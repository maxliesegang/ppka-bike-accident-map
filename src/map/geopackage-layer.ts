import { GeoPackage } from '@ngageoint/geopackage';
import { GEOPACKAGE_FILE_NAME, GEOPACKAGE_LAYER_NAME } from '../constants';
import { fetchAndOpenGeoPackage } from './geopackage-loader';
import { createAndRegisterGeoPackageAccidentMarker } from './accident-marker-factory';
import { type DataSourceId } from './data-source-types';

export interface GeoPackageLoadResult {
  markerCount: number;
  skippedCount: number;
}

/**
 * Registers the GeoPackage accidents (2018-2023) with the given source. The
 * caller owns the registration batch, because the local source is fed by this
 * file and the PPKA CSV together — see `local-accident-layer.ts`.
 */
export async function loadGeoPackageMarkers(
  markerSourceId: DataSourceId,
): Promise<GeoPackageLoadResult> {
  const geoPackage = await fetchAndOpenGeoPackage(GEOPACKAGE_FILE_NAME);
  return registerGeoPackageMarkers(geoPackage, markerSourceId);
}

function registerGeoPackageMarkers(
  geoPackage: GeoPackage,
  markerSourceId: DataSourceId,
): GeoPackageLoadResult {
  let markerCount = 0;
  let skippedCount = 0;

  for (const feature of geoPackage.iterateGeoJSONFeatures(
    GEOPACKAGE_LAYER_NAME,
  )) {
    if (
      createAndRegisterGeoPackageAccidentMarker(feature, markerSourceId) ===
      null
    ) {
      skippedCount += 1;
      continue;
    }

    markerCount += 1;
  }

  return { markerCount, skippedCount };
}
