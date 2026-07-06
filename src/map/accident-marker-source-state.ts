import * as L from 'leaflet';
import { AccidentType, SeverityType } from '../data/accident-styles';

export interface AccidentMarkerEntry {
  marker: L.CircleMarker;
  accidentType: AccidentType;
  severityType: SeverityType;
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
  private map: L.Map | null = null;
  private isRegisteringBatch = false;
  private needsVisibilityRefresh = false;

  clear(): void {
    this.markerEntries.length = 0;
    this.markerEntriesByAccidentType.clear();
    this.markerEntriesBySeverityType.clear();
    this.isRegisteringBatch = false;
    this.needsVisibilityRefresh = false;
    this.visibleMarkersLayer.clearLayers();
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
    isMarkerSelected: AccidentMarkerFilterPredicate,
  ): void {
    const markerEntry = { marker, accidentType, severityType };
    this.markerEntries.push(markerEntry);
    addToIndex(this.markerEntriesByAccidentType, accidentType, markerEntry);
    addToIndex(this.markerEntriesBySeverityType, severityType, markerEntry);

    if (
      !this.isRegisteringBatch &&
      isMarkerSelected(accidentType, severityType)
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

    for (const { marker, accidentType, severityType } of this.markerEntries) {
      if (isMarkerSelected(accidentType, severityType)) {
        this.visibleMarkersLayer.addLayer(marker);
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

    for (const { marker, accidentType, severityType } of markers) {
      const shouldBeVisible = isMarkerSelected(accidentType, severityType);
      const isVisible = this.visibleMarkersLayer.hasLayer(marker);

      if (shouldBeVisible && !isVisible) {
        this.visibleMarkersLayer.addLayer(marker);
      } else if (!shouldBeVisible && isVisible) {
        this.visibleMarkersLayer.removeLayer(marker);
      }
    }
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
