import { setSqljsWasmLocateFile } from '@ngageoint/geopackage';
import * as L from 'leaflet';
import {
  GEOPACKAGE_WASM_FILE,
  MAP_INITIAL_VIEW,
  MAP_ZOOM_LEVEL,
  TILE_LAYER_ATTRIBUTION,
  TILE_LAYER_URL,
} from '../constants';

export function createMap(): L.Map {
  setSqljsWasmLocateFile(() => GEOPACKAGE_WASM_FILE);
  return L.map('map', { preferCanvas: true }).setView(
    MAP_INITIAL_VIEW,
    MAP_ZOOM_LEVEL,
  );
}

export function addTileLayer(map: L.Map): void {
  L.tileLayer(TILE_LAYER_URL, {
    maxZoom: 19,
    attribution: TILE_LAYER_ATTRIBUTION,
  }).addTo(map);
}
