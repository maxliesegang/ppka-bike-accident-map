import * as L from 'leaflet';
import {
  getActiveDataSource,
  onDataSourceChange,
  setDataSource,
} from '../data-source-utils';
import { isDataSource } from '../data-source-types';
import {
  fetchUnfallatlasAvailableYears,
  getSelectedUnfallatlasYears,
  setUnfallatlasYears,
  setUnfallatlasYearSelection,
} from '../unfallatlas-layer';
import {
  bindPanelToggle,
  buildDataSourcePanelContent,
  buildYearChip,
  createPanelBody,
  createPanelToggle,
  createPanelWrapper,
  DATA_PANEL_BODY_ID,
  getElementFromEvent,
  getInputFromEvent,
  parseYear,
  queryRequired,
  setAllYearInputsChecked,
  setYearStatusText,
  updateDataSourceState,
  updateUnfallatlasSourceLabel,
  updateYearSectionState,
  updateYearStatusFromInputs,
  YEAR_CLEAR_ALL_ACTION,
  YEAR_SELECT_ALL_ACTION,
} from './filter-control-shared';

interface DataSourcePanelElements {
  yearSection: HTMLElement;
  sourceStatus: HTMLElement;
  yearsGrid: HTMLElement;
  yearsStatus: HTMLElement;
  unfallatlasLabel: HTMLElement;
}

interface DataPanelChangeContext {
  event: Event;
  map: L.Map;
  yearsGrid: HTMLElement;
  yearsStatus: HTMLElement;
}

interface DataPanelClickContext {
  event: Event;
  yearsGrid: HTMLElement;
  yearsStatus: HTMLElement;
  availableYears: readonly number[];
}

interface UnfallatlasYearUiContext {
  yearsGrid: HTMLElement;
  yearsStatus: HTMLElement;
  unfallatlasLabel: HTMLElement;
}

class DataSourceControl extends L.Control {
  private unsubscribeDataSourceChange: (() => void) | null = null;

  override onAdd(map: L.Map): HTMLElement {
    const wrapper = createPanelWrapper('filter-panel--source');
    const toggle = createPanelToggle(
      wrapper,
      DATA_PANEL_BODY_ID,
      'Datenquelle ein- oder ausblenden',
      'Datenquelle',
    );
    const body = createPanelBody(wrapper, DATA_PANEL_BODY_ID);

    body.innerHTML = buildDataSourcePanelContent();
    const uiElements = getRequiredDataSourceElements(body);

    let availableUnfallatlasYears: number[] = [];

    const initialSource = getActiveDataSource();
    updateDataSourceState(body, uiElements.sourceStatus, initialSource);
    updateYearSectionState(uiElements.yearSection, initialSource);

    this.unsubscribeDataSourceChange = onDataSourceChange((source) => {
      updateDataSourceState(body, uiElements.sourceStatus, source);
      updateYearSectionState(uiElements.yearSection, source);
    });

    void hydrateUnfallatlasYearOptions({
      yearsGrid: uiElements.yearsGrid,
      yearsStatus: uiElements.yearsStatus,
      unfallatlasLabel: uiElements.unfallatlasLabel,
    }).then((availableYears) => {
      availableUnfallatlasYears = availableYears;
    });

    bindPanelToggle(wrapper, toggle);

    body.addEventListener('change', (event: Event) => {
      handleDataPanelChange({
        event,
        map,
        yearsGrid: uiElements.yearsGrid,
        yearsStatus: uiElements.yearsStatus,
      });
    });

    body.addEventListener('click', (event: Event) => {
      handleDataPanelClick({
        event,
        yearsGrid: uiElements.yearsGrid,
        yearsStatus: uiElements.yearsStatus,
        availableYears: availableUnfallatlasYears,
      });
    });

    return wrapper;
  }

  override onRemove(): void {
    this.unsubscribeDataSourceChange?.();
    this.unsubscribeDataSourceChange = null;
  }
}

function getRequiredDataSourceElements(
  root: ParentNode,
): DataSourcePanelElements {
  return {
    yearSection: queryRequired<HTMLElement>(
      root,
      '[data-unfallatlas-years-section]',
    ),
    sourceStatus: queryRequired<HTMLElement>(root, '[data-source-status]'),
    yearsGrid: queryRequired<HTMLElement>(
      root,
      '[data-unfallatlas-years-grid]',
    ),
    yearsStatus: queryRequired<HTMLElement>(
      root,
      '[data-unfallatlas-years-status]',
    ),
    unfallatlasLabel: queryRequired<HTMLElement>(
      root,
      '[data-unfallatlas-label]',
    ),
  };
}

function handleDataPanelChange({
  event,
  map,
  yearsGrid,
  yearsStatus,
}: DataPanelChangeContext): void {
  const input = getInputFromEvent(event);
  if (!input) {
    return;
  }

  const { kind, type, year } = input.dataset;

  if (kind === 'datasource') {
    if (isDataSource(type)) {
      setDataSource(type, map);
    }
    return;
  }

  if (kind !== 'unfallatlas-year') {
    return;
  }

  const parsedYear = parseYear(year);
  if (parsedYear === null) {
    return;
  }

  setUnfallatlasYearSelection(parsedYear, input.checked);
  updateYearStatusFromInputs(yearsStatus, yearsGrid);
}

function handleDataPanelClick({
  event,
  yearsGrid,
  yearsStatus,
  availableYears,
}: DataPanelClickContext): void {
  const targetElement = getElementFromEvent(event);
  if (!targetElement) {
    return;
  }

  const actionButton =
    targetElement.closest<HTMLButtonElement>('[data-action]');
  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;
  if (action === YEAR_SELECT_ALL_ACTION) {
    if (availableYears.length === 0) {
      return;
    }

    setUnfallatlasYears(availableYears);
    setAllYearInputsChecked(yearsGrid, true);
    setYearStatusText(
      yearsStatus,
      availableYears.length,
      availableYears.length,
    );
    return;
  }

  if (action === YEAR_CLEAR_ALL_ACTION) {
    setUnfallatlasYears([]);
    setAllYearInputsChecked(yearsGrid, false);
    setYearStatusText(yearsStatus, availableYears.length, 0);
  }
}

async function hydrateUnfallatlasYearOptions({
  yearsGrid,
  yearsStatus,
  unfallatlasLabel,
}: UnfallatlasYearUiContext): Promise<number[]> {
  yearsStatus.textContent = 'Jahre werden geladen...';

  try {
    const availableYears = await fetchUnfallatlasAvailableYears();
    updateUnfallatlasSourceLabel(unfallatlasLabel, availableYears);

    if (availableYears.length === 0) {
      yearsGrid.innerHTML = '';
      yearsStatus.textContent = 'Keine Unfallatlas-Jahre gefunden.';
      return [];
    }

    if (getSelectedUnfallatlasYears().length === 0) {
      setUnfallatlasYears(availableYears);
    }

    const selectedYears = new Set(getSelectedUnfallatlasYears());
    yearsGrid.innerHTML = availableYears
      .map((year) => buildYearChip(year, selectedYears.has(year)))
      .join('');
    setYearStatusText(yearsStatus, availableYears.length, selectedYears.size);
    return availableYears;
  } catch (error: unknown) {
    yearsGrid.innerHTML = '';
    yearsStatus.textContent = 'Jahre konnten nicht geladen werden.';
    console.error('Error loading Unfallatlas years:', error);
    return [];
  }
}

export function createDataSourceControl(): L.Control {
  return new DataSourceControl({ position: 'topright' });
}
