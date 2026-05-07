import { React } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { IMConfig, Unit } from '../config';
import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components';
import { Select, Option, Label } from 'jimu-ui';

export default class Setting extends React.PureComponent<AllWidgetSettingProps<IMConfig>> {

  onMapWidgetSelected = (useMapWidgetIds: string[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      useMapWidgetIds,
    });
  };

  onPropertyChange = (name: keyof IMConfig, value: any) => {
    const newConfig = this.props.config.set(name, value);
    this.props.onSettingChange({ id: this.props.id, config: newConfig });
  };

  render() {
    const { config } = this.props;

    return (
      <div>
        <SettingSection title="Map">
          <SettingRow>
            <MapWidgetSelector
              useMapWidgetIds={this.props.useMapWidgetIds}
              onSelect={this.onMapWidgetSelected}
            />
          </SettingRow>
        </SettingSection>

        <SettingSection title="Defaults">
          <SettingRow label="Default unit">
            <Select
              value={config.defaultUnit}
              onChange={(e) => this.onPropertyChange('defaultUnit', e.target.value as Unit)}
              size="sm"
            >
              <Option value="meters">Meters</Option>
              <Option value="feet">Feet</Option>
            </Select>
          </SettingRow>

          <SettingRow label="Default threat type">
            <Select
              value={config.defaultThreatIndex}
              onChange={(e) => this.onPropertyChange('defaultThreatIndex', Number(e.target.value))}
              size="sm"
            >
              {[
                'Pipe Bomb',
                'Suicide Bomb',
                'Briefcase Bomb',
                'Car Bomb',
                'SUV / Van Bomb',
                'Small Delivery Truck Bomb',
                'Container / Water Truck Bomb',
                'Semi-Trailer Bomb',
              ].map((label, i) => (
                <Option key={i} value={i}>{label}</Option>
              ))}
            </Select>
          </SettingRow>
        </SettingSection>
      </div>
    );
  }
}
