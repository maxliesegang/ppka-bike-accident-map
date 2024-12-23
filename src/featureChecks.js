export const isSingleBikeAccident = (feature) => {
  return (
    feature.properties.sum_bike === 1 &&
    feature.properties.sum_ped === 0 &&
    feature.properties.sum_car_truck_bus === 0
  );
};

export const isBikeOnlyAccident = (feature) => {
  return (
    feature.properties.sum_bike > 1 &&
    feature.properties.sum_ped === 0 &&
    feature.properties.sum_car_truck_bus === 0
  );
};

export const isBikeAndPedestrianAccident = (feature) => {
  return (
    feature.properties.sum_bike > 0 &&
    feature.properties.sum_ped > 0 &&
    feature.properties.sum_car_truck_bus === 0
  );
};

export const isBikeAndVehicleAccident = (feature) => {
  return (
    feature.properties.sum_bike > 0 &&
    feature.properties.sum_ped === 0 &&
    feature.properties.sum_car_truck_bus > 0
  );
};

export const isPedestrianAndVehicleAccident = (feature) => {
  return (
    feature.properties.sum_bike === 0 &&
    feature.properties.sum_ped > 0 &&
    feature.properties.sum_car_truck_bus > 0
  );
};

export const hasInjuries = (feature) => {
  return (
    feature.properties.sum_injured_bike > 0 ||
    feature.properties.sum_injured_ped > 0
  );
};

export const hasSevereInjuries = (feature) => {
  return feature.properties.severely_injured_bike > 0;
};
