import * as L from 'leaflet';
import {
  getAccidentType,
  getSeverityType,
  getStyle,
} from '../features/accident-feature-utils';
import { AccidentProperties } from '../data/accident-properties';
import { generatePopupContent } from './popup-utils';
import { registerMarker } from './layer-filter-utils';

export function createAndRegisterMarker(
  feature: GeoJSON.Feature,
): L.CircleMarker {
  const geometry = feature.geometry as GeoJSON.Point;
  const [lng, lat] = geometry.coordinates;
  const properties = feature.properties as AccidentProperties;

  const marker = L.circleMarker([lat, lng], getStyle(properties));
  marker.bindPopup(generatePopupContent(properties));

  registerMarker(
    marker,
    getAccidentType(properties),
    getSeverityType(properties),
  );

  return marker;
}
