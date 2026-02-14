import * as L from 'leaflet';
import { createDataSourceControl } from './filter-controls/data-source-control';
import { createLegendControl } from './filter-controls/legend-control';

export function addFilterControlToMap(map: L.Map): void {
  createDataSourceControl().addTo(map);
  createLegendControl().addTo(map);
}
