import * as L from 'leaflet';
import type { DataSourceId } from '../../map/data-source-types';
import { ACCIDENT_POPUP_OPTIONS } from '../../map/popup-options';
import { renderHotspotPopup } from './hotspot-popup-renderer';
import type { Hotspot } from './hotspot-types';

/** Zoom the map reaches when a hotspot is selected, unless already closer in. */
const HOTSPOT_FOCUS_ZOOM = 17;

/**
 * Flies the map to a hotspot and opens its detail popup — the click-through from
 * a leaderboard row. Never zooms out: a user already zoomed in past the focus
 * level keeps their closer view.
 */
export function focusHotspot(
  map: L.Map,
  hotspot: Hotspot,
  dataSourceId: DataSourceId,
  rank: number,
): void {
  const target: L.LatLngExpression = [hotspot.lat, hotspot.lng];
  const targetZoom = Math.max(map.getZoom(), HOTSPOT_FOCUS_ZOOM);

  map.flyTo(target, targetZoom);
  L.popup(ACCIDENT_POPUP_OPTIONS)
    .setLatLng(target)
    .setContent(renderHotspotPopup(hotspot, dataSourceId, rank))
    .openOn(map);
}
