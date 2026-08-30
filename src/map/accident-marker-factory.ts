import type { AccidentProperties } from '../data/accident-properties';
import type { AccidentType, SeverityType } from '../data/accident-styles';
import { getAccidentColor, getSeverityRadius } from '../data/accident-styles';
import {
  getAccidentType,
  getSeverityType,
} from '../features/accident-classification';
import type { AccidentPopupPropertySource } from './accident-marker-source-state';
import { registerAccidentMarker } from './accident-marker-store';
import type { DataSourceId } from './data-source-types';

export interface AccidentMarkerData {
  latitude: number;
  longitude: number;
  accidentType: AccidentType;
  severityType: SeverityType;
  /** Accident year used by the year filter; `null` when no date is available. */
  year: number | null;
  popupProperties: AccidentPopupPropertySource;
}

export function createAndRegisterGeoPackageAccidentMarker(
  feature: GeoJSON.Feature,
  dataSourceId: DataSourceId = 'local',
): GeoJSON.Feature<GeoJSON.Point> | null {
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

/**
 * Turns the classification into a GeoJSON point whose properties carry
 * everything the shared circle layer and filter expressions need: `color` and
 * `radius` for the paint, `accidentType`/`severityType`/`year` for the
 * visibility filter. The popup property source is kept out of the feature —
 * it lives in the source's popup registry, keyed by the `popupId` assigned at
 * registration.
 */
export function createAndRegisterAccidentMarker(
  accidentMarkerData: AccidentMarkerData,
  dataSourceId: DataSourceId,
): GeoJSON.Feature<GeoJSON.Point> {
  const feature: GeoJSON.Feature<GeoJSON.Point> = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [accidentMarkerData.longitude, accidentMarkerData.latitude],
    },
    properties: {
      accidentType: accidentMarkerData.accidentType,
      severityType: accidentMarkerData.severityType,
      color: getAccidentColor(accidentMarkerData.accidentType),
      radius: getSeverityRadius(accidentMarkerData.severityType),
      ...(accidentMarkerData.year === null
        ? {}
        : { year: accidentMarkerData.year }),
    },
  };

  registerAccidentMarker(
    feature,
    accidentMarkerData.accidentType,
    accidentMarkerData.severityType,
    accidentMarkerData.year,
    accidentMarkerData.popupProperties,
    dataSourceId,
  );

  return feature;
}

function hasValidPointGeometry(
  geometry: GeoJSON.Geometry | null,
): geometry is GeoJSON.Point {
  return geometry?.type === 'Point' && geometry.coordinates.length >= 2;
}

function isFiniteCoordinate(value: number): boolean {
  return Number.isFinite(value);
}
