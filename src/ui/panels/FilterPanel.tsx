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
import { type DataSource } from '../../map/data-source-types';
import {
  getActiveDataSource,
  onDataSourceChange,
  setDataSource,
} from '../../map/data-source-store';
import {
  fetchUnfallatlasAvailableYears,
  getSelectedUnfallatlasYears,
  setUnfallatlasYears,
  setUnfallatlasYearSelection,
  subscribeToUnfallatlasYears,
} from '../../map/unfallatlas-layer';
import { PanelFrame } from './PanelFrame';

const FRAG_DEN_STAAT_REQUEST_URL =
  'https://fragdenstaat.de/anfrage/rohdaten-zu-verkehrsunfaellen-seit-2017/';
const GITHUB_URL = 'https://github.com/maxliesegang/ppka-bike-accident-map';

const SOURCE_ITEMS = [
  { value: 'local', label: 'FragDenStaat Anfrage (Karlsruhe)' },
  { value: 'unfallatlas', label: 'Unfallatlas (bundesweit)' },
];

/**
 * Top-right panel with the query controls: which data source to show and, for
 * Unfallatlas, which years. The visual key for the markers lives separately in
 * the bottom-left legend panel.
 */
export function FilterPanel({ map }: { map: L.Map }) {
  const source = useSyncExternalStore(onDataSourceChange, getActiveDataSource);
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
    fetchUnfallatlasAvailableYears()
      .then((years) => {
        if (cancelled) return;
        setAvailableYears(years);
        if (years.length > 0 && getSelectedUnfallatlasYears().length === 0) {
          setUnfallatlasYears(years);
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
    setUnfallatlasYearSelection(year, selected);
  };

  const applyYears = (years: readonly number[]) => {
    setUnfallatlasYears(years);
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
        items={SOURCE_ITEMS}
        selected={source}
        onChange={(value) => setDataSource(value as DataSource, map)}
      />
      {source === 'local' ? (
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

      {source === 'unfallatlas' && (
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
