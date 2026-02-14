import * as L from 'leaflet';
import { ACCIDENT_LEGENDS, SEVERITY_LEGENDS } from '../constants';
import { AccidentType, SeverityType } from '../data/accident-styles';

interface CategorizedMarker {
  marker: L.CircleMarker;
  accidentType: AccidentType;
  severityType: SeverityType;
}

const registeredMarkers: CategorizedMarker[] = [];
const visibleLayerGroup = L.layerGroup();

const selectedAccidentTypes = new Set<AccidentType>(
  ACCIDENT_LEGENDS.map(({ type }) => type),
);
const selectedSeverityTypes = new Set<SeverityType>(
  SEVERITY_LEGENDS.map(({ key }) => key),
);

export function initializeVisibleLayerGroup(map: L.Map): void {
  if (!map.hasLayer(visibleLayerGroup)) {
    visibleLayerGroup.addTo(map);
  }
}

export function clearRegisteredMarkers(): void {
  registeredMarkers.length = 0;
  visibleLayerGroup.clearLayers();
}

export function registerMarker(
  marker: L.CircleMarker,
  accidentType: AccidentType,
  severityType: SeverityType,
): void {
  registeredMarkers.push({ marker, accidentType, severityType });

  if (
    selectedAccidentTypes.has(accidentType) &&
    selectedSeverityTypes.has(severityType)
  ) {
    visibleLayerGroup.addLayer(marker);
  }
}

export function setAccidentTypeSelection(
  accidentType: AccidentType,
  selected: boolean,
): void {
  updateSelection(selectedAccidentTypes, accidentType, selected);
  refreshVisibleLayers();
}

export function setSeverityTypeSelection(
  severityType: SeverityType,
  selected: boolean,
): void {
  updateSelection(selectedSeverityTypes, severityType, selected);
  refreshVisibleLayers();
}

function updateSelection<T>(set: Set<T>, key: T, selected: boolean): void {
  if (selected) {
    set.add(key);
  } else {
    set.delete(key);
  }
}

function refreshVisibleLayers(): void {
  visibleLayerGroup.clearLayers();
  for (const { marker, accidentType, severityType } of registeredMarkers) {
    if (
      selectedAccidentTypes.has(accidentType) &&
      selectedSeverityTypes.has(severityType)
    ) {
      visibleLayerGroup.addLayer(marker);
    }
  }
}
