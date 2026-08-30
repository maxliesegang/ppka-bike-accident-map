import { setSqljsWasmLocateFile } from '@ngageoint/geopackage';
import {
  Map as MapLibreMap,
  type StyleSpecification,
  setWorkerUrl,
} from 'maplibre-gl';
// MapLibre resolves its worker relative to `import.meta.url`, which breaks in a
// Vite build (the worker file is not emitted next to the bundle). Importing it
// through Vite's worker pipeline bundles it — including its shared chunk — and
// yields a same-origin URL.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  GEOPACKAGE_WASM_FILE,
  MAP_INITIAL_CENTER,
  MAP_MAX_ZOOM_LEVEL,
  MAP_ZOOM_LEVEL,
  TILE_LAYER_ATTRIBUTION,
  TILE_LAYER_TILES,
} from '../constants';

/**
 * Inline style with the raster basemap instead of an external style JSON: the
 * tile URLs stay a build-time constant and no third-party style request is
 * needed.
 */
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: 'raster',
      tiles: [...TILE_LAYER_TILES],
      tileSize: 256,
      maxzoom: MAP_MAX_ZOOM_LEVEL,
      attribution: TILE_LAYER_ATTRIBUTION,
    },
  },
  layers: [
    {
      id: 'basemap',
      type: 'raster',
      source: 'basemap',
    },
  ],
};

export function createMap(): MapLibreMap {
  setSqljsWasmLocateFile(() => GEOPACKAGE_WASM_FILE);
  setWorkerUrl(maplibreWorkerUrl);
  return new MapLibreMap({
    container: 'map',
    style: MAP_STYLE,
    center: MAP_INITIAL_CENTER,
    zoom: MAP_ZOOM_LEVEL,
    maxZoom: MAP_MAX_ZOOM_LEVEL,
    attributionControl: { compact: false },
  });
}
