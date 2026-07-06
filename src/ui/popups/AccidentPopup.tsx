import {
  KernBadge,
  KernDescriptionList,
  KernDivider,
  KernHeading,
  KernText,
} from '@kern-ux-annex/kern-react-kit';
import {
  buildAccidentPopupViewModel,
  type AccidentPopupMetric,
  type AccidentPopupSummaryItem,
} from './accident-popup-view-model';

interface AccidentPopupProps {
  properties: Record<string, unknown> | null | undefined;
}

/**
 * Content for a marker popup, rendered with Kern UX components. Rendered to a
 * static HTML string by `renderAccidentPopup` and handed to Leaflet's popup.
 * The top section is optimized for scanning; the complete labelled field list
 * remains available below it for verification and power use.
 */
export function AccidentPopup({ properties }: AccidentPopupProps) {
  if (!properties || Object.keys(properties).length === 0) {
    return (
      <p className="popup-no-properties">
        Keine Eigenschaften für dieses Merkmal verfügbar.
      </p>
    );
  }

  const viewModel = buildAccidentPopupViewModel(properties);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="popup-title">
          <KernText type="preline" size="small">
            {viewModel.sourceLabel}
          </KernText>
          <KernHeading level={3} size="small">
            Unfalldetails
          </KernHeading>
        </div>
        {viewModel.severity && (
          <KernBadge
            label={viewModel.severity.label}
            variant={viewModel.severity.variant}
            withIcon
          />
        )}
      </header>

      <div className="popup-summary" aria-label="Zusammenfassung">
        {viewModel.summaryItems.map((item) => (
          <SummaryItem item={item} key={item.label} />
        ))}
      </div>

      {viewModel.metrics.length > 0 && (
        <div className="popup-metrics" aria-label="Kennzahlen">
          {viewModel.metrics.map((metric) => (
            <MetricItem metric={metric} key={metric.label} />
          ))}
        </div>
      )}

      <KernDivider spacing="small" />

      <details className="popup-disclosure">
        <summary className="popup-disclosure__summary">
          <span className="popup-disclosure__title">Alle Angaben</span>
          <span className="popup-disclosure__count">
            {Object.keys(viewModel.details).length} Felder
          </span>
        </summary>
        <KernDescriptionList
          details={viewModel.details}
          className="popup-details"
        />
      </details>
    </div>
  );
}

function SummaryItem({ item }: { item: AccidentPopupSummaryItem }) {
  return (
    <div className="popup-summary__item">
      <span className="popup-summary__label">{item.label}</span>
      <span className="popup-summary__value">{item.value}</span>
    </div>
  );
}

function MetricItem({ metric }: { metric: AccidentPopupMetric }) {
  return (
    <div className="popup-metric">
      <span className="popup-metric__value">{metric.value}</span>
      <span className="popup-metric__label">{metric.label}</span>
    </div>
  );
}
