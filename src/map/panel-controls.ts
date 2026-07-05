import * as L from 'leaflet';
import {
  createFilterControl,
  createLegendControl,
} from '../ui/controls/map-panel-control';

export function addPanelControls(map: L.Map): void {
  createFilterControl().addTo(map);
  createLegendControl().addTo(map);
}
