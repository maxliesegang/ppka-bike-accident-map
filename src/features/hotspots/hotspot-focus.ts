import { GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import type { DataSourceId } from '../../map/data-source-types';
import { openAccidentPopup } from '../../map/map-popup';
import { renderHotspotPopup } from './hotspot-popup-renderer';
import { getHotspotDisplayRadiusMeters, type Hotspot } from './hotspot-types';

/** Zoom the map reaches when a hotspot is selected, unless already closer in. */
const HOTSPOT_FOCUS_ZOOM = 17;

const HOTSPOT_AREA_SOURCE_ID = 'hotspot-focus-area';
const HOTSPOT_AREA_LAYER_ID = 'hotspot-focus-area';
const HOTSPOT_AREA_ZOOM_MAX = 22;
const HOTSPOT_AREA_COLOR = '#d4351c';

// Web-mercator ground resolution: metres covered by one pixel at zoom 0 with
// 256 px tiles (the equatorial circumference divided by the tile width).
const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686;
const METERS_PER_PIXEL_AT_ZOOM_0 = EARTH_CIRCUMFERENCE_METERS / 256;

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [],
};

// Only one hotspot is focused at a time, so the area circle is a single-feature
// GeoJSON source replaced on each focus and emptied when the popup closes.
let activeAreaMap: MapLibreMap | null = null;

/**
 * Flies the map to a hotspot, draws a circle covering the area its accidents were
 * grouped from, and opens its detail popup — the click-through from a leaderboard
 * row. The circle answers "which area is this?": a clicked spot reads as a bounded
 * region rather than a floating point. Never zooms out: a user already zoomed in
 * past the focus level keeps their closer view.
 */
export function focusHotspot(
  map: MapLibreMap,
  hotspot: Hotspot,
  dataSourceId: DataSourceId,
  rank: number,
): void {
  const target: [number, number] = [hotspot.lng, hotspot.lat];
  const targetZoom = Math.max(map.getZoom(), HOTSPOT_FOCUS_ZOOM);

  clearActiveArea();
  map.flyTo({ center: target, zoom: targetZoom });

  // Open the popup first: it synchronously closes any previous hotspot popup
  // and fires its `close` (clearing the already-null circle). Only then draw
  // the new circle, so that stale close event cannot remove it.
  openAccidentPopup(
    map,
    target,
    renderHotspotPopup(hotspot, dataSourceId, rank),
    clearActiveArea,
  );
  showFocusArea(map, hotspot);
}

function clearActiveArea(): void {
  const map = activeAreaMap;
  if (map === null) {
    return;
  }
  activeAreaMap = null;
  const source = map.getSource(HOTSPOT_AREA_SOURCE_ID);
  if (source instanceof GeoJSONSource) {
    source.setData(EMPTY_FEATURE_COLLECTION);
  }
}

/**
 * The focused area as a point feature carrying its circle size in screen pixels
 * at two zoom anchors. Paired with the layer's exponential (2×) zoom
 * interpolation, the drawn radius keeps a constant ground size in metres — the
 * web-mercator metres-per-pixel halving per zoom cancels out exactly.
 */
function toAreaFeature(hotspot: Hotspot): GeoJSON.Feature<GeoJSON.Point> {
  const radiusMeters = getHotspotDisplayRadiusMeters(hotspot);
  // The mercator scale factor cos(latitude) is fixed per feature, so it is
  // folded into the pixel radii here rather than evaluated per frame.
  const radiusPixelsAtZoom0 =
    radiusMeters /
    (METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos((hotspot.lat * Math.PI) / 180));
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [hotspot.lng, hotspot.lat] },
    properties: {
      radiusPixelsAtZoom0,
      radiusPixelsAtZoom22: radiusPixelsAtZoom0 * 2 ** HOTSPOT_AREA_ZOOM_MAX,
    },
  };
}

function showFocusArea(map: MapLibreMap, hotspot: Hotspot): void {
  if (map.getSource(HOTSPOT_AREA_SOURCE_ID) === undefined) {
    map.addSource(HOTSPOT_AREA_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_FEATURE_COLLECTION,
    });
    map.addLayer({
      id: HOTSPOT_AREA_LAYER_ID,
      type: 'circle',
      source: HOTSPOT_AREA_SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['exponential', 2],
          ['zoom'],
          0,
          ['get', 'radiusPixelsAtZoom0'],
          HOTSPOT_AREA_ZOOM_MAX,
          ['get', 'radiusPixelsAtZoom22'],
        ],
        'circle-color': HOTSPOT_AREA_COLOR,
        'circle-opacity': 0.12,
        'circle-stroke-color': HOTSPOT_AREA_COLOR,
        'circle-stroke-width': 2,
        'circle-stroke-opacity': 1,
      },
    });
  }

  const source = map.getSource(HOTSPOT_AREA_SOURCE_ID);
  if (!(source instanceof GeoJSONSource)) {
    return;
  }
  source.setData({
    type: 'FeatureCollection',
    features: [toAreaFeature(hotspot)],
  });
  activeAreaMap = map;
}
