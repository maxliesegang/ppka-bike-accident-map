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
import { generatePopupContent } from './popup-utils';
import { accidentLayerGroups, severityLayerGroups } from './layer-groups';

/**
 * Creates a GeoJSON layer from a feature and adds it to the appropriate layer groups.
 * @param feature - The GeoJSON feature to create a layer from
 * @param map - The Leaflet map to add the layer to
 * @returns The created GeoJSON layer
 */
export function createAndAddGeoJsonLayer(
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
  const popupContent = generatePopupContent(properties);
  geoJsonLayer.bindPopup(popupContent);

  // Add to appropriate accident type layer group
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

  // Add to appropriate severity layer group
  if (hasSevereInjuries(properties)) {
    severityLayerGroups.SEVERE_INJURY.addLayer(geoJsonLayer);
  } else if (hasInjuries(properties)) {
    severityLayerGroups.INJURY.addLayer(geoJsonLayer);
  } else {
    severityLayerGroups.NO_INJURY.addLayer(geoJsonLayer);
  }

  return geoJsonLayer.addTo(map);
}
