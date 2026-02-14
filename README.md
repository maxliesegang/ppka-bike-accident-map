# PPKA Bike Accident Map

This repository showcases an interactive map application built using **TypeScript**, **Leaflet**, and **GeoPackage**, visualizing bike and pedestrian traffic accident data for Karlsruhe and aggregated Unfallatlas OpenData for selectable year ranges.

## Features

- **Canvas-rendered map**: Uses Leaflet's Canvas renderer with direct `CircleMarker` creation for fast rendering of thousands of accident points.
- **Unified filter control**: Collapsible panel (bottom-left) to toggle data source, available Unfallatlas years, accident types, and severity levels.
- **GeoPackage support**: Loads local GeoPackage data (`unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg`) for efficient geospatial operations.
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
This includes `bundle.js`, `main.css`, `index.html`, `sql-wasm.wasm`, the GeoPackage data file, and optional Unfallatlas CSV files from `data/unfallatlas`.

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
  - **`constants.ts`**: Map config (view, zoom, tiles), GeoPackage paths, filter entry definitions.
  - **`styles.css`**: Styles for the map, filter panel, and popups.
  - **`data/`**: Data types and style config.
    - `accident-properties.ts` — TypeScript interface for accident feature properties.
    - `accident-styles.ts` — `AccidentType`/`SeverityType` unions, color and radius lookups.
  - **`features/`**: Accident classification logic.
    - `accident-feature-utils.ts` — determines accident type, severity, and marker style from properties.
  - **`map/`**: Map initialization, data loading, layer management, and UI controls.
    - `map-utils.ts` — Leaflet map creation with Canvas renderer, tile layer setup.
    - `geopackage-loader.ts` — fetches and opens GeoPackage files.
    - `geopackage-layer-utils.ts` — iterates GeoPackage features and creates markers.
    - `unfallatlas-loader.ts` — parses yearly Unfallatlas CSV files and maps rows to existing accident/severity categories.
    - `unfallatlas-layer.ts` — lazy-loads and toggles the Unfallatlas marker layer.
    - `data-source-utils.ts` — toggles between local and Unfallatlas data sources.
    - `layer-creator.ts` — creates `CircleMarker` from a GeoJSON feature and registers it.
    - `layer-filter-utils.ts` — manages marker visibility based on selected accident/severity filters.
    - `layer-control-utils.ts` — custom Leaflet control with grouped, collapsible filter panel.
    - `popup-utils.ts` — generates HTML popup content for marker click.
- **`webpack.config.js`**: Webpack config for bundling/dev server and generating `unfallatlas/manifest.json` from `data/unfallatlas`.
- **`scripts/extract-unfallatlas-bundesland.mjs`**: Streams raw Unfallatlas CSVs and writes filtered files for a selected `ULAND` code.
- **`unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg`**: Geospatial accident data (must be in root).

## Key Technologies Used

- **TypeScript**: Ensures type safety and structured code.
- **Leaflet**: Lightweight JavaScript library for interactive maps.
- **GeoPackage**: Used for handling local geospatial data files efficiently.
- **Webpack**: Bundles the project for development and production.
- **ESLint & Prettier**: Enforces coding standards and automatic formatting.

## How the Application Works

1. **Map initialization** — Leaflet map with `preferCanvas: true` for Canvas rendering. Configured in `constants.ts`.
2. **Data loading** — Local GeoPackage data is fetched and iterated with `for...of`. Unfallatlas years are discovered from generated `unfallatlas/manifest.json`; selected years are loaded lazily from local CSV files.
3. **Normalization** — Unfallatlas rows are transformed into existing `AccidentType` and `SeverityType` categories so both sources use one styling/filter model.
4. **Marker creation** — Every normalized record becomes an `L.circleMarker` styled by accident type (color) and severity (radius), then registered in the filter system.
5. **Filter control** — Custom collapsible panel in bottom-left. Users can switch data source, choose available Unfallatlas years, and toggle accident/severity filters independently.

## Development Tools

- **Linting**: Run `npm run lint` to lint the codebase, or `npm run lint:fix` to auto-fix supported issues.
- **Type checking**: Run `npm run typecheck` to run TypeScript type checks without emitting files.
- **Prettier**: Run `npm run format` to format the codebase.
- **Security audit**: Run `npm audit` to verify dependency vulnerability status.
