import { greatCircleDistance, UNITS } from 'h3-js';
import type { GeoPoint } from './hotspot-types';

/**
 * Pure geographic helpers shared by the binning and merging passes. Keeping the
 * h3-js distance call (and its metres-unit convention) behind this one module
 * means the aggregation code reads in domain terms — distances and radii over
 * {@link GeoPoint}s — and there is a single place to swap the distance metric.
 */

/** Great-circle distance between two positions, in metres. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  return greatCircleDistance([a.lat, a.lng], [b.lat, b.lng], UNITS.m);
}

/**
 * Radius of the smallest circle centered on `center` that contains every point —
 * i.e. the distance to the farthest one. Zero for an empty set or a lone point
 * sitting on the center.
 */
export function enclosingRadiusMeters(
  center: GeoPoint,
  points: readonly GeoPoint[],
): number {
  let radius = 0;
  for (const point of points) {
    const distance = distanceMeters(center, point);
    if (distance > radius) {
      radius = distance;
    }
  }
  return radius;
}
