import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type * as L from 'leaflet';
import {
  KernButton,
  KernCheckbox,
  KernDivider,
  KernFieldset,
  KernLink,
  KernRadioGroup,
  KernText,
} from '@kern-ux-annex/kern-react-kit';
import { isDataSourceId } from '../../map/data-source-types';
import {
  getSelectedDataSourceId,
  subscribeToDataSourceId,
  setSelectedDataSourceId,
} from '../../map/data-source-store';
import {
  getAvailableUnfallatlasYears,
  getSelectedUnfallatlasYears,
  setSelectedUnfallatlasYears,
  setUnfallatlasYearSelected,
  subscribeToUnfallatlasYears,
} from '../../map/unfallatlas-layer';
import { PanelFrame } from './PanelFrame';

const FRAG_DEN_STAAT_REQUEST_URL =
  'https://fragdenstaat.de/anfrage/rohdaten-zu-verkehrsunfaellen-seit-2017/';
const GITHUB_URL = 'https://github.com/maxliesegang/ppka-bike-accident-map';

const DATA_SOURCE_OPTIONS = [
  { value: 'local', label: 'FragDenStaat Anfrage (Karlsruhe)' },
  { value: 'unfallatlas', label: 'Unfallatlas (bundesweit)' },
];

/**
 * Top-right panel with the query controls: which data source to show and, for
 * Unfallatlas, which years. The visual key for the markers lives separately in
 * the bottom-left legend panel.
 */
export function FilterPanel({ map }: { map: L.Map }) {
  const selectedDataSourceId = useSyncExternalStore(
    subscribeToDataSourceId,
    getSelectedDataSourceId,
  );
  const selectedYears = useSyncExternalStore(
    subscribeToUnfallatlasYears,
    getSelectedUnfallatlasYears,
  );
  const [availableYears, setAvailableYears] = useState<readonly number[]>([]);
  const [yearsMessage, setYearsMessage] = useState('Jahre werden geladen …');
  const selectedYearSet = useMemo(
    () => new Set(selectedYears),
    [selectedYears],
  );

  useEffect(() => {
    let cancelled = false;
    getAvailableUnfallatlasYears()
      .then((years) => {
        if (cancelled) return;
        setAvailableYears(years);
        if (years.length > 0 && getSelectedUnfallatlasYears().length === 0) {
          setSelectedUnfallatlasYears(years);
        }
        setYearsMessage(
          years.length === 0 ? 'Keine Unfallatlas-Jahre gefunden.' : '',
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setYearsMessage('Jahre konnten nicht geladen werden.');
        console.error('Error loading Unfallatlas years:', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleYear = (year: number, selected: boolean) => {
    setUnfallatlasYearSelected(year, selected);
  };

  const applyYears = (years: readonly number[]) => {
    setSelectedUnfallatlasYears(years);
  };

  const changeSelectedDataSource = (value: string) => {
    if (isDataSourceId(value)) {
      setSelectedDataSourceId(value, map);
    }
  };

  return (
    <PanelFrame
      modifier="cp--filter"
      toggleLabel="Filter"
      toggleIcon="checklist"
      preline="Karlsruhe · Fuß- & Radverkehr"
      title="Unfallkarte"
    >
      <KernRadioGroup
        name="datasource"
        legend="Datenquelle"
        items={DATA_SOURCE_OPTIONS}
        selected={selectedDataSourceId}
        onChange={changeSelectedDataSource}
      />
      {selectedDataSourceId === 'local' ? (
        <KernLink
          href={FRAG_DEN_STAAT_REQUEST_URL}
          label="Zur FragDenStaat-Anfrage"
          icon="open-in-new"
          small
          target="_blank"
        />
      ) : (
        <KernText type="body" muted className="cp__hint">
          Bundesweite OpenData, unten nach Jahr einschränkbar.
        </KernText>
      )}

      {selectedDataSourceId === 'unfallatlas' && (
        <>
          <KernDivider spacing="small" />
          <KernFieldset label="Jahre">
            <div className="cp__year-actions">
              <KernButton
                label="Alle"
                variant="tertiary"
                type="button"
                onClick={() => applyYears(availableYears)}
              />
              <KernButton
                label="Keine"
                variant="tertiary"
                type="button"
                onClick={() => applyYears([])}
              />
            </div>
            <div className="cp__year-grid">
              {availableYears.map((year) => (
                <KernCheckbox
                  key={year}
                  id={`ua-year-${year}`}
                  label={String(year)}
                  checked={selectedYearSet.has(year)}
                  onChange={(event) => toggleYear(year, event.target.checked)}
                />
              ))}
            </div>
            <KernText type="body" muted className="cp__hint" aria-live="polite">
              {yearsMessage ||
                yearStatusText(availableYears.length, selectedYears.length)}
            </KernText>
          </KernFieldset>
        </>
      )}

      <KernDivider spacing="small" />

      <footer className="cp__footer">
        <KernLink
          href={GITHUB_URL}
          label="Quellcode auf GitHub"
          icon="open-in-new"
          small
          target="_blank"
        />
      </footer>
    </PanelFrame>
  );
}

function yearStatusText(availableCount: number, selectedCount: number): string {
  if (availableCount === 0) {
    return 'Keine Jahre verfügbar.';
  }
  if (selectedCount === 0) {
    return `Kein Jahr aktiv (${availableCount} verfügbar).`;
  }
  return `${selectedCount} von ${availableCount} Jahren aktiv`;
}
