import type { LatLngExpression } from 'leaflet';
import type { AccidentType, SeverityType } from './data/accident-styles';

// Map configuration
export const MAP_INITIAL_VIEW: LatLngExpression = [49, 8.4];
export const MAP_ZOOM_LEVEL = 12;
export const TILE_LAYER_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Unfallatlas CSV configuration
// Used as fallback when manifest discovery fails.
export const UNFALLATLAS_FALLBACK_YEARS = [2023, 2024, 2025] as const;
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

// "Karlsruhe" scope for the Unfallatlas data: Regierungsbezirk Karlsruhe
// (UREGBEZ 2) restricted to the Stadtkreis (UKREIS 12) and Landkreis (UKREIS 15)
// Karlsruhe. The shipped CSVs already cover all of Baden-Württemberg; this filter
// is applied client-side to derive the Karlsruhe view.
export const UNFALLATLAS_KARLSRUHE_REGION = {
  uregbez: 2,
  ukreise: [12, 15],
} as const;

// PPKA CSV configuration
// A later FragDenStaat response from the Polizeipraesidium Karlsruhe, delivered
// as one unified CSV covering 2018-2025. Only its newer records carry
// coordinates; the 2018-2023 rows reference the GeoPackage records through
// `Original_Unfall_ID` and are skipped by the loader to avoid duplicates.
export const PPKA_CSV_PATH =
  'ppka/verkehrsunfaelle_einheitlich_ka_fuss_rad.csv';
export const PPKA_SOURCE_NAME =
  'Polizeipraesidium Karlsruhe (FragDenStaat-Anfrage)';

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
  { type: 'SINGLE_BIKE', description: 'Fahrradunfall ohne Beteiligte' },
  { type: 'BIKE_ONLY', description: 'Unfall nur mit Fahrrädern' },
  { type: 'UNKNOWN', description: 'Unbekannter Unfalltyp' },
];

export const LOCAL_SEVERITY_LEGENDS: {
  type: SeverityType;
  description: string;
}[] = [
  { type: 'LOCAL_SEVERE_INJURY', description: 'Schwerverletzungen' },
  { type: 'LOCAL_INJURY', description: 'Verletzungen' },
  { type: 'LOCAL_NO_INJURY', description: 'Keine Verletzungen' },
];

export const UNFALLATLAS_SEVERITY_LEGENDS: {
  type: SeverityType;
  description: string;
}[] = [
  { type: 'UNFALLATLAS_FATALITY', description: 'Kategorie 1: Mit Getöteten' },
  {
    type: 'UNFALLATLAS_SEVERE_INJURY',
    description: 'Kategorie 2: Mit Schwerverletzten',
  },
  {
    type: 'UNFALLATLAS_LIGHT_INJURY',
    description: 'Kategorie 3: Mit Leichtverletzten',
  },
];

export const SEVERITY_LEGENDS: { type: SeverityType; description: string }[] = [
  ...LOCAL_SEVERITY_LEGENDS,
  ...UNFALLATLAS_SEVERITY_LEGENDS,
];
