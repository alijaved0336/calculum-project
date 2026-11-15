export interface GeoChartRow {
  /** ISO 3166-1 alpha-2 country code — what Google's GeoChart actually draws by. Confirmed against
   * Google's own docs: a full country name or an alpha-2 code, never alpha-3. */
  code: string;
  value: number;
  /** What `on-event-click` emits when this row's region is clicked. Defaults to `code` — set this
   * when the caller's own data is keyed by something else (e.g. AR's chart-catalog answers
   * alpha-3, so its row's own `key` is the alpha-3 it actually needs back). */
  key?: string;
  /** Shown in the hover tooltip for this row. Omit to fall back to the raw `value`. */
  tooltip?: string;
}

/** Mirrors Index.vue's inline `defineProps<{...}>()` shape (same duplication as bubble-map/types.ts). */
export type GeoChartProps = {
  /** A unique DOM id Google's GeoChart draws into. Auto-generated when omitted — only needs
   * setting explicitly for snapshot/visual-diff stability across renders. */
  chartName?: string;
  /** One row per country. A code with no known region, or a null value, simply doesn't draw. */
  data: GeoChartRow[];
  /** Header label for the value column. Not shown anywhere visible today (Google's GeoChart
   * renders no legend title), kept for forward-compat with a future GeoChart feature that reads it. */
  valueLabel?: string;
  /** Fixed height (CSS length). Ignored when `fullBleedBreakpoints` is set. */
  height?: string;
  /** AP's Program Overview breakpoint sizing (800px/600px/500px by viewport, full-bleed) instead
   * of a fixed `height` — exists to preserve that one caller's exact current behavior; a new
   * caller should use `height` instead. */
  fullBleedBreakpoints?: boolean;
  /** Message shown if the Google Charts script fails to load. */
  mapUnavailableMessage?: string;
};
