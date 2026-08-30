import type * as L from 'leaflet';
import {
  createFilterControl,
  createHotspotControl,
  createLegendControl,
} from '../ui/controls/map-panel-control';

export function addPanelControls(map: L.Map): void {
  createFilterControl().addTo(map);
  createLegendControl().addTo(map);
  createHotspotControl().addTo(map);
}
