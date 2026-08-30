import type {
  AccidentCasualtyTotals,
  AccidentParticipantCounts,
  AccidentProperties,
} from '../data/accident-properties';
import type { AccidentType, SeverityType } from '../data/accident-styles';

type AccidentClassifier = {
  type: AccidentType;
  matches: (properties: AccidentParticipantCounts) => boolean;
};

type SeverityClassifier = {
  type: SeverityType;
  matches: (properties: AccidentProperties) => boolean;
};

const ACCIDENT_TYPE_CLASSIFIERS: readonly AccidentClassifier[] = [
  {
    type: 'BIKE_AND_VEHICLE',
    matches: (p) =>
      p.sum_bike > 0 && p.sum_ped === 0 && p.sum_car_truck_bus > 0,
  },
  {
    type: 'PEDESTRIAN_AND_VEHICLE',
    matches: (p) =>
      p.sum_bike === 0 && p.sum_ped > 0 && p.sum_car_truck_bus > 0,
  },
  {
    type: 'BIKE_AND_PEDESTRIAN',
    matches: (p) =>
      p.sum_bike > 0 && p.sum_ped > 0 && p.sum_car_truck_bus === 0,
  },
  {
    type: 'SINGLE_BIKE',
    matches: (p) =>
      p.sum_bike === 1 && p.sum_ped === 0 && p.sum_car_truck_bus === 0,
  },
  {
    type: 'BIKE_ONLY',
    matches: (p) =>
      p.sum_bike > 1 && p.sum_ped === 0 && p.sum_car_truck_bus === 0,
  },
];

const SEVERITY_TYPE_CLASSIFIERS: readonly SeverityClassifier[] = [
  {
    type: 'LOCAL_SEVERE_INJURY',
    matches: (p) => p.sum_severely_injured_bike > 0,
  },
  {
    type: 'LOCAL_INJURY',
    matches: (p) => p.sum_injured_bike > 0 || p.sum_injured_ped > 0,
  },
];

export function getAccidentType(p: AccidentParticipantCounts): AccidentType {
  for (const { type, matches } of ACCIDENT_TYPE_CLASSIFIERS) {
    if (matches(p)) {
      return type;
    }
  }

  return 'UNKNOWN';
}

export function getSeverityType(p: AccidentProperties): SeverityType {
  for (const { type, matches } of SEVERITY_TYPE_CLASSIFIERS) {
    if (matches(p)) {
      return type;
    }
  }

  return 'LOCAL_NO_INJURY';
}

/**
 * Severity bucket for a source that reports casualties per accident instead of
 * per mode of travel (the PPKA CSV). Fatalities share the most severe local
 * bucket — the local legend has no separate fatality entry — but the popup still
 * reports the actual `Unfallkategorie`.
 */
export function getLocalSeverityTypeFromCasualties({
  killed,
  severelyInjured,
  slightlyInjured,
}: AccidentCasualtyTotals): SeverityType {
  if (killed > 0 || severelyInjured > 0) {
    return 'LOCAL_SEVERE_INJURY';
  }
  if (slightlyInjured > 0) {
    return 'LOCAL_INJURY';
  }
  return 'LOCAL_NO_INJURY';
}
