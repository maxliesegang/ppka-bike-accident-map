import * as L from 'leaflet';
import type { DataSourceId } from '../../map/data-source-types';
import { ACCIDENT_POPUP_OPTIONS } from '../../map/popup-options';
import { renderHotspotPopup } from './hotspot-popup-renderer';
import { getHotspotDisplayRadiusMeters, type Hotspot } from './hotspot-types';

/** Zoom the map reaches when a hotspot is selected, unless already closer in. */
const HOTSPOT_FOCUS_ZOOM = 17;

/** Leaflet style for the area circle drawn around the focused hotspot. */
const HOTSPOT_CIRCLE_STYLE: L.CircleMarkerOptions = {
  color: '#d4351c',
  weight: 2,
  fillColor: '#d4351c',
  fillOpacity: 0.12,
  interactive: false,
};

// Only one hotspot is focused at a time, so a single shared circle is tracked at
// module scope and replaced on each focus / cleared when the popup closes.
let activeCircle: L.Circle | null = null;
let popupCloseBound = false;

/**
 * Flies the map to a hotspot, draws a circle covering the area its accidents were
 * grouped from, and opens its detail popup — the click-through from a leaderboard
 * row. The circle answers "which area is this?": a clicked spot reads as a bounded
 * region rather than a floating point. Never zooms out: a user already zoomed in
 * past the focus level keeps their closer view.
 */
export function focusHotspot(
  map: L.Map,
  hotspot: Hotspot,
  dataSourceId: DataSourceId,
  rank: number,
): void {
  const target: L.LatLngExpression = [hotspot.lat, hotspot.lng];
  const targetZoom = Math.max(map.getZoom(), HOTSPOT_FOCUS_ZOOM);

  clearActiveCircle();
  bindPopupClose(map);

  map.flyTo(target, targetZoom);

  // Open the popup first: it synchronously closes any previous hotspot popup and
  // fires `popupclose` (clearing the already-null circle). Only then draw the new
  // circle, so that stale event cannot remove it.
  L.popup(ACCIDENT_POPUP_OPTIONS)
    .setLatLng(target)
    .setContent(renderHotspotPopup(hotspot, dataSourceId, rank))
    .openOn(map);

  activeCircle = L.circle(target, {
    ...HOTSPOT_CIRCLE_STYLE,
    radius: getHotspotDisplayRadiusMeters(hotspot),
  }).addTo(map);
}

function clearActiveCircle(): void {
  if (activeCircle) {
    activeCircle.remove();
    activeCircle = null;
  }
}

// The circle is a companion to the popup: once the popup is dismissed the area
// cue has no owner, so it is removed too. Registered once per map — a fresh focus
// replaces the circle up front, so the stale close event has nothing to clear.
function bindPopupClose(map: L.Map): void {
  if (popupCloseBound) {
    return;
  }
  popupCloseBound = true;
  map.on('popupclose', clearActiveCircle);
}
