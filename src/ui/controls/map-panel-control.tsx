import type {
  ControlPosition,
  IControl,
  Map as MapLibreMap,
} from 'maplibre-gl';
import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { KernRoot } from '../KernRoot';
import { FilterPanel } from '../panels/FilterPanel';
import { HotspotPanel } from '../panels/HotspotPanel';
import { LegendPanel } from '../panels/LegendPanel';
import '../panels.css';

/**
 * A MapLibre control that hosts a React tree. Keeps corner placement and
 * click/scroll isolation from the map while the panel content is plain React +
 * Kern UX. React owns everything inside the returned container.
 */
class MapPanelControl implements IControl {
  private root: Root | null = null;
  private container: HTMLElement | null = null;

  constructor(
    private readonly renderPanel: (map: MapLibreMap) => ReactNode,
    private readonly position: ControlPosition,
  ) {}

  onAdd(map: MapLibreMap): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl cp-control';
    // MapLibre binds its gesture handlers to the map container, an ancestor of
    // every control — stopping propagation here keeps panel clicks, scrolling,
    // and double-clicks from panning, zooming, or rotating the map.
    for (const eventType of [
      'mousedown',
      'touchstart',
      'wheel',
      'dblclick',
      'contextmenu',
    ]) {
      container.addEventListener(eventType, (event) => event.stopPropagation());
    }

    this.container = container;
    this.root = createRoot(container);
    this.root.render(<KernRoot>{this.renderPanel(map)}</KernRoot>);
    return container;
  }

  onRemove(): void {
    const root = this.root;
    this.root = null;
    this.container?.remove();
    this.container = null;
    // Defer so we never unmount synchronously during a React render pass.
    if (root) {
      queueMicrotask(() => root.unmount());
    }
  }

  getDefaultPosition(): ControlPosition {
    return this.position;
  }
}

export function createFilterControl(): IControl {
  return new MapPanelControl((map) => <FilterPanel map={map} />, 'top-right');
}

export function createLegendControl(): IControl {
  return new MapPanelControl(() => <LegendPanel />, 'bottom-left');
}

export function createHotspotControl(): IControl {
  return new MapPanelControl(
    (map) => <HotspotPanel map={map} />,
    'bottom-right',
  );
}
