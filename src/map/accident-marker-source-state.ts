import {
  type CircleLayerSpecification,
  type ExpressionSpecification,
  GeoJSONSource,
  type Map as MapLibreMap,
} from 'maplibre-gl';
import type { AccidentType, SeverityType } from '../data/accident-styles';
import { renderAccidentPopup } from './accident-popup-renderer';
import type { DataSourceId } from './data-source-types';
import { openAccidentPopup } from './map-popup';

/**
 * What a popup renders from: either a plain property bag, or a factory that is
 * only invoked when the user opens the popup (so the per-row detail objects are
 * not built for every loaded accident).
 */
export type AccidentPopupPropertySource =
  | Record<string, unknown>
  | (() => Record<string, unknown>);

export function resolvePopupProperties(
  popupProperties: AccidentPopupPropertySource,
): Record<string, unknown> {
  return typeof popupProperties === 'function'
    ? popupProperties()
    : popupProperties;
}

export interface AccidentMarkerEntry {
  readonly feature: GeoJSON.Feature<GeoJSON.Point>;
  /** `[longitude, latitude]`, kept alongside the feature for analytics reuse. */
  readonly coordinates: readonly [number, number];
  readonly accidentType: AccidentType;
  readonly severityType: SeverityType;
  /** Accident year, or `null` when the source carries no usable date. */
  readonly year: number | null;
  /** Key into this source's popup property registry (see `registerFeature`). */
  readonly popupId: number;
}

/**
 * The style of the shared accident circle layer. Color encodes the accident
 * type and radius the severity, both read from the feature properties that the
 * marker factory stamps on every point.
 */
const ACCIDENT_LAYER_SPECIFICATION: Omit<
  CircleLayerSpecification,
  'id' | 'source'
> = {
  type: 'circle',
  paint: {
    'circle-color': ['get', 'color'],
    'circle-radius': ['get', 'radius'],
    'circle-opacity': 0.9,
    'circle-stroke-color': '#000000',
    'circle-stroke-width': 1,
    'circle-stroke-opacity': 1,
  },
};

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [],
};

/**
 * Whether the error is MapLibre rejecting a style mutation because a style
 * update is still in flight ("Style is not done loading."). Such mutations are
 * retried once the map settles instead of failing.
 */
function isStyleBusyError(error: unknown): error is Error {
  return error instanceof Error && error.message.includes('not done loading');
}

/**
 * Owns one data source's accidents as a MapLibre GeoJSON source. Instead of
 * toggling individual markers, visibility is a filter expression over the
 * feature properties (accident type, severity, year) that the shared circle
 * layer applies — recomputed only when a filter moves, never per marker.
 * Feature data is pushed in batches: registration marks the source dirty, and
 * the batch end uploads the rebuilt `FeatureCollection` once.
 */
export class AccidentMarkerSourceState {
  private readonly sourceId: string;
  private readonly layerId: string;

  private readonly markerEntries: AccidentMarkerEntry[] = [];
  private readonly popupPropertiesById = new Map<
    number,
    AccidentPopupPropertySource
  >();
  private readonly availableYears = new Set<number>();
  private availableYearsSnapshot: readonly number[] = [];
  private availableYearsDirty = false;
  // Selected years for this source, or `null` when no year filter is active
  // (every year visible). Applied on top of the type/severity filter, so any
  // source gains year filtering without a bespoke pipeline.
  private yearFilter: ReadonlySet<number> | null = null;
  // The type/severity clauses shared by every source, built by the marker
  // store from the legend selections. Set on attach and on selection changes.
  private baseFilter: ExpressionSpecification | null = null;
  private map: MapLibreMap | null = null;
  private isRegisteringBatch = false;
  private isDataDirty = false;
  private nextPopupId = 0;

  constructor(dataSourceId: DataSourceId) {
    this.sourceId = `accidents-${dataSourceId}`;
    this.layerId = this.sourceId;
  }

