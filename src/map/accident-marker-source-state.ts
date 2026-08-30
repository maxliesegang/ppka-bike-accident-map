import * as L from 'leaflet';
import { AccidentType, SeverityType } from '../data/accident-styles';

export interface AccidentMarkerEntry {
  marker: L.CircleMarker;
  accidentType: AccidentType;
  severityType: SeverityType;
  /** Accident year, or `null` when the source carries no usable date. */
  year: number | null;
}

export type AccidentMarkerFilterPredicate = (
  accidentType: AccidentType,
  severityType: SeverityType,
) => boolean;

export class AccidentMarkerSourceState {
  readonly visibleMarkersLayer = L.layerGroup();

  private readonly markerEntries: AccidentMarkerEntry[] = [];

  /**
   * Every registered marker for this source, regardless of current filter
   * visibility. Read-only so analytics consumers (e.g. the hotspot store) can
   * aggregate over the full set without mutating the marker index.
   */
  get entries(): readonly AccidentMarkerEntry[] {
    return this.markerEntries;
  }

  private readonly markerEntriesByAccidentType = new Map<
    AccidentType,
    AccidentMarkerEntry[]
  >();
  private readonly markerEntriesBySeverityType = new Map<
    SeverityType,
    AccidentMarkerEntry[]
  >();
  private readonly markerEntriesByYear = new Map<
    number,
    AccidentMarkerEntry[]
  >();
  private availableYearsSnapshot: readonly number[] = [];
  private availableYearsDirty = false;
  // Selected years for this source, or `null` when no year filter is active
  // (every year visible). Applied client-side on top of the type/severity
  // predicate, so any source gains year filtering without a bespoke pipeline.
  private yearFilter: ReadonlySet<number> | null = null;
  private map: L.Map | null = null;
  private isRegisteringBatch = false;
  private needsVisibilityRefresh = false;

  clear(): void {
    this.markerEntries.length = 0;
    this.markerEntriesByAccidentType.clear();
    this.markerEntriesBySeverityType.clear();
    this.markerEntriesByYear.clear();
    this.availableYearsSnapshot = [];
    this.availableYearsDirty = false;
    this.isRegisteringBatch = false;
    this.needsVisibilityRefresh = false;
    this.visibleMarkersLayer.clearLayers();
  }

  /** Distinct accident years present in this source, ascending. */
  getAvailableYears(): readonly number[] {
    if (this.availableYearsDirty) {
      this.availableYearsSnapshot = [...this.markerEntriesByYear.keys()].sort(
        (left, right) => left - right,
      );
      this.availableYearsDirty = false;
    }
    return this.availableYearsSnapshot;
  }

  getYearFilter(): ReadonlySet<number> | null {
    return this.yearFilter;
  }

  /**
   * Restricts visible markers to `years` (`null` clears the year filter). Only
   * the year buckets whose membership actually flips are touched, so toggling a
   * year never rebuilds the whole layer.
   */
  setYearFilter(
    years: ReadonlySet<number> | null,
    isMarkerSelected: AccidentMarkerFilterPredicate,
  ): void {
    const previous = this.yearFilter;
    this.yearFilter = years;

    for (const year of this.affectedYears(previous, years)) {
      this.updateMarkerVisibility(
        this.markerEntriesByYear.get(year) ?? [],
        isMarkerSelected,
      );
    }
  }

  beginRegistrationBatch(): void {
    this.isRegisteringBatch = true;
  }

  endRegistrationBatch(isMarkerSelected: AccidentMarkerFilterPredicate): void {
    if (!this.isRegisteringBatch) {
      return;
    }

    this.isRegisteringBatch = false;
    this.refreshVisibleMarkers(isMarkerSelected);
  }

  registerMarker(
    marker: L.CircleMarker,
    accidentType: AccidentType,
    severityType: SeverityType,
    year: number | null,
    isMarkerSelected: AccidentMarkerFilterPredicate,
  ): void {
    const markerEntry = { marker, accidentType, severityType, year };
    this.markerEntries.push(markerEntry);
    addToIndex(this.markerEntriesByAccidentType, accidentType, markerEntry);
    addToIndex(this.markerEntriesBySeverityType, severityType, markerEntry);
    if (year !== null) {
      if (!this.markerEntriesByYear.has(year)) {
        this.availableYearsDirty = true;
      }
      addToIndex(this.markerEntriesByYear, year, markerEntry);
    }

    if (
      !this.isRegisteringBatch &&
      this.isEntryVisible(markerEntry, isMarkerSelected)
    ) {
      this.visibleMarkersLayer.addLayer(marker);
    }
  }

