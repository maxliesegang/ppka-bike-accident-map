interface AccidentColorStore {
  [key: string]: string;
}

const colorStore: AccidentColorStore = {
  BIKE_AND_VEHICLE: '#FF0000',
  PEDESTRIAN_AND_VEHICLE: '#FFA500',
  BIKE_AND_PEDESTRIAN: '#FFDC00',
  SINGLE_BIKE: '#0074D9',
  BIKE_ONLY: '#B10DC9',
  DEFAULT_FILL: '#0FF',
};

export type AccidentType = keyof typeof colorStore;

// Get color for an accident type
export function getColorForType(accidentType: AccidentType): string {
  return colorStore[accidentType] || colorStore.DEFAULT_FILL;
}

// Update color for an accident type
export function updateColorForType(
  accidentType: AccidentType,
  newColor: string,
): void {
  if (colorStore[accidentType] !== undefined) {
    colorStore[accidentType] = newColor;
  } else {
    console.warn(
      `Accident type "${accidentType}" does not exist in the color store.`,
    );
  }
}
