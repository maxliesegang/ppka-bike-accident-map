import { AccidentProperties } from '../data/accident-properties';
import { getColorForType } from '../data/color-store';
import { getRadiusForType } from '../data/radius-store';

// Accident Type Checking Functions
export const isSingleBikeAccident = (properties: AccidentProperties) =>
  properties.sum_bike === 1 &&
  properties.sum_ped === 0 &&
  properties.sum_car_truck_bus === 0;

export const isBikeOnlyAccident = (properties: AccidentProperties) =>
  properties.sum_bike > 1 &&
  properties.sum_ped === 0 &&
  properties.sum_car_truck_bus === 0;

export const isBikeAndPedestrianAccident = (properties: AccidentProperties) =>
  properties.sum_bike > 0 &&
  properties.sum_ped > 0 &&
  properties.sum_car_truck_bus === 0;

export const isBikeAndVehicleAccident = (properties: AccidentProperties) =>
  properties.sum_bike > 0 &&
  properties.sum_ped === 0 &&
  properties.sum_car_truck_bus > 0;

export const isPedestrianAndVehicleAccident = (
  properties: AccidentProperties,
) =>
  properties.sum_bike === 0 &&
  properties.sum_ped > 0 &&
  properties.sum_car_truck_bus > 0;

export const hasInjuries = (properties: AccidentProperties) =>
  properties.sum_injured_bike > 0 || properties.sum_injured_ped > 0;

export const hasSevereInjuries = (properties: AccidentProperties) =>
  properties.sum_severely_injured_bike > 0;

const getFillColor = (properties: AccidentProperties): string => {
  if (isBikeAndVehicleAccident(properties)) {
    return getColorForType('BIKE_AND_VEHICLE');
  }
  if (isPedestrianAndVehicleAccident(properties)) {
    return getColorForType('PEDESTRIAN_AND_VEHICLE');
  }
  if (isBikeAndPedestrianAccident(properties)) {
    return getColorForType('BIKE_AND_PEDESTRIAN');
  }
  if (isSingleBikeAccident(properties)) {
    return getColorForType('SINGLE_BIKE');
  }
  if (isBikeOnlyAccident(properties)) {
    return getColorForType('BIKE_ONLY');
  }

  return getColorForType('DEFAULT_FILL');
};

const getRadius = (properties: AccidentProperties): number => {
  if (hasSevereInjuries(properties)) {
    return getRadiusForType('SEVERE_INJURY');
  }
  if (hasInjuries(properties)) {
    return getRadiusForType('INJURY');
  }

  return getRadiusForType('NO_INJURY');
};

export const getStyle = (properties: AccidentProperties) => ({
  color: '#000000',
  stroke: true,
  weight: 1,
  radius: getRadius(properties),
  fillColor: getFillColor(properties),
  opacity: 1,
  fillOpacity: 0.9,
});
