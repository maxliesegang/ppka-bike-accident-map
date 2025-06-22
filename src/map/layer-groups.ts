import * as L from 'leaflet';
import { AccidentType } from '../data/color-store';
import { SeverityType } from '../data/radius-store';

/**
 * Layer groups for different accident types.
 */
export const accidentLayerGroups: Record<AccidentType, L.LayerGroup> = {
  BIKE_AND_VEHICLE: L.layerGroup(),
  PEDESTRIAN_AND_VEHICLE: L.layerGroup(),
  BIKE_AND_PEDESTRIAN: L.layerGroup(),
  SINGLE_BIKE: L.layerGroup(),
  BIKE_ONLY: L.layerGroup(),
  DEFAULT_FILL: L.layerGroup(),
};

/**
 * Layer groups for different severity levels.
 */
export const severityLayerGroups: Record<SeverityType, L.LayerGroup> = {
  SEVERE_INJURY: L.layerGroup(),
  INJURY: L.layerGroup(),
  NO_INJURY: L.layerGroup(),
};
