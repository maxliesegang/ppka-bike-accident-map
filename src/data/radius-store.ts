interface SeverityRadiusStore {
  [key: string]: number;
}

const radiusStore: SeverityRadiusStore = {
  SEVERE_INJURY: 9,
  INJURY: 6,
  NO_INJURY: 3,
};

export type SeverityType = keyof SeverityRadiusStore;

// Get radius for a severity type
export function getRadiusForType(severityType: SeverityType): number {
  return radiusStore[severityType] || radiusStore.NO_INJURY;
}

// Update radius for a severity type
export function updateRadiusForType(
  severityType: SeverityType,
  newRadius: number,
): void {
  if (radiusStore[severityType] !== undefined) {
    radiusStore[severityType] = newRadius;
  } else {
    console.warn(
      `Severity type "${severityType}" does not exist in the radius store.`,
    );
  }
}
