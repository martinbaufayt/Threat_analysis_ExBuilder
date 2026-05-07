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
import Color from 'esri/Color';
import { fromJSON as geometryFromJSON } from 'esri/geometry/support/jsonUtils';

type DrawTool = 'point' | 'polyline' | 'polygon';

interface ZoneGroup {
  id: string;
  threatIndex: number;
  threatLabel: string;
  unit: Unit;
  drawTool: DrawTool;
  sketchGeometryJson: any;
  mandatoryGeometryJson: any;
  preferredGeometryJson: any;
}

interface State {
  jimuMapView: JimuMapView | null;
  selectedThreatIndex: number;
  selectedUnit: Unit;
  activeTool: DrawTool | null;
  hasZones: boolean;
  statusMsg: string;
  zoneGroups: ZoneGroup[];
}

// Input sketch symbols — blue transparent fill (alpha 0-1), opaque outline
const inputPointSymbol = new SimpleMarkerSymbol({
  color: new Color([0, 120, 255, 0.2]),
  outline: new SimpleLineSymbol({ color: new Color([0, 80, 220, 0.85]), width: 2 }),
  size: 12,
  style: 'circle',
});

const inputLineSymbol = new SimpleLineSymbol({
  color: new Color([0, 80, 220, 0.85]),
  width: 2.5,
});

const inputPolygonSymbol = new SimpleFillSymbol({
  color: new Color([0, 120, 255, 0.2]),
  outline: new SimpleLineSymbol({ color: new Color([0, 80, 220, 0.85]), width: 2 }),
});

// Buffer zone symbols — transparent fill, opaque outline
const mandatoryFillSymbol = new SimpleFillSymbol({
  color: new Color([204, 0, 0, 0.2]),
  outline: new SimpleLineSymbol({ color: new Color([204, 0, 0, 0.85]), width: 2 }),
});

