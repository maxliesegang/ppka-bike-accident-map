import { latLngToCell } from 'h3-js';
import type { AccidentType, SeverityType } from '../../data/accident-styles';
import type { AccidentRecord, Hotspot } from './hotspot-types';

/**
 * H3 resolution used to snap accidents into hotspot bins. Resolution 10 hexagons
 * span roughly 130 m across — coarse enough to absorb the Unfallatlas coordinate
 * jitter (~30–50 m) so accidents at the same junction land in one bin, yet fine
 * enough that distinct junctions stay separate. Kept as a single named constant
 * so later roadmap items (Gi\* hotspots, KDE) can share the exact same grid.
 */
export const HOTSPOT_H3_RESOLUTION = 10;

interface HotspotAccumulator {
  count: number;
  latSum: number;
  lngSum: number;
  readonly accidentTypeCounts: Map<AccidentType, number>;
  readonly severityTypeCounts: Map<SeverityType, number>;
}

/**
 * Snaps each accident to an H3 cell and tallies per cell — an O(n) pass over a
 * hash map. Returns one {@link Hotspot} per occupied cell. The cell is only the
 * grouping key: each hotspot is positioned at the **mean of its member
 * accidents**, not the fixed hex center, so the reported location tracks where
 * the accidents actually are (and averages out the coordinate jitter) rather
 * than pointing at an arbitrary grid vertex. The result is unordered; ranking
 * and adjacent-bin merging are separate concerns.
 */
export function binAccidentsIntoHotspots(
  records: Iterable<AccidentRecord>,
  resolution: number = HOTSPOT_H3_RESOLUTION,
): Hotspot[] {
  const accumulatorByCell = new Map<string, HotspotAccumulator>();

  for (const record of records) {
    if (!Number.isFinite(record.lat) || !Number.isFinite(record.lng)) {
      continue;
    }

    const cellId = latLngToCell(record.lat, record.lng, resolution);
    const accumulator = getOrCreateAccumulator(accumulatorByCell, cellId);
    accumulator.count += 1;
    accumulator.latSum += record.lat;
    accumulator.lngSum += record.lng;
    increment(accumulator.accidentTypeCounts, record.accidentType);
    increment(accumulator.severityTypeCounts, record.severityType);
  }

  const hotspots: Hotspot[] = [];
  for (const [cellId, accumulator] of accumulatorByCell) {
    hotspots.push({
      id: cellId,
      lat: accumulator.latSum / accumulator.count,
      lng: accumulator.lngSum / accumulator.count,
      count: accumulator.count,
      accidentTypeCounts: accumulator.accidentTypeCounts,
      severityTypeCounts: accumulator.severityTypeCounts,
    });
  }

  return hotspots;
}

function getOrCreateAccumulator(
  accumulatorByCell: Map<string, HotspotAccumulator>,
  cellId: string,
): HotspotAccumulator {
  const existing = accumulatorByCell.get(cellId);
  if (existing) {
    return existing;
  }

  const created: HotspotAccumulator = {
    count: 0,
    latSum: 0,
    lngSum: 0,
    accidentTypeCounts: new Map(),
    severityTypeCounts: new Map(),
  };
  accumulatorByCell.set(cellId, created);
  return created;
}

function increment<T>(counts: Map<T, number>, key: T): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}
