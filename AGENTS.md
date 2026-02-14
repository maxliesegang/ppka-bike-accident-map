# AGENTS.md

Guidance for contributors and coding agents working in this repository.

## Scope

- This project is a TypeScript + Webpack + Leaflet browser app.
- Primary entry point: `src/index.ts`.
- GeoPackage loading logic lives in `src/map/geopackage-loader.ts` and `src/map/geopackage-layer-utils.ts`.

## Environment

- Use Node.js `>=22` and npm `>=10` (see `package.json` engines).
- Optional dependencies are intentionally omitted by default via `.npmrc` (`omit=optional`).

## Required Commands

Run these before opening a PR:

```bash
npm run lint
npm run typecheck
npm run build
```

## Dependency and Build Rules

- Prefer latest stable dependencies, but keep compatibility constraints:
  - Do not upgrade to ESLint 10 until `typescript-eslint` supports it.
- Keep `node-polyfill-webpack-plugin` removed unless there is a strong, justified need.
- Keep `webpack.config.js` `output.clean = true` to avoid stale deployment artifacts.
- Keep local GeoPackage WASM loading intact:
  - `src/constants.ts` must expose `GEOPACKAGE_WASM_FILE = 'sql-wasm.wasm'`.
  - `webpack.config.js` must copy `node_modules/@ngageoint/geopackage/dist/sql-wasm.wasm` into `dist`.
  - Avoid remote CDN hardcoding for WASM.

## Security Expectations

- Maintain a clean `npm audit` whenever possible.
- Keep the `lodash` override in `package.json` unless upstream dependency updates make it unnecessary.
- Avoid adding new heavy transitive dependencies without justification.

## Change Discipline

- Keep changes minimal and targeted.
- Preserve existing app behavior and map output unless the task explicitly requests behavior changes.
- Update `README.md` when commands, runtime assumptions, or build/deploy behavior change.
