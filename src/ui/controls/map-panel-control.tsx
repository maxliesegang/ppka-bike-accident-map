import * as L from 'leaflet';
import { type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { KernRoot } from '../KernRoot';
import { FilterPanel } from '../panels/FilterPanel';
import { HotspotPanel } from '../panels/HotspotPanel';
import { LegendPanel } from '../panels/LegendPanel';
import '../panels.css';

/**
 * A Leaflet control that hosts a React tree. Keeps corner placement and
 * click/scroll isolation from Leaflet while the panel content is plain React +
 * Kern UX. React owns everything inside the returned container.
 */
class MapPanelControl extends L.Control {
  private root: Root | null = null;

  constructor(
    private readonly renderPanel: (map: L.Map) => ReactNode,
    options?: L.ControlOptions,
  ) {
    super(options);
  }

  override onAdd(map: L.Map): HTMLElement {
    const container = L.DomUtil.create('div', 'leaflet-control cp-control');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    this.root = createRoot(container);
    this.root.render(<KernRoot>{this.renderPanel(map)}</KernRoot>);
    return container;
  }

  override onRemove(): void {
    const root = this.root;
    this.root = null;
    // Defer so we never unmount synchronously during a React render pass.
    if (root) {
      queueMicrotask(() => root.unmount());
    }
  }
}

export function createFilterControl(): L.Control {
  return new MapPanelControl((map) => <FilterPanel map={map} />, {
    position: 'topright',
  });
}

export function createLegendControl(): L.Control {
  return new MapPanelControl(() => <LegendPanel />, {
    position: 'bottomleft',
  });
}

export function createHotspotControl(): L.Control {
  return new MapPanelControl((map) => <HotspotPanel map={map} />, {
    position: 'bottomright',
  });
}
