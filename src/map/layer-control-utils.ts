import * as L from 'leaflet';
import {
  accidentLayerGroups,
  severityLayerGroups,
} from './geopackage-layer-utils';
import { ACCIDENT_LEGENDS, SEVERITY_LEGENDS } from './map-legend-utils';

// Function to add a layer control to the map
export function addLayerControlToMap(map: L.Map): void {
  // Map accident layer groups to German descriptions from the legend
  const accidentLayerOverlays: Record<string, L.LayerGroup> = {};
  ACCIDENT_LEGENDS.forEach(({ type, description }) => {
    if (accidentLayerGroups[type]) {
      accidentLayerOverlays[description] = accidentLayerGroups[type];
    }
  });

  // Map severity layer groups to German descriptions from the legend
  const severityLayerOverlays: Record<string, L.LayerGroup> = {};
  SEVERITY_LEGENDS.forEach(({ key, description }) => {
    if (severityLayerGroups[key]) {
      severityLayerOverlays[description] = severityLayerGroups[key];
    }
  });

  const baseLayers = {}; // Optional: For base map layer functionality

  // Add the layer control to the map
  L.control
    .layers(baseLayers, { ...accidentLayerOverlays, ...severityLayerOverlays })
    .addTo(map);
}
