import * as L from 'leaflet';
import { ACCIDENT_LEGENDS, SEVERITY_LEGENDS } from '../constants';
import { AccidentType, SeverityType } from '../data/accident-styles';
import { DATA_SOURCE_IDS, type DataSourceId } from './data-source-types';
import { AccidentMarkerSourceState } from './accident-marker-source-state';
import { FilterSelection } from './filter-selection';

const accidentMarkerStateBySource: Record<
  DataSourceId,
  AccidentMarkerSourceState
> = {
  local: new AccidentMarkerSourceState(),
  unfallatlas: new AccidentMarkerSourceState(),
};

/**
 * A filter dimension the user can toggle (accident type, severity type). It owns
 * the selection set and knows how to push a single key's new visibility into a
 * source's marker layer. Modelling both dimensions the same way keeps the toggle
 * plumbing below symmetric — adding a third filter is one more entry here.
 */
interface MarkerFilterDimension<T> {
  readonly selection: FilterSelection<T>;
  applyVisibility(source: AccidentMarkerSourceState, key: T): void;
}

// The dimension selections are the single source of truth for which accident and
// severity types are visible. React panels read them through the getters below
// and re-render via `subscribeToAccidentMarkerFilters`; they never keep their own copy.
const accidentTypeDimension: MarkerFilterDimension<AccidentType> = {
  selection: new FilterSelection(ACCIDENT_LEGENDS.map(({ type }) => type)),
  applyVisibility: (source, type) =>
    source.updateAccidentTypeVisibility(type, isMarkerSelected),
};

const severityTypeDimension: MarkerFilterDimension<SeverityType> = {
  selection: new FilterSelection(SEVERITY_LEGENDS.map(({ type }) => type)),
  applyVisibility: (source, type) =>
    source.updateSeverityTypeVisibility(type, isMarkerSelected),
};

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
  return accidentTypeDimension.selection.values;
}

export function getSelectedSeverityTypes(): ReadonlySet<SeverityType> {
  return severityTypeDimension.selection.values;
}

export function subscribeToAccidentMarkerFilters(
  listener: () => void,
): () => void {
  accidentMarkerFilterListeners.add(listener);
  return () => {
    accidentMarkerFilterListeners.delete(listener);
  };
}

export function setAccidentTypeSelected(
  accidentType: AccidentType,
  selected: boolean,
): void {
  setDimensionSelected(accidentTypeDimension, accidentType, selected);
}

export function setSeverityTypeSelected(
  severityType: SeverityType,
  selected: boolean,
): void {
  setDimensionSelected(severityTypeDimension, severityType, selected);
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

function setDimensionSelected<T>(
  dimension: MarkerFilterDimension<T>,
  key: T,
  selected: boolean,
): void {
  if (!dimension.selection.toggle(key, selected)) {
    return;
  }

  for (const dataSourceId of DATA_SOURCE_IDS) {
    dimension.applyVisibility(accidentMarkerStateBySource[dataSourceId], key);
  }
  notifyAccidentMarkerFiltersChanged();
}

function notifyAccidentMarkerFiltersChanged(): void {
  for (const listener of accidentMarkerFilterListeners) {
    listener();
  }
}

function isMarkerSelected(
  accidentType: AccidentType,
  severityType: SeverityType,
): boolean {
  return (
    accidentTypeDimension.selection.has(accidentType) &&
    severityTypeDimension.selection.has(severityType)
  );
}
