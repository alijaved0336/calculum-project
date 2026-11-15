/**
 * Loads Google Charts (the `geochart` package) for GeoChart's own choropleth.
 *
 * Promoted from apps/ar/src/utils/loadGoogleCharts.ts, itself ported from
 * apps/ap/src/utils/scriptLoader.ts (loadScript, loadCharts) and
 * apps/ap/src/utils/kendoLoader.ts (ensureChartsLoaded) at commit d004458f63 (UC-UI-00 / AB#19226).
 *
 * Trimmed to only the Google Charts piece — AP's original file also loads jQuery and a legacy
 * global Kendo bundle for its older jQuery-based widgets, neither of which this component needs.
 *
 * Self-sufficient by design: in AP, every current GeoChart caller happens to `await` a separate
 * `ensureChartsLoaded()` before mounting it, so AP's original GeoChart.vue itself never awaits its
 * own script load — an implicit ordering dependency on the caller. GeoChart (this component) calls
 * this directly in its own `onMounted` instead, so it works correctly regardless of caller.
 *
 * The cache clears itself on failure (same as AP's own `loadCharts()`, which resets
 * `window.chartsLoadPromise = undefined` in its `catch`) — without that, a transient script-load
 * failure caches a rejected promise forever, and every GeoChart mounted for the rest of the
 * session re-rejects immediately with no way to retry.
 *
 * Consuming apps must serve `/scripts/charts_loader.js` at that exact path — already true for both
 * `apps/ap` and `apps/ar` (confirmed byte-identical), so no asset work is needed to add a new
 * consumer app either.
 */

declare global {
  // `var`, not `interface Window` - this project's lib config doesn't merge Window augmentations
  // into `typeof globalThis`, and `globalThis.x` needs the property on globalThis's own type.
  //
  // `google` itself is deliberately NOT declared here (no `var google`, no `interface Window {
  // google }`): a consuming app can already depend on its own Google-product type package (e.g.
  // apps/ap depends on vue3-google-map, whose bundled @types/google.maps declares `google` as an
  // ambient NAMESPACE) - a `var google` of this component's own shape collides with that
  // (`error TS2300: Duplicate identifier 'google'`) the moment both are part of the same
  // compiled program. `google` is read through an untyped cast at every access site below
  // instead, which needs no ambient declaration and so cannot collide with anyone else's.
  // eslint-disable-next-line no-var -- required for a global augmentation to reach globalThis's type.
  var googleChartsLoadPromise: Promise<void> | undefined;
}

const SCRIPT_SRC = "/scripts/charts_loader.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/** Loads Google Charts (idempotent — safe to call from every GeoChart instance). */
export function loadGoogleCharts(): Promise<void> {
  globalThis.googleChartsLoadPromise ??= loadScript(SCRIPT_SRC)
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see the declare global block's own note on why `google` isn't ambiently typed.
          const google = (globalThis as any).google;
          if (!google) {
            reject(new Error("Google object not found after script load"));
            return;
          }
          google.charts.load("current", { packages: ["geochart"] });
          google.charts.setOnLoadCallback(resolve);
        }),
    )
    .catch((error) => {
      globalThis.googleChartsLoadPromise = undefined;
      throw error;
    });
  return globalThis.googleChartsLoadPromise;
}
