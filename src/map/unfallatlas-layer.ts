import * as L from 'leaflet';
import {
  beginMarkerRegistrationBatch,
  clearRegisteredMarkers,
  endMarkerRegistrationBatch,
  hideUnfallatlasMarkers,
  showUnfallatlasMarkers,
} from './layer-filter-utils';
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

export async function fetchUnfallatlasAvailableYears(): Promise<number[]> {
  return getAvailableUnfallatlasYears();
}

export function getSelectedUnfallatlasYears(): readonly number[] {
  return state.selectedYears;
}

export function setUnfallatlasYears(years: readonly number[]): void {
  const normalizedYears = normalizeYears(years);
  if (areYearsEqual(state.selectedYears, normalizedYears)) {
    return;
  }

  state.selectedYears = normalizedYears;
  state.hasInitializedSelection = true;
  state.loadedYearsKey = null;

  if (state.isVisible) {
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
  showUnfallatlasMarkers(map);
  triggerLoad();
}

export function hideUnfallatlasLayer(map: L.Map): void {
  state.isVisible = false;
  state.hasPendingReload = false;
  hideUnfallatlasMarkers(map);
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
        if (state.selectedYears.length === 0) {
          state.selectedYears = normalizeYears(availableYears);
        }
        state.hasInitializedSelection = true;
      })
      .finally(() => {
        state.selectionInitPromise = null;
      });
  }

  return state.selectionInitPromise;
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
