import { addTileLayerToMap, initializeMap } from './map/map-utils';
import { loadGeoPackageFile } from './map/geopackage-layer-utils';
import './styles.css';
import { refreshLegend } from './map/map-legend-utils';
import { addLayerControlToMap } from './map/layer-control-utils';
function main(): void {
  const map = initializeMap();

  // Add Tile Layer to the Map
  addTileLayerToMap(map);

  // Load GeoPackage Layers into the Map
  loadGeoPackageFile(map);

  // Add Layer Control for Toggling
  addLayerControlToMap(map);

  // Add the Legend
  refreshLegend();
}

main();
