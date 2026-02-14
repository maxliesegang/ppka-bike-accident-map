import { GeoPackage } from '@ngageoint/geopackage';
import * as L from 'leaflet';
import { GEOPACKAGE_FILE_NAME, GEOPACKAGE_LAYER_NAME } from '../constants';
import { fetchAndOpenGeoPackage } from './geopackage-loader';
import { createAndRegisterMarker } from './layer-creator';
import {
  clearRegisteredMarkers,
  initializeVisibleLayerGroup,
} from './layer-filter-utils';

export async function loadGeoPackageFile(map: L.Map): Promise<void> {
  try {
    initializeVisibleLayerGroup(map);
    clearRegisteredMarkers();

    const geoPackage = await fetchAndOpenGeoPackage(GEOPACKAGE_FILE_NAME);
    addGeoPackageLayersToMap(geoPackage);
  } catch (error: unknown) {
    console.error('Error loading GeoPackage file:', error);
  }
}

function addGeoPackageLayersToMap(geoPackage: GeoPackage): void {
  for (const feature of geoPackage.iterateGeoJSONFeatures(
    GEOPACKAGE_LAYER_NAME,
  )) {
    createAndRegisterMarker(feature);
  }
}
