import { loadLocalAccidentMarkers } from './map/local-accident-layer';
import { createMap } from './map/map';
import { addPanelControls } from './map/panel-controls';
import './styles.css';

function main(): void {
  const map = createMap();
  loadLocalAccidentMarkers(map);
  addPanelControls(map);
}

main();
