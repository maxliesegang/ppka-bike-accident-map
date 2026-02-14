import * as L from 'leaflet';
import {
  MAP_INITIAL_VIEW,
  MAP_ZOOM_LEVEL,
  TILE_LAYER_URL,
  TILE_LAYER_ATTRIBUTION,
  GEOPACKAGE_WASM_FILE,
} from '../constants';
import { setSqljsWasmLocateFile } from '@ngageoint/geopackage';

export function initializeMap(): L.Map {
  setSqljsWasmLocateFile(() => GEOPACKAGE_WASM_FILE);
  return L.map('map', { preferCanvas: true }).setView(
    MAP_INITIAL_VIEW,
    MAP_ZOOM_LEVEL,
  );
}

export function addTileLayerToMap(map: L.Map): void {
  L.tileLayer(TILE_LAYER_URL, {
    maxZoom: 19,
    attribution: TILE_LAYER_ATTRIBUTION,
  }).addTo(map);
}
