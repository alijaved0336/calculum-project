/**
 * Tracks every currently-mounted `CalculumModal` in the order it was opened, so each instance can
 * tell whether it is the topmost one - `CalculumModal` uses this to make Escape close only the
 * modal currently on top rather than every open modal at once, and to give each instance a
 * z-index strictly higher than every modal opened before it, so a modal opened from inside
 * another modal always renders above it regardless of where either one lives in the component
 * tree (Teleported to `<body>`, so plain DOM/mount order can't be relied on for this the way it
 * can for two plain siblings).
 *
 * A module-level singleton on purpose: `<script setup>` state is per component *instance*, but
 * "who else is currently open" has to be shared across every `CalculumModal` instance in the app.
 */

const BASE_Z_INDEX = 1050

// kendo-grid.scss sets `.k-animation-container { z-index: 1070 }` for Kendo's own popups/tooltips
// - kept well under that so a Kendo control inside a CalculumModal still shows its own tooltip on
// top of the modal, even after several CalculumModals are stacked. Staying under 1070 forever
// (not just per-session) is `releaseModal`'s own job, not this step size's - see its doc.
const Z_INDEX_STEP = 2

let nextZIndex = BASE_Z_INDEX
const openStack: symbol[] = []

export interface AcquiredModal {
  token: symbol
  zIndex: number
}

/** Call once when a `CalculumModal` mounts. `nextZIndex` only ever increases while ANY modal is
 * still open (never reused out from under one that's still on screen) - reusing a z-index while
 * something else is still open would let a modal that closed and reopened later end up BELOW one
 * that never closed. Once every modal has closed, `releaseModal` resets it back to `BASE_Z_INDEX`
 * - see that function's own doc for why this reset matters. */
export function acquireModal(): AcquiredModal {
  const token = Symbol('calculum-modal')
  const zIndex = nextZIndex
  nextZIndex += Z_INDEX_STEP
  openStack.push(token)
  return { token, zIndex }
}

/** Call once when that same `CalculumModal` unmounts. Resets `nextZIndex` back to `BASE_Z_INDEX`
 * once the stack is fully empty - safe precisely because nothing is left open to end up "below" a
 * reused value, and necessary because `nextZIndex` never reused a value on its own (see
 * `acquireModal`'s own doc): a long enough session opening and closing modals (the Customer Card
 * modal re-targeting itself on every corporate-tree node click does this without ever fully
 * unmounting in between, but plenty of other flows open-then-close-then-reopen it) would otherwise
 * climb `nextZIndex` past kendo-grid.scss's `.k-animation-container { z-index: 1070 }`, and every
 * Kendo tooltip/popup inside the modal would silently start rendering BEHIND it instead of on top -
 * the exact bug this reset closes off, without this app ever needing to know Kendo's own number. */
export function releaseModal(token: symbol): void {
  const index = openStack.indexOf(token)
  if (index !== -1) {
    openStack.splice(index, 1)
  }
  if (openStack.length === 0) {
    nextZIndex = BASE_Z_INDEX
  }
}

export function isTopmostModal(token: symbol): boolean {
  return openStack.length > 0 && openStack[openStack.length - 1] === token
}
