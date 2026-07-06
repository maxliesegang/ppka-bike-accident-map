import { ACCIDENT_LEGENDS, SEVERITY_LEGENDS } from '../../constants';
import type { AccidentType, SeverityType } from '../../data/accident-styles';
import {
  isUnfallatlasSource,
  type DataSourceId,
} from '../../map/data-source-types';

const accidentTypeLabels = new Map<AccidentType, string>(
  ACCIDENT_LEGENDS.map(({ type, description }) => [type, description]),
);
const severityTypeLabels = new Map<SeverityType, string>(
  SEVERITY_LEGENDS.map(({ type, description }) => [type, description]),
);
const countFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0,
});

// Always-true caveats, phrased for a lay reader: raw counts conflate "busy"
// with "dangerous" (no exposure normalization), and spots are an approximate
// grid grouping rather than exact points.
const HOTSPOT_CAVEAT_BASE =
  'Ein Ort kann auch weit oben stehen, weil dort einfach viel Verkehr ist – die Zahlen sind nicht auf die Verkehrsmenge umgerechnet. Nahe beieinander liegende Unfälle werden zu einem Schwerpunkt zusammengefasst; die angezeigte Position ist ungefähr.';

// Source-specific: the Unfallatlas only publishes injury accidents, so its
// counts are a lower bound. This is a property of the data, not an app filter —
// the local source *does* include no-injury accidents, and which severities
// count is entirely up to the legend selection. So it must not be shown there.
const HOTSPOT_CAVEAT_UNFALLATLAS_INJURY_ONLY =
  'Gezählt werden nur Unfälle, bei denen Menschen verletzt oder getötet wurden – Unfälle mit reinem Sachschaden fehlen, die tatsächliche Zahl liegt also höher.';

/**
 * Honesty caveat surfaced wherever a hotspot count is shown, tailored to the
 * active data source (see the roadmap's data-methodology notes).
 */
export function getHotspotCaveat(dataSourceId: DataSourceId): string {
  return isUnfallatlasSource(dataSourceId)
    ? `${HOTSPOT_CAVEAT_UNFALLATLAS_INJURY_ONLY} ${HOTSPOT_CAVEAT_BASE}`
    : HOTSPOT_CAVEAT_BASE;
}

export function getAccidentTypeLabel(type: AccidentType): string {
  return accidentTypeLabels.get(type) ?? type;
}

export function getSeverityTypeLabel(type: SeverityType): string {
  return severityTypeLabels.get(type) ?? type;
}

export function formatAccidentCount(count: number): string {
  return `${formatCount(count)} ${getAccidentUnit(count)}`;
}

/** The count on its own, so a hero number can be styled apart from its unit. */
export function formatCount(count: number): string {
  return countFormatter.format(count);
}

/** The grammatically correct unit for a count, shown next to a hero number. */
export function getAccidentUnit(count: number): string {
  return count === 1 ? 'Unfall' : 'Unfälle';
}
