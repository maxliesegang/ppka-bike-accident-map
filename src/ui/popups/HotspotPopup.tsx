import {
  KernAlert,
  KernDescriptionList,
  KernDivider,
  KernHeading,
  KernText,
} from '@kern-ux-annex/kern-react-kit';
import type { AccidentType, SeverityType } from '../../data/accident-styles';
import {
  getHotspotCaveat,
  formatCount,
  getAccidentTypeLabel,
  getAccidentUnit,
  getSeverityTypeLabel,
} from '../../features/hotspots/hotspot-labels';
import type { Hotspot } from '../../features/hotspots/hotspot-types';
import type { DataSourceId } from '../../map/data-source-types';

interface HotspotPopupProps {
  hotspot: Hotspot;
  dataSourceId: DataSourceId;
  rank: number;
}

/**
 * Content for the popup opened when a leaderboard row is selected. Summarizes a
 * single hotspot — its total and its breakdown by accident type and severity —
 * reusing the marker popup's Kern layout so both read as one system. The rank
 * chip mirrors the leaderboard row that opened it, so the click-through reads as
 * one continuous gesture. Rendered to a static HTML string by `renderHotspotPopup`.
 */
export function HotspotPopup({ hotspot, dataSourceId, rank }: HotspotPopupProps) {
  return (
    <div className="popup-container">
      <header className="popup-header popup-header--with-status">
        <div className="popup-title">
          <KernText type="preline" size="small">
            Karlsruhe · Fuß- & Radverkehr
          </KernText>
          <KernHeading level={3} size="small">
            Unfallschwerpunkt
          </KernHeading>
        </div>
        <span className="popup-rank" aria-label={`Platz ${rank}`}>
          {rank}
        </span>
      </header>

      <p className="popup-hero">
        <span className="popup-hero__value">{formatCount(hotspot.count)}</span>
        <span className="popup-hero__unit">{getAccidentUnit(hotspot.count)}</span>
      </p>

      <section className="popup-details-section" aria-label="Nach Unfallart">
        <KernHeading level={4} size="small">
          Nach Unfallart
        </KernHeading>
        <KernDescriptionList
          details={toLabelledCounts(hotspot.accidentTypeCounts, getAccidentTypeLabel)}
          className="popup-details"
        />
      </section>

      <section className="popup-details-section" aria-label="Nach Schweregrad">
        <KernHeading level={4} size="small">
          Nach Schweregrad
        </KernHeading>
        <KernDescriptionList
          details={toLabelledCounts(hotspot.severityTypeCounts, getSeverityTypeLabel)}
          className="popup-details"
        />
      </section>

      <KernDivider spacing="small" />

      <KernAlert
        variant="info"
        title="Zahlen richtig einordnen"
        className="popup-caveat"
      >
        {getHotspotCaveat(dataSourceId)}
      </KernAlert>
    </div>
  );
}

function toLabelledCounts<T extends AccidentType | SeverityType>(
  counts: ReadonlyMap<T, number>,
  toLabel: (key: T) => string,
): Record<string, string> {
  const details: Record<string, string> = {};
  for (const [key, count] of sortByCountDescending(counts)) {
    details[toLabel(key)] = String(count);
  }
  return details;
}

function sortByCountDescending<T>(counts: ReadonlyMap<T, number>): [T, number][] {
  return [...counts].sort(([, a], [, b]) => b - a);
}
