import { LatLngExpression } from 'leaflet';
import { AccidentType, SeverityType } from './data/accident-styles';

// Map configuration
export const MAP_INITIAL_VIEW: LatLngExpression = [49, 8.4];
export const MAP_ZOOM_LEVEL = 12;
export const TILE_LAYER_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// GeoPackage configuration
export const GEOPACKAGE_FILE_NAME =
  'unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg';
export const GEOPACKAGE_LAYER_NAME = 'zugeschnitten';
export const GEOPACKAGE_WASM_FILE = 'sql-wasm.wasm';

// Filter control entries
export const ACCIDENT_LEGENDS: { type: AccidentType; description: string }[] = [
  { type: 'BIKE_AND_VEHICLE', description: 'Fahrrad- und Fahrzeugunfall' },
  {
    type: 'PEDESTRIAN_AND_VEHICLE',
    description: 'Fußgänger- und Fahrzeugunfall',
  },
  { type: 'BIKE_AND_PEDESTRIAN', description: 'Fahrrad- und Fußgängerunfall' },
  { type: 'SINGLE_BIKE', description: 'Unfall nur mit Fahrrädern' },
  { type: 'BIKE_ONLY', description: 'Fahrradunfall ohne Beteiligte' },
  { type: 'DEFAULT_FILL', description: 'Unbekannter Unfalltyp' },
];

export const SEVERITY_LEGENDS: { key: SeverityType; description: string }[] = [
  { key: 'SEVERE_INJURY', description: 'Schwerverletzungen' },
  { key: 'INJURY', description: 'Verletzungen' },
  { key: 'NO_INJURY', description: 'Keine Verletzungen' },
];
