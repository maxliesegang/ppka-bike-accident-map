import { setSqljsWasmLocateFile } from '@ngageoint/geopackage';
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
// MapLibre resolves its worker relative to `import.meta.url`, which breaks in a
// Vite build (the worker file is not emitted next to the bundle). Importing it
// through Vite's worker pipeline bundles it — including its shared chunk — and
// yields a same-origin URL.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  GEOPACKAGE_WASM_FILE,
  MAP_INITIAL_CENTER,
  MAP_MAX_ZOOM_LEVEL,
  MAP_STYLE_ATTRIBUTION,
  MAP_STYLE_URL,
  MAP_ZOOM_LEVEL,
} from '../constants';

export function createMap(): MapLibreMap {
  setSqljsWasmLocateFile(() => GEOPACKAGE_WASM_FILE);
  setWorkerUrl(maplibreWorkerUrl);
  return new MapLibreMap({
    container: 'map',
    style: MAP_STYLE_URL,
    center: MAP_INITIAL_CENTER,
    zoom: MAP_ZOOM_LEVEL,
    maxZoom: MAP_MAX_ZOOM_LEVEL,
    attributionControl: {
      compact: false,
      customAttribution: MAP_STYLE_ATTRIBUTION,
    },
  });
}
