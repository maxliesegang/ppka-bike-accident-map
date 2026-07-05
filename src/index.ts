import { addTileLayer, createMap } from './map/map';
import { loadGeoPackageMarkers } from './map/geopackage-layer';
import { addPanelControls } from './map/panel-controls';
import './styles.css';

function main(): void {
  const map = createMap();
  addTileLayer(map);
  loadGeoPackageMarkers(map);
  addPanelControls(map);
}

main();
