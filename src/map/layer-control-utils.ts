import * as L from 'leaflet';
import { ACCIDENT_LEGENDS, SEVERITY_LEGENDS } from '../constants';
import {
  type AccidentType,
  getColor,
  getRadius,
  type SeverityType,
} from '../data/accident-styles';
import {
  setAccidentTypeSelection,
  setSeverityTypeSelection,
} from './layer-filter-utils';

const FilterControl = L.Control.extend({
  options: { position: 'bottomleft' },

  onAdd() {
    const wrapper = L.DomUtil.create('div', 'filter-panel');
    L.DomEvent.disableClickPropagation(wrapper);
    L.DomEvent.disableScrollPropagation(wrapper);

    const toggle = L.DomUtil.create('button', 'filter-panel-toggle', wrapper);
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Filter ein-/ausblenden');
    toggle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="0"/><circle cx="8" cy="12" r="0"/><circle cx="12" cy="18" r="0"/></svg>`;

    const body = L.DomUtil.create('div', 'filter-panel-body', wrapper);
    body.innerHTML =
      buildSection('Unfallart', buildAccidentItems()) +
      buildSection('Schweregrad', buildSeverityItems());

    toggle.addEventListener('click', () => {
      wrapper.classList.toggle('filter-panel--open');
    });

    body.addEventListener('change', (e: Event) => {
      const input = e.target as HTMLInputElement;
      const kind = input.dataset.kind;
      const type = input.dataset.type!;

      if (kind === 'accident') {
        setAccidentTypeSelection(type as AccidentType, input.checked);
      } else {
        setSeverityTypeSelection(type as SeverityType, input.checked);
      }
    });

    // Start expanded on desktop
    if (window.innerWidth > 600) {
      wrapper.classList.add('filter-panel--open');
    }

    return wrapper;
  },
});

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

function buildSeverityItems(): string[] {
  return SEVERITY_LEGENDS.map(
    ({ key, description }) =>
      `<label class="filter-item">
        <input type="checkbox" checked data-kind="severity" data-type="${key}" />
        <span class="filter-swatch filter-swatch--dark" style="width:${getRadius(key) * 2}px;height:${getRadius(key) * 2}px"></span>
        <span class="filter-label">${description}</span>
      </label>`,
  );
}

function buildSection(title: string, items: string[]): string {
  return `<div class="filter-section">
    <div class="filter-section-title">${title}</div>
    ${items.join('')}
  </div>`;
}

export function addFilterControlToMap(map: L.Map): void {
  new FilterControl().addTo(map);
}