  attachToMap(
    map: L.Map,
    isMarkerSelected: AccidentMarkerFilterPredicate,
  ): void {
    this.map = map;
    if (this.needsVisibilityRefresh) {
      this.refreshVisibleMarkers(isMarkerSelected);
    }
    if (!map.hasLayer(this.visibleMarkersLayer)) {
      this.visibleMarkersLayer.addTo(map);
    }
  }

  detachFromMap(map: L.Map): void {
    if (map.hasLayer(this.visibleMarkersLayer)) {
      map.removeLayer(this.visibleMarkersLayer);
    }
    if (this.map === map) {
      this.map = null;
    }
  }

  updateAccidentTypeVisibility(
    accidentType: AccidentType,
    isMarkerSelected: AccidentMarkerFilterPredicate,
  ): void {
    this.updateMarkerVisibility(
      this.markerEntriesByAccidentType.get(accidentType) ?? [],
      isMarkerSelected,
    );
  }

  updateSeverityTypeVisibility(
    severityType: SeverityType,
    isMarkerSelected: AccidentMarkerFilterPredicate,
  ): void {
    this.updateMarkerVisibility(
      this.markerEntriesBySeverityType.get(severityType) ?? [],
      isMarkerSelected,
    );
  }

  private refreshVisibleMarkers(
    isMarkerSelected: AccidentMarkerFilterPredicate,
  ): void {
    const wasLayerVisible =
      this.map !== null && this.map.hasLayer(this.visibleMarkersLayer);

    if (this.map && wasLayerVisible) {
      this.map.removeLayer(this.visibleMarkersLayer);
    }

    this.visibleMarkersLayer.clearLayers();

    for (const entry of this.markerEntries) {
      if (this.isEntryVisible(entry, isMarkerSelected)) {
        this.visibleMarkersLayer.addLayer(entry.marker);
      }
    }

    if (this.map && wasLayerVisible) {
      this.visibleMarkersLayer.addTo(this.map);
    }
    this.needsVisibilityRefresh = false;
  }

  private updateMarkerVisibility(
    markers: readonly AccidentMarkerEntry[],
    isMarkerSelected: AccidentMarkerFilterPredicate,
  ): void {
    if (this.isRegisteringBatch) {
      return;
    }
    if (this.map === null || !this.map.hasLayer(this.visibleMarkersLayer)) {
      this.needsVisibilityRefresh = true;
      return;
    }

    for (const entry of markers) {
      const shouldBeVisible = this.isEntryVisible(entry, isMarkerSelected);
      const isVisible = this.visibleMarkersLayer.hasLayer(entry.marker);

      if (shouldBeVisible && !isVisible) {
        this.visibleMarkersLayer.addLayer(entry.marker);
      } else if (!shouldBeVisible && isVisible) {
        this.visibleMarkersLayer.removeLayer(entry.marker);
      }
    }
  }

  private isEntryVisible(
    entry: AccidentMarkerEntry,
    isMarkerSelected: AccidentMarkerFilterPredicate,
  ): boolean {
    return (
      isMarkerSelected(entry.accidentType, entry.severityType) &&
      this.isYearVisible(entry.year)
    );
  }

  /** Whether this year passes the current year filter (undated stays visible). */
  isYearVisible(year: number | null): boolean {
    // Undated markers can't be excluded by a year filter, so they stay visible.
    return (
      this.yearFilter === null || year === null || this.yearFilter.has(year)
    );
  }

  /** Years whose visibility can differ between the old and new year filters. */
  private affectedYears(
    previous: ReadonlySet<number> | null,
    next: ReadonlySet<number> | null,
  ): Iterable<number> {
    if (previous === null || next === null) {
      // Switching to or from "all years" can flip any dated marker.
      return this.markerEntriesByYear.keys();
    }
    const changed = new Set<number>();
    for (const year of this.markerEntriesByYear.keys()) {
      if (previous.has(year) !== next.has(year)) {
        changed.add(year);
      }
    }
    return changed;
  }
}

function addToIndex<T>(
  index: Map<T, AccidentMarkerEntry[]>,
  key: T,
  marker: AccidentMarkerEntry,
): void {
  const existingBucket = index.get(key);
  if (existingBucket) {
    existingBucket.push(marker);
    return;
  }

  index.set(key, [marker]);
}
