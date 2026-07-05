import { GeoPackage } from '@ngageoint/geopackage';
import * as L from 'leaflet';
import { GEOPACKAGE_FILE_NAME, GEOPACKAGE_LAYER_NAME } from '../constants';
import { fetchAndOpenGeoPackage } from './geopackage-loader';
import { createAndRegisterGeoPackageAccidentMarker } from './marker-factory';
import {
  beginAccidentMarkerBatch,
  clearAccidentMarkersForSource,
  endAccidentMarkerBatch,
  attachLocalAccidentMarkers,
} from './marker-store';

export async function loadGeoPackageMarkers(map: L.Map): Promise<void> {
  try {
    attachLocalAccidentMarkers(map);
    clearAccidentMarkersForSource('local');

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

  beginAccidentMarkerBatch('local');
  try {
    for (const feature of geoPackage.iterateGeoJSONFeatures(
      GEOPACKAGE_LAYER_NAME,
    )) {
      if (createAndRegisterGeoPackageAccidentMarker(feature) === null) {
        skippedCount += 1;
        continue;
      }

      addedCount += 1;
    }
  } finally {
    endAccidentMarkerBatch('local');
  }

  return { addedCount, skippedCount };
}
