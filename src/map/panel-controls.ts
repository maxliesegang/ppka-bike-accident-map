import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  createFilterControl,
  createHotspotControl,
  createLegendControl,
} from '../ui/controls/map-panel-control';

export function addPanelControls(map: MapLibreMap): void {
  map.addControl(createFilterControl(), 'top-right');
  map.addControl(createLegendControl(), 'bottom-left');
  map.addControl(createHotspotControl(), 'bottom-right');
}
