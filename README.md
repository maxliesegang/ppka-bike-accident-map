# PPKA Bike Accident Map

This repository showcases an interactive map application built using **TypeScript**, **Vite**, **Leaflet**, and **GeoPackage**, visualizing bike and pedestrian traffic accident data for Karlsruhe and aggregated Unfallatlas OpenData for selectable year ranges.

## Features

- **Canvas-rendered map**: Uses Leaflet's Canvas renderer with direct `CircleMarker` creation for fast rendering of thousands of accident points.
- **Unified filter control**: Collapsible panel (bottom-left) to toggle data source, available Unfallatlas years, accident types, and severity levels.
- **GeoPackage support**: Loads local GeoPackage data (`unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg`) for efficient geospatial operations.
- **PPKA request data**: Adds the geocoded newer years from the unified Polizeipraesidium-Karlsruhe response (`data/ppka/verkehrsunfaelle_einheitlich_ka_fuss_rad.csv`) to the same local data source, so the FragDenStaat view spans 2018-2025.
- **Unfallatlas aggregation**: Loads yearly Unfallatlas CSV exports, maps them to existing accident/severity categories, and aggregates them into one view.
- **Local WASM runtime**: Ships `sql-wasm.wasm` with the build, avoiding runtime CDN dependencies.
- **Responsive design**: Filter panel collapses on mobile, expands on desktop.

## Live Demo

The application is deployed on GitHub Pages. You can interact with the live map demo here:

