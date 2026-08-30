import {
  KernButton,
  KernCheckbox,
  KernDivider,
  KernFieldset,
  KernLink,
  KernRadioGroup,
  KernText,
} from '@kern-ux-annex/kern-react-kit';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useMemo, useSyncExternalStore } from 'react';
import { localYearFilterController } from '../../map/accident-marker-store';
import {
  getSelectedDataSourceId,
  setSelectedDataSourceId,
  subscribeToDataSourceId,
} from '../../map/data-source-store';
import {
  isDataSourceId,
  isUnfallatlasSource,
} from '../../map/data-source-types';
import { unfallatlasYearFilterController } from '../../map/unfallatlas-layer';
import {
  resolveYearMessage,
  type YearFilterController,
} from '../../map/year-filter';
import { PanelFrame } from './PanelFrame';

const FRAG_DEN_STAAT_REQUEST_URL =
  'https://fragdenstaat.de/anfrage/rohdaten-zu-verkehrsunfaellen-seit-2017/';
const GITHUB_URL = 'https://github.com/maxliesegang/ppka-bike-accident-map';

const DATA_SOURCE_OPTIONS = [
  { value: 'local', label: 'FragDenStaat Anfrage (Karlsruhe)' },
  { value: 'unfallatlas-karlsruhe', label: 'Unfallatlas (Karlsruhe)' },
  { value: 'unfallatlas', label: 'Unfallatlas (Baden-Württemberg)' },
];

/**
 * Top-right panel with the query controls: which data source to show and which
 * years to include. The visual key for the markers lives separately in the
 * bottom-left legend panel.
 */
export function FilterPanel({ map }: { map: MapLibreMap }) {
  const selectedDataSourceId = useSyncExternalStore(
    subscribeToDataSourceId,
    getSelectedDataSourceId,
  );

  // Each source backs its year filter differently, but exposes the same
  // controller — so the panel just picks the active one and stays backend-agnostic.
  const yearController = isUnfallatlasSource(selectedDataSourceId)
    ? unfallatlasYearFilterController
    : localYearFilterController;
  const { availableYears, selectedYears, selectedYearSet, yearMessage } =
    useYearFilter(yearController);

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
          {selectedDataSourceId === 'unfallatlas-karlsruhe'
            ? 'Unfallatlas-OpenData, eingegrenzt auf Stadt- und Landkreis Karlsruhe. Unten nach Jahr einschränkbar.'
            : 'Unfallatlas-OpenData für Baden-Württemberg, unten nach Jahr einschränkbar.'}
        </KernText>
      )}

      {/* All sources are year-filterable: Unfallatlas via its CSV loader,
          the FragDenStaat (local) source via the client-side year dimension. */}
      <KernDivider spacing="small" />
      <KernFieldset label="Jahre">
        <div className="cp__year-actions">
          <KernButton
            label="Alle"
            variant="tertiary"
            type="button"
            onClick={() => yearController.setSelectedYears(availableYears)}
          />
          <KernButton
            label="Keine"
            variant="tertiary"
            type="button"
            onClick={() => yearController.setSelectedYears([])}
          />
        </div>
        <div className="cp__year-grid">
          {availableYears.map((year) => (
            <KernCheckbox
              key={year}
              id={`year-${year}`}
              label={String(year)}
              checked={selectedYearSet.has(year)}
              onChange={(event) =>
                yearController.setYearSelected(year, event.target.checked)
              }
            />
          ))}
        </div>
        <KernText type="body" muted className="cp__hint" aria-live="polite">
          {yearMessage ||
            yearSelectionSummary(availableYears.length, selectedYears.length)}
        </KernText>
      </KernFieldset>

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

/**
 * Reads a year filter controller into render-ready values. Both hooks re-run when
 * the controller changes (data source switch) and re-subscribe automatically.
 */
function useYearFilter(controller: YearFilterController) {
  const availableYears = useSyncExternalStore(
    controller.subscribe,
    controller.getAvailableYears,
  );
  const selectedYears = useSyncExternalStore(
    controller.subscribe,
    controller.getSelectedYears,
  );
  const status = useSyncExternalStore(
    controller.subscribe,
    controller.getStatus,
  );
  const selectedYearSet = useMemo(
    () => new Set(selectedYears),
    [selectedYears],
  );
  const yearMessage = resolveYearMessage(
    controller,
    status,
    availableYears.length,
  );
  return { availableYears, selectedYears, selectedYearSet, yearMessage };
}

function yearSelectionSummary(
  availableCount: number,
  selectedCount: number,
): string {
  if (availableCount === 0) {
    return 'Keine Jahre verfügbar.';
  }
  if (selectedCount === 0) {
    return `Kein Jahr aktiv (${availableCount} verfügbar).`;
  }
  return `${selectedCount} von ${availableCount} Jahren aktiv`;
}
