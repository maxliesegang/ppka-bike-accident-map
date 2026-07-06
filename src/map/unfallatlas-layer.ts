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
} from './unfallatlas-loader';

interface UnfallatlasLayerState {
  selectedYears: number[];
  hasInitializedYearSelection: boolean;
  yearSelectionInitializationPromise: Promise<void> | null;
  isLayerVisible: boolean;
  loadedYearSelectionKey: string | null;
  markerLoadPromise: Promise<void> | null;
  hasQueuedReload: boolean;
}

const state: UnfallatlasLayerState = {
  selectedYears: [],
  hasInitializedYearSelection: false,
  yearSelectionInitializationPromise: null,
  isLayerVisible: false,
  loadedYearSelectionKey: null,
  markerLoadPromise: null,
  hasQueuedReload: false,
};

const unfallatlasYearListeners = new Set<() => void>();

// Re-exported so UI panels depend only on this layer facade, not the loader.
export { getAvailableUnfallatlasYears };

export function getSelectedUnfallatlasYears(): readonly number[] {
  return state.selectedYears;
}

export function subscribeToUnfallatlasYears(listener: () => void): () => void {
  unfallatlasYearListeners.add(listener);
  return () => {
    unfallatlasYearListeners.delete(listener);
  };
}

export function setSelectedUnfallatlasYears(years: readonly number[]): void {
  const hasSelectionChanged = updateSelectedYears(years, true);

  if (state.isLayerVisible && hasSelectionChanged) {
    requestUnfallatlasMarkerLoad();
  }
}

export function setUnfallatlasYearSelected(
  year: number,
  selected: boolean,
): void {
  const nextYears = new Set(state.selectedYears);
  if (selected) {
    nextYears.add(year);
  } else {
    nextYears.delete(year);
  }

  setSelectedUnfallatlasYears([...nextYears]);
}

export function showUnfallatlasLayer(map: L.Map): void {
  state.isLayerVisible = true;
  attachAccidentMarkersForSource(map, 'unfallatlas');
  requestUnfallatlasMarkerLoad();
}

export function hideUnfallatlasLayer(map: L.Map): void {
  state.isLayerVisible = false;
  state.hasQueuedReload = false;
  detachAccidentMarkersForSource(map, 'unfallatlas');
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
      clearAccidentMarkersForSource('unfallatlas');
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
  const currentYearsKey = toYearSelectionKey(yearsSnapshot);
  if (currentYearsKey === state.loadedYearSelectionKey) {
    return;
  }

  clearAccidentMarkersForSource('unfallatlas');

  if (yearsSnapshot.length === 0) {
    state.loadedYearSelectionKey = currentYearsKey;
    return;
  }

  beginAccidentMarkerBatch('unfallatlas');
  const result = await loadUnfallatlasMarkersForYears(yearsSnapshot).finally(
    () => {
      endAccidentMarkerBatch('unfallatlas');
    },
  );
  state.loadedYearSelectionKey = currentYearsKey;

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
    state.loadedYearSelectionKey = null;
  }
  notifyYearSelectionChanged();

  return hasSelectionChanged;
}

function notifyYearSelectionChanged(): void {
  for (const listener of unfallatlasYearListeners) {
    listener();
  }
}

function normalizeYears(years: readonly number[]): number[] {
  const uniqueYears = new Set<number>();

  for (const year of years) {
    if (Number.isInteger(year)) {
      uniqueYears.add(year);
    }
  }

  return [...uniqueYears].sort((a, b) => a - b);
}

function areYearsEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function toYearSelectionKey(years: readonly number[]): string {
  return years.join(',');
}
