import {
  KernBadge,
  KernDescriptionList,
  KernHeading,
} from '@kern-ux-annex/kern-react-kit';

interface AccidentPopupProps {
  properties: Record<string, unknown> | null | undefined;
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

/**
 * Content for a marker popup, rendered with Kern UX components. Rendered to a
 * static HTML string by `renderAccidentPopup` and handed to Leaflet's popup.
 * The severity field, when present, is surfaced as a badge; everything else is
 * shown as a labelled description list.
 */
export function AccidentPopup({ properties }: AccidentPopupProps) {
  if (!properties || Object.keys(properties).length === 0) {
    return (
      <p className="popup-no-properties">
        Keine Eigenschaften für dieses Merkmal verfügbar.
      </p>
    );
  }

  const severity =
    typeof properties.Schweregrad === 'string'
      ? properties.Schweregrad
      : undefined;

  const details: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'Schweregrad') {
      continue;
    }
    details[FIELD_LABELS[key] ?? key] = formatValue(value);
  }

  return (
    <div className="popup-container">
      <KernHeading level={3} size="small">
        Unfalldetails
      </KernHeading>
      {severity && (
        <div className="popup-badge-row">
          <KernBadge label={severity} variant={severityVariant(severity)} withIcon />
        </div>
      )}
      <KernDescriptionList details={details} />
    </div>
  );
}

function severityVariant(
  severity: string,
): 'info' | 'success' | 'warning' | 'danger' {
  if (severity.includes('Getöteten')) {
    return 'danger';
  }
  if (severity.includes('Schwer')) {
    return 'warning';
  }
  return 'info';
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
