import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl';
import { ACCIDENT_LEGENDS, SEVERITY_LEGENDS } from '../constants';
import type { AccidentType, SeverityType } from '../data/accident-styles';
import {
  type AccidentMarkerEntry,
  AccidentMarkerSourceState,
  type AccidentPopupPropertySource,
} from './accident-marker-source-state';
import { DATA_SOURCE_IDS, type DataSourceId } from './data-source-types';
import { FilterSelection } from './filter-selection';
import {
  areYearsEqual,
  toggleYear,
  type YearFilterController,
  type YearFilterStatus,
} from './year-filter';

const accidentMarkerStateBySource: Record<
  DataSourceId,
  AccidentMarkerSourceState
> = {
  local: new AccidentMarkerSourceState('local'),
  'unfallatlas-karlsruhe': new AccidentMarkerSourceState(
    'unfallatlas-karlsruhe',
  ),
  unfallatlas: new AccidentMarkerSourceState('unfallatlas'),
};

// The dimension selections are the single source of truth for which accident and
// severity types are visible. React panels read them through the getters below
// and re-render via `subscribeToAccidentMarkerFilters`; they never keep their own copy.
const accidentTypeSelection = new FilterSelection(
  ACCIDENT_LEGENDS.map(({ type }) => type),
);
const severityTypeSelection = new FilterSelection(
  SEVERITY_LEGENDS.map(({ type }) => type),
);

const accidentMarkerFilterListeners = new Set<() => void>();
// Fires when the underlying accident set changes (a source is (re)loaded or
// cleared), as opposed to only its filter visibility. Analytics consumers such
// as the hotspot store recompute on both signals.
const accidentMarkerDataListeners = new Set<() => void>();

export function attachLocalAccidentMarkers(map: MapLibreMap): void {
  attachAccidentMarkersForSource(map, 'local');
}

export function clearAccidentMarkersForSource(
  dataSourceId: DataSourceId = 'local',
): void {
  accidentMarkerStateBySource[dataSourceId].clear();
  notifyAccidentMarkerDataChanged();
}

export function beginAccidentMarkerBatch(
  dataSourceId: DataSourceId = 'local',
): void {
  accidentMarkerStateBySource[dataSourceId].beginRegistrationBatch();
}

export function endAccidentMarkerBatch(
  dataSourceId: DataSourceId = 'local',
): void {
  accidentMarkerStateBySource[dataSourceId].endRegistrationBatch();
  notifyAccidentMarkerDataChanged();
}

export function registerAccidentMarker(
  feature: GeoJSON.Feature<GeoJSON.Point>,
  accidentType: AccidentType,
  severityType: SeverityType,
  year: number | null,
  popupProperties: AccidentPopupPropertySource,
  dataSourceId: DataSourceId = 'local',
): void {
  accidentMarkerStateBySource[dataSourceId].registerFeature(
    feature,
    accidentType,
    severityType,
    year,
    popupProperties,
  );
}

export function getSelectedAccidentTypes(): ReadonlySet<AccidentType> {
  return accidentTypeSelection.values;
}

export function getSelectedSeverityTypes(): ReadonlySet<SeverityType> {
  return severityTypeSelection.values;
}

export function subscribeToAccidentMarkerFilters(
  listener: () => void,
): () => void {
  accidentMarkerFilterListeners.add(listener);
  return () => {
    accidentMarkerFilterListeners.delete(listener);
  };
}

export function subscribeToAccidentMarkerData(
  listener: () => void,
): () => void {
  accidentMarkerDataListeners.add(listener);
  return () => {
    accidentMarkerDataListeners.delete(listener);
  };
}

/** All registered markers for a source, before any filter is applied. */
export function getAccidentMarkerEntries(
  dataSourceId: DataSourceId,
): readonly AccidentMarkerEntry[] {
  return accidentMarkerStateBySource[dataSourceId].entries;
}

/** Whether an accident of this type/severity is currently visible on the map. */
export function isAccidentVisible(
  accidentType: AccidentType,
  severityType: SeverityType,
): boolean {
  return (
    accidentTypeSelection.has(accidentType) &&
    severityTypeSelection.has(severityType)
  );
}

export function setAccidentTypeSelected(
  accidentType: AccidentType,
  selected: boolean,
): void {
  setSelection(accidentTypeSelection, accidentType, selected);
}

export function setSeverityTypeSelected(
  severityType: SeverityType,
  selected: boolean,
): void {
  setSelection(severityTypeSelection, severityType, selected);
}

export function attachAccidentMarkersForSource(
  map: MapLibreMap,
  dataSourceId: DataSourceId,
): void {
  accidentMarkerStateBySource[dataSourceId].attachToMap(map, buildBaseFilter());
}

export function detachAccidentMarkersForSource(
  map: MapLibreMap,
  dataSourceId: DataSourceId,
): void {
  accidentMarkerStateBySource[dataSourceId].detachFromMap(map);
}

