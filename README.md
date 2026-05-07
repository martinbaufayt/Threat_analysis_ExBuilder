# Threat Analysis — ArcGIS Experience Builder Widget

<img src="threat-analysis/icon.svg" alt="Threat Analysis icon" width="64" align="right"/>

A custom widget for [ArcGIS Experience Builder](https://www.esri.com/en-us/arcgis/products/arcgis-experience-builder/overview) that replicates the Threat Analysis functionality from ArcGIS Web AppBuilder.

Users interactively draw a point, polyline, or polygon on a map, select a threat type, and instantly generate two geodesic buffer zones — **Mandatory Evacuation** and **Preferred Evacuation** — based on standardized safe-standoff distances. Designed for public safety, crisis management, and civil protection use cases.

---

## Features

- Interactive drawing tools: point, polyline, or polygon as threat origin
- 8 built-in threat types with standard IEDL safe-standoff distances
- Dual buffer zones rendered simultaneously:
  - Mandatory Evacuation Zone (red, transparent fill with opaque outline)
  - Preferred Evacuation Zone (orange, transparent fill with opaque outline)
- Input sketch rendered in blue (transparent fill, opaque outline)
- **Cumulative zones** — each new sketch adds to the map without clearing previous zones
- **Clickable buffers** — click any zone to open a popup with zone type, threat type, distance, and unit
- **Fixed coordinate input** — place a threat point by typing coordinates in DD, DDM, MGRS, or UTM (any number of decimals accepted)
- Distance labels on both zones
- Unit toggle: meters (default) or feet
- Auto-zoom to the newly created zones
- Clear All button to reset the map

### Session management

- **Save** — exports the full session (all zone groups with geometries and metadata) as a `.json` file
- **Load** — restores a previously saved session from a `.json` file

---

## Threat Types & Distances

| Threat Type | Mandatory Evacuation | Preferred Evacuation |
|---|---|---|
| Pipe Bomb | 70 ft / 21 m | 1,200 ft / 366 m |
| Suicide Bomb | 110 ft / 34 m | 1,700 ft / 518 m |
| Briefcase Bomb | 150 ft / 46 m | 1,850 ft / 564 m |
| Car Bomb | 320 ft / 98 m | 1,900 ft / 579 m |
| SUV / Van Bomb | 400 ft / 122 m | 2,400 ft / 732 m |
| Small Delivery Truck Bomb | 640 ft / 195 m | 3,800 ft / 1,158 m |
| Container / Water Truck Bomb | 860 ft / 262 m | 5,100 ft / 1,554 m |
| Semi-Trailer Bomb | 1,570 ft / 479 m | 9,300 ft / 2,835 m |

---

## Project Structure

```
threat-analysis/
├── manifest.json                        # Widget metadata (ExB 1.17.0)
├── config.json                          # Default configuration (unit: meters)
├── icon.svg
└── src/
    ├── config.ts                        # Types, threat data, unit conversion
    ├── runtime/
    │   ├── widget.tsx                   # Main widget component
    │   ├── translations/default.ts      # UI strings
    │   └── lib/style.ts                 # CSS-in-JS styles (theme-aware)
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
- Set the **default unit** (meters or feet)
- Set the **default threat type**

---

## How It Works

1. Select a **threat type** from the dropdown.
2. Select the **unit** (meters or feet).
3. Click **Point**, **Polyline**, or **Polygon** to activate a drawing tool.
4. Draw on the map — zones are generated automatically when the sketch is complete.
5. Two buffer zones appear around the sketch:
   - Inner red zone: Mandatory Evacuation
   - Outer orange zone: Preferred Evacuation
6. Click any buffer zone to open a popup showing the zone type, threat type, distance, and unit.
7. Alternatively, click **Enter Coordinates** to place a point from a typed coordinate (DD, DDM, MGRS, or UTM).
8. Repeat to add more zones — previous zones are preserved.
9. Use **Save** / **Load** to persist sessions as JSON.

> [!NOTE]
> Buffers are computed as geodesic buffers using `geometryEngineAsync.geodesicBuffer`, ensuring accurate distances regardless of map projection. All distances are stored in feet internally and converted to meters using `FT_TO_M = 0.3048`.

---

## Session File Format

The session JSON file saves all zone groups with their full geometry. It can be reloaded in any subsequent session:

```json
{
  "version": "1.0",
  "savedAt": "2025-05-07T...",
  "zoneGroups": [
    {
      "id": "1715000000000",
      "threatIndex": 3,
      "threatLabel": "Car Bomb",
      "unit": "meters",
      "drawTool": "point",
      "sketchGeometryJson": { ... },
      "mandatoryGeometryJson": { ... },
      "preferredGeometryJson": { ... }
    }
  ]
}
```

---

## Technical Notes

- Built with the **ArcGIS Maps SDK for JavaScript** (AMD-style `esri/` imports) inside the ExB / jimu-core framework.
- Uses `SketchViewModel` for interactive drawing and `geometryEngineAsync` for geodesic buffer computation.
- Three separate `GraphicsLayer` instances: buffer zones (popup-enabled), text labels (popup-disabled), sketch inputs (popup-disabled).
- Popup is triggered via `view.hitTest()` + `view.popup.open()` for reliable behavior in the ExB environment. The popup displays zone type, threat type, distance, and unit.
- Coordinate input uses `esri/geometry/coordinateFormatter` (loaded asynchronously on map ready) for MGRS and UTM parsing; DD and DDM are parsed natively with support for any number of decimal places and optional N/S/E/W suffixes.
- Styling via `jimu-core` CSS-in-JS (`css` tagged template), fully theme-aware.

---

## Related Projects

- [draw_exp_builder](https://github.com/martinbaufayt/draw_exp_builder) — Draw Advanced widget port for Experience Builder
