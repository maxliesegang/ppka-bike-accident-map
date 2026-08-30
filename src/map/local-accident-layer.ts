import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  attachLocalAccidentMarkers,
  beginAccidentMarkerBatch,
  clearAccidentMarkersForSource,
  endAccidentMarkerBatch,
  setLocalYearFilterStatus,
} from './accident-marker-store';
import type { DataSourceId } from './data-source-types';
import { loadGeoPackageMarkers } from './geopackage-layer';
import { loadPpkaCsvMarkers } from './ppka-loader';

const LOCAL_SOURCE_ID: DataSourceId = 'local';

/**
 * Loads the FragDenStaat (local) source, which is shipped as two files: the
 * original GeoPackage covering 2018-2023 and the later unified PPKA CSV, whose
 * geocoded rows extend the series past it. Both feed one registration batch so
 * the map and the year filter see the combined set in a single update.
 */
export async function loadLocalAccidentMarkers(
  map: MapLibreMap,
): Promise<void> {
  setLocalYearFilterStatus('loading');
  attachLocalAccidentMarkers(map);
  clearAccidentMarkersForSource(LOCAL_SOURCE_ID);
  beginAccidentMarkerBatch(LOCAL_SOURCE_ID);
  let hasLoadedDataset = false;

  try {
    const [geoPackageResult, ppkaResult] = await Promise.allSettled([
      loadGeoPackageMarkers(LOCAL_SOURCE_ID),
      loadPpkaCsvMarkers(LOCAL_SOURCE_ID),
    ]);

    if (geoPackageResult.status === 'rejected') {
      console.error('Error loading GeoPackage file:', geoPackageResult.reason);
    } else {
      hasLoadedDataset = true;
      const { markerCount, skippedCount } = geoPackageResult.value;
      if (skippedCount > 0) {
        console.warn(
          `Skipped ${skippedCount} GeoPackage features without valid point geometry.`,
        );
      }
      console.info(`Loaded ${markerCount} GeoPackage markers.`);
    }

    if (ppkaResult.status === 'rejected') {
      console.error('Error loading PPKA CSV:', ppkaResult.reason);
    } else {
      hasLoadedDataset = true;
      const { markerCount, skippedCount } = ppkaResult.value;
      console.info(
        `Loaded ${markerCount} PPKA CSV markers (skipped ${skippedCount} duplicate or invalid rows).`,
      );
    }
  } finally {
    endAccidentMarkerBatch(LOCAL_SOURCE_ID);
    setLocalYearFilterStatus(hasLoadedDataset ? 'ready' : 'error');
  }
}
