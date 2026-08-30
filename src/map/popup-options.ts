import type { PopupOptions } from 'maplibre-gl';

/**
 * Shared MapLibre options for every accident-related popup — single-marker
 * detail and hotspot detail alike — so they size, float, and pick up the
 * `accident-popup` class (see `styles.css`) identically. One definition keeps
 * the two entry points (`accident-marker-source-state`, `hotspot-focus`)
 * visually in sync.
 */
export const ACCIDENT_POPUP_OPTIONS: PopupOptions = {
  className: 'accident-popup',
  maxWidth: '380px',
  offset: 24,
  padding: { top: 24, bottom: 24, left: 24, right: 24 },
};
