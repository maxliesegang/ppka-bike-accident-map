import {
  getAccidentMarkerEntries,
  isAccidentVisible,
  isAccidentYearVisible,
  localYearFilterController,
  subscribeToAccidentMarkerData,
  subscribeToAccidentMarkerFilters,
} from '../../map/accident-marker-store';
import {
  getSelectedDataSourceId,
  subscribeToDataSourceId,
} from '../../map/data-source-store';
import { binAccidentsIntoHotspots } from './spatial-binning';
import { mergeAdjacentHotspots } from './hotspot-merging';
import { rankHotspots } from './hotspot-ranking';
import type { AccidentRecord, Hotspot } from './hotspot-types';

/**
 * Derives the ranked "worst spots" leaderboard from what is currently shown on
 * the map: the selected data source, restricted to the accident/severity types
 * and years the user has enabled. It is a read-through cache — the ranked list is
 * recomputed only when one of those inputs changes (accidents (re)loaded, filters
 * or years toggled, data source switched), so `getRankedHotspots` returns a
 * referentially stable snapshot suitable for React's `useSyncExternalStore`.
 */
let cachedHotspots: readonly Hotspot[] = [];
let isDirty = true;
const listeners = new Set<() => void>();

export function getRankedHotspots(): readonly Hotspot[] {
  if (isDirty) {
    cachedHotspots = computeRankedHotspots();
    isDirty = false;
  }
  return cachedHotspots;
}

export function subscribeToHotspots(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function computeRankedHotspots(): readonly Hotspot[] {
  const dataSourceId = getSelectedDataSourceId();
  const records: AccidentRecord[] = [];

  for (const entry of getAccidentMarkerEntries(dataSourceId)) {
    if (!isAccidentVisible(entry.accidentType, entry.severityType)) {
      continue;
    }
    if (!isAccidentYearVisible(dataSourceId, entry.year)) {
      continue;
    }

    const { lat, lng } = entry.marker.getLatLng();
    records.push({
      lat,
      lng,
      accidentType: entry.accidentType,
      severityType: entry.severityType,
    });
  }

  const bins = binAccidentsIntoHotspots(records);
  return rankHotspots(mergeAdjacentHotspots(bins));
}

function invalidate(): void {
  isDirty = true;
  for (const listener of listeners) {
    listener();
  }
}

subscribeToAccidentMarkerData(invalidate);
subscribeToAccidentMarkerFilters(invalidate);
localYearFilterController.subscribe(invalidate);
subscribeToDataSourceId(invalidate);
