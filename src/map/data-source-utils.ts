import {
  showUnfallatlasLayer,
  hideUnfallatlasLayer,
} from './unfallatlas-layer';
import { showLocalMarkers, hideLocalMarkers } from './layer-filter-utils';
import { type DataSource } from './data-source-types';

let activeSource: DataSource = 'local';
const changeListeners = new Set<(source: DataSource) => void>();
const sourceVisibilityActions: Record<
  DataSource,
  { show: (map: L.Map) => void; hide: (map: L.Map) => void }
> = {
  local: {
    show: showLocalMarkers,
    hide: hideLocalMarkers,
  },
  unfallatlas: {
    show: showUnfallatlasLayer,
    hide: hideUnfallatlasLayer,
  },
};

export function getActiveDataSource(): DataSource {
  return activeSource;
}

export function setDataSource(source: DataSource, map: L.Map): void {
  if (source === activeSource) {
    return;
  }

  const previousSource = activeSource;
  sourceVisibilityActions[previousSource].hide(map);
  sourceVisibilityActions[source].show(map);
  activeSource = source;

  for (const listener of changeListeners) {
    listener(activeSource);
  }
}

export function onDataSourceChange(
  listener: (source: DataSource) => void,
): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}