/** Keeps the local year UI state independent from whether the dataset is empty. */
export function setLocalYearFilterStatus(status: YearFilterStatus): void {
  if (status === localYearFilterStatus) {
    return;
  }
  localYearFilterStatus = status;
  notifyYearFilterChanged();
}

function setSelection<T>(
  selection: FilterSelection<T>,
  key: T,
  selected: boolean,
): void {
  if (!selection.toggle(key, selected)) {
    return;
  }

  // Visibility is a filter expression over feature properties, so every source
  // layer just picks up the rebuilt clauses — no per-marker bookkeeping.
  const baseFilter = buildBaseFilter();
  for (const dataSourceId of DATA_SOURCE_IDS) {
    accidentMarkerStateBySource[dataSourceId].setBaseFilter(baseFilter);
  }
  notifyAccidentMarkerFiltersChanged();
}

/**
 * The type/severity clauses every accident layer filters on, expressed over the
 * feature properties stamped by the marker factory. The per-source year filter
 * is appended by the source state itself.
 */
function buildBaseFilter(): ExpressionSpecification {
  return [
    'all',
    [
      'in',
      ['get', 'accidentType'],
      ['literal', [...accidentTypeSelection.values]],
    ],
    [
      'in',
      ['get', 'severityType'],
      ['literal', [...severityTypeSelection.values]],
    ],
  ];
}

function notifyAccidentMarkerFiltersChanged(): void {
  for (const listener of accidentMarkerFilterListeners) {
    listener();
  }
}

function notifyAccidentMarkerDataChanged(): void {
  recomputeLocalYearCaches();
  for (const listener of accidentMarkerDataListeners) {
    listener();
  }
}

// --- Year filter (local source) -------------------------------------------
// Year is a client-side, data-driven filter dimension. The generic mechanism
// lives in AccidentMarkerSourceState, so any source could use it; only the
// single-file `local` (FragDenStaat) source is wired to the year UI, because
// the Unfallatlas sources filter years at load time via their CSV pipeline.

const LOCAL_SOURCE_ID: DataSourceId = 'local';
const yearFilterListeners = new Set<() => void>();
let localYearFilterStatus: YearFilterStatus = 'loading';
// Cached snapshots so `useSyncExternalStore` sees stable identities between
// changes. Recomputed only when the marker set or year selection moves.
let localAvailableYears: readonly number[] = [];
let localSelectedYears: readonly number[] = [];

/**
 * Whether an accident of this year passes the source's year filter. Analytics
 * consumers (e.g. the hotspot ranking) use it to mirror the year selection that
 * the map applies. Sources without a year filter report every year as visible.
 */
export function isAccidentYearVisible(
  dataSourceId: DataSourceId,
  year: number | null,
): boolean {
  return accidentMarkerStateBySource[dataSourceId].isYearVisible(year);
}

/** The local source's year filter, exposed to the UI via a uniform controller. */
export const localYearFilterController: YearFilterController = {
  subscribe(listener) {
    yearFilterListeners.add(listener);
    return () => {
      yearFilterListeners.delete(listener);
    };
  },
  getStatus: () => localYearFilterStatus,
  getAvailableYears: () => localAvailableYears,
  getSelectedYears: () => localSelectedYears,
  setSelectedYears: setLocalSelectedYears,
  setYearSelected: setLocalYearSelected,
  messages: {
    loading: 'Jahre werden geladen …',
    empty: 'Keine Jahre verfügbar.',
    error: 'Lokale Unfalldaten konnten nicht geladen werden.',
  },
};

function setLocalSelectedYears(years: readonly number[]): void {
  const available = new Set(localAvailableYears);
  const selected = new Set(years.filter((year) => available.has(year)));
  // Full selection is represented as "no filter" so newly loaded years stay
  // visible by default.
  const filter = selected.size === available.size ? null : selected;
  accidentMarkerStateBySource[LOCAL_SOURCE_ID].setYearFilter(filter);
  recomputeLocalYearCaches();
}

function setLocalYearSelected(year: number, selected: boolean): void {
  setLocalSelectedYears(toggleYear(localSelectedYears, year, selected));
}

function recomputeLocalYearCaches(): void {
  const available =
    accidentMarkerStateBySource[LOCAL_SOURCE_ID].getAvailableYears();
  const filter = accidentMarkerStateBySource[LOCAL_SOURCE_ID].getYearFilter();
  const selected =
    filter === null ? available : available.filter((year) => filter.has(year));
  const availableChanged = !areYearsEqual(available, localAvailableYears);
  const selectedChanged = !areYearsEqual(selected, localSelectedYears);

  if (availableChanged) {
    localAvailableYears = available;
  }
  if (selectedChanged) {
    localSelectedYears = selected;
  }

  if (availableChanged || selectedChanged) {
    notifyYearFilterChanged();
  }
}

function notifyYearFilterChanged(): void {
  for (const listener of yearFilterListeners) {
    listener();
  }
}
