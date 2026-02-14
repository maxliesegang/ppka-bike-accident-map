import { GeoPackage, GeoPackageAPI } from '@ngageoint/geopackage';

export async function fetchAndOpenGeoPackage(
  filePath: string,
): Promise<GeoPackage> {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`Failed to load GeoPackage: ${response.statusText}`);
  }
  const fileBuffer = new Uint8Array(await response.arrayBuffer());
  return GeoPackageAPI.open(fileBuffer);
}
