import { type LngLatLike, type Map as MapLibreMap, Popup } from 'maplibre-gl';
import { ACCIDENT_POPUP_OPTIONS } from './popup-options';

// MapLibre allows any number of popups at once; the accident views behave like
// a one-popup-at-a-time map, where opening a popup closes the previous one.
// Tracking the single active popup here and removing it before the next opens
// keeps that behavior.
let activePopup: Popup | null = null;

/**
 * Opens the one accident-related popup on the map, closing any previous one —
 * including a hotspot popup, whose companion area circle must react to that
 * close (see `hotspot-focus`). `onClose` fires whenever the popup is dismissed,
 * whether by the user or by another popup replacing it.
 */
export function openAccidentPopup(
  map: MapLibreMap,
  lngLat: LngLatLike,
  html: string,
  onClose?: () => void,
): void {
  activePopup?.remove();

  const popup = new Popup(ACCIDENT_POPUP_OPTIONS)
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map);

  popup.on('close', () => {
    if (activePopup === popup) {
      activePopup = null;
    }
    onClose?.();
  });
  activePopup = popup;
}