[Live Demo](https://maxliesegang.github.io/ppka-bike-accident-map)

## Installation

Ensure you have the following prerequisites installed:

- **Node.js** (≥ 22.x)
- **npm** (≥ 10.x)

### 1. Clone the Repository

```bash
git clone https://github.com/maxliesegang/ppka-bike-accident-map.git
cd ppka-bike-accident-map
```

### 2. Install Dependencies

Run the following command to install required dependencies:

```bash
npm ci --omit=optional
```

Note: `.npmrc` already configures `omit=optional`, so `npm ci` behaves the same.
The project uses a Rollup WASM override so Vite works with optional dependencies omitted.

### 3. Run the Development Server

Start the project in development mode:

```bash
npm run start
```

The app will be accessible at: [http://localhost:4000/](http://localhost:4000/).

### 4. Build for Production

To create a production-ready build:

```bash
npm run build
```

The bundled files will be available in the `dist` directory.
This includes Vite-generated JavaScript/CSS assets, `index.html`, `sql-wasm.wasm`, the GeoPackage data file, the PPKA CSV from `data/ppka`, and optional Unfallatlas CSV files from `data/unfallatlas`.

To serve the production build locally:

```bash
npm run preview
```

### 5. Optional: Add Filtered Unfallatlas CSV Data

1. Download yearly CSV zip files from [Unfallatlas OpenData](https://unfallatlas.statistikportal.de/opendata/).
2. Extract each zip file locally.
3. Place extracted CSV files in `data/unfallatlas-raw`.
4. Run:

```bash
npm run unfallatlas:extract:bw
```

5. The script writes filtered yearly CSV files (ULAND `08`, Baden-Wuerttemberg) to `data/unfallatlas`.
   It stages output first and only replaces target CSV files after a successful run.
6. Any `.csv` filename containing a 4-digit year is auto-discovered at build time and appears in the Unfallatlas year selector.

To extract another state, run:

```bash
npm run unfallatlas:extract -- --bundesland <name-or-code>
```

## Project Structure

- **`src/`**: Source folder containing TypeScript, CSS, and utility files.
  - **`index.ts`**: Entry point — initializes map, loads data, adds filter control.
  - **`constants.ts`**: Map config (view, zoom, tiles), GeoPackage and PPKA CSV paths, filter entry definitions.
  - **`styles.css`**: Styles for the map, filter panel, and popups.
  - **`data/`**: Data types and style config.
    - `accident-properties.ts` — TypeScript interfaces for accident feature properties, participant counts, and casualty totals.
    - `csv.ts` — shared tokenizer and value parsers for the semicolon-separated CSV exports.
    - `accident-styles.ts` — `AccidentType`/`SeverityType` unions, color and radius lookups.
  - **`features/`**: Accident classification logic.
    - `accident-classification.ts` — determines accident type, severity, and marker style from properties.
  - **`map/`**: Map initialization, data loading, layer management, and UI controls.
    - `map.ts` — Leaflet map creation with Canvas renderer, tile layer setup.
    - `geopackage-loader.ts` — fetches and opens GeoPackage files.
    - `geopackage-layer.ts` — iterates GeoPackage features and creates markers.
    - `ppka-loader.ts` — parses the unified PPKA CSV, skipping the pre-2024 rows the GeoPackage already covers.
    - `local-accident-layer.ts` — loads the GeoPackage and the PPKA CSV into one registration batch for the local data source.
    - `unfallatlas-loader.ts` — parses yearly Unfallatlas CSV files and maps rows to existing accident/severity categories.
    - `unfallatlas-layer.ts` — lazy-loads and toggles the Unfallatlas marker layer.
    - `data-source-store.ts` — toggles between local and Unfallatlas data sources.
    - `accident-marker-factory.ts` — creates `CircleMarker` from a GeoJSON feature and registers it.
    - `accident-marker-store.ts` — manages marker visibility based on selected accident/severity filters.
    - `panel-controls.ts` — attaches custom Leaflet controls for React-rendered panels.
    - `popup-renderer.tsx` — renders React popup content for marker clicks.
  - **`ui/`**: React controls, panels, and popup components used inside Leaflet controls/popups.
- **`index.html`**: Vite HTML entry point.
- **`vite.config.mjs`**: Vite config for bundling/dev server, local data assets (`data/ppka`, `data/unfallatlas`), Node-module shims for the GeoPackage browser bundle, and `unfallatlas/manifest.json` generation.
- **`scripts/extract-unfallatlas-bundesland.mjs`**: Streams raw Unfallatlas CSVs and writes filtered files for a selected `ULAND` code.
- **`unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg`**: Geospatial accident data 2018-2023 (must be in root).
- **`data/ppka/verkehrsunfaelle_einheitlich_ka_fuss_rad.csv`**: Unified PPKA response covering 2018-2025. Its 2018-2023 rows restate the GeoPackage records (linked via `Original_Unfall_ID`, without coordinates) and are skipped at load time; only the geocoded newer years become markers.

## Key Technologies Used

- **TypeScript**: Ensures type safety and structured code.
- **Leaflet**: Lightweight JavaScript library for interactive maps.
- **GeoPackage**: Used for handling local geospatial data files efficiently.
- **Vite**: Bundles the project for development and production.
- **ESLint & Prettier**: Enforces coding standards and automatic formatting.

## How the Application Works

1. **Map initialization** — Leaflet map with `preferCanvas: true` for Canvas rendering. Configured in `constants.ts`.
2. **Data loading** — The local source loads two files in one batch: the GeoPackage (iterated with `for...of`) and the PPKA CSV. Unfallatlas years are discovered from generated `unfallatlas/manifest.json`; selected years are loaded lazily from local CSV files.
3. **Normalization** — PPKA CSV and Unfallatlas rows are transformed into existing `AccidentType` and `SeverityType` categories so all sources use one styling/filter model. The PPKA response reports casualties per accident rather than per mode of travel, so its severity comes from the accident totals; fatal accidents share the `LOCAL_SEVERE_INJURY` bucket and report their actual `Unfallkategorie` in the popup.
4. **Marker creation** — Every normalized record becomes an `L.circleMarker` styled by accident type (color) and severity (radius), then registered in the filter system.
5. **Filter control** — Custom collapsible panel in bottom-left. Users can switch data source, choose available Unfallatlas years, and toggle accident/severity filters independently.

## Development Tools

- **Linting**: Run `npm run lint` to lint the codebase, or `npm run lint:fix` to auto-fix supported issues.
- **Type checking**: Run `npm run typecheck` to run TypeScript type checks without emitting files.
- **Prettier**: Run `npm run format` to format the codebase.
- **Security audit**: Run `npm audit` to verify dependency vulnerability status.
