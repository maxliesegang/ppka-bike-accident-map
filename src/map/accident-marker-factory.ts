import * as L from 'leaflet';
import { AccidentProperties } from '../data/accident-properties';
import { AccidentType, SeverityType } from '../data/accident-styles';
import {
  getAccidentType,
  getSeverityType,
  getMarkerStyle,
} from '../features/accident-classification';
import { renderAccidentPopup } from './accident-popup-renderer';
import { ACCIDENT_POPUP_OPTIONS } from './popup-options';
import { type DataSourceId } from './data-source-types';
import { registerAccidentMarker } from './accident-marker-store';

export interface AccidentMarkerData {
  latitude: number;
  longitude: number;
  accidentType: AccidentType;
  severityType: SeverityType;
  popupProperties: AccidentPopupPropertySource;
}

export type AccidentPopupPropertySource =
  Record<string, unknown> | (() => Record<string, unknown>);

const ACCIDENT_POPUP_PROPERTIES_SYMBOL = Symbol('popupProperties');

type AccidentMarkerWithPopupProperties = L.CircleMarker & {
  [ACCIDENT_POPUP_PROPERTIES_SYMBOL]: AccidentPopupPropertySource;
};

export function createAndRegisterGeoPackageAccidentMarker(
  feature: GeoJSON.Feature,
  dataSourceId: DataSourceId = 'local',
): L.CircleMarker | null {
  if (!hasValidPointGeometry(feature.geometry)) {
    return null;
  }

  const [longitude, latitude] = feature.geometry.coordinates;
  if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
    return null;
  }

  const properties = (feature.properties ?? {}) as AccidentProperties;

  return createAndRegisterAccidentMarker(
    {
      latitude,
      longitude,
      popupProperties: feature.properties ?? {},
      accidentType: getAccidentType(properties),
      severityType: getSeverityType(properties),
    },
    dataSourceId,
  );
}

export function createAndRegisterAccidentMarker(
  accidentMarkerData: AccidentMarkerData,
  dataSourceId: DataSourceId,
): L.CircleMarker {
  const marker = L.circleMarker(
    [accidentMarkerData.latitude, accidentMarkerData.longitude],
    getMarkerStyle(
      accidentMarkerData.accidentType,
      accidentMarkerData.severityType,
    ),
  ) as AccidentMarkerWithPopupProperties;
  marker[ACCIDENT_POPUP_PROPERTIES_SYMBOL] = accidentMarkerData.popupProperties;
  marker.bindPopup(renderPopupContent, ACCIDENT_POPUP_OPTIONS);

  registerAccidentMarker(
    marker,
    accidentMarkerData.accidentType,
    accidentMarkerData.severityType,
    dataSourceId,
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
  const marker = layer as AccidentMarkerWithPopupProperties;
  const popupSource = marker[ACCIDENT_POPUP_PROPERTIES_SYMBOL];
  const popupProperties =
    typeof popupSource === 'function' ? popupSource() : popupSource;

  return renderAccidentPopup(popupProperties);
}
