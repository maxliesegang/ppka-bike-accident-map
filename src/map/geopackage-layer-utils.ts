import { GeoPackage, GeoPackageAPI } from '@ngageoint/geopackage';
import * as L from 'leaflet';
import {
  getStyle,
  hasInjuries,
  hasSevereInjuries,
  isBikeAndPedestrianAccident,
  isBikeAndVehicleAccident,
  isBikeOnlyAccident,
  isPedestrianAndVehicleAccident,
  isSingleBikeAccident,
} from '../features/accident-feature-utils';
import { AccidentProperties } from '../data/accident-properties';
import { AccidentType } from '../data/color-store';
import { SeverityType } from '../data/radius-store';

const FILE_NAME = 'unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg';
const GEO_PACKAGE_LAYER_NAME = 'zugeschnitten'; // Extracted constant for GeoPackage layer name.

export const accidentLayerGroups: Record<AccidentType, L.LayerGroup> = {
  BIKE_AND_VEHICLE: L.layerGroup(),
  PEDESTRIAN_AND_VEHICLE: L.layerGroup(),
  BIKE_AND_PEDESTRIAN: L.layerGroup(),
  SINGLE_BIKE: L.layerGroup(),
  BIKE_ONLY: L.layerGroup(),
  DEFAULT_FILL: L.layerGroup(),
};

export const severityLayerGroups: Record<SeverityType, L.LayerGroup> = {
  SEVERE_INJURY: L.layerGroup(),
  INJURY: L.layerGroup(),
  NO_INJURY: L.layerGroup(),
};

export async function loadGeoPackageFile(map: L.Map): Promise<void> {
  try {
    const geoPackage = await fetchAndOpenGeoPackage(FILE_NAME);
    addGeoPackageLayersToMap(map, geoPackage);
    Object.values(accidentLayerGroups).forEach((group) => group.addTo(map));
    Object.values(severityLayerGroups).forEach((group) => group.addTo(map));
  } catch (error: unknown) {
    handleError('Error loading GeoPackage file:', error);
  }
}

async function fetchAndOpenGeoPackage(filePath: string): Promise<GeoPackage> {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`Failed to load file: ${response.statusText}`);
  }
  const fileBuffer = new Uint8Array(await response.arrayBuffer()); // Renamed from `arrayBuffer` to `fileBuffer` for clarity.
  return GeoPackageAPI.open(fileBuffer);
}

function addGeoPackageLayersToMap(
  map: L.Map,
  geoPackage: GeoPackage,
): Array<L.GeoJSON> {
  const geoJsonFeatures = geoPackage.iterateGeoJSONFeatures(
    GEO_PACKAGE_LAYER_NAME,
  );
  return Array.from(geoJsonFeatures).map((geoJsonFeature) =>
    createAndAddGeoJsonLayer(geoJsonFeature, map),
  );
}

function createAndAddGeoJsonLayer(
  feature: GeoJSON.Feature,
  map: L.Map,
): L.GeoJSON {
  const geoJsonLayer = L.geoJSON(feature, {
    style: (value) => getStyle(value.properties as AccidentProperties),
    pointToLayer: (value, latlng) =>
      L.circleMarker(latlng, getStyle(value.properties as AccidentProperties)),
  });

  // Bind a popup to each feature with the properties visualized
  const properties = feature.properties as AccidentProperties;

  // Generate content for the popup
  const popupContent = generatePopupContent(properties);

  // Add the popup to the layer
  geoJsonLayer.bindPopup(popupContent);

  if (isBikeAndVehicleAccident(properties)) {
    accidentLayerGroups.BIKE_AND_VEHICLE.addLayer(geoJsonLayer);
  } else if (isPedestrianAndVehicleAccident(properties)) {
    accidentLayerGroups.PEDESTRIAN_AND_VEHICLE.addLayer(geoJsonLayer);
  } else if (isBikeAndPedestrianAccident(properties)) {
    accidentLayerGroups.BIKE_AND_PEDESTRIAN.addLayer(geoJsonLayer);
  } else if (isSingleBikeAccident(properties)) {
    accidentLayerGroups.SINGLE_BIKE.addLayer(geoJsonLayer);
  } else if (isBikeOnlyAccident(properties)) {
    accidentLayerGroups.BIKE_ONLY.addLayer(geoJsonLayer);
  } else {
    accidentLayerGroups.DEFAULT_FILL.addLayer(geoJsonLayer);
  }

  if (hasSevereInjuries(properties)) {
    severityLayerGroups.SEVERE_INJURY.addLayer(geoJsonLayer);
  } else if (hasInjuries(properties)) {
    severityLayerGroups.INJURY.addLayer(geoJsonLayer);
  } else {
    severityLayerGroups.NO_INJURY.addLayer(geoJsonLayer);
  }

  return geoJsonLayer.addTo(map);
}

function handleError(message: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(message, error.message);
  } else {
    console.error(message, 'Unknown error occurred');
  }
}

function generatePopupContent(properties: AccidentProperties): string {
  if (!properties) {
    return '<p>No properties available for this feature.</p>';
  }

  // Build rows for the property table
  const rows = Object.entries(properties)
    .map(
      ([key, value]) =>
        `<tr><td class="popup-key">${key}</td><td class="popup-value">${
          value ?? 'N/A'
        }</td></tr>`,
    )
    .join('');

  // Return improved styled content with height limits
  return `
    <div style="max-height: 200px; overflow-y: auto; overflow-x: hidden;">
      <h3 style="margin-bottom: 10px; font-size: 16px; color: #333; font-family: Arial, sans-serif;">
        Feature Properties
      </h3>
      <table style="
        width: 100%;
        border-collapse: collapse;
        font-family: Arial, sans-serif;
        font-size: 14px;
        text-align: left;
      ">
        <thead>
          <tr style="background-color: #f9f9f9;">
            <th style="padding: 8px; border: 1px solid #ddd;">Key</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}
