import * as L from 'leaflet';
import {
  ACCIDENT_LEGENDS,
  LOCAL_SEVERITY_LEGENDS,
  UNFALLATLAS_SEVERITY_LEGENDS,
} from '../../constants';
import {
  type AccidentType,
  getColor,
  getRadius,
  type SeverityType,
} from '../../data/accident-styles';
import { type DataSource } from '../data-source-types';

const FRAG_DEN_STAAT_REQUEST_URL =
  'https://fragdenstaat.de/anfrage/rohdaten-zu-verkehrsunfaellen-seit-2017/';
const FILTER_TOGGLE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="0"/><circle cx="8" cy="12" r="0"/><circle cx="12" cy="18" r="0"/></svg>`;

const accidentTypeValues = new Set<AccidentType>(
  ACCIDENT_LEGENDS.map(({ type }) => type),
);
const severityTypeValues = new Set<SeverityType>([
  ...LOCAL_SEVERITY_LEGENDS.map(({ key }) => key),
  ...UNFALLATLAS_SEVERITY_LEGENDS.map(({ key }) => key),
]);

export const DATA_PANEL_BODY_ID = 'map-data-panel-body';
export const LEGEND_PANEL_BODY_ID = 'map-legend-panel-body';
export const YEAR_SELECT_ALL_ACTION = 'unfallatlas-years-select-all';
export const YEAR_CLEAR_ALL_ACTION = 'unfallatlas-years-clear-all';

export function isAccidentType(
  value: string | undefined,
): value is AccidentType {
  if (!value) {
    return false;
  }

  return accidentTypeValues.has(value as AccidentType);
}

export function isSeverityType(
  value: string | undefined,
): value is SeverityType {
  if (!value) {
    return false;
  }

  return severityTypeValues.has(value as SeverityType);
}

export function createPanelWrapper(panelModifierClass: string): HTMLElement {
  const wrapper = L.DomUtil.create('div', `filter-panel ${panelModifierClass}`);
  L.DomEvent.disableClickPropagation(wrapper);
  L.DomEvent.disableScrollPropagation(wrapper);
  return wrapper;
}

export function createPanelToggle(
  wrapper: HTMLElement,
  controlsId: string,
  ariaLabel: string,
  text: string,
): HTMLButtonElement {
  const toggle = L.DomUtil.create('button', 'filter-panel-toggle', wrapper);
  toggle.type = 'button';
  toggle.setAttribute('aria-label', ariaLabel);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', controlsId);
  toggle.innerHTML = `${FILTER_TOGGLE_ICON}<span>${text}</span>`;
  return toggle;
}

export function createPanelBody(wrapper: HTMLElement, id: string): HTMLElement {
  const body = L.DomUtil.create('div', 'filter-panel-body', wrapper);
  body.id = id;
  return body;
}

export function bindPanelToggle(
  wrapper: HTMLElement,
  toggle: HTMLButtonElement,
): void {
  toggle.addEventListener('click', () => {
    wrapper.classList.toggle('filter-panel--open');
    toggle.setAttribute(
      'aria-expanded',
      wrapper.classList.contains('filter-panel--open') ? 'true' : 'false',
    );
  });
}

export function queryRequired<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required control element: ${selector}`);
  }

  return element;
}

export function getInputFromEvent(event: Event): HTMLInputElement | null {
  const target = event.target;
  return target instanceof HTMLInputElement ? target : null;
}

export function getElementFromEvent(event: Event): HTMLElement | null {
  const target = event.target;
  return target instanceof HTMLElement ? target : null;
}

export function buildDataSourcePanelContent(): string {
  return `<div class="filter-shell filter-shell--source">
      ${buildDataSourceSection()}
      ${buildUnfallatlasYearSection()}
    </div>`;
}

