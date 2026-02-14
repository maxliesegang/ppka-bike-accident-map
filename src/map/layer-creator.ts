import * as L from 'leaflet';
import { AccidentProperties } from '../data/accident-properties';
import { AccidentType, SeverityType } from '../data/accident-styles';
import {
  getAccidentType,
  getSeverityType,
  getStyleFromTypes,
} from '../features/accident-feature-utils';
import { generatePopupContent } from './popup-utils';
import { type DataSource } from './data-source-types';
import { registerMarker } from './layer-filter-utils';

export interface CategorizedMarkerData {
  latitude: number;
  longitude: number;
  accidentType: AccidentType;
  severityType: SeverityType;
  popupProperties: PopupPropertySource;
}

export type PopupPropertySource =
  | Record<string, unknown>
  | (() => Record<string, unknown>);

const POPUP_PROPERTIES_SYMBOL = Symbol('popupProperties');

type MarkerWithPopupProperties = L.CircleMarker & {
  [POPUP_PROPERTIES_SYMBOL]: PopupPropertySource;
};

export function createAndRegisterMarker(
  feature: GeoJSON.Feature,
  source: DataSource = 'local',
): L.CircleMarker | null {
  if (!hasValidPointGeometry(feature.geometry)) {
    return null;
  }

  const [longitude, latitude] = feature.geometry.coordinates;
  if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
    return null;
  }

  const properties = (feature.properties ?? {}) as AccidentProperties;

  return createAndRegisterCategorizedMarker(
    {
      latitude,
      longitude,
      popupProperties: feature.properties ?? {},
      accidentType: getAccidentType(properties),
      severityType: getSeverityType(properties),
    },
    source,
  );
}

export function createAndRegisterCategorizedMarker(
  markerData: CategorizedMarkerData,
  source: DataSource,
): L.CircleMarker {
  const marker = L.circleMarker(
    [markerData.latitude, markerData.longitude],
    getStyleFromTypes(markerData.accidentType, markerData.severityType),
  ) as MarkerWithPopupProperties;
  marker[POPUP_PROPERTIES_SYMBOL] = markerData.popupProperties;
  marker.bindPopup(renderPopupContent);

  registerMarker(
    marker,
    markerData.accidentType,
    markerData.severityType,
    source,
  );

  return marker;
}

function hasValidPointGeometry(
  geometry: GeoJSON.Geometry | null,
): geometry is GeoJSON.Point {
  return geometry?.type === 'Point' && geometry.coordinates.length >= 2;
}

function isFiniteCoordinate(value: number): boolean {
  return Number.isFinite(value);
}

function renderPopupContent(layer: L.Layer): string {
  const marker = layer as MarkerWithPopupProperties;
  const popupSource = marker[POPUP_PROPERTIES_SYMBOL];
  const popupProperties =
    typeof popupSource === 'function' ? popupSource() : popupSource;

  return generatePopupContent(popupProperties);
}
