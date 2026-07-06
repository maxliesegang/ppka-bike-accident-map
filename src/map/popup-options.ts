import * as L from 'leaflet';

/**
 * Shared Leaflet options for every accident-related popup — single-marker detail
 * and hotspot detail alike — so they pan, size, and pick up the `accident-popup`
 * class (see `styles.css`) identically. One definition keeps the two entry points
 * (`accident-marker-factory`, `hotspot-focus`) visually in sync.
 */
export const ACCIDENT_POPUP_OPTIONS: L.PopupOptions = {
  autoPanPadding: L.point(24, 24),
  className: 'accident-popup',
  maxWidth: 380,
  minWidth: 260,
};
