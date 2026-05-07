/** @jsx jsx */
import { React, AllWidgetProps, jsx } from 'jimu-core';
import { IMConfig, THREAT_TYPES, Unit, toMeters } from '../config';
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis';
import { Button, Select, Option, Label } from 'jimu-ui';
import { getStyle } from './lib/style';
import defaultMessages from './translations/default';

import GraphicsLayer from 'esri/layers/GraphicsLayer';
import Graphic from 'esri/Graphic';
import SketchViewModel from 'esri/widgets/Sketch/SketchViewModel';
import geometryEngineAsync from 'esri/geometry/geometryEngineAsync';
import SimpleFillSymbol from 'esri/symbols/SimpleFillSymbol';
import SimpleLineSymbol from 'esri/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol';
import TextSymbol from 'esri/symbols/TextSymbol';
import Point from 'esri/geometry/Point';
import Polyline from 'esri/geometry/Polyline';
import Polygon from 'esri/geometry/Polygon';
import Color from 'esri/Color';

type DrawTool = 'point' | 'polyline' | 'polygon';

interface State {
  jimuMapView: JimuMapView | null;
  selectedThreatIndex: number;
  selectedUnit: Unit;
  activeTool: DrawTool | null;
  zonesCreated: boolean;
  statusMsg: string;
}

const MANDATORY_COLOR = new Color([204, 0, 0, 180]);
const MANDATORY_OUTLINE_COLOR = new Color([204, 0, 0, 255]);
const PREFERRED_COLOR = new Color([255, 140, 0, 90]);
const PREFERRED_OUTLINE_COLOR = new Color([255, 140, 0, 255]);

const mandatoryFillSymbol = new SimpleFillSymbol({
  color: MANDATORY_COLOR,
  outline: new SimpleLineSymbol({ color: MANDATORY_OUTLINE_COLOR, width: 2 }),
});

const preferredFillSymbol = new SimpleFillSymbol({
  color: PREFERRED_COLOR,
  outline: new SimpleLineSymbol({ color: PREFERRED_OUTLINE_COLOR, width: 2 }),
});

const inputPointSymbol = new SimpleMarkerSymbol({
  color: new Color([50, 50, 50, 200]),
  outline: new SimpleLineSymbol({ color: new Color([255, 255, 255, 255]), width: 1.5 }),
  size: 10,
  style: 'circle',
});

const inputLineSymbol = new SimpleLineSymbol({
  color: new Color([50, 50, 50, 200]),
  width: 2,
  style: 'short-dash',
});

const inputPolygonSymbol = new SimpleFillSymbol({
  color: new Color([50, 50, 50, 60]),
  outline: new SimpleLineSymbol({ color: new Color([50, 50, 50, 200]), width: 2, style: 'short-dash' }),
});

function makeTextSymbol(text: string, color: Color): TextSymbol {
  return new TextSymbol({
    text,
    color,
    haloColor: new Color([255, 255, 255, 255]),
    haloSize: 1.5,
    font: { size: 11, weight: 'bold' },
    horizontalAlignment: 'center',
    verticalAlignment: 'middle',
  });
}

function formatDistance(feet: number, unit: Unit): string {
  if (unit === 'meters') {
    return `${Math.round(toMeters(feet))} m`;
  }
  return `${feet} ft`;
}

