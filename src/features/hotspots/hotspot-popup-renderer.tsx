import { renderToStaticMarkup } from 'react-dom/server';
import type { DataSourceId } from '../../map/data-source-types';
import { HotspotPopup } from '../../ui/popups/HotspotPopup';
import type { Hotspot } from './hotspot-types';

/**
 * Renders a hotspot's popup to a static HTML string for Leaflet, mirroring
 * `renderAccidentPopup` for single markers. React escapes all values.
 */
export function renderHotspotPopup(
  hotspot: Hotspot,
  dataSourceId: DataSourceId,
  rank: number,
): string {
  return renderToStaticMarkup(
    <HotspotPopup hotspot={hotspot} dataSourceId={dataSourceId} rank={rank} />,
  );
}