const preferredFillSymbol = new SimpleFillSymbol({
  color: new Color([255, 140, 0, 0.15]),
  outline: new SimpleLineSymbol({ color: new Color([255, 140, 0, 0.85]), width: 2 }),
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

function makePopupTemplate(threatLabel: string, zoneType: string, distanceFt: number, unit: Unit): __esri.PopupTemplateProperties {
  return {
    title: zoneType,
    content: `
      <b>Threat Type:</b> ${threatLabel}<br>
      <b>Distance:</b> ${formatDistance(distanceFt, unit)}<br>
      <b>Unit:</b> ${unit === 'meters' ? 'Meters' : 'Feet'}
    `,
  };
}

function getSketchSymbol(drawTool: DrawTool): any {
  if (drawTool === 'polyline') return inputLineSymbol;
  if (drawTool === 'polygon') return inputPolygonSymbol;
  return inputPointSymbol;
}

export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, State> {
  private graphicsLayer: GraphicsLayer | null = null;
  private labelLayer: GraphicsLayer | null = null;
  private sketchLayer: GraphicsLayer | null = null;
  private sketchViewModel: SketchViewModel | null = null;
  private sketchCompleteHandle: IHandle | null = null;
  private clickHandle: IHandle | null = null;
  private lastDrawTool: DrawTool = 'point';
  private fileInputRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: AllWidgetProps<IMConfig>) {
    super(props);
    this.state = {
      jimuMapView: null,
      selectedThreatIndex: props.config?.defaultThreatIndex ?? 0,
      selectedUnit: props.config?.defaultUnit ?? 'meters',
      activeTool: null,
      hasZones: false,
      statusMsg: '',
      zoneGroups: [],
    };
  }

  nls = (key: keyof typeof defaultMessages): string => defaultMessages[key] || key;

  onMapViewReady = (jimuMapView: JimuMapView) => {
    this.setState({ jimuMapView });

    this.graphicsLayer = new GraphicsLayer({ listMode: 'hide' });
    this.labelLayer = new GraphicsLayer({ listMode: 'hide' });
    this.labelLayer.popupEnabled = false;
    this.sketchLayer = new GraphicsLayer({ listMode: 'hide' });
    this.sketchLayer.popupEnabled = false;
    jimuMapView.view.map.addMany([this.graphicsLayer, this.labelLayer, this.sketchLayer]);

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

    this.clickHandle = jimuMapView.view.on('click', async (event) => {
      if (this.state.activeTool) return;
      const response = await jimuMapView.view.hitTest(event, { include: [this.graphicsLayer] });
      const hit = response.results.find((r) => r.type === 'graphic' && (r as any).graphic?.attributes?.isBufferZone);
      if (hit && hit.type === 'graphic') {
        jimuMapView.view.popup.open({
          location: event.mapPoint,
          features: [(hit as any).graphic],
        });
      }
    });
  };

  componentWillUnmount() {
    this.sketchCompleteHandle?.remove();
    this.clickHandle?.remove();
    this.sketchViewModel?.destroy();
    const map = this.state.jimuMapView?.view?.map;
    if (map) {
      if (this.graphicsLayer) map.remove(this.graphicsLayer);
      if (this.labelLayer) map.remove(this.labelLayer);
      if (this.sketchLayer) map.remove(this.sketchLayer);
    }
  }

  onSketchComplete = async (graphic: Graphic) => {
    this.setState({ activeTool: null });
    await this.createZonesFromGeometry(graphic.geometry);
  };

  activateDrawTool = (tool: DrawTool) => {
    if (!this.sketchViewModel) return;
    this.lastDrawTool = tool;
    this.setState({ activeTool: tool, statusMsg: this.getDrawInstruction(tool) });
    this.sketchViewModel.create(tool);
  };

  getDrawInstruction = (tool: DrawTool): string => {
    if (tool === 'point') return this.nls('drawInstruction');
    if (tool === 'polyline') return this.nls('drawInstructionLine');
    return this.nls('drawInstructionPolygon');
  };

  createZonesFromGeometry = async (geometry: __esri.Geometry) => {
    const { selectedThreatIndex, selectedUnit } = this.state;
    const threat = THREAT_TYPES[selectedThreatIndex];

    const [mandatoryBuffer, preferredBuffer] = await Promise.all([
      geometryEngineAsync.geodesicBuffer(geometry, toMeters(threat.mandatoryFt), 'meters') as Promise<__esri.Polygon>,
      geometryEngineAsync.geodesicBuffer(geometry, toMeters(threat.preferredFt), 'meters') as Promise<__esri.Polygon>,
    ]);

    if (!mandatoryBuffer || !preferredBuffer) return;

    const group: ZoneGroup = {
      id: Date.now().toString(),
      threatIndex: selectedThreatIndex,
      threatLabel: threat.label,
      unit: selectedUnit,
      drawTool: this.lastDrawTool,
      sketchGeometryJson: geometry.toJSON(),
      mandatoryGeometryJson: mandatoryBuffer.toJSON(),
      preferredGeometryJson: preferredBuffer.toJSON(),
    };

    this.addZoneGroupGraphics(group);

    this.setState((prev) => ({
      hasZones: true,
      statusMsg: this.nls('zoneCreated'),
      zoneGroups: [...prev.zoneGroups, group],
    }));

    this.state.jimuMapView?.view.goTo((preferredBuffer as __esri.Polygon).extent.expand(1.3));
  };

  addZoneGroupGraphics = (group: ZoneGroup) => {
    const threat = THREAT_TYPES[group.threatIndex];
    const { unit } = group;

    const mandatoryGeom = geometryFromJSON(group.mandatoryGeometryJson) as __esri.Polygon;
    const preferredGeom = geometryFromJSON(group.preferredGeometryJson) as __esri.Polygon;
    const sketchGeom = geometryFromJSON(group.sketchGeometryJson);

    // Sketch input graphic
    const sketchGraphic = new Graphic({ geometry: sketchGeom, symbol: getSketchSymbol(group.drawTool) });
    this.sketchLayer?.add(sketchGraphic);

    // Buffer graphics (clickable, with popup)
    const preferredGraphic = new Graphic({
      geometry: preferredGeom,
      symbol: preferredFillSymbol,
      attributes: { isBufferZone: true, threatType: threat.label, zoneType: 'Preferred Evacuation', distanceFt: threat.preferredFt, unit },
      popupTemplate: makePopupTemplate(threat.label, this.nls('preferredEvacuation'), threat.preferredFt, unit) as any,
    });

    const mandatoryGraphic = new Graphic({
      geometry: mandatoryGeom,
      symbol: mandatoryFillSymbol,
      attributes: { isBufferZone: true, threatType: threat.label, zoneType: 'Mandatory Evacuation', distanceFt: threat.mandatoryFt, unit },
      popupTemplate: makePopupTemplate(threat.label, this.nls('mandatoryEvacuation'), threat.mandatoryFt, unit) as any,
    });

    this.graphicsLayer?.addMany([preferredGraphic, mandatoryGraphic]);

    // Text labels (non-clickable, on labelLayer)
    const mandatoryLabelPt = mandatoryGeom.centroid;
    const preferredExtent = preferredGeom.extent;
    const preferredLabelPt = new Point({
      x: preferredExtent.center.x,
      y: preferredExtent.ymax - preferredExtent.height * 0.12,
      spatialReference: preferredGeom.spatialReference,
    });

    this.labelLayer?.addMany([
      new Graphic({
        geometry: mandatoryLabelPt,
        symbol: makeTextSymbol(`${this.nls('mandatoryEvacuation')}\n${formatDistance(threat.mandatoryFt, unit)}`, new Color([204, 0, 0, 255])),
      }),
      new Graphic({
        geometry: preferredLabelPt,
        symbol: makeTextSymbol(`${this.nls('preferredEvacuation')}\n${formatDistance(threat.preferredFt, unit)}`, new Color([180, 90, 0, 255])),
      }),
    ]);
  };

  clearAll = () => {
    this.graphicsLayer?.removeAll();
    this.labelLayer?.removeAll();
    this.sketchLayer?.removeAll();
    this.sketchViewModel?.cancel();
    this.state.jimuMapView?.view.popup.close();
    this.setState({ hasZones: false, activeTool: null, statusMsg: '', zoneGroups: [] });
  };

  saveSession = () => {
    const data = {
      version: '1.0',
      savedAt: new Date().toISOString(),
      zoneGroups: this.state.zoneGroups,
    };
    this.downloadBlob(JSON.stringify(data, null, 2), 'threat-analysis-session.json', 'application/json');
  };

  loadSession = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.version !== '1.0' || !Array.isArray(data.zoneGroups)) {
          this.setState({ statusMsg: this.nls('invalidSession') });
          return;
        }
        this.clearAll();
        for (const group of data.zoneGroups) {
          this.addZoneGroupGraphics(group);
        }
        this.setState({ zoneGroups: data.zoneGroups, hasZones: data.zoneGroups.length > 0 });
      } catch {
        this.setState({ statusMsg: this.nls('invalidSession') });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  render() {
    const { jimuMapView, selectedThreatIndex, selectedUnit, activeTool, hasZones, statusMsg } = this.state;
    const { theme, useMapWidgetIds, config } = this.props;

    const threat = THREAT_TYPES[selectedThreatIndex];

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

            <div>
              <Label className="threat-section-label">{this.nls('selectThreatType')}</Label>
              <Select
                value={selectedThreatIndex}
                onChange={(e) => this.setState({ selectedThreatIndex: Number(e.target.value) })}
                size="sm"
              >
                {THREAT_TYPES.map((t, i) => (
                  <Option key={i} value={i}>{t.label}</Option>
                ))}
              </Select>
            </div>

            <div>
              <Label className="threat-section-label">{this.nls('units')}</Label>
              <Select
                value={selectedUnit}
                onChange={(e) => this.setState({ selectedUnit: e.target.value as Unit })}
                size="sm"
              >
                <Option value="meters">{this.nls('meters')}</Option>
                <Option value="feet">{this.nls('feet')}</Option>
              </Select>
            </div>

            <div>
              <Label className="threat-section-label">{this.nls('selectDrawTool')}</Label>
              <div className="threat-draw-tools">
                {(['point', 'polyline', 'polygon'] as DrawTool[]).map((tool) => (
                  <Button
                    key={tool}
                    size="sm"
                    type={activeTool === tool ? 'primary' : 'default'}
                    onClick={() => this.activateDrawTool(tool)}
                  >
                    {this.nls(tool === 'point' ? 'drawPoint' : tool === 'polyline' ? 'drawPolyline' : 'drawPolygon')}
                  </Button>
                ))}
              </div>
            </div>

            {statusMsg && <p className="threat-status-msg">{statusMsg}</p>}

            <div className="threat-zone-legend">
              <div className="threat-zone-row">
                <span className="threat-zone-swatch mandatory" />
                <span>{this.nls('mandatoryEvacuation')}</span>
                <span className="threat-zone-distance">{formatDistance(threat.mandatoryFt, selectedUnit)}</span>
              </div>
              <div className="threat-zone-row">
                <span className="threat-zone-swatch preferred" />
                <span>{this.nls('preferredEvacuation')}</span>
                <span className="threat-zone-distance">{formatDistance(threat.preferredFt, selectedUnit)}</span>
              </div>
            </div>

            {hasZones && (
              <div className="threat-actions">
                <Button size="sm" type="danger" onClick={this.clearAll}>
                  {this.nls('clearZones')}
                </Button>
              </div>
            )}

            <div className="threat-session">
              <Button size="sm" type="default" onClick={this.saveSession} disabled={!hasZones}>
                {this.nls('saveSession')}
              </Button>
              <Button size="sm" type="default" onClick={() => this.fileInputRef.current?.click()}>
                {this.nls('loadSession')}
              </Button>
              <input
                ref={this.fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={this.loadSession}
              />
            </div>

          </div>
        )}
      </div>
    );
  }
}
