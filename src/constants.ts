import { LatLngExpression } from 'leaflet';
import { AccidentType, SeverityType } from './data/accident-styles';

// Map configuration
export const MAP_INITIAL_VIEW: LatLngExpression = [49, 8.4];
export const MAP_ZOOM_LEVEL = 12;
export const TILE_LAYER_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Unfallatlas CSV configuration
// Used as fallback when manifest discovery fails.
export const UNFALLATLAS_SELECTED_YEARS = [2022, 2023, 2024] as const;
export const UNFALLATLAS_MANIFEST_FILE = 'unfallatlas/manifest.json';
export const UNFALLATLAS_CSV_PATH_TEMPLATE = 'unfallatlas/opendata{year}.csv';
export const UNFALLATLAS_CSV_PATH_TEMPLATES = [
  UNFALLATLAS_CSV_PATH_TEMPLATE,
  'unfallatlas/Unfallorte{year}.csv',
  'unfallatlas/unfallorte{year}.csv',
  'unfallatlas/Unfallorte_{year}.csv',
  'unfallatlas/unfallorte_{year}.csv',
] as const;
export const UNFALLATLAS_SOURCE_NAME =
  'Unfallatlas (Datenlizenz Deutschland – Namensnennung – Version 2.0)';

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

export const LOCAL_SEVERITY_LEGENDS: {
  key: SeverityType;
  description: string;
}[] = [
  { key: 'LOCAL_SEVERE_INJURY', description: 'Schwerverletzungen' },
  { key: 'LOCAL_INJURY', description: 'Verletzungen' },
  { key: 'LOCAL_NO_INJURY', description: 'Keine Verletzungen' },
];

export const UNFALLATLAS_SEVERITY_LEGENDS: {
  key: SeverityType;
  description: string;
}[] = [
  { key: 'UNFALLATLAS_FATALITY', description: 'Kategorie 1: Mit Getöteten' },
  {
    key: 'UNFALLATLAS_SEVERE_INJURY',
    description: 'Kategorie 2: Mit Schwerverletzten',
  },
  {
    key: 'UNFALLATLAS_LIGHT_INJURY',
    description: 'Kategorie 3: Mit Leichtverletzten',
  },
];

export const SEVERITY_LEGENDS: { key: SeverityType; description: string }[] = [
  ...LOCAL_SEVERITY_LEGENDS,
  ...UNFALLATLAS_SEVERITY_LEGENDS,
];
