import type { AccidentType, SeverityType } from '../../data/accident-styles';

/**
 * A single accident reduced to what spatial aggregation needs: a position and
 * its classification. Detached from Leaflet markers so the binning and ranking
 * code stays pure and unit-testable.
 */
export interface AccidentRecord {
  readonly lat: number;
  readonly lng: number;
  readonly accidentType: AccidentType;
  readonly severityType: SeverityType;
}

/**
 * One aggregated location — the accidents that snapped to a single spatial bin.
 * `id` is the bin's stable key (an H3 cell index) and `lat`/`lng` its centroid,
 * so a hotspot can be ranked, listed, and flown to. The per-type tallies are the
 * substrate later roadmap items (severity scoring, mechanism labelling) build on.
 */
export interface Hotspot {
  readonly id: string;
  readonly lat: number;
  readonly lng: number;
  readonly count: number;
  readonly accidentTypeCounts: ReadonlyMap<AccidentType, number>;
  readonly severityTypeCounts: ReadonlyMap<SeverityType, number>;
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
