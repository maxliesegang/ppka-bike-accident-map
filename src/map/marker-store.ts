import * as L from 'leaflet';
import { ACCIDENT_LEGENDS, SEVERITY_LEGENDS } from '../constants';
import { AccidentType, SeverityType } from '../data/accident-styles';
import { DATA_SOURCE_IDS, type DataSourceId } from './data-source-types';
import { AccidentMarkerSourceState } from './accident-marker-source-state';

const accidentMarkerStateBySource: Record<
  DataSourceId,
  AccidentMarkerSourceState
> = {
  local: new AccidentMarkerSourceState(),
  unfallatlas: new AccidentMarkerSourceState(),
};

// The selection sets are the single source of truth for which accident and
// severity types are visible. React panels read them through the getters below
// and re-render via `subscribeToAccidentMarkerFilters`; they never keep their own copy.
// Each change swaps in a fresh set so snapshot identity changes for
// `useSyncExternalStore`.
let selectedAccidentTypeFilters: ReadonlySet<AccidentType> = new Set(
  ACCIDENT_LEGENDS.map(({ type }) => type),
);
let selectedSeverityTypeFilters: ReadonlySet<SeverityType> = new Set(
  SEVERITY_LEGENDS.map(({ type }) => type),
);

const accidentMarkerFilterListeners = new Set<() => void>();

export function attachLocalAccidentMarkers(map: L.Map): void {
  attachAccidentMarkersForSource(map, 'local');
}

export function clearAccidentMarkersForSource(
  dataSourceId: DataSourceId = 'local',
): void {
  accidentMarkerStateBySource[dataSourceId].clear();
}

export function beginAccidentMarkerBatch(
  dataSourceId: DataSourceId = 'local',
): void {
  accidentMarkerStateBySource[dataSourceId].beginRegistrationBatch();
}

export function endAccidentMarkerBatch(
  dataSourceId: DataSourceId = 'local',
): void {
  accidentMarkerStateBySource[dataSourceId].endRegistrationBatch(
    isMarkerSelected,
  );
}

export function registerAccidentMarker(
  marker: L.CircleMarker,
  accidentType: AccidentType,
  severityType: SeverityType,
  dataSourceId: DataSourceId = 'local',
): void {
  accidentMarkerStateBySource[dataSourceId].registerMarker(
    marker,
    accidentType,
    severityType,
    isMarkerSelected,
  );
}

export function getSelectedAccidentTypes(): ReadonlySet<AccidentType> {
  return selectedAccidentTypeFilters;
}

export function getSelectedSeverityTypes(): ReadonlySet<SeverityType> {
  return selectedSeverityTypeFilters;
}

export function subscribeToAccidentMarkerFilters(
  listener: () => void,
): () => void {
  accidentMarkerFilterListeners.add(listener);
  return () => {
    accidentMarkerFilterListeners.delete(listener);
  };
}

export function setAccidentTypeFilterSelected(
  accidentType: AccidentType,
  selected: boolean,
): void {
  const nextSelection = withToggled(
    selectedAccidentTypeFilters,
    accidentType,
    selected,
  );
  if (nextSelection === selectedAccidentTypeFilters) {
    return;
  }

  selectedAccidentTypeFilters = nextSelection;
  updateAccidentTypeVisibility(accidentType);
  notifyAccidentMarkerFiltersChanged();
}

export function setSeverityTypeFilterSelected(
  severityType: SeverityType,
  selected: boolean,
): void {
  const nextSelection = withToggled(
    selectedSeverityTypeFilters,
    severityType,
    selected,
  );
  if (nextSelection === selectedSeverityTypeFilters) {
    return;
  }

  selectedSeverityTypeFilters = nextSelection;
  updateSeverityTypeVisibility(severityType);
  notifyAccidentMarkerFiltersChanged();
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

function notifyAccidentMarkerFiltersChanged(): void {
  for (const listener of accidentMarkerFilterListeners) {
    listener();
  }
}

export function attachAccidentMarkersForSource(
  map: L.Map,
  dataSourceId: DataSourceId,
): void {
  accidentMarkerStateBySource[dataSourceId].attachToMap(map, isMarkerSelected);
}

export function detachAccidentMarkersForSource(
  map: L.Map,
  dataSourceId: DataSourceId,
): void {
  accidentMarkerStateBySource[dataSourceId].detachFromMap(map);
}

function updateAccidentTypeVisibility(accidentType: AccidentType): void {
  for (const dataSourceId of DATA_SOURCE_IDS) {
    accidentMarkerStateBySource[dataSourceId].updateAccidentTypeVisibility(
      accidentType,
      isMarkerSelected,
    );
  }
}

function updateSeverityTypeVisibility(severityType: SeverityType): void {
  for (const dataSourceId of DATA_SOURCE_IDS) {
    accidentMarkerStateBySource[dataSourceId].updateSeverityTypeVisibility(
      severityType,
      isMarkerSelected,
    );
  }
}

function isMarkerSelected(
  accidentType: AccidentType,
  severityType: SeverityType,
): boolean {
  return (
    selectedAccidentTypeFilters.has(accidentType) &&
    selectedSeverityTypeFilters.has(severityType)
  );
}
