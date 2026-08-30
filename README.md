# PPKA Bike Accident Map

Interactive MapLibre GL JS map of bicycle and pedestrian accidents in Karlsruhe.

[Live demo](https://maxliesegang.github.io/ppka-bike-accident-map)

## Features

- Three data views: FragDenStaat Karlsruhe data, Unfallatlas Karlsruhe, and the full Baden-Württemberg Unfallatlas.
- Filters for data source, year, accident type, and severity.
- Top-30 hotspot list based on the currently visible accidents. Selecting a hotspot zooms to its approximate area and shows its breakdown.
- GeoPackage and CSV data are loaded locally; the GeoPackage WASM runtime is bundled with the app.
- Responsive, collapsible controls with OpenStreetMap attribution.

Hotspot counts are not exposure-adjusted. Unfallatlas coordinates are approximate, and the Unfallatlas contains only accidents involving injury or death.

## Run locally

Requirements: Node.js 22+ and npm 10+.

```bash
npm ci
npm run start
```

Open [http://localhost:4000](http://localhost:4000). Create and serve a production build with:

```bash
npm run build
npm run preview
```

## Unfallatlas data

The repository includes prepared yearly CSV files in `data/unfallatlas`. To prepare more files:

1. Download and extract yearly CSV exports from [Unfallatlas OpenData](https://unfallatlas.statistikportal.de/opendata/) into `data/unfallatlas-raw`.
2. Filter them for Baden-Württemberg:

   ```bash
   npm run unfallatlas:extract:bw
   ```

The output is written to `data/unfallatlas`. The build discovers every CSV filename containing a four-digit year and generates the year selector automatically. To use another state, pass its name or code:

```bash
npm run unfallatlas:extract -- --bundesland <name-or-code>
```

## Data files

- `unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg` — Karlsruhe GeoPackage data for 2018–2023.
- `data/ppka/verkehrsunfaelle_einheitlich_ka_fuss_rad.csv` — unified FragDenStaat response. Its 2018–2023 rows duplicate the GeoPackage records and are skipped; geocoded newer rows are added to the local view.
- `data/unfallatlas/` — prepared Unfallatlas CSV files.

## Development

```bash
npm run lint
npm run typecheck
npm run build
```

Use `npm run format` to format the codebase with Biome.

The main entry point is `src/index.ts`. Data loading and map state live in `src/map/`, hotspot aggregation in `src/features/hotspots/`, and React controls in `src/ui/`. `vite.config.mjs` serves and bundles the local data files and GeoPackage WASM runtime.
