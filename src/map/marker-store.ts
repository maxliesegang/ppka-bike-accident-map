import * as L from 'leaflet';
import { ACCIDENT_LEGENDS, SEVERITY_LEGENDS } from '../constants';
import { AccidentType, SeverityType } from '../data/accident-styles';
import { DATA_SOURCES, type DataSource } from './data-source-types';

interface CategorizedMarker {
  marker: L.CircleMarker;
  accidentType: AccidentType;
  severityType: SeverityType;
}

interface SourceState {
  registeredMarkers: CategorizedMarker[];
  visibleLayerGroup: L.LayerGroup;
  map: L.Map | null;
  isBatchingRegistration: boolean;
}

const stateBySource: Record<DataSource, SourceState> = {
  local: createSourceState(),
  unfallatlas: createSourceState(),
};

// The selection sets are the single source of truth for which accident and
// severity types are visible. React panels read them through the getters below
// and re-render via `subscribeToSelection`; they never keep their own copy.
// Each change swaps in a fresh set so snapshot identity changes for
// `useSyncExternalStore`.
let selectedAccidentTypes: ReadonlySet<AccidentType> = new Set(
  ACCIDENT_LEGENDS.map(({ type }) => type),
);
let selectedSeverityTypes: ReadonlySet<SeverityType> = new Set(
  SEVERITY_LEGENDS.map(({ type }) => type),
);

const selectionListeners = new Set<() => void>();

export function initializeMarkerLayer(map: L.Map): void {
  attachMarkersForSource(map, 'local');
}

export function clearRegisteredMarkers(source: DataSource = 'local'): void {
  const state = stateBySource[source];
  state.registeredMarkers.length = 0;
  state.isBatchingRegistration = false;
  state.visibleLayerGroup.clearLayers();
}

export function beginMarkerRegistrationBatch(
  source: DataSource = 'local',
): void {
  stateBySource[source].isBatchingRegistration = true;
}

export function endMarkerRegistrationBatch(source: DataSource = 'local'): void {
  const state = stateBySource[source];
  if (!state.isBatchingRegistration) {
    return;
  }

  state.isBatchingRegistration = false;
  refreshVisibleLayers(source);
}

export function registerMarker(
  marker: L.CircleMarker,
  accidentType: AccidentType,
  severityType: SeverityType,
  source: DataSource = 'local',
): void {
  const state = stateBySource[source];
  state.registeredMarkers.push({ marker, accidentType, severityType });

  if (
    !state.isBatchingRegistration &&
    selectedAccidentTypes.has(accidentType) &&
    selectedSeverityTypes.has(severityType)
  ) {
    state.visibleLayerGroup.addLayer(marker);
  }
}

export function getSelectedAccidentTypes(): ReadonlySet<AccidentType> {
  return selectedAccidentTypes;
}

export function getSelectedSeverityTypes(): ReadonlySet<SeverityType> {
  return selectedSeverityTypes;
}

export function subscribeToSelection(listener: () => void): () => void {
  selectionListeners.add(listener);
  return () => {
    selectionListeners.delete(listener);
  };
}

export function setAccidentTypeSelection(
  accidentType: AccidentType,
  selected: boolean,
): void {
  const nextSelection = withToggled(
    selectedAccidentTypes,
    accidentType,
    selected,
  );
  if (nextSelection === selectedAccidentTypes) {
    return;
  }

  selectedAccidentTypes = nextSelection;
  refreshVisibleLayersForAllSources();
  notifySelectionChanged();
}

export function setSeverityTypeSelection(
  severityType: SeverityType,
  selected: boolean,
): void {
  const nextSelection = withToggled(
    selectedSeverityTypes,
    severityType,
    selected,
  );
  if (nextSelection === selectedSeverityTypes) {
    return;
  }

  selectedSeverityTypes = nextSelection;
  refreshVisibleLayersForAllSources();
  notifySelectionChanged();
}

function withToggled<T>(
  set: ReadonlySet<T>,
  key: T,
  selected: boolean,
): ReadonlySet<T> {
  if (set.has(key) === selected) {
    return set;
  }

  const next = new Set(set);
  if (selected) {
    next.add(key);
  } else {
    next.delete(key);
  }
  return next;
}

function notifySelectionChanged(): void {
  for (const listener of selectionListeners) {
    listener();
  }
}

function createSourceState(): SourceState {
  return {
    registeredMarkers: [],
    visibleLayerGroup: L.layerGroup(),
    map: null,
    isBatchingRegistration: false,
  };
}

export function attachMarkersForSource(map: L.Map, source: DataSource): void {
  const state = stateBySource[source];
  state.map = map;
  if (!map.hasLayer(state.visibleLayerGroup)) {
    state.visibleLayerGroup.addTo(map);
  }
}

export function detachMarkersForSource(map: L.Map, source: DataSource): void {
  const state = stateBySource[source];
  if (map.hasLayer(state.visibleLayerGroup)) {
    map.removeLayer(state.visibleLayerGroup);
  }
  if (state.map === map) {
    state.map = null;
  }
}

function refreshVisibleLayersForAllSources(): void {
  for (const source of DATA_SOURCES) {
    refreshVisibleLayers(source);
  }
}

function refreshVisibleLayers(source: DataSource): void {
  const state = stateBySource[source];
  const { map, visibleLayerGroup, registeredMarkers } = state;
  const wasLayerVisible = map !== null && map.hasLayer(visibleLayerGroup);

  if (map && wasLayerVisible) {
    map.removeLayer(visibleLayerGroup);
  }

  visibleLayerGroup.clearLayers();

  for (const { marker, accidentType, severityType } of registeredMarkers) {
    if (isSelected(accidentType, severityType)) {
      visibleLayerGroup.addLayer(marker);
    }
  }

  if (map && wasLayerVisible) {
    visibleLayerGroup.addTo(map);
  }
}

function isSelected(
  accidentType: AccidentType,
  severityType: SeverityType,
): boolean {
  return (
    selectedAccidentTypes.has(accidentType) &&
    selectedSeverityTypes.has(severityType)
  );
}