  /**
   * Every registered marker for this source, regardless of current filter
   * visibility. Read-only so analytics consumers (e.g. the hotspot store) can
   * aggregate over the full set without mutating the marker index.
   */
  get entries(): readonly AccidentMarkerEntry[] {
    return this.markerEntries;
  }

  clear(): void {
    this.markerEntries.length = 0;
    this.popupPropertiesById.clear();
    this.availableYears.clear();
    this.availableYearsSnapshot = [];
    this.availableYearsDirty = false;
    this.isRegisteringBatch = false;
    this.nextPopupId = 0;
    this.isDataDirty = true;
    this.syncData();
  }

  /** Distinct accident years present in this source, ascending. */
  getAvailableYears(): readonly number[] {
    if (this.availableYearsDirty) {
      this.availableYearsSnapshot = [...this.availableYears].sort(
        (left, right) => left - right,
      );
      this.availableYearsDirty = false;
    }
    return this.availableYearsSnapshot;
  }

  getYearFilter(): ReadonlySet<number> | null {
    return this.yearFilter;
  }

  /** Whether this year passes the current year filter (undated stays visible). */
  isYearVisible(year: number | null): boolean {
    // Undated markers can't be excluded by a year filter, so they stay visible.
    return (
      this.yearFilter === null || year === null || this.yearFilter.has(year)
    );
  }

  /**
   * Registers one accident as a GeoJSON point. The feature carries the style
   * (color/radius) and filter (type/severity/year) properties; `popupId` is
   * stamped here so the click handler can resolve the popup property source
   * back from a rendered feature.
   */
  registerFeature(
    feature: GeoJSON.Feature<GeoJSON.Point>,
    accidentType: AccidentType,
    severityType: SeverityType,
    year: number | null,
    popupProperties: AccidentPopupPropertySource,
  ): void {
    const popupId = this.nextPopupId;
    this.nextPopupId += 1;
    feature.properties = { ...feature.properties, popupId };

    const [longitude, latitude] = feature.geometry.coordinates;
    this.markerEntries.push({
      feature,
      coordinates: [longitude, latitude],
      accidentType,
      severityType,
      year,
      popupId,
    });
    this.popupPropertiesById.set(popupId, popupProperties);
    if (year !== null && !this.availableYears.has(year)) {
      this.availableYears.add(year);
      this.availableYearsDirty = true;
    }

    this.isDataDirty = true;
    if (!this.isRegisteringBatch) {
      this.syncData();
    }
  }

  beginRegistrationBatch(): void {
    this.isRegisteringBatch = true;
  }

  endRegistrationBatch(): void {
    if (!this.isRegisteringBatch) {
      return;
    }
    this.isRegisteringBatch = false;
    this.syncData();
  }

  /**
   * Shows this source's layer on the map, creating its GeoJSON source and
   * circle layer (with the current filter baked in) the first time. Style
   * mutations are unavailable until the map has loaded its style, and the
   * initial attach runs synchronously after map creation — so first-time
   * creation defers into the map's load event.
   */
  attachToMap(map: MapLibreMap, baseFilter: ExpressionSpecification): void {
    this.map = map;
    this.baseFilter = baseFilter;

    if (map.isStyleLoaded()) {
      this.applyToMap();
    } else {
      map.once('load', () => {
        if (this.map === map) {
          this.applyToMap();
        }
      });
    }
  }

  detachFromMap(map: MapLibreMap): void {
    this.setLayerVisibility(map, 'none');
    if (this.map === map) {
      this.map = null;
    }
  }

  setBaseFilter(baseFilter: ExpressionSpecification): void {
    this.baseFilter = baseFilter;
    this.applyFilter();
  }

  /**
   * Restricts visible markers to `years` (`null` clears the year filter). The
   * filter expression is recomputed wholesale — cheap next to re-rendering.
   */
  setYearFilter(years: ReadonlySet<number> | null): void {
    this.yearFilter = years;
    this.applyFilter();
  }

