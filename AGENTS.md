# AGENTS.md

Guidance for contributors and coding agents working in this repository.

## Scope

- TypeScript + Webpack + Leaflet browser app.
- Entry point: `src/index.ts`.
- GeoPackage loading: `src/map/geopackage-loader.ts` and `src/map/geopackage-layer-utils.ts`.
- Style/type definitions: `src/data/accident-styles.ts` — single source of truth for `AccidentType`, `SeverityType`, colors, and radii.
- Filter UI: `src/map/layer-control-utils.ts` — custom Leaflet control (not `L.control.layers`).
- Filter state: `src/map/layer-filter-utils.ts` — manages marker visibility via `Set`-based selection tracking.

## Architecture Notes

- Map uses `preferCanvas: true` for performance — all markers render on a single Canvas element.
- Markers are `L.circleMarker` instances created directly from GeoJSON coordinates (not via `L.geoJSON`).
- GeoPackage features are iterated with `for...of` — never materialized into an array.
- `tsconfig.json` has `"strict": true` — all code must pass strict type checking.

## Environment

- Node.js `>=22`, npm `>=10` (see `package.json` engines).
- Optional dependencies omitted via `.npmrc` (`omit=optional`).

## Required Commands

Run before opening a PR:

```bash
npm run lint
npm run typecheck
npm run build
```

## Dependency and Build Rules

- Prefer latest stable dependencies, but:
  - Do not upgrade to ESLint 10 until `typescript-eslint` supports it.
- Keep `node-polyfill-webpack-plugin` removed unless strongly justified.
- Keep `webpack.config.js` `output.clean = true`.
- Keep local GeoPackage WASM loading intact:
  - `src/constants.ts` must expose `GEOPACKAGE_WASM_FILE = 'sql-wasm.wasm'`.
  - `webpack.config.js` must copy `node_modules/@ngageoint/geopackage/dist/sql-wasm.wasm` into `dist`.
  - No remote CDN for WASM.

## Security Expectations

- Maintain a clean `npm audit` whenever possible.
- Keep the `lodash` override in `package.json` unless upstream updates make it unnecessary.
- Avoid adding heavy transitive dependencies without justification.

## Change Discipline

- Keep changes minimal and targeted.
- Preserve existing app behavior unless the task explicitly requests changes.
- Update `README.md` when commands, runtime assumptions, or build/deploy behavior change.
