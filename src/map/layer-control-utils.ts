import * as L from 'leaflet';
import {
  accidentLayerGroups,
  severityLayerGroups,
} from './geopackage-layer-utils';
import { ACCIDENT_LEGENDS, SEVERITY_LEGENDS } from './map-legend-utils';

export function addLayerControlToMap(map: L.Map): void {
  const accidentLayerOverlays: Record<string, L.LayerGroup> = {};
  ACCIDENT_LEGENDS.forEach(({ type, description }) => {
    if (accidentLayerGroups[type]) {
      accidentLayerOverlays[description] = accidentLayerGroups[type];
    }
  });

  const severityLayerOverlays: Record<string, L.LayerGroup> = {};
  SEVERITY_LEGENDS.forEach(({ key, description }) => {
    if (severityLayerGroups[key]) {
      severityLayerOverlays[description] = severityLayerGroups[key];
    }
  });

  const baseLayers = {};
  L.control
    .layers(baseLayers, { ...accidentLayerOverlays, ...severityLayerOverlays })
    .addTo(map);
}
