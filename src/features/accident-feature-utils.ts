import { AccidentProperties } from '../data/accident-properties';
import {
  AccidentType,
  getColor,
  getRadius,
  SeverityType,
} from '../data/accident-styles';

type AccidentClassifier = {
  type: AccidentType;
  matches: (properties: AccidentProperties) => boolean;
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

const BASE_CIRCLE_MARKER_STYLE: Pick<
  L.CircleMarkerOptions,
  'color' | 'stroke' | 'weight' | 'opacity' | 'fillOpacity'
> = {
  color: '#000000',
  stroke: true,
  weight: 1,
  opacity: 1,
  fillOpacity: 0.9,
};

const STYLE_CACHE = new Map<string, L.CircleMarkerOptions>();

export function getAccidentType(p: AccidentProperties): AccidentType {
  for (const { type, matches } of ACCIDENT_TYPE_CLASSIFIERS) {
    if (matches(p)) {
      return type;
    }
  }

  return 'DEFAULT_FILL';
}

export function getSeverityType(p: AccidentProperties): SeverityType {
  for (const { type, matches } of SEVERITY_TYPE_CLASSIFIERS) {
    if (matches(p)) {
      return type;
    }
  }

  return 'LOCAL_NO_INJURY';
}

export function getStyleFromTypes(
  accidentType: AccidentType,
  severityType: SeverityType,
): L.CircleMarkerOptions {
  const styleKey = `${accidentType}:${severityType}`;
  const cachedStyle = STYLE_CACHE.get(styleKey);
  if (cachedStyle) {
    return cachedStyle;
  }

  const style: L.CircleMarkerOptions = {
    ...BASE_CIRCLE_MARKER_STYLE,
    radius: getRadius(severityType),
    fillColor: getColor(accidentType),
  };
  STYLE_CACHE.set(styleKey, style);
  return style;
}

export function getStyle(
  properties: AccidentProperties,
): L.CircleMarkerOptions {
  return getStyleFromTypes(
    getAccidentType(properties),
    getSeverityType(properties),
  );
}