export function buildLegendPanelContent(): string {
  return `<div class="filter-shell filter-shell--legend">
      ${buildSection('Unfallart', buildAccidentItems())}
      ${buildSourceSpecificSeveritySection(
        'local',
        'Schweregrad (FragDenStaat Anfrage PPKA)',
        buildSeverityItems(LOCAL_SEVERITY_LEGENDS),
      )}
      ${buildSourceSpecificSeveritySection(
        'unfallatlas',
        'Schweregrad (Unfallatlas Kategorien)',
        buildSeverityItems(UNFALLATLAS_SEVERITY_LEGENDS),
      )}
    </div>`;
}

export function updateYearSectionState(
  yearSection: HTMLElement,
  source: DataSource,
): void {
  const isVisible = source === 'unfallatlas';
  yearSection.hidden = !isVisible;
  yearSection.classList.toggle('filter-years--hidden', !isVisible);
  yearSection.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

export function updateSeveritySectionState(
  severitySections: NodeListOf<HTMLElement>,
  source: DataSource,
): void {
  for (const section of severitySections) {
    const sectionSource = section.dataset.sourceType;
    const isVisible = sectionSource === source;
    section.hidden = !isVisible;
    section.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
  }
}

export function updateDataSourceState(
  controlRoot: HTMLElement,
  statusElement: HTMLElement,
  source: DataSource,
): void {
  const cards = controlRoot.querySelectorAll<HTMLElement>('[data-source-card]');
  for (const card of cards) {
    const cardSource = card.dataset.sourceType;
    const isActive = cardSource === source;
    card.classList.toggle('filter-source-card--active', isActive);
  }

  const selectedInput = controlRoot.querySelector<HTMLInputElement>(
    `input[data-kind="datasource"][data-type="${source}"]`,
  );
  if (selectedInput && !selectedInput.checked) {
    selectedInput.checked = true;
  }

  statusElement.textContent =
    source === 'local'
      ? 'Aktiv: FragDenStaat Anfrage PPKA. Die Jahr-Auswahl ist ausgeblendet.'
      : 'Aktiv: Unfallatlas. Nutze die Jahresauswahl für den Datenumfang.';
}

export function updateUnfallatlasSourceLabel(
  labelElement: HTMLElement,
  years: readonly number[],
): void {
  if (years.length === 0) {
    labelElement.textContent = 'Unfallatlas';
    return;
  }

  labelElement.textContent = `Unfallatlas (${formatYearRange(years)})`;
}

export function parseYear(rawValue: string | undefined): number | null {
  if (!rawValue) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function updateYearStatusFromInputs(
  statusElement: HTMLElement,
  yearsGrid: HTMLElement,
): void {
  const inputs = yearsGrid.querySelectorAll<HTMLInputElement>(
    'input[data-kind="unfallatlas-year"]',
  );

  let selectedCount = 0;
  for (const input of inputs) {
    if (input.checked) {
      selectedCount += 1;
    }
  }

  setYearStatusText(statusElement, inputs.length, selectedCount);
}

export function setYearStatusText(
  statusElement: HTMLElement,
  availableCount: number,
  selectedCount: number,
): void {
  if (availableCount === 0) {
    statusElement.textContent = 'Keine Jahre verfügbar.';
    return;
  }

  if (selectedCount === 0) {
    statusElement.textContent = `Kein Jahr aktiv (${availableCount} verfügbar).`;
    return;
  }

  statusElement.textContent = `${selectedCount} von ${availableCount} Jahren aktiv`;
}

export function setAllYearInputsChecked(
  yearsGrid: HTMLElement,
  selected: boolean,
): void {
  const inputs = yearsGrid.querySelectorAll<HTMLInputElement>(
    'input[data-kind="unfallatlas-year"]',
  );

  for (const input of inputs) {
    input.checked = selected;
  }
}

function buildDataSourceSection(): string {
  return `<fieldset class="filter-section filter-card">
    <legend class="filter-step-title">Datenquelle</legend>
    <div class="filter-source-grid">
      <div class="filter-source-card" data-source-card data-source-type="local">
        <label class="filter-source-option">
          <input type="radio" name="datasource" checked data-kind="datasource" data-type="local" />
          <span class="filter-source-title">FragDenStaat Anfrage PPKA</span>
          <span class="filter-source-description">Karlsruhe-Datensatz aus der FragDenStaat-Anfrage.</span>
        </label>
        <a class="filter-source-link" href="${FRAG_DEN_STAAT_REQUEST_URL}" target="_blank" rel="noopener noreferrer">Zur Anfrage</a>
      </div>
      <div class="filter-source-card" data-source-card data-source-type="unfallatlas">
        <label class="filter-source-option">
          <input type="radio" name="datasource" data-kind="datasource" data-type="unfallatlas" />
          <span class="filter-source-title" data-unfallatlas-label>Unfallatlas</span>
          <span class="filter-source-description">Bundesweite OpenData, unten nach Jahr einschränkbar.</span>
        </label>
      </div>
    </div>
    <p class="filter-source-status" data-source-status aria-live="polite"></p>
  </fieldset>`;
}

function buildUnfallatlasYearSection(): string {
  return `<fieldset class="filter-section filter-card filter-years" data-unfallatlas-years-section>
    <legend class="filter-step-title">Unfallatlas Jahre</legend>
    <p class="filter-step-hint">Nur sichtbar bei aktiver Unfallatlas-Quelle.</p>
    <div class="filter-year-actions">
      <button type="button" class="filter-year-action" data-action="${YEAR_SELECT_ALL_ACTION}">Alle</button>
      <button type="button" class="filter-year-action" data-action="${YEAR_CLEAR_ALL_ACTION}">Keine</button>
    </div>
    <div class="filter-year-grid" data-unfallatlas-years-grid></div>
    <div class="filter-year-status" data-unfallatlas-years-status aria-live="polite"></div>
  </fieldset>`;
}

export function buildYearChip(year: number, checked: boolean): string {
  return `<label class="filter-year-chip">
    <input type="checkbox" data-kind="unfallatlas-year" data-year="${year}" ${
      checked ? 'checked' : ''
    } />
    <span>${year}</span>
  </label>`;
}

function buildAccidentItems(): string[] {
  return ACCIDENT_LEGENDS.map(
    ({ type, description }) =>
      `<label class="filter-item">
        <input type="checkbox" checked data-kind="accident" data-type="${type}" />
        <span class="filter-swatch" style="background:${getColor(type)}"></span>
        <span class="filter-label">${description}</span>
      </label>`,
  );
}

function buildSeverityItems(
  entries: readonly { key: SeverityType; description: string }[],
): string[] {
  return entries.map(
    ({ key, description }) =>
      `<label class="filter-item">
        <input type="checkbox" checked data-kind="severity" data-type="${key}" />
        <span class="filter-swatch filter-swatch--dark" style="width:${getRadius(key) * 2}px;height:${getRadius(key) * 2}px"></span>
        <span class="filter-label">${description}</span>
      </label>`,
  );
}

function buildSection(title: string, items: string[]): string {
  return `<fieldset class="filter-section filter-card">
    <legend class="filter-step-title">${title}</legend>
    <div class="filter-option-list">
      ${items.join('')}
    </div>
  </fieldset>`;
}

function buildSourceSpecificSeveritySection(
  source: DataSource,
  title: string,
  items: string[],
): string {
  return `<fieldset class="filter-section filter-card" data-severity-section data-source-type="${source}">
    <legend class="filter-step-title">${title}</legend>
    <div class="filter-option-list">
      ${items.join('')}
    </div>
  </fieldset>`;
}

function formatYearRange(years: readonly number[]): string {
  const sortedYears = [...years].sort((a, b) => a - b);
  const firstYear = sortedYears[0];
  const lastYear = sortedYears[sortedYears.length - 1];
  return firstYear === lastYear ? `${firstYear}` : `${firstYear}-${lastYear}`;
}
