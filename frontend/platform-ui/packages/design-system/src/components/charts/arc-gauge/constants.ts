import type { ArcScale } from "@progress/kendo-vue-gauges";

/** Default gauge width (px). Plot height follows `ARC_GAUGE_ASPECT_RATIO`. */
export const ARC_GAUGE_DEFAULT_SIZE = 300;

/**
 * Width / height of the cropped arc plot (matches the visible semicircle).
 * CSS: `aspect-ratio: ${ARC_GAUGE_ASPECT_RATIO}`.
 */
export const ARC_GAUGE_ASPECT_RATIO = 1 / 0.54;

/** Tip: white disk diameter (px). */
export const ARC_GAUGE_TIP_DIAMETER = 16;

/** Tip: colored ring outside the white disk (px each side). */
export const ARC_GAUGE_TIP_OUTLINE = 8;

/** Re-apply SVG decorations while Kendo animates the arc. */
export const ARC_GAUGE_DECORATE_MS = 900;
export const ARC_GAUGE_DECORATE_INTERVAL_MS = 32;

export const ARC_GAUGE_DEFAULT_SCALE: ArcScale = {
  min: 0,
  max: 100,
  majorTicks: { visible: false },
  minorTicks: { visible: false },
  labels: { visible: false },
  rangeSize: 16,
  rangePlaceholderColor: "#EAECF0",
  rangeLineCap: "round",
};
