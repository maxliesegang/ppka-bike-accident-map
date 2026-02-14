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

const sourceStateByType: Record<DataSource, SourceState> = {
  local: createSourceState(),
  unfallatlas: createSourceState(),
};

const selectedAccidentTypes = new Set<AccidentType>(
  ACCIDENT_LEGENDS.map(({ type }) => type),
);
const selectedSeverityTypes = new Set<SeverityType>(
  SEVERITY_LEGENDS.map(({ key }) => key),
);

export function initializeVisibleLayerGroup(map: L.Map): void {
  showMarkersForSource(map, 'local');
}

export function clearRegisteredMarkers(source: DataSource = 'local'): void {
  const state = sourceStateByType[source];
  state.registeredMarkers.length = 0;
  state.isBatchingRegistration = false;
  state.visibleLayerGroup.clearLayers();
}

export function beginMarkerRegistrationBatch(
  source: DataSource = 'local',
): void {
  sourceStateByType[source].isBatchingRegistration = true;
}

export function endMarkerRegistrationBatch(source: DataSource = 'local'): void {
  const state = sourceStateByType[source];
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
  const state = sourceStateByType[source];
  state.registeredMarkers.push({ marker, accidentType, severityType });

  if (
    !state.isBatchingRegistration &&
    selectedAccidentTypes.has(accidentType) &&
    selectedSeverityTypes.has(severityType)
  ) {
    state.visibleLayerGroup.addLayer(marker);
  }
}

export function setAccidentTypeSelection(
  accidentType: AccidentType,
  selected: boolean,
): void {
  updateSelection(selectedAccidentTypes, accidentType, selected);
  refreshVisibleLayersForAllSources();
}

export function setSeverityTypeSelection(
  severityType: SeverityType,
  selected: boolean,
): void {
  updateSelection(selectedSeverityTypes, severityType, selected);
  refreshVisibleLayersForAllSources();
}

function updateSelection<T>(set: Set<T>, key: T, selected: boolean): void {
  if (selected) {
    set.add(key);
  } else {
    set.delete(key);
  }
}

export function showLocalMarkers(map: L.Map): void {
  showMarkersForSource(map, 'local');
}

export function hideLocalMarkers(map: L.Map): void {
  hideMarkersForSource(map, 'local');
}

export function showUnfallatlasMarkers(map: L.Map): void {
  showMarkersForSource(map, 'unfallatlas');
}

export function hideUnfallatlasMarkers(map: L.Map): void {
  hideMarkersForSource(map, 'unfallatlas');
}

function createSourceState(): SourceState {
  return {
    registeredMarkers: [],
    visibleLayerGroup: L.layerGroup(),
    map: null,
    isBatchingRegistration: false,
  };
}

function showMarkersForSource(map: L.Map, source: DataSource): void {
  const state = sourceStateByType[source];
  state.map = map;
  if (!map.hasLayer(state.visibleLayerGroup)) {
    state.visibleLayerGroup.addTo(map);
  }
}

function hideMarkersForSource(map: L.Map, source: DataSource): void {
  const state = sourceStateByType[source];
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
  const state = sourceStateByType[source];
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
