# AGENTS.md

Guidance for contributors and coding agents working in this repository.

## Scope

- TypeScript + Vite + Leaflet browser app.
- Entry point: `src/index.ts`.
- GeoPackage loading: `src/map/geopackage-loader.ts` and `src/map/geopackage-layer.ts`.
- Style/type definitions: `src/data/accident-styles.ts` — single source of truth for `AccidentType`, `SeverityType`, colors, and radii.
- Filter UI: `src/map/panel-controls.ts` and `src/ui/` — custom Leaflet controls with React-rendered panels (not `L.control.layers`).
- Filter state: `src/map/accident-marker-store.ts` — manages marker visibility via `Set`-based selection tracking.

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
  - Keep Vite on a version that works with `.npmrc` `omit=optional`; Vite 7 uses the `rollup` override to `@rollup/wasm-node`, while Vite 8's native Rolldown binding currently conflicts with that install policy.
- Keep browser Node.js polyfills absent unless strongly justified.
- Keep local GeoPackage WASM loading intact:
  - `src/constants.ts` must expose `GEOPACKAGE_WASM_FILE = 'sql-wasm.wasm'`.
  - `vite.config.mjs` must copy `node_modules/@ngageoint/geopackage/dist/sql-wasm.wasm` into `dist`.
  - `vite.config.mjs` must generate and serve `unfallatlas/manifest.json`.
  - No remote CDN for WASM.

## Security Expectations

- Maintain a clean `npm audit` whenever possible.
- Keep the `lodash` override in `package.json` unless upstream updates make it unnecessary.
- Avoid adding heavy transitive dependencies without justification.

## Change Discipline

- Keep changes minimal and targeted.
- Preserve existing app behavior unless the task explicitly requests changes.
- Update `README.md` when commands, runtime assumptions, or build/deploy behavior change.
