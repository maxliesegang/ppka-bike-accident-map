import { GeoPackage } from '@ngageoint/geopackage';
import * as L from 'leaflet';
import { GEOPACKAGE_FILE_NAME, GEOPACKAGE_LAYER_NAME } from '../constants';
import { fetchAndOpenGeoPackage } from './geopackage-loader';
import { createAndRegisterMarker } from './marker-factory';
import {
  beginMarkerRegistrationBatch,
  clearRegisteredMarkers,
  endMarkerRegistrationBatch,
  initializeMarkerLayer,
} from './marker-store';

export async function loadGeoPackageMarkers(map: L.Map): Promise<void> {
  try {
    initializeMarkerLayer(map);
    clearRegisteredMarkers('local');

    const geoPackage = await fetchAndOpenGeoPackage(GEOPACKAGE_FILE_NAME);
    const { addedCount, skippedCount } = registerGeoPackageMarkers(geoPackage);
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

function registerGeoPackageMarkers(geoPackage: GeoPackage): {
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
