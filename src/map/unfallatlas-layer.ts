import * as L from 'leaflet';
import {
  beginMarkerRegistrationBatch,
  clearRegisteredMarkers,
  endMarkerRegistrationBatch,
  attachMarkersForSource,
  detachMarkersForSource,
} from './marker-store';
import {
  getAvailableUnfallatlasYears,
  loadUnfallatlasMarkersForYears,
} from './unfallatlas-loader';

interface UnfallatlasLayerState {
  selectedYears: number[];
  hasInitializedSelection: boolean;
  selectionInitPromise: Promise<void> | null;
  isVisible: boolean;
  loadedYearsKey: string | null;
  loadPromise: Promise<void> | null;
  hasPendingReload: boolean;
}

const state: UnfallatlasLayerState = {
  selectedYears: [],
  hasInitializedSelection: false,
  selectionInitPromise: null,
  isVisible: false,
  loadedYearsKey: null,
  loadPromise: null,
  hasPendingReload: false,
};

const yearSelectionListeners = new Set<() => void>();

export async function fetchUnfallatlasAvailableYears(): Promise<number[]> {
  return getAvailableUnfallatlasYears();
}

export function getSelectedUnfallatlasYears(): readonly number[] {
  return state.selectedYears;
}

export function subscribeToUnfallatlasYears(listener: () => void): () => void {
  yearSelectionListeners.add(listener);
  return () => {
    yearSelectionListeners.delete(listener);
  };
}

export function setUnfallatlasYears(years: readonly number[]): void {
  const hasSelectionChanged = applySelectedYears(years, true);

  if (state.isVisible && hasSelectionChanged) {
    triggerLoad();
  }
}

export function setUnfallatlasYearSelection(
  year: number,
  selected: boolean,
): void {
  const nextYears = new Set(state.selectedYears);
  if (selected) {
    nextYears.add(year);
  } else {
    nextYears.delete(year);
  }

  setUnfallatlasYears([...nextYears]);
}

export function showUnfallatlasLayer(map: L.Map): void {
  state.isVisible = true;
  attachMarkersForSource(map, 'unfallatlas');
  triggerLoad();
}

export function hideUnfallatlasLayer(map: L.Map): void {
  state.isVisible = false;
  state.hasPendingReload = false;
  detachMarkersForSource(map, 'unfallatlas');
}

function triggerLoad(): void {
  if (!state.isVisible) {
    return;
  }

  if (state.loadPromise) {
    state.hasPendingReload = true;
    return;
  }

  state.loadPromise = loadUnfallatlasForCurrentSelection()
    .catch((error: unknown) => {
      clearRegisteredMarkers('unfallatlas');
      console.error('Error loading Unfallatlas data:', error);
    })
    .finally(() => {
      state.loadPromise = null;
      if (state.hasPendingReload) {
        state.hasPendingReload = false;
        triggerLoad();
      }
    });
}

async function loadUnfallatlasForCurrentSelection(): Promise<void> {
  await ensureSelectionInitialized();

  const yearsSnapshot = state.selectedYears;
  const currentYearsKey = toYearsKey(yearsSnapshot);
  if (currentYearsKey === state.loadedYearsKey) {
    return;
  }

  clearRegisteredMarkers('unfallatlas');

  if (yearsSnapshot.length === 0) {
    state.loadedYearsKey = currentYearsKey;
    return;
  }

  beginMarkerRegistrationBatch('unfallatlas');
  const result = await loadUnfallatlasMarkersForYears(yearsSnapshot).finally(
    () => {
      endMarkerRegistrationBatch('unfallatlas');
    },
  );
  state.loadedYearsKey = currentYearsKey;

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

async function ensureSelectionInitialized(): Promise<void> {
  if (state.hasInitializedSelection) {
    return;
  }

  if (!state.selectionInitPromise) {
    state.selectionInitPromise = fetchUnfallatlasAvailableYears()
      .then((availableYears) => {
        applySelectedYears(
          !state.hasInitializedSelection && state.selectedYears.length === 0
            ? availableYears
            : state.selectedYears,
          true,
        );
      })
      .finally(() => {
        state.selectionInitPromise = null;
      });
  }

  return state.selectionInitPromise;
}

function applySelectedYears(
  years: readonly number[],
  markInitialized: boolean,
): boolean {
  const normalizedYears = normalizeYears(years);
  const hasSelectionChanged = !areYearsEqual(
    state.selectedYears,
    normalizedYears,
  );
  const hasInitializationChanged =
    markInitialized && !state.hasInitializedSelection;

  if (!hasSelectionChanged && !hasInitializationChanged) {
    return false;
  }

  state.selectedYears = normalizedYears;
  if (markInitialized) {
    state.hasInitializedSelection = true;
  }
  if (hasSelectionChanged) {
    state.loadedYearsKey = null;
  }
  notifyYearSelectionChanged();

  return hasSelectionChanged;
}

function notifyYearSelectionChanged(): void {
  for (const listener of yearSelectionListeners) {
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

function toYearsKey(years: readonly number[]): string {
  return years.join(',');
}
