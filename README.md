# PPKA Bike Accident Map

This repository showcases an interactive map application built using **TypeScript**, **Leaflet**, and **GeoPackage**, visualizing bike and pedestrian traffic accident data for the Karlsruhe area from 2018 to 2023.

## Features

- **Canvas-rendered map**: Uses Leaflet's Canvas renderer with direct `CircleMarker` creation for fast rendering of thousands of accident points.
- **Filter control**: Collapsible panel (bottom-left) to toggle accident types and severity levels. Serves as both filter and legend with color/size indicators.
- **GeoPackage support**: Loads local GeoPackage data (`unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg`) for efficient geospatial operations.
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
This includes `bundle.js`, `main.css`, `index.html`, `sql-wasm.wasm`, and the GeoPackage data file.

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
    - `layer-creator.ts` — creates `CircleMarker` from a GeoJSON feature and registers it.
    - `layer-filter-utils.ts` — manages marker visibility based on selected accident/severity filters.
    - `layer-control-utils.ts` — custom Leaflet control with grouped, collapsible filter panel.
    - `popup-utils.ts` — generates HTML popup content for marker click.
- **`webpack.config.js`**: Webpack config for bundling and dev server.
- **`unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg`**: Geospatial accident data (must be in root).

## Key Technologies Used

- **TypeScript**: Ensures type safety and structured code.
- **Leaflet**: Lightweight JavaScript library for interactive maps.
- **GeoPackage**: Used for handling local geospatial data files efficiently.
- **Webpack**: Bundles the project for development and production.
- **ESLint & Prettier**: Enforces coding standards and automatic formatting.

## How the Application Works

1. **Map initialization** — Leaflet map with `preferCanvas: true` for Canvas rendering. Configured in `constants.ts`.
2. **Data loading** — GeoPackage file is fetched, opened via WASM, and its features are iterated with `for...of` (no full materialization).
3. **Marker creation** — Each feature becomes an `L.circleMarker` styled by accident type (color) and severity (radius), registered in the filter system.
4. **Filter control** — Custom collapsible panel in bottom-left. Checkboxes toggle accident types and severity levels independently. Acts as both filter and legend.

## Development Tools

- **Linting**: Run `npm run lint` to lint the codebase, or `npm run lint:fix` to auto-fix supported issues.
- **Type checking**: Run `npm run typecheck` to run TypeScript type checks without emitting files.
- **Prettier**: Run `npm run format` to format the codebase.
- **Security audit**: Run `npm audit` to verify dependency vulnerability status.
