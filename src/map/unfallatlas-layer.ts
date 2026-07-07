import * as L from 'leaflet';
import {
  beginAccidentMarkerBatch,
  clearAccidentMarkersForSource,
  endAccidentMarkerBatch,
  attachAccidentMarkersForSource,
  detachAccidentMarkersForSource,
} from './accident-marker-store';
import {
  getAvailableUnfallatlasYears,
  loadUnfallatlasMarkersForYears,
  type UnfallatlasRegionFilter,
} from './unfallatlas-loader';
import { UNFALLATLAS_KARLSRUHE_REGION } from '../constants';
import { type DataSourceId } from './data-source-types';
import {
  areYearsEqual,
  normalizeYears,
  toggleYear,
  type YearFilterController,
  type YearFilterStatus,
} from './year-filter';

/**
 * Both Unfallatlas data sources share the same CSVs and layer machinery; they
 * differ only in geographic scope. 'unfallatlas' shows all of
 * Baden-Württemberg, while 'unfallatlas-karlsruhe' filters rows down to
 * Stadt-/Landkreis Karlsruhe client-side. Each source registers into its own
 * marker bucket so hotspots and filters stay scoped to the active view.
 */
export type UnfallatlasSourceId = Extract<
  DataSourceId,
  'unfallatlas' | 'unfallatlas-karlsruhe'
>;

const REGION_FILTER_BY_SOURCE: Record<
  UnfallatlasSourceId,
  UnfallatlasRegionFilter | undefined
> = {
  unfallatlas: undefined,
  'unfallatlas-karlsruhe': UNFALLATLAS_KARLSRUHE_REGION,
};

interface UnfallatlasLayerState {
  selectedYears: number[];
  sourceId: UnfallatlasSourceId;
  hasInitializedYearSelection: boolean;
  yearSelectionInitializationPromise: Promise<void> | null;
  isLayerVisible: boolean;
  loadedSelectionKey: string | null;
  markerLoadPromise: Promise<void> | null;
  hasQueuedReload: boolean;
}

const state: UnfallatlasLayerState = {
  selectedYears: [],
  sourceId: 'unfallatlas',
  hasInitializedYearSelection: false,
  yearSelectionInitializationPromise: null,
  isLayerVisible: false,
  loadedSelectionKey: null,
  markerLoadPromise: null,
  hasQueuedReload: false,
};

const unfallatlasYearListeners = new Set<() => void>();

// Available years come from a manifest fetch; the snapshot lets the year UI read
// them synchronously (via the controller) once loaded. Both Unfallatlas sources
// share the same yearly files, so a single availability snapshot serves both.
let availableYearsSnapshot: readonly number[] = [];
let availableYearsStatus: YearFilterStatus = 'loading';
let hasStartedAvailableYearsLoad = false;

/**
 * The Unfallatlas year filter as a uniform controller. Subscribing lazily kicks
 * off the manifest fetch, so the year list loads exactly when the panel first
 * needs it rather than on app start.
 */
export const unfallatlasYearFilterController: YearFilterController = {
  subscribe(listener) {
    ensureAvailableYearsLoaded();
    unfallatlasYearListeners.add(listener);
    return () => {
      unfallatlasYearListeners.delete(listener);
    };
  },
  getStatus: () => availableYearsStatus,
  getAvailableYears: () => availableYearsSnapshot,
  getSelectedYears: () => state.selectedYears,
  setSelectedYears: setSelectedUnfallatlasYears,
  setYearSelected: setUnfallatlasYearSelected,
  messages: {
    loading: 'Jahre werden geladen …',
    empty: 'Keine Unfallatlas-Jahre gefunden.',
    error: 'Jahre konnten nicht geladen werden.',
  },
};

function ensureAvailableYearsLoaded(): void {
  if (hasStartedAvailableYearsLoad) {
    return;
  }
  hasStartedAvailableYearsLoad = true;
  getAvailableUnfallatlasYears()
    .then((years) => {
      availableYearsSnapshot = years;
      availableYearsStatus = 'ready';
      // Default to every year until the user narrows the range; if a selection
      // already exists, `updateSelectedYears` leaves it untouched.
      if (years.length > 0 && state.selectedYears.length === 0) {
        setSelectedUnfallatlasYears(years);
      } else {
        notifyYearSelectionChanged();
      }
    })
    .catch((error: unknown) => {
      availableYearsStatus = 'error';
      console.error('Error loading Unfallatlas years:', error);
      notifyYearSelectionChanged();
    });
}

function setSelectedUnfallatlasYears(years: readonly number[]): void {
  const hasSelectionChanged = updateSelectedYears(years, true);

  if (state.isLayerVisible && hasSelectionChanged) {
    requestUnfallatlasMarkerLoad();
  }
}

