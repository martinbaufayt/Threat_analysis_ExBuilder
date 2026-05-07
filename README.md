# Threat Analysis — ArcGIS Experience Builder Widget

<img src="threat-analysis/icon.svg" alt="Threat Analysis icon" width="64" align="right"/>

A custom widget for [ArcGIS Experience Builder](https://www.esri.com/en-us/arcgis/products/arcgis-experience-builder/overview) that replicates the Threat Analysis functionality from ArcGIS Web AppBuilder.

It lets users interactively draw a point, polyline, or polygon on a map, select a threat type, and instantly generate two geodesic buffer zones — **Mandatory Evacuation** and **Preferred Evacuation** — based on standardized safe-standoff distances. Designed for public safety, crisis management, and civil protection use cases.

---

## Features

- Interactive drawing tools: point, polyline, or polygon as threat origin
- 8 built-in threat types with standard IEDL safe-standoff distances
- Dual buffer zones rendered simultaneously:
  - Mandatory Evacuation Zone (red)
  - Preferred Evacuation Zone (orange)
- Distance labels on both zones
- Unit toggle: feet or meters
- Auto-zoom to the created zones
- Clear button to reset the map
- Configurable defaults (unit and threat type) from the ExB settings panel

---

## Threat Types & Distances

| Threat Type | Mandatory Evacuation | Preferred Evacuation |
|---|---|---|
| Pipe Bomb | 70 ft | 1,200 ft |
| Suicide Bomb | 110 ft | 1,700 ft |
| Briefcase Bomb | 150 ft | 1,850 ft |
| Car Bomb | 320 ft | 1,900 ft |
| SUV / Van Bomb | 400 ft | 2,400 ft |
| Small Delivery Truck Bomb | 640 ft | 3,800 ft |
| Container / Water Truck Bomb | 860 ft | 5,100 ft |
| Semi-Trailer Bomb | 1,570 ft | 9,300 ft |

---

## Project Structure

```
threat-analysis/
├── manifest.json                        # Widget metadata (ExB 1.17.0)
├── config.json                          # Default configuration values
├── icon.svg
└── src/
    ├── config.ts                        # Types, threat data, unit conversion
    ├── runtime/
    │   ├── widget.tsx                   # Main widget component
    │   ├── translations/default.ts      # UI strings
    │   └── lib/style.ts                 # CSS-in-JS styles
    └── setting/
        └── setting.tsx                  # ExB configuration panel
```

---

## Getting Started

### Prerequisites

- [ArcGIS Experience Builder Developer Edition](https://developers.arcgis.com/experience-builder/) (tested on v1.17)
- Node.js ≥ 18

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/martinbaufayt/Threat_analysis_ExBuilder.git
   ```

2. Copy the `threat-analysis/` folder into your ExB extensions directory:

   ```bash
   cp -r threat-analysis/ <ExB root>/client/your-extensions/widgets/
   ```

3. Start the ExB development server from the ExB root:

   ```bash
   npm start
   ```

4. Open ExB in your browser, create or open an application, and add the **Threat Analysis** widget from the widget panel.

### Configuration

In the ExB builder, open the widget settings panel to:

- Connect the widget to a **Map** widget
- Set the **default unit** (feet or meters)
- Set the **default threat type**

---

## How It Works

1. Select a **threat type** from the dropdown.
2. Select the **unit** (feet or meters).
3. Click **Point**, **Polyline**, or **Polygon** to activate a drawing tool.
4. Draw on the map — zones are generated automatically when the sketch is complete.
5. Two buffer zones appear: the inner red zone (mandatory evacuation) and the outer orange zone (preferred evacuation), both computed as geodesic buffers using `geometryEngineAsync.geodesicBuffer`.
6. Click **Clear** to reset.

> [!NOTE]
> Buffers are always computed in meters internally (converted from feet using `FT_TO_M = 0.3048`), then displayed in the unit chosen by the user.

---

## Technical Notes

- Built with the **ArcGIS Maps SDK for JavaScript** (AMD-style imports via `esri/`) inside the ExB / jimu-core framework.
- Uses `SketchViewModel` for interactive drawing and `geometryEngineAsync` for geodesic buffer computation.
- Styling via `jimu-core` CSS-in-JS (`css` tagged template), theme-aware.
- Widget state is managed as a React class component (`React.PureComponent`), consistent with the ExB widget conventions.

---

## Related Projects

- [draw_exp_builder](https://github.com/martinbaufayt/draw_exp_builder) — Draw Advanced widget port for Experience Builder