export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, State> {
  private graphicsLayer: GraphicsLayer | null = null;
  private sketchLayer: GraphicsLayer | null = null;
  private sketchViewModel: SketchViewModel | null = null;
  private sketchCompleteHandle: IHandle | null = null;

  constructor(props: AllWidgetProps<IMConfig>) {
    super(props);
    this.state = {
      jimuMapView: null,
      selectedThreatIndex: props.config?.defaultThreatIndex ?? 0,
      selectedUnit: props.config?.defaultUnit ?? 'feet',
      activeTool: null,
      zonesCreated: false,
      statusMsg: '',
    };
  }

  nls = (key: keyof typeof defaultMessages): string => {
    return defaultMessages[key] || key;
  };

  onMapViewReady = (jimuMapView: JimuMapView) => {
    this.setState({ jimuMapView });

    this.graphicsLayer = new GraphicsLayer({ listMode: 'hide' });
    this.sketchLayer = new GraphicsLayer({ listMode: 'hide' });
    jimuMapView.view.map.addMany([this.graphicsLayer, this.sketchLayer]);

    this.sketchViewModel = new SketchViewModel({
      view: jimuMapView.view,
      layer: this.sketchLayer,
      pointSymbol: inputPointSymbol,
      polylineSymbol: inputLineSymbol,
      polygonSymbol: inputPolygonSymbol,
      updateOnGraphicClick: false,
    });

    this.sketchCompleteHandle = this.sketchViewModel.on('create', (event) => {
      if (event.state === 'complete') {
        this.onSketchComplete(event.graphic);
      }
    });
  };

  componentWillUnmount() {
    this.sketchCompleteHandle?.remove();
    this.sketchViewModel?.destroy();
    if (this.state.jimuMapView?.view?.map) {
      if (this.graphicsLayer) this.state.jimuMapView.view.map.remove(this.graphicsLayer);
      if (this.sketchLayer) this.state.jimuMapView.view.map.remove(this.sketchLayer);
    }
  }

  onSketchComplete = async (graphic: Graphic) => {
    this.setState({ activeTool: null });
    await this.createZonesFromGeometry(graphic.geometry);
  };

  activateDrawTool = (tool: DrawTool) => {
    if (!this.sketchViewModel) return;
    this.setState({ activeTool: tool, zonesCreated: false, statusMsg: this.getDrawInstruction(tool) });
    this.sketchViewModel.create(tool);
  };

  getDrawInstruction = (tool: DrawTool): string => {
    if (tool === 'point') return this.nls('drawInstruction');
    if (tool === 'polyline') return this.nls('drawInstructionLine');
    return this.nls('drawInstructionPolygon');
  };

  createZonesFromGeometry = async (geometry: __esri.Geometry) => {
    if (!this.graphicsLayer) return;

    this.graphicsLayer.removeAll();

    const threat = THREAT_TYPES[this.state.selectedThreatIndex];
    const unit = this.state.selectedUnit;

    const mandatoryDistM = toMeters(threat.mandatoryFt);
    const preferredDistM = toMeters(threat.preferredFt);

    const [mandatoryBuffer, preferredBuffer] = await Promise.all([
      geometryEngineAsync.geodesicBuffer(geometry, mandatoryDistM, 'meters') as Promise<__esri.Polygon>,
      geometryEngineAsync.geodesicBuffer(geometry, preferredDistM, 'meters') as Promise<__esri.Polygon>,
    ]);

    if (!mandatoryBuffer || !preferredBuffer) return;

    const preferredGraphic = new Graphic({ geometry: preferredBuffer, symbol: preferredFillSymbol });
    const mandatoryGraphic = new Graphic({ geometry: mandatoryBuffer, symbol: mandatoryFillSymbol });

    const mandatoryLabelPoint = (mandatoryBuffer as __esri.Polygon).centroid;
    const preferredExtent = (preferredBuffer as __esri.Polygon).extent;
    const preferredLabelPoint = new Point({
      x: preferredExtent.center.x,
      y: preferredExtent.ymax - (preferredExtent.height * 0.12),
      spatialReference: preferredBuffer.spatialReference,
    });

    const mandatoryLabelGraphic = new Graphic({
      geometry: mandatoryLabelPoint,
      symbol: makeTextSymbol(
        `${this.nls('mandatoryEvacuation')}\n${formatDistance(threat.mandatoryFt, unit)}`,
        new Color([204, 0, 0, 255])
      ),
    });

    const preferredLabelGraphic = new Graphic({
      geometry: preferredLabelPoint,
      symbol: makeTextSymbol(
        `${this.nls('preferredEvacuation')}\n${formatDistance(threat.preferredFt, unit)}`,
        new Color([180, 90, 0, 255])
      ),
    });

    this.graphicsLayer.addMany([preferredGraphic, mandatoryGraphic, mandatoryLabelGraphic, preferredLabelGraphic]);

    this.state.jimuMapView?.view.goTo(preferredBuffer.extent.expand(1.3));

    this.setState({ zonesCreated: true, statusMsg: this.nls('zoneCreated') });
  };

  clearAll = () => {
    this.graphicsLayer?.removeAll();
    this.sketchLayer?.removeAll();
    this.sketchViewModel?.cancel();
    this.setState({ zonesCreated: false, activeTool: null, statusMsg: '' });
  };

  render() {
    const { jimuMapView, selectedThreatIndex, selectedUnit, activeTool, zonesCreated, statusMsg } = this.state;
    const { theme, useMapWidgetIds, config } = this.props;

    const threat = THREAT_TYPES[selectedThreatIndex];
    const unit = selectedUnit;

    const mandatoryLabel = formatDistance(threat.mandatoryFt, unit);
    const preferredLabel = formatDistance(threat.preferredFt, unit);

    return (
      <div css={getStyle(theme, config)} style={{ width: '100%', height: '100%' }}>
        <JimuMapViewComponent
          useMapWidgetId={useMapWidgetIds?.[0]}
          onActiveViewChange={this.onMapViewReady}
        />

        {!jimuMapView ? (
          <div className="threat-widget-container">
            <p className="threat-status-msg">{this.nls('noMapView')}</p>
          </div>
        ) : (
          <div className="threat-widget-container">

            {/* Threat type selector */}
            <div>
              <Label className="threat-section-label">{this.nls('selectThreatType')}</Label>
              <Select
                value={selectedThreatIndex}
                onChange={(e) => this.setState({ selectedThreatIndex: Number(e.target.value), zonesCreated: false })}
                size="sm"
              >
                {THREAT_TYPES.map((t, i) => (
                  <Option key={i} value={i}>{t.label}</Option>
                ))}
              </Select>
            </div>

            {/* Unit selector */}
            <div>
              <Label className="threat-section-label">{this.nls('units')}</Label>
              <Select
                value={selectedUnit}
                onChange={(e) => this.setState({ selectedUnit: e.target.value as Unit, zonesCreated: false })}
                size="sm"
              >
                <Option value="feet">{this.nls('feet')}</Option>
                <Option value="meters">{this.nls('meters')}</Option>
              </Select>
            </div>

            {/* Draw tools */}
            <div>
              <Label className="threat-section-label">{this.nls('selectDrawTool')}</Label>
              <div className="threat-draw-tools">
                <Button
                  size="sm"
                  type={activeTool === 'point' ? 'primary' : 'default'}
                  onClick={() => this.activateDrawTool('point')}
                  title={this.nls('drawPoint')}
                >
                  {this.nls('drawPoint')}
                </Button>
                <Button
                  size="sm"
                  type={activeTool === 'polyline' ? 'primary' : 'default'}
                  onClick={() => this.activateDrawTool('polyline')}
                  title={this.nls('drawPolyline')}
                >
                  {this.nls('drawPolyline')}
                </Button>
                <Button
                  size="sm"
                  type={activeTool === 'polygon' ? 'primary' : 'default'}
                  onClick={() => this.activateDrawTool('polygon')}
                  title={this.nls('drawPolygon')}
                >
                  {this.nls('drawPolygon')}
                </Button>
              </div>
            </div>

            {/* Status message */}
            {statusMsg && (
              <p className="threat-status-msg">{statusMsg}</p>
            )}

            {/* Zone legend */}
            <div className="threat-zone-legend">
              <div className="threat-zone-row">
                <span className="threat-zone-swatch mandatory" />
                <span>{this.nls('mandatoryEvacuation')}</span>
                <span className="threat-zone-distance">{mandatoryLabel}</span>
              </div>
              <div className="threat-zone-row">
                <span className="threat-zone-swatch preferred" />
                <span>{this.nls('preferredEvacuation')}</span>
                <span className="threat-zone-distance">{preferredLabel}</span>
              </div>
            </div>

            {/* Clear button */}
            {zonesCreated && (
              <div className="threat-actions">
                <Button size="sm" type="secondary" onClick={this.clearAll}>
                  {this.nls('clearZones')}
                </Button>
              </div>
            )}

          </div>
        )}
      </div>
    );
  }
}