function setUnfallatlasYearSelected(year: number, selected: boolean): void {
  setSelectedUnfallatlasYears(toggleYear(state.selectedYears, year, selected));
}

export function showUnfallatlasLayer(
  map: L.Map,
  sourceId: UnfallatlasSourceId,
): void {
  if (sourceId !== state.sourceId) {
    state.sourceId = sourceId;
    // Source changed: the previously loaded markers no longer match, so force a
    // reload rather than short-circuiting on the cached selection key.
    state.loadedSelectionKey = null;
  }
  state.isLayerVisible = true;
  attachAccidentMarkersForSource(map, state.sourceId);
  requestUnfallatlasMarkerLoad();
}

export function hideUnfallatlasLayer(map: L.Map): void {
  state.isLayerVisible = false;
  state.hasQueuedReload = false;
  detachAccidentMarkersForSource(map, state.sourceId);
}

function requestUnfallatlasMarkerLoad(): void {
  if (!state.isLayerVisible) {
    return;
  }

  if (state.markerLoadPromise) {
    state.hasQueuedReload = true;
    return;
  }

  state.markerLoadPromise = loadSelectedUnfallatlasYears()
    .catch((error: unknown) => {
      clearAccidentMarkersForSource(state.sourceId);
      console.error('Error loading Unfallatlas data:', error);
    })
    .finally(() => {
      state.markerLoadPromise = null;
      if (state.hasQueuedReload) {
        state.hasQueuedReload = false;
        requestUnfallatlasMarkerLoad();
      }
    });
}

async function loadSelectedUnfallatlasYears(): Promise<void> {
  await ensureYearSelectionInitialized();

  const yearsSnapshot = state.selectedYears;
  const sourceId = state.sourceId;
  const currentSelectionKey = toSelectionKey(sourceId, yearsSnapshot);
  if (currentSelectionKey === state.loadedSelectionKey) {
    return;
  }

  clearAccidentMarkersForSource(sourceId);

  if (yearsSnapshot.length === 0) {
    state.loadedSelectionKey = currentSelectionKey;
    return;
  }

  beginAccidentMarkerBatch(sourceId);
  const result = await loadUnfallatlasMarkersForYears(
    yearsSnapshot,
    REGION_FILTER_BY_SOURCE[sourceId],
    sourceId,
  ).finally(() => {
    endAccidentMarkerBatch(sourceId);
  });
  state.loadedSelectionKey = currentSelectionKey;

  if (result.loadedYears === 0) {
    console.warn(
      'No Unfallatlas CSV files loaded. Add extracted yearly CSV files to data/unfallatlas/.',
    );
    return;
  }

  if (result.markerCount === 0) {
    console.warn(
      'Unfallatlas CSV files were loaded but produced no mappable markers.',
    );
    return;
  }

  console.info(
    `Loaded ${result.markerCount} Unfallatlas markers from ${result.loadedYears} year file(s).`,
  );
}

async function ensureYearSelectionInitialized(): Promise<void> {
  if (state.hasInitializedYearSelection) {
    return;
  }

  if (!state.yearSelectionInitializationPromise) {
    state.yearSelectionInitializationPromise = getAvailableUnfallatlasYears()
      .then((availableYears) => {
        updateSelectedYears(
          !state.hasInitializedYearSelection && state.selectedYears.length === 0
            ? availableYears
            : state.selectedYears,
          true,
        );
      })
      .finally(() => {
        state.yearSelectionInitializationPromise = null;
      });
  }

  return state.yearSelectionInitializationPromise;
}

function updateSelectedYears(
  years: readonly number[],
  markInitialized: boolean,
): boolean {
  const normalizedYears = normalizeYears(years);
  const hasSelectionChanged = !areYearsEqual(
    state.selectedYears,
    normalizedYears,
  );
  const hasInitializationChanged =
    markInitialized && !state.hasInitializedYearSelection;

  if (!hasSelectionChanged && !hasInitializationChanged) {
    return false;
  }

  state.selectedYears = normalizedYears;
  if (markInitialized) {
    state.hasInitializedYearSelection = true;
  }
  if (hasSelectionChanged) {
    state.loadedSelectionKey = null;
  }
  notifyYearSelectionChanged();

  return hasSelectionChanged;
}

function notifyYearSelectionChanged(): void {
  for (const listener of unfallatlasYearListeners) {
    listener();
  }
}

function toSelectionKey(
  sourceId: UnfallatlasSourceId,
  years: readonly number[],
): string {
  return `${sourceId}|${years.join(',')}`;
}
