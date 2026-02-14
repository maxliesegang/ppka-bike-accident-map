import { addTileLayerToMap, initializeMap } from './map/map-utils';
import { loadGeoPackageFile } from './map/geopackage-layer-utils';
import { addFilterControlToMap } from './map/layer-control-utils';
import './styles.css';

function main(): void {
  const map = initializeMap();
  addTileLayerToMap(map);
  loadGeoPackageFile(map);
  addFilterControlToMap(map);
}

main();
