import { AccidentProperties } from '../data/accident-properties';
import {
  AccidentType,
  getColor,
  getRadius,
  SeverityType,
} from '../data/accident-styles';

const isSingleBikeAccident = (p: AccidentProperties) =>
  p.sum_bike === 1 && p.sum_ped === 0 && p.sum_car_truck_bus === 0;

const isBikeOnlyAccident = (p: AccidentProperties) =>
  p.sum_bike > 1 && p.sum_ped === 0 && p.sum_car_truck_bus === 0;

const isBikeAndPedestrianAccident = (p: AccidentProperties) =>
  p.sum_bike > 0 && p.sum_ped > 0 && p.sum_car_truck_bus === 0;

const isBikeAndVehicleAccident = (p: AccidentProperties) =>
  p.sum_bike > 0 && p.sum_ped === 0 && p.sum_car_truck_bus > 0;

const isPedestrianAndVehicleAccident = (p: AccidentProperties) =>
  p.sum_bike === 0 && p.sum_ped > 0 && p.sum_car_truck_bus > 0;

const hasInjuries = (p: AccidentProperties) =>
  p.sum_injured_bike > 0 || p.sum_injured_ped > 0;

const hasSevereInjuries = (p: AccidentProperties) =>
  p.sum_severely_injured_bike > 0;

export function getAccidentType(p: AccidentProperties): AccidentType {
  if (isBikeAndVehicleAccident(p)) return 'BIKE_AND_VEHICLE';
  if (isPedestrianAndVehicleAccident(p)) return 'PEDESTRIAN_AND_VEHICLE';
  if (isBikeAndPedestrianAccident(p)) return 'BIKE_AND_PEDESTRIAN';
  if (isSingleBikeAccident(p)) return 'SINGLE_BIKE';
  if (isBikeOnlyAccident(p)) return 'BIKE_ONLY';
  return 'DEFAULT_FILL';
}

export function getSeverityType(p: AccidentProperties): SeverityType {
  if (hasSevereInjuries(p)) return 'SEVERE_INJURY';
  if (hasInjuries(p)) return 'INJURY';
  return 'NO_INJURY';
}

export function getStyle(
  properties: AccidentProperties,
): L.CircleMarkerOptions {
  return {
    color: '#000000',
    stroke: true,
    weight: 1,
    radius: getRadius(getSeverityType(properties)),
    fillColor: getColor(getAccidentType(properties)),
    opacity: 1,
    fillOpacity: 0.9,
  };
}
