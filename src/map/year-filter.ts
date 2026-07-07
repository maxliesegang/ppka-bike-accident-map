/**
 * A data source's year filter, viewed uniformly by the UI. Each source backs it
 * differently — the FragDenStaat (local) source filters loaded markers
 * client-side, the Unfallatlas sources load whole yearly CSVs — but both expose
 * the same snapshot-based surface so the filter panel stays backend-agnostic.
 * Adding year filtering to a new source means providing another controller, not
 * touching the panel.
 *
 * The getters return referentially stable snapshots so they can drive React's
 * `useSyncExternalStore`; `subscribe` fires whenever any snapshot changes.
 */
export interface YearFilterController {
  subscribe(listener: () => void): () => void;
  getStatus(): YearFilterStatus;
  /** Selectable years, ascending. */
  getAvailableYears(): readonly number[];
  /** Currently active years (subset of available). */
  getSelectedYears(): readonly number[];
  setSelectedYears(years: readonly number[]): void;
  setYearSelected(year: number, selected: boolean): void;
  /** Hints shown while the year list is unavailable; see `resolveYearMessage`. */
  readonly messages: YearFilterMessages;
}

export type YearFilterStatus = 'loading' | 'ready' | 'error';

export interface YearFilterMessages {
  loading: string;
  empty: string;
  error: string;
}

/**
 * Status/emptiness hint for the year fieldset, or `''` when the concrete year
 * list should speak for itself.
 */
export function resolveYearMessage(
  controller: YearFilterController,
  status: YearFilterStatus,
  availableCount: number,
): string {
  if (status === 'error') {
    return controller.messages.error;
  }
  if (status === 'loading') {
    return controller.messages.loading;
  }
  if (availableCount === 0) {
    return controller.messages.empty;
  }
  return '';
}

/** Order-sensitive equality for the normalized (ascending) year arrays. */
export function areYearsEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === right.length &&
    left.every((year, index) => year === right[index])
  );
}

/**
 * The canonical shape a year array takes before it is compared or stored:
 * de-duplicated, sorted ascending, with non-integer entries dropped.
 */
export function normalizeYears(years: readonly number[]): number[] {
  const uniqueYears = new Set<number>();
  for (const year of years) {
    if (Number.isInteger(year)) {
      uniqueYears.add(year);
    }
  }
  return [...uniqueYears].sort((a, b) => a - b);
}

/** Returns `years` with `year` added or removed, following `selected`. */
export function toggleYear(
  years: readonly number[],
  year: number,
  selected: boolean,
): number[] {
  const nextYears = new Set(years);
  if (selected) {
    nextYears.add(year);
  } else {
    nextYears.delete(year);
  }
  return [...nextYears];
}
