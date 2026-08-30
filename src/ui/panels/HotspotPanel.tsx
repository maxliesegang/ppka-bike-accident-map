import { KernText } from '@kern-ux-annex/kern-react-kit';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useSyncExternalStore } from 'react';
import { getAccidentColor } from '../../data/accident-styles';
import { focusHotspot } from '../../features/hotspots/hotspot-focus';
import {
  formatAccidentCount,
  getAccidentTypeLabel,
  getHotspotCaveat,
} from '../../features/hotspots/hotspot-labels';
import {
  getRankedHotspots,
  subscribeToHotspots,
} from '../../features/hotspots/hotspot-store';
import {
  getDominantAccidentType,
  type Hotspot,
} from '../../features/hotspots/hotspot-types';
import {
  getSelectedDataSourceId,
  subscribeToDataSourceId,
} from '../../map/data-source-store';
import { PanelFrame } from './PanelFrame';

/**
 * The ranked "worst spots" leaderboard. Aggregates the currently visible
 * accidents into spatial bins (see `hotspot-store`) and lists the busiest;
 * selecting a row flies the map there and opens the spot's detail popup. Ranking
 * is by raw count — labelled as a lower bound and not exposure-adjusted.
 */
export function HotspotPanel({ map }: { map: MapLibreMap }) {
  const hotspots = useSyncExternalStore(subscribeToHotspots, getRankedHotspots);
  const dataSourceId = useSyncExternalStore(
    subscribeToDataSourceId,
    getSelectedDataSourceId,
  );

  return (
    <PanelFrame
      modifier="cp--hotspot"
      toggleLabel="Schwerpunkte"
      toggleIcon="warning"
      preline="Karlsruhe · Fuß- & Radverkehr"
      title="Unfallschwerpunkte"
    >
      <KernText type="body" muted className="cp__hint">
        Die am stärksten betroffenen Orte im aktuellen Filter.{' '}
        {getHotspotCaveat(dataSourceId)}
      </KernText>

      {hotspots.length === 0 ? (
        <KernText type="body" muted aria-live="polite">
          Keine Unfälle im aktuellen Filter.
        </KernText>
      ) : (
        <ol className="cp__hotspot-list">
          {hotspots.map((hotspot, index) => (
            <li key={hotspot.id}>
              <HotspotRow
                hotspot={hotspot}
                rank={index + 1}
                onSelect={() =>
                  focusHotspot(map, hotspot, dataSourceId, index + 1)
                }
              />
            </li>
          ))}
        </ol>
      )}
    </PanelFrame>
  );
}

function HotspotRow({
  hotspot,
  rank,
  onSelect,
}: {
  hotspot: Hotspot;
  rank: number;
  onSelect: () => void;
}) {
  const dominantType = getDominantAccidentType(hotspot);
  const countLabel = formatAccidentCount(hotspot.count);
  const typeLabel = dominantType ? getAccidentTypeLabel(dominantType) : null;

  return (
    <button
      type="button"
      className="cp__hotspot-row"
      onClick={onSelect}
      aria-label={`Platz ${rank}: ${countLabel}${typeLabel ? `, überwiegend ${typeLabel}` : ''}. Auf Karte anzeigen.`}
    >
      <span className="cp__hotspot-rank" aria-hidden="true">
        {rank}
      </span>
      <span className="cp__hotspot-body">
        <span className="cp__hotspot-count">{countLabel}</span>
        {typeLabel && dominantType && (
          <span className="cp__hotspot-type">
            <span
              className="cp__swatch"
              style={{ background: getAccidentColor(dominantType) }}
              aria-hidden="true"
            />
            {typeLabel}
          </span>
        )}
      </span>
    </button>
  );
}
