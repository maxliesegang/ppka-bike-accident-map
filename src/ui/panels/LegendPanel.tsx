import {
  KernCheckbox,
  KernDivider,
  KernFieldset,
} from '@kern-ux-annex/kern-react-kit';
import { useSyncExternalStore } from 'react';
import {
  ACCIDENT_LEGENDS,
  LOCAL_SEVERITY_LEGENDS,
  UNFALLATLAS_SEVERITY_LEGENDS,
} from '../../constants';
import {
  getAccidentColor,
  getSeverityRadius,
} from '../../data/accident-styles';
import {
  getSelectedAccidentTypes,
  getSelectedSeverityTypes,
  setAccidentTypeSelected,
  setSeverityTypeSelected,
  subscribeToAccidentMarkerFilters,
} from '../../map/accident-marker-store';
import {
  getSelectedDataSourceId,
  subscribeToDataSourceId,
} from '../../map/data-source-store';
import { PanelFrame } from './PanelFrame';

/**
 * Bottom-left panel: the visual key for the markers. Colour encodes the
 * accident type, dot size encodes severity — and each row is a checkbox, so the
 * legend doubles as the accident/severity filter. Selection state is owned by
 * `marker-store`; this panel only reflects and mutates it.
 */
export function LegendPanel() {
  const selectedDataSourceId = useSyncExternalStore(
    subscribeToDataSourceId,
    getSelectedDataSourceId,
  );
  const accidentSelection = useSyncExternalStore(
    subscribeToAccidentMarkerFilters,
    getSelectedAccidentTypes,
  );
  const severitySelection = useSyncExternalStore(
    subscribeToAccidentMarkerFilters,
    getSelectedSeverityTypes,
  );

  const severityEntries =
    selectedDataSourceId === 'local'
      ? LOCAL_SEVERITY_LEGENDS
      : UNFALLATLAS_SEVERITY_LEGENDS;

  return (
    <PanelFrame
      modifier="cp--legend"
      toggleLabel="Legende"
      toggleIcon="visibility"
      title="Legende"
    >
      <KernFieldset label="Unfallart" hint="Farbe der Punkte">
        {ACCIDENT_LEGENDS.map(({ type, description }) => (
          <div className="cp__row" key={type}>
            <span
              className="cp__swatch"
              style={{ background: getAccidentColor(type) }}
              aria-hidden="true"
            />
            <KernCheckbox
              id={`accident-${type}`}
              label={description}
              checked={accidentSelection.has(type)}
              onChange={(event) =>
                setAccidentTypeSelected(type, event.target.checked)
              }
            />
          </div>
        ))}
      </KernFieldset>

      <KernDivider spacing="small" />

      <KernFieldset label="Schweregrad" hint="Größe der Punkte">
        {severityEntries.map(({ type, description }) => {
          const size = getSeverityRadius(type) * 2;
          return (
            <div className="cp__row" key={type}>
              <span className="cp__swatch-wrap" aria-hidden="true">
                <span
                  className="cp__swatch cp__swatch--dark"
                  style={{ width: `${size}px`, height: `${size}px` }}
                />
              </span>
              <KernCheckbox
                id={`severity-${type}`}
                label={description}
                checked={severitySelection.has(type)}
                onChange={(event) =>
                  setSeverityTypeSelected(type, event.target.checked)
                }
              />
            </div>
          );
        })}
      </KernFieldset>
    </PanelFrame>
  );
}
