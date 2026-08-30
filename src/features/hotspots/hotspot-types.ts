import type { AccidentType, SeverityType } from '../../data/accident-styles';

/**
 * A geographic position — the shared shape every located thing here carries
 * (accidents, hotspot centroids, raw points). Kept minimal so the geometry
 * helpers in `hotspot-geometry` accept any of them structurally.
 */
export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

/**
 * A single accident reduced to what spatial aggregation needs: a position and
 * its classification. Detached from the map's marker layer so the binning and
 * ranking code stays pure and unit-testable.
 */
export interface AccidentRecord extends GeoPoint {
  readonly accidentType: AccidentType;
  readonly severityType: SeverityType;
}

/**
 * One aggregated location — the accidents that snapped to a single spatial bin.
 * `id` is the bin's stable key (an H3 cell index) and `lat`/`lng` its centroid,
 * so a hotspot can be ranked, listed, and flown to. The per-type tallies are the
 * substrate later roadmap items (severity scoring, mechanism labelling) build on.
 *
 * `radiusMeters` is the distance from the centroid to the farthest member
 * accident — the enclosing radius of the grouped cluster. It answers "which area
 * does this spot cover?": the map draws it as a circle so a clicked hotspot reads
 * as a bounded region rather than a floating point. Zero for a single-accident
 * spot; see {@link getHotspotDisplayRadiusMeters} for the value actually drawn.
 */
export interface Hotspot extends GeoPoint {
  readonly id: string;
  readonly count: number;
  readonly radiusMeters: number;
  readonly accidentTypeCounts: ReadonlyMap<AccidentType, number>;
  readonly severityTypeCounts: ReadonlyMap<SeverityType, number>;
}

/**
 * Smallest radius the hotspot circle is ever drawn at. A tight cluster (or a
 * single accident) has a near-zero enclosing radius, which would render as an
 * invisible dot; this floor keeps the area cue legible without overstating the
 * spread. The drawn circle and the popup's "Radius ca. …" text share this value.
 */
export const HOTSPOT_MIN_DISPLAY_RADIUS_METERS = 40;

/** The radius the hotspot circle is drawn at: its true spread, floored for legibility. */
export function getHotspotDisplayRadiusMeters(hotspot: Hotspot): number {
  return Math.max(hotspot.radiusMeters, HOTSPOT_MIN_DISPLAY_RADIUS_METERS);
}

/** The accident type that occurs most often at a hotspot, or `null` if empty. */
export function getDominantAccidentType(hotspot: Hotspot): AccidentType | null {
  let dominantType: AccidentType | null = null;
  let dominantCount = 0;

  for (const [type, count] of hotspot.accidentTypeCounts) {
    if (count > dominantCount) {
      dominantType = type;
      dominantCount = count;
    }
  }

  return dominantType;
}
