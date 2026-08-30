import * as L from 'leaflet';
import type { AccidentProperties } from '../data/accident-properties';
import type { AccidentType, SeverityType } from '../data/accident-styles';
import {
  getAccidentType,
  getMarkerStyle,
  getSeverityType,
} from '../features/accident-classification';
import { registerAccidentMarker } from './accident-marker-store';
import { renderAccidentPopup } from './accident-popup-renderer';
import type { DataSourceId } from './data-source-types';
import { ACCIDENT_POPUP_OPTIONS } from './popup-options';

export interface AccidentMarkerData {
  latitude: number;
  longitude: number;
  accidentType: AccidentType;
  severityType: SeverityType;
  /** Accident year used by the year filter; `null` when no date is available. */
  year: number | null;
  popupProperties: AccidentPopupPropertySource;
}

export type AccidentPopupPropertySource =
  | Record<string, unknown>
  | (() => Record<string, unknown>);

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

  const rawProperties: Record<string, unknown> = feature.properties ?? {};
  const properties = rawProperties as unknown as AccidentProperties;
  const year = parseYearFromKoUdatum(rawProperties.KO_UDATUM);

  return createAndRegisterAccidentMarker(
    {
      latitude,
      longitude,
      // Surface the derived year so the popup's "Zeitpunkt" line works for the
      // raw GeoPackage records too, alongside the existing detail fields.
      popupProperties:
        year === null ? rawProperties : { ...rawProperties, Jahr: year },
      accidentType: getAccidentType(properties),
      severityType: getSeverityType(properties),
      year,
    },
    dataSourceId,
  );
}

/**
 * The GeoPackage stores the accident date as a `YYYYMMDD` integer (e.g.
 * 20180716) in `KO_UDATUM`; the leading four digits are the year.
 */
function parseYearFromKoUdatum(value: unknown): number | null {
  const digits =
    typeof value === 'number'
      ? String(Math.trunc(value))
      : typeof value === 'string'
        ? value.trim()
        : '';
  if (digits.length < 4) {
    return null;
  }
  const year = Number.parseInt(digits.slice(0, 4), 10);
  return Number.isInteger(year) ? year : null;
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
    accidentMarkerData.year,
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
