export type AccidentType =
  | 'BIKE_AND_VEHICLE'
  | 'PEDESTRIAN_AND_VEHICLE'
  | 'BIKE_AND_PEDESTRIAN'
  | 'SINGLE_BIKE'
  | 'BIKE_ONLY'
  | 'DEFAULT_FILL';

export type SeverityType = 'SEVERE_INJURY' | 'INJURY' | 'NO_INJURY';

const ACCIDENT_COLORS: Record<AccidentType, string> = {
  BIKE_AND_VEHICLE: '#FF0000',
  PEDESTRIAN_AND_VEHICLE: '#FFA500',
  BIKE_AND_PEDESTRIAN: '#FFDC00',
  SINGLE_BIKE: '#0074D9',
  BIKE_ONLY: '#B10DC9',
  DEFAULT_FILL: '#0FF',
} as const;

const SEVERITY_RADII: Record<SeverityType, number> = {
  SEVERE_INJURY: 9,
  INJURY: 6,
  NO_INJURY: 3,
} as const;

export function getColor(type: AccidentType): string {
  return ACCIDENT_COLORS[type];
}

export function getRadius(type: SeverityType): number {
  return SEVERITY_RADII[type];
}
