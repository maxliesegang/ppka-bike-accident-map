import * as L from 'leaflet';
import { getActiveDataSource, onDataSourceChange } from '../data-source-utils';
import {
  setAccidentTypeSelection,
  setSeverityTypeSelection,
} from '../layer-filter-utils';
import {
  bindPanelToggle,
  buildLegendPanelContent,
  createPanelBody,
  createPanelToggle,
  createPanelWrapper,
  getInputFromEvent,
  isAccidentType,
  isSeverityType,
  LEGEND_PANEL_BODY_ID,
  updateSeveritySectionState,
} from './filter-control-shared';

class LegendControl extends L.Control {
  private unsubscribeDataSourceChange: (() => void) | null = null;

  override onAdd(): HTMLElement {
    const wrapper = createPanelWrapper('filter-panel--legend');
    const toggle = createPanelToggle(
      wrapper,
      LEGEND_PANEL_BODY_ID,
      'Legende und Filter ein- oder ausblenden',
      'Legende',
    );
    const body = createPanelBody(wrapper, LEGEND_PANEL_BODY_ID);

    body.innerHTML = buildLegendPanelContent();

    const severitySections = body.querySelectorAll<HTMLElement>(
      '[data-severity-section]',
    );
    const initialSource = getActiveDataSource();
    updateSeveritySectionState(severitySections, initialSource);

    this.unsubscribeDataSourceChange = onDataSourceChange((source) => {
      updateSeveritySectionState(severitySections, source);
    });

    bindPanelToggle(wrapper, toggle);

    body.addEventListener('change', (event: Event) => {
      handleLegendPanelChange(event);
    });

    return wrapper;
  }

  override onRemove(): void {
    this.unsubscribeDataSourceChange?.();
    this.unsubscribeDataSourceChange = null;
  }
}

function handleLegendPanelChange(event: Event): void {
  const input = getInputFromEvent(event);
  if (!input) {
    return;
  }

  const { kind, type } = input.dataset;

  if (kind === 'accident' && isAccidentType(type)) {
    setAccidentTypeSelection(type, input.checked);
    return;
  }

  if (kind === 'severity' && isSeverityType(type)) {
    setSeverityTypeSelection(type, input.checked);
  }
}

export function createLegendControl(): L.Control {
  return new LegendControl({ position: 'bottomleft' });
}
