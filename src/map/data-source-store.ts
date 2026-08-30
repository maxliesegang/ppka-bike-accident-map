import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  attachAccidentMarkersForSource,
  detachAccidentMarkersForSource,
} from './accident-marker-store';
import type { DataSourceId } from './data-source-types';
import {
  hideUnfallatlasLayer,
  showUnfallatlasLayer,
} from './unfallatlas-layer';

let selectedDataSourceId: DataSourceId = 'local';
const dataSourceListeners = new Set<(dataSourceId: DataSourceId) => void>();
const dataSourceVisibilityActions: Record<
  DataSourceId,
  { show: (map: MapLibreMap) => void; hide: (map: MapLibreMap) => void }
> = {
  local: {
    show: (map) => attachAccidentMarkersForSource(map, 'local'),
    hide: (map) => detachAccidentMarkersForSource(map, 'local'),
  },
  'unfallatlas-karlsruhe': {
    show: (map) => showUnfallatlasLayer(map, 'unfallatlas-karlsruhe'),
    hide: hideUnfallatlasLayer,
  },
  unfallatlas: {
    show: (map) => showUnfallatlasLayer(map, 'unfallatlas'),
    hide: hideUnfallatlasLayer,
  },
};

export function getSelectedDataSourceId(): DataSourceId {
  return selectedDataSourceId;
}

export function setSelectedDataSourceId(
  dataSourceId: DataSourceId,
  map: MapLibreMap,
): void {
  if (dataSourceId === selectedDataSourceId) {
    return;
  }

  const previousDataSourceId = selectedDataSourceId;
  dataSourceVisibilityActions[previousDataSourceId].hide(map);
  dataSourceVisibilityActions[dataSourceId].show(map);
  selectedDataSourceId = dataSourceId;

  for (const listener of dataSourceListeners) {
    listener(selectedDataSourceId);
  }
}

export function subscribeToDataSourceId(
  listener: (dataSourceId: DataSourceId) => void,
): () => void {
  dataSourceListeners.add(listener);
  return () => {
    dataSourceListeners.delete(listener);
  };
}