  /**
   * Creates the source and circle layer on the map (once) and pushes the
   * current data. Called only once the map's style has loaded; creating the
   * layer with the current filter baked in keeps the busy-style window after
   * `addSource` free of further style mutations.
   */
  private applyToMap(): void {
    const map = this.map;
    if (map === null) {
      return;
    }

    if (map.getSource(this.sourceId) === undefined) {
      map.addSource(this.sourceId, {
        type: 'geojson',
        data: EMPTY_FEATURE_COLLECTION,
      });
      map.addLayer({
        ...ACCIDENT_LAYER_SPECIFICATION,
        id: this.layerId,
        source: this.sourceId,
        filter: this.buildFilterExpression(),
      });
      this.bindClickHandler(map);
    } else {
      // Re-attach: the layer starts hidden and becomes this source's active view.
      this.setLayerVisibility(map, 'visible');
    }

    this.syncData();
  }

  private syncData(): void {
    const map = this.map;
    if (map === null || !this.isDataDirty) {
      return;
    }
    const source = map.getSource(this.sourceId);
    if (source instanceof GeoJSONSource) {
      source.setData(this.buildFeatureCollection());
      this.isDataDirty = false;
    }
  }

  private buildFeatureCollection(): GeoJSON.FeatureCollection<GeoJSON.Point> {
    return {
      type: 'FeatureCollection',
      features: this.markerEntries.map((entry) => entry.feature),
    };
  }

  /** The full visibility filter: the shared type/severity clauses plus years. */
  private buildFilterExpression(): ExpressionSpecification {
    if (this.baseFilter === null) {
      return ['all'];
    }
    if (this.yearFilter === null) {
      return this.baseFilter;
    }
    // Undated markers can't be excluded by a year filter, so they stay visible.
    return [
      'all',
      this.baseFilter,
      [
        'any',
        ['!', ['has', 'year']],
        ['in', ['get', 'year'], ['literal', [...this.yearFilter]]],
      ],
    ];
  }

  private applyFilter(): void {
    const map = this.map;
    if (map === null || map.getSource(this.sourceId) === undefined) {
      // Not on the map yet — `applyToMap` bakes the filter into the new layer.
      return;
    }
    try {
      map.setFilter(this.layerId, this.buildFilterExpression());
    } catch (error: unknown) {
      if (isStyleBusyError(error)) {
        map.once('idle', () => {
          if (this.map === map) {
            this.applyFilter();
          }
        });
      } else {
        throw error;
      }
    }
  }

  private setLayerVisibility(
    map: MapLibreMap,
    visibility: 'visible' | 'none',
  ): void {
    if (map.getLayer(this.layerId) === undefined) {
      // Not created yet: layers are created visible (only the attached source
      // creates them), so a pending hide is a no-op.
      return;
    }
    try {
      map.setLayoutProperty(this.layerId, 'visibility', visibility);
    } catch (error: unknown) {
      if (isStyleBusyError(error)) {
        map.once('idle', () => {
          // Only retry if the desired state hasn't flipped meanwhile.
          const stillWants =
            visibility === 'visible' ? this.map === map : this.map !== map;
          if (stillWants) {
            this.setLayerVisibility(map, visibility);
          }
        });
      } else {
        throw error;
      }
    }
  }

  private bindClickHandler(map: MapLibreMap): void {
    map.on('click', this.layerId, (event) => {
      const feature = event.features?.[0];
      if (feature?.geometry.type !== 'Point') {
        return;
      }
      const popupId = Number(feature.properties?.popupId);
      const popupProperties = this.popupPropertiesById.get(popupId);
      if (popupProperties === undefined) {
        return;
      }
      openAccidentPopup(
        map,
        feature.geometry.coordinates as [number, number],
        renderAccidentPopup(resolvePopupProperties(popupProperties)),
      );
    });
  }
}
