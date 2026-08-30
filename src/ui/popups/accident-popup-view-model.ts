export type AccidentPopupBadgeVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export interface AccidentPopupSummaryItem {
  label: string;
  value: string;
}

export interface AccidentPopupMetric {
  label: string;
  value: string;
}

export interface AccidentPopupViewModel {
  sourceLabel: string;
  severity: { label: string; variant: AccidentPopupBadgeVariant } | null;
  summaryItems: AccidentPopupSummaryItem[];
  metrics: AccidentPopupMetric[];
  details: Record<string, string>;
}

/**
 * Human-readable labels for the raw GeoPackage (local) fields. Unfallatlas
 * records already arrive with German labels, so keys not listed here are shown
 * as-is.
 */
const FIELD_LABELS: Record<string, string> = {
  sum_bike: 'Fahrräder',
  sum_ped: 'Zu Fuß',
  sum_car_truck_bus: 'Kfz (Auto/Lkw/Bus)',
  sum_injured_bike: 'Verletzte (Rad)',
  sum_injured_ped: 'Verletzte (zu Fuß)',
  sum_severely_injured_bike: 'Schwerverletzte (Rad)',
};

const LOCAL_METRICS = [
  { key: 'sum_bike', label: 'Fahrräder' },
  { key: 'sum_ped', label: 'Zu Fuß' },
  { key: 'sum_car_truck_bus', label: 'Kfz' },
  { key: 'sum_injured_bike', label: 'Verletzte Rad' },
  { key: 'sum_injured_ped', label: 'Verletzte Fuß' },
  { key: 'sum_severely_injured_bike', label: 'Schwerverletzte Rad' },
] as const;

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

export function buildAccidentPopupViewModel(
  properties: Record<string, unknown>,
): AccidentPopupViewModel {
  const sourceLabel = getTextProperty(properties, 'Quelle');
  const severityLabel = describeSeverity(properties);
  const time = describeTime(properties);
  const participants = describeParticipants(properties);
  const summaryItems = [
    toSummaryItem('Zeitpunkt', time),
    toSummaryItem('Beteiligung', participants),
  ].filter((item): item is AccidentPopupSummaryItem => item !== null);

  if (summaryItems.length === 0 && sourceLabel) {
    summaryItems.push({ label: 'Quelle', value: sourceLabel });
  }

  return {
    sourceLabel: sourceLabel ?? 'Verkehrsunfall',
    severity: severityLabel
      ? { label: severityLabel, variant: severityVariant(severityLabel) }
      : null,
    summaryItems,
    metrics: buildMetrics(properties),
    details: buildDetails(properties),
  };
}

function toSummaryItem(
  label: string,
  value: string | null,
): AccidentPopupSummaryItem | null {
  return value ? { label, value } : null;
}

function severityVariant(severity: string): AccidentPopupBadgeVariant {
  const normalized = severity.toLocaleLowerCase('de-DE');
  if (normalized.includes('getötet') || normalized.includes('fatal')) {
    return 'danger';
  }
  if (normalized.includes('schwer')) {
    return 'warning';
  }
  if (normalized.includes('keine') || normalized.includes('ohne')) {
    return 'success';
  }
  return 'info';
}

function describeSeverity(properties: Record<string, unknown>): string | null {
  const suppliedSeverity = getTextProperty(properties, 'Schweregrad');
  if (suppliedSeverity) {
    return suppliedSeverity;
  }

  if (
    !('sum_injured_bike' in properties) &&
    !('sum_injured_ped' in properties) &&
    !('sum_severely_injured_bike' in properties)
  ) {
    return null;
  }

  const severelyInjuredBike =
    asNumber(properties.sum_severely_injured_bike) ?? 0;
  const injured =
    (asNumber(properties.sum_injured_bike) ?? 0) +
    (asNumber(properties.sum_injured_ped) ?? 0);

  if (severelyInjuredBike > 0) {
    return `Schwerverletzte Radfahrende: ${formatNumber(severelyInjuredBike)}`;
  }
  if (injured > 0) {
    return `Verletzte: ${formatNumber(injured)}`;
  }
  return 'Keine Verletzten erfasst';
}

function describeTime(properties: Record<string, unknown>): string | null {
  const year = asNumber(properties.Jahr);
  const month = asNumber(properties.Monat);
  const hour = asNumber(properties.Stunde);
  const dateParts: string[] = [];

  if (month !== null && month >= 1 && month <= 12) {
    dateParts.push(MONTH_NAMES[month - 1]);
  }
  if (year !== null) {
    // A year is a plain label, not a quantity — no thousands separator.
    dateParts.push(String(year));
  }

  const timeParts = [...dateParts];
  if (hour !== null && hour >= 0 && hour <= 23) {
    timeParts.push(`${String(hour).padStart(2, '0')}:00 Uhr`);
  }

  return timeParts.length > 0 ? timeParts.join(', ') : null;
}

function describeParticipants(
  properties: Record<string, unknown>,
): string | null {
  const suppliedParticipants = getTextProperty(properties, 'Beteiligung');
  if (suppliedParticipants) {
    return suppliedParticipants;
  }

  const bikes = asNumber(properties.sum_bike);
  const pedestrians = asNumber(properties.sum_ped);
  const motorVehicles = asNumber(properties.sum_car_truck_bus);
  const participantParts = [
    countLabel(bikes, 'Fahrrad', 'Fahrräder'),
    countLabel(pedestrians, 'zu Fuß', 'zu Fuß'),
    countLabel(motorVehicles, 'Kfz', 'Kfz'),
  ].filter((part): part is string => part !== null);

  return participantParts.length > 0 ? participantParts.join(', ') : null;
}

function countLabel(
  count: number | null,
  singular: string,
  plural: string,
): string | null {
  if (count === null || count <= 0) {
    return null;
  }
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

function buildMetrics(
  properties: Record<string, unknown>,
): AccidentPopupMetric[] {
  return LOCAL_METRICS.flatMap(({ key, label }) => {
    const value = asNumber(properties[key]);
    if (value === null) {
      return [];
    }
    return [{ label, value: formatNumber(value) }];
  });
}

function buildDetails(
  properties: Record<string, unknown>,
): Record<string, string> {
  const details: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    details[FIELD_LABELS[key] ?? key] = formatValue(value);
  }
  return details;
}

function getTextProperty(
  properties: Record<string, unknown>,
  key: string,
): string | null {
  const value = properties[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== 'N/A' ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
