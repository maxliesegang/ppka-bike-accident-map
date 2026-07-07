import { gridDisk } from 'h3-js';
import type { AccidentType, SeverityType } from '../../data/accident-styles';
import { distanceMeters } from './hotspot-geometry';
import type { GeoPoint, Hotspot } from './hotspot-types';

/**
 * Two adjacent hex bins are stitched into one spot only when their accident
 * centroids are at most this far apart. This is the guard against over-merging:
 * a single cluster split across a cell boundary piles up *near* that boundary,
 * so both bins' centroids sit close together (well under this threshold); two
 * genuinely distinct junctions in neighbouring cells keep their centroids near
 * the respective cell centers (~130 m apart) and are left separate. 60 m is
 * comfortably above the ~30–50 m coordinate jitter yet well below the cell pitch.
 */
export const HOTSPOT_MERGE_DISTANCE_METERS = 60;

/**
 * Reconciles the raw per-cell bins into hotspots that follow the accidents
 * rather than the grid. Adjacent occupied cells whose centroids are within
 * {@link HOTSPOT_MERGE_DISTANCE_METERS} are unioned into a single spot with the
 * combined count, summed type/severity tallies, and a count-weighted centroid —
 * fixing the fixed-grid failure where one real cluster straddling a hex edge is
 * split into two weaker, mislocated bins.
 */
export function mergeAdjacentHotspots(
  hotspots: readonly Hotspot[],
  maxDistanceMeters: number = HOTSPOT_MERGE_DISTANCE_METERS,
): Hotspot[] {
  if (hotspots.length < 2) {
    return [...hotspots];
  }

  const hotspotById = new Map(hotspots.map((hotspot) => [hotspot.id, hotspot]));
  const unionFind = new UnionFind(hotspotById.keys());

  for (const hotspot of hotspots) {
    for (const neighborId of gridDisk(hotspot.id, 1)) {
      // Only occupied neighbours, and each undirected pair exactly once.
      if (neighborId <= hotspot.id) {
        continue;
      }
      const neighbor = hotspotById.get(neighborId);
      if (!neighbor) {
        continue;
      }

      if (distanceMeters(hotspot, neighbor) <= maxDistanceMeters) {
        unionFind.union(hotspot.id, neighborId);
      }
    }
  }

  const membersByRoot = new Map<string, Hotspot[]>();
  for (const hotspot of hotspots) {
    const root = unionFind.find(hotspot.id);
    const members = membersByRoot.get(root);
    if (members) {
      members.push(hotspot);
    } else {
      membersByRoot.set(root, [hotspot]);
    }
  }

  const merged: Hotspot[] = [];
  for (const members of membersByRoot.values()) {
    merged.push(members.length === 1 ? members[0] : mergeMembers(members));
  }
  return merged;
}

function mergeMembers(members: readonly Hotspot[]): Hotspot {
  let totalCount = 0;
  let latSum = 0;
  let lngSum = 0;
  const accidentTypeCounts = new Map<AccidentType, number>();
  const severityTypeCounts = new Map<SeverityType, number>();
  // The busiest member cell represents the merged spot: a stable, meaningful id.
  let representative = members[0];

  for (const member of members) {
    totalCount += member.count;
    // member.lat*count recovers the member's accident lat-sum, so the combined
    // centroid is the exact mean over every accident in the merged spot.
    latSum += member.lat * member.count;
    lngSum += member.lng * member.count;
    addCounts(accidentTypeCounts, member.accidentTypeCounts);
    addCounts(severityTypeCounts, member.severityTypeCounts);
    if (member.count > representative.count) {
      representative = member;
    }
  }

  const centroid: GeoPoint = { lat: latSum / totalCount, lng: lngSum / totalCount };

  return {
    id: representative.id,
    lat: centroid.lat,
    lng: centroid.lng,
    count: totalCount,
    radiusMeters: mergedRadiusMeters(centroid, members),
    accidentTypeCounts,
    severityTypeCounts,
  };
}

/**
 * Enclosing radius of the merged spot around its new centroid, without keeping
 * every member accident's coordinate around: the farthest accident in a member
 * cell is at most `dist(newCentroid, memberCentroid) + memberRadius` away, so the
 * max of that bound over all members is guaranteed to enclose the whole cluster.
 * Slightly conservative (never minimal), which is fine — the circle is an
 * approximate area cue, not a precise boundary.
 */
function mergedRadiusMeters(
  centroid: GeoPoint,
  members: readonly Hotspot[],
): number {
  let radius = 0;
  for (const member of members) {
    const reach = distanceMeters(centroid, member) + member.radiusMeters;
    if (reach > radius) {
      radius = reach;
    }
  }
  return radius;
}

function addCounts<T>(target: Map<T, number>, source: ReadonlyMap<T, number>): void {
  for (const [key, count] of source) {
    target.set(key, (target.get(key) ?? 0) + count);
  }
}

/** Minimal union-find over string keys (path compression, union by size). */
class UnionFind {
  private readonly parent = new Map<string, string>();
  private readonly size = new Map<string, number>();

  constructor(keys: Iterable<string>) {
    for (const key of keys) {
      this.parent.set(key, key);
      this.size.set(key, 1);
    }
  }

  find(key: string): string {
    let root = key;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // Path compression: point every node on the path straight at the root.
    let node = key;
    while (node !== root) {
      const next = this.parent.get(node)!;
      this.parent.set(node, root);
      node = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) {
      return;
    }

    const sizeA = this.size.get(rootA)!;
    const sizeB = this.size.get(rootB)!;
    const [larger, smaller] = sizeA >= sizeB ? [rootA, rootB] : [rootB, rootA];
    this.parent.set(smaller, larger);
    this.size.set(larger, sizeA + sizeB);
  }
}
