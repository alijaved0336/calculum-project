/**
 * Loads the legacy jQuery + Kendo UI global scripts that @progress/kendo-map-vue-wrapper needs
 * at runtime (it wraps the classic jQuery-based Kendo Map widget, not a native Vue component —
 * Telerik has no native, jQuery-free Vue Map, and ended support for this Wrapper family in May
 * 2025 with no replacement planned; it remains the only option).
 *
 * Ported from apps/ap/src/utils/scriptLoader.ts (loadJQuery, loadKendo), trimmed to just this
 * pair (AP's file also loads Google Charts/recaptcha, which BubbleMap doesn't need), following
 * the same globalThis-cached-promise idiom already used in apps/ar/src/utils/loadGoogleCharts.ts
 * so a transient load failure can be retried instead of caching a rejected promise forever.
 *
 * Consuming apps must serve the two static files this loads at these exact paths — copy them
 * from apps/ap/public/scripts/{jquery.js,kendo.js} into the app's own public/scripts/ folder.
 */

declare global {
  // `var`, not `interface Window` - this project's lib config doesn't merge Window augmentations
  // into `typeof globalThis`, and `globalThis.x` needs the property on globalThis's own type.
  // Note: no `var kendo` here - @progress/kendo-ui's own .d.ts already declares an ambient
  // global `namespace kendo` (transitively imported via kendo-map-vue-wrapper's types), and
  // redeclaring it as a `var` is a duplicate-identifier error. Reference the bare `kendo`
  // identifier below instead of `globalThis.kendo`.
  // eslint-disable-next-line no-var -- required for a global augmentation to reach globalThis's type.
  var jQuery: unknown | undefined;
  // eslint-disable-next-line no-var -- required for a global augmentation to reach globalThis's type.
  var jQueryLoadPromise: Promise<void> | undefined;
  // eslint-disable-next-line no-var -- required for a global augmentation to reach globalThis's type.
  var kendoLoadPromise: Promise<void> | undefined;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

function loadJQuery(): Promise<void> {
  globalThis.jQueryLoadPromise ??= loadScript("/scripts/jquery.js")
    .then(() => {
      if (typeof globalThis.jQuery === "undefined") {
        throw new Error("jQuery object not found after script load");
      }
    })
    .catch((error) => {
      globalThis.jQueryLoadPromise = undefined;
      throw error;
    });
  return globalThis.jQueryLoadPromise;
}

function loadKendo(): Promise<void> {
  globalThis.kendoLoadPromise ??= loadJQuery()
    .then(() => loadScript("/scripts/kendo.js"))
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          // Kendo's ~4.8MB bundle needs a beat after `onload` fires before `window.kendo` is
          // actually assigned — same guard as apps/ap/src/utils/scriptLoader.ts.
          setTimeout(() => {
            if (typeof kendo === "undefined") {
              reject(new Error("Kendo object not found after script load"));
              return;
            }
            resolve();
          }, 50);
        }),
    )
    .catch((error) => {
      globalThis.kendoLoadPromise = undefined;
      throw error;
    });
  return globalThis.kendoLoadPromise;
}

/** Loads jQuery + Kendo UI (idempotent — safe to call from every BubbleMap instance). */
export function ensureKendoMapLoaded(): Promise<void> {
  return loadKendo();
}
