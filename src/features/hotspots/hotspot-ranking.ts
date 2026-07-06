import type { Hotspot } from './hotspot-types';

/** How many spots the leaderboard surfaces. */
export const HOTSPOT_LEADERBOARD_SIZE = 30;

/**
 * Orders hotspots worst-first and keeps the top `limit`. Ranking is by raw
 * accident count — the honest, exposure-free baseline. Severity-weighted scoring
 * is a deliberate later step (roadmap 1.2); ties here break on the cell id purely
 * so the order is stable across recomputes.
 */
export function rankHotspots(
  hotspots: readonly Hotspot[],
  limit: number = HOTSPOT_LEADERBOARD_SIZE,
): Hotspot[] {
  return [...hotspots].sort(compareHotspots).slice(0, limit);
}

function compareHotspots(a: Hotspot, b: Hotspot): number {
  if (b.count !== a.count) {
    return b.count - a.count;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
