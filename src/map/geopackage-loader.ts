import { GeoPackage, GeoPackageAPI } from '@ngageoint/geopackage';
import { handleError } from '../utils/error-utils';

/**
 * Fetches and opens a GeoPackage file.
 * @param filePath - The path to the GeoPackage file
 * @returns A Promise that resolves to a GeoPackage object
 * @throws Error if the file cannot be loaded
 */
export async function fetchAndOpenGeoPackage(
  filePath: string,
): Promise<GeoPackage> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load file: ${response.statusText}`);
    }
    const fileBuffer = new Uint8Array(await response.arrayBuffer());
    return GeoPackageAPI.open(fileBuffer);
  } catch (error: unknown) {
    handleError('Error fetching and opening GeoPackage file:', error);
    throw error; // Re-throw to allow caller to handle the error
  }
}
