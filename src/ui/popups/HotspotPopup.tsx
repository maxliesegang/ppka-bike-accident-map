import {
  KernDescriptionList,
  KernDivider,
  KernHeading,
  KernText,
} from '@kern-ux-annex/kern-react-kit';
import type { AccidentType, SeverityType } from '../../data/accident-styles';
import {
  getHotspotCaveat,
  formatAccidentCount,
  getAccidentTypeLabel,
  getSeverityTypeLabel,
} from '../../features/hotspots/hotspot-labels';
import type { Hotspot } from '../../features/hotspots/hotspot-types';
import type { DataSourceId } from '../../map/data-source-types';

interface HotspotPopupProps {
  hotspot: Hotspot;
  dataSourceId: DataSourceId;
}

/**
 * Content for the popup opened when a leaderboard row is selected. Summarizes a
 * single hotspot — its total and its breakdown by accident type and severity —
 * reusing the marker popup's Kern layout so both read as one system. Rendered to
 * a static HTML string by `renderHotspotPopup`.
 */
export function HotspotPopup({ hotspot, dataSourceId }: HotspotPopupProps) {
  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="popup-title">
          <KernText type="preline" size="small">
            Karlsruhe · Fuß- & Radverkehr
          </KernText>
          <KernHeading level={3} size="small">
            Unfallschwerpunkt
          </KernHeading>
        </div>
      </header>

      <p className="hotspot-popup__count">{formatAccidentCount(hotspot.count)}</p>

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

      <KernText type="body" size="small" muted>
        {getHotspotCaveat(dataSourceId)}
      </KernText>
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
