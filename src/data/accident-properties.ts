/** Per-mode counts the GeoPackage (FragDenStaat) export carries per accident. */
export interface AccidentProperties {
  sum_bike: number;
  sum_ped: number;
  sum_car_truck_bus: number;
  sum_injured_bike: number;
  sum_injured_ped: number;
  sum_severely_injured_bike: number;
}

/**
 * The subset of participant counts the accident-type classification needs. The
 * PPKA CSV export supplies these but not the per-mode injury counts, so the
 * classifier is typed against this narrower shape.
 */
export type AccidentParticipantCounts = Pick<
  AccidentProperties,
  'sum_bike' | 'sum_ped' | 'sum_car_truck_bus'
>;

/**
 * Accident-level casualty totals. The PPKA CSV reports killed/severely/slightly
 * injured people for the whole accident without splitting them by mode of
 * travel, which is all the newer years of the request provide.
 */
export interface AccidentCasualtyTotals {
  killed: number;
  severelyInjured: number;
  slightlyInjured: number;
}
