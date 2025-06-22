import { GeoPackage } from '@ngageoint/geopackage';
import * as L from 'leaflet';
import { GEOPACKAGE_FILE_NAME, GEOPACKAGE_LAYER_NAME } from '../constants';
import { handleError } from '../utils/error-utils';
import { fetchAndOpenGeoPackage } from './geopackage-loader';
import { createAndAddGeoJsonLayer } from './layer-creator';
import { accidentLayerGroups, severityLayerGroups } from './layer-groups';

export async function loadGeoPackageFile(map: L.Map): Promise<void> {
  try {
    const geoPackage = await fetchAndOpenGeoPackage(GEOPACKAGE_FILE_NAME);
    addGeoPackageLayersToMap(map, geoPackage);
    Object.values(accidentLayerGroups).forEach((group) => group.addTo(map));
    Object.values(severityLayerGroups).forEach((group) => group.addTo(map));
  } catch (error: unknown) {
    handleError('Error loading GeoPackage file:', error);
  }
}

function addGeoPackageLayersToMap(
  map: L.Map,
  geoPackage: GeoPackage,
): Array<L.GeoJSON> {
  const geoJsonFeatures = geoPackage.iterateGeoJSONFeatures(
    GEOPACKAGE_LAYER_NAME,
  );
  return Array.from(geoJsonFeatures).map((geoJsonFeature) =>
    createAndAddGeoJsonLayer(geoJsonFeature, map),
  );
}
