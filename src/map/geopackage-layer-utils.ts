import { GeoPackage } from '@ngageoint/geopackage';
import * as L from 'leaflet';
import { GEOPACKAGE_FILE_NAME, GEOPACKAGE_LAYER_NAME } from '../constants';
import { fetchAndOpenGeoPackage } from './geopackage-loader';
import { createAndRegisterMarker } from './layer-creator';
import {
  beginMarkerRegistrationBatch,
  clearRegisteredMarkers,
  endMarkerRegistrationBatch,
  initializeVisibleLayerGroup,
} from './layer-filter-utils';

export async function loadGeoPackageFile(map: L.Map): Promise<void> {
  try {
    initializeVisibleLayerGroup(map);
    clearRegisteredMarkers('local');

    const geoPackage = await fetchAndOpenGeoPackage(GEOPACKAGE_FILE_NAME);
    const { addedCount, skippedCount } = addGeoPackageLayersToMap(geoPackage);
    if (skippedCount > 0) {
      console.warn(
        `Skipped ${skippedCount} GeoPackage features without valid point geometry.`,
      );
    }
    console.info(`Loaded ${addedCount} GeoPackage markers.`);
  } catch (error: unknown) {
    console.error('Error loading GeoPackage file:', error);
  }
}

function addGeoPackageLayersToMap(geoPackage: GeoPackage): {
  addedCount: number;
  skippedCount: number;
} {
  let addedCount = 0;
  let skippedCount = 0;

  beginMarkerRegistrationBatch('local');
  try {
    for (const feature of geoPackage.iterateGeoJSONFeatures(
      GEOPACKAGE_LAYER_NAME,
    )) {
      if (createAndRegisterMarker(feature) === null) {
        skippedCount += 1;
        continue;
      }

      addedCount += 1;
    }
  } finally {
    endMarkerRegistrationBatch('local');
  }

  return { addedCount, skippedCount };
}
