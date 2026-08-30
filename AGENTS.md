# AGENTS.md

Guidance for contributors and coding agents working in this repository.

## Scope

- TypeScript + Vite + Leaflet browser app.
- Entry point: `src/index.ts`.
- GeoPackage loading: `src/map/geopackage-loader.ts` and `src/map/geopackage-layer.ts`.
- Local (FragDenStaat) source: `src/map/local-accident-layer.ts` loads the GeoPackage (2018-2023) and the PPKA CSV (`src/map/ppka-loader.ts`, geocoded years only) into a single registration batch.
- CSV parsing helpers shared by the PPKA and Unfallatlas loaders: `src/data/csv.ts`.
- Linting and formatting: Biome (`biome.json`) — single tool replacing ESLint and Prettier.
- Style/type definitions: `src/data/accident-styles.ts` — single source of truth for `AccidentType`, `SeverityType`, colors, and radii.
- Filter UI: `src/map/panel-controls.ts` and `src/ui/` — custom Leaflet controls with React-rendered panels (not `L.control.layers`).
- Filter state: `src/map/accident-marker-store.ts` — manages marker visibility via `Set`-based selection tracking.

## Architecture Notes

- Map uses `preferCanvas: true` for performance — all markers render on a single Canvas element.
- Markers are `L.circleMarker` instances created directly from GeoJSON coordinates (not via `L.geoJSON`).
- GeoPackage features are iterated with `for...of` — never materialized into an array.
- The PPKA CSV is streamed row by row for the same reason; its pre-2024 rows duplicate GeoPackage records (they carry the GeoPackage `UN_KEY` in `Original_Unfall_ID`) and must stay skipped.
- `tsconfig.json` has `"strict": true` — all code must pass strict type checking.

## Environment

- Node.js `>=22`, npm `>=10` (see `package.json` engines).
- Optional dependencies must be installed — Biome and esbuild deliver their platform binaries as optional packages. Do not reintroduce `omit=optional` (removed when switching to Biome).

## Required Commands

Run before opening a PR:

```bash
npm run lint
npm run typecheck
npm run build
```

## Dependency and Build Rules

- Prefer latest stable dependencies, but:
- Keep linting and formatting on Biome; keep `npm run lint` clean.
  - Keep Vite on 7 with the `rollup` override to `@rollup/wasm-node` (no native Rollup binary needed); Vite 8's Rolldown toolchain is untested in this setup.
- Keep browser Node.js polyfills absent unless strongly justified.
- Keep local GeoPackage WASM loading intact:
  - `src/constants.ts` must expose `GEOPACKAGE_WASM_FILE = 'sql-wasm.wasm'`.
  - `vite.config.mjs` must copy `node_modules/@ngageoint/geopackage/dist/sql-wasm.wasm` into `dist`.
  - `vite.config.mjs` must generate and serve `unfallatlas/manifest.json`.
  - `vite.config.mjs` must serve and emit `data/ppka` under `ppka/`.
  - No remote CDN for WASM.

## Security Expectations

- Maintain a clean `npm audit` whenever possible.
- Keep the `lodash` override in `package.json` unless upstream updates make it unnecessary.
- Avoid adding heavy transitive dependencies without justification.

## Change Discipline

- Keep changes minimal and targeted.
- Preserve existing app behavior unless the task explicitly requests changes.
- Update `README.md` when commands, runtime assumptions, or build/deploy behavior change.
