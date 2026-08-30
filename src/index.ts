import { addTileLayer, createMap } from './map/map';
import { loadLocalAccidentMarkers } from './map/local-accident-layer';
import { addPanelControls } from './map/panel-controls';
import './styles.css';

function main(): void {
  const map = createMap();
  addTileLayer(map);
  loadLocalAccidentMarkers(map);
  addPanelControls(map);
}

main();
