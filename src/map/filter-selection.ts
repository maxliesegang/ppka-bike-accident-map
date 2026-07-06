/**
 * An immutable-swap set of selected keys. Every real change swaps in a fresh
 * `Set` so that snapshot identity changes — this is what lets React panels read
 * the selection through `useSyncExternalStore` and re-render only when it moves.
 */
export class FilterSelection<T> {
  private selected: ReadonlySet<T>;

  constructor(initial: Iterable<T>) {
    this.selected = new Set(initial);
  }

  /** Current selection. Identity is stable until `toggle` reports a change. */
  get values(): ReadonlySet<T> {
    return this.selected;
  }

  has(key: T): boolean {
    return this.selected.has(key);
  }

  /** Adds or removes `key`; returns `true` only if the selection changed. */
  toggle(key: T, selected: boolean): boolean {
    if (this.selected.has(key) === selected) {
      return false;
    }

    const next = new Set(this.selected);
    if (selected) {
      next.add(key);
    } else {
      next.delete(key);
    }
    this.selected = next;
    return true;
  }
}
