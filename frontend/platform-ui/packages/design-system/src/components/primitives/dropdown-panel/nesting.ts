/**
 * Open DropdownPanel registry — nested popups (portaled) must not close parents
 * on outside-click, sibling panels must not stack, and Escape closes the topmost
 * panel only.
 *
 * Outside-click is handled here on capture-phase `pointerdown` so a trigger that
 * calls `stopPropagation` (e.g. a grid kebab that must not steal header sort)
 * still closes other open panels. Kendo Popup `mousedownoutside` is bubble-phase
 * and never sees those events.
 */

export type DropdownPanelNestEntry = {
  id: symbol;
  getAnchor: () => HTMLElement | null;
  getContent: () => HTMLElement | null;
  close: () => void;
  closeOnEscape: boolean;
  closeOnOutsideClick: boolean;
};

const openPanels: DropdownPanelNestEntry[] = [];

let listenersBound = false;

function onDocumentEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented) {
    return;
  }

  for (let i = openPanels.length - 1; i >= 0; i -= 1) {
    const entry = openPanels[i];
    if (!entry.closeOnEscape) {
      continue;
    }
    event.preventDefault();
    event.stopPropagation();
    entry.close();
    return;
  }
}

let outsideCloseQueued = false;

function onDocumentOutsidePointer(event: Event) {
  if (event instanceof MouseEvent && event.button !== 0) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (outsideCloseQueued) {
    return;
  }
  outsideCloseQueued = true;
  queueMicrotask(() => {
    outsideCloseQueued = false;
  });

  for (const entry of [...openPanels].reverse()) {
    if (!entry.closeOnOutsideClick) {
      continue;
    }
    if (isInsideEntryTree(entry, target)) {
      continue;
    }
    entry.close();
  }
}

function ensureListeners() {
  if (listenersBound) {
    return;
  }
  document.addEventListener("keydown", onDocumentEscape, true);
  document.addEventListener("pointerdown", onDocumentOutsidePointer, true);
  document.addEventListener("mousedown", onDocumentOutsidePointer, true);
  listenersBound = true;
}

function teardownListenersIfEmpty() {
  if (openPanels.length > 0 || !listenersBound) {
    return;
  }
  document.removeEventListener("keydown", onDocumentEscape, true);
  document.removeEventListener("pointerdown", onDocumentOutsidePointer, true);
  document.removeEventListener("mousedown", onDocumentOutsidePointer, true);
  listenersBound = false;
}

function closeUnrelatedPanels(incoming: DropdownPanelNestEntry) {
  for (const other of [...openPanels]) {
    if (other.id === incoming.id) {
      continue;
    }
    if (isNestedUnder(other, incoming)) {
      continue;
    }
    other.close();
  }
}

export function registerDropdownPanel(entry: DropdownPanelNestEntry) {
  const existing = openPanels.findIndex((item) => item.id === entry.id);
  if (existing >= 0) {
    openPanels[existing] = entry;
    ensureListeners();
    return;
  }

  closeUnrelatedPanels(entry);
  openPanels.push(entry);
  ensureListeners();
}

export function unregisterDropdownPanel(id: symbol) {
  const index = openPanels.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    openPanels.splice(index, 1);
  }
  teardownListenersIfEmpty();
}

function nodeInside(el: HTMLElement | null, target: Node): boolean {
  return Boolean(el && (el === target || el.contains(target)));
}

function getPopupSurface(entry: DropdownPanelNestEntry): HTMLElement | null {
  const content = entry.getContent();
  if (!content) {
    return null;
  }
  return content.closest(".k-popup") ?? content.parentElement ?? content;
}

function nodeInsideEntry(entry: DropdownPanelNestEntry, target: Node): boolean {
  return (
    nodeInside(entry.getAnchor(), target) ||
    nodeInside(getPopupSurface(entry), target) ||
    nodeInside(entry.getContent(), target)
  );
}

function getParentPanel(
  entry: DropdownPanelNestEntry,
): DropdownPanelNestEntry | undefined {
  const anchor = entry.getAnchor();
  if (!anchor) {
    return undefined;
  }

  for (const other of openPanels) {
    if (other.id === entry.id) {
      continue;
    }
    if (
      nodeInside(other.getContent(), anchor) ||
      nodeInside(getPopupSurface(other), anchor)
    ) {
      return other;
    }
  }

  return undefined;
}

function isNestedUnder(
  ancestor: DropdownPanelNestEntry,
  descendant: DropdownPanelNestEntry,
): boolean {
  const seen = new Set<symbol>();
  let current: DropdownPanelNestEntry | undefined = descendant;

  while (current) {
    if (seen.has(current.id)) {
      break;
    }
    seen.add(current.id);
    const parent = getParentPanel(current);
    if (!parent) {
      return false;
    }
    if (parent.id === ancestor.id) {
      return true;
    }
    current = parent;
  }

  return false;
}

function isInsideEntryTree(entry: DropdownPanelNestEntry, target: Node): boolean {
  if (nodeInsideEntry(entry, target)) {
    return true;
  }

  for (const other of openPanels) {
    if (other.id === entry.id) {
      continue;
    }
    if (isNestedUnder(entry, other) && nodeInsideEntry(other, target)) {
      return true;
    }
  }

  return false;
}

/**
 * True when `target` is inside this panel or a nested descendant
 * (that panel's anchor lives inside an ancestor's content, transitively).
 */
export function isInsideNestedChildPanel(
  selfId: symbol,
  target: EventTarget | null | undefined,
): boolean {
  if (!(target instanceof Node)) {
    return false;
  }

  const self = openPanels.find((entry) => entry.id === selfId);
  if (!self) {
    return false;
  }

  return isInsideEntryTree(self, target);
}

export function extractOutsideClickTarget(
  event: unknown,
): EventTarget | null {
  if (!event || typeof event !== "object") {
    return null;
  }
  const record = event as {
    event?: { target?: EventTarget | null };
    originalEvent?: { target?: EventTarget | null };
    target?: EventTarget | null;
  };
  return (
    record.event?.target ??
    record.originalEvent?.target ??
    record.target ??
    null
  );
}
