import { ThemeVariables, css, SerializedStyles } from 'jimu-core';
import { IMConfig } from '../../config';

export function getStyle(theme: ThemeVariables, _widgetConfig: IMConfig): SerializedStyles {
  return css`
    .threat-widget-container {
      display: flex;
      flex-direction: column;
      padding: 12px;
      gap: 12px;
      height: 100%;
      overflow-y: auto;
    }

    .threat-section-label {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
      color: ${theme.colors?.palette?.dark?.[700] || '#333'};
    }

    .threat-draw-tools {
      display: flex;
      gap: 6px;
    }

    .threat-draw-tools .jimu-btn {
      flex: 1;
    }

    .threat-zone-legend {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px;
      border: 1px solid ${theme.colors?.palette?.dark?.[200] || '#ddd'};
      border-radius: 4px;
      background: ${theme.colors?.palette?.light?.[100] || '#f9f9f9'};
    }

    .threat-zone-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }

    .threat-zone-swatch {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      flex-shrink: 0;
      border: 1px solid rgba(0,0,0,0.2);
    }

    .threat-zone-swatch.mandatory {
      background: rgba(204, 0, 0, 0.5);
      border-color: #CC0000;
    }

    .threat-zone-swatch.preferred {
      background: rgba(255, 140, 0, 0.35);
      border-color: #FF8C00;
    }

    .threat-zone-distance {
      font-weight: 600;
      margin-left: auto;
    }

    .threat-status-msg {
      font-size: 11px;
      color: ${theme.colors?.palette?.dark?.[500] || '#666'};
      font-style: italic;
      text-align: center;
    }

    .threat-actions {
      display: flex;
      gap: 8px;
    }

    .threat-actions .jimu-btn {
      flex: 1;
    }
  `;
}
