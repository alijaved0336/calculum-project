export type ChartTooltipContent = {
  visible: boolean;
  /** Position relative to the chart host (px). */
  left: number;
  top: number;
  title: string;
  value: string;
  accent: string;
};

export type KendoShowTooltipArgs = {
  point?: {
    category?: unknown;
    value?: unknown;
    series?: { name?: string; color?: string };
    options?: { color?: string };
    formatValue?: (format: string) => string;
    /** The raw data item behind this point - e.g. horizontal-bar's `originalValue` for a negative value rendered as a positive bar, and its per-point color override. */
    dataItem?: { originalValue?: number; color?: string };
  };
  anchor?: {
    point?: { left?: number; top?: number; x?: number; y?: number };
    align?: { horizontal?: string; vertical?: string };
  };
  format?: string;
  crosshair?: boolean;
};

/**
 * Convert Kendo `anchor.point` (page/document coordinates) to offsets
 * inside `host` (for `position: absolute` relative to the chart root).
 *
 * `getBoundingClientRect()` is viewport-relative, so page coords must
 * subtract both the rect and the window scroll — otherwise tooltips
 * drift after the page is scrolled.
 */
export function documentPointToHost(
  host: HTMLElement,
  point: { left?: number; top?: number },
): { left: number; top: number } {
  const rect = host.getBoundingClientRect();
  return {
    left: (point.left ?? 0) - (rect.left + window.scrollX),
    top: (point.top ?? 0) - (rect.top + window.scrollY),
  };
}

/** Preferred gap between anchor and tooltip when sitting to the right. */
export const CHART_TOOLTIP_OFFSET_X_PX = 10;

/** Inset from host edges when clamping. */
export const CHART_TOOLTIP_EDGE_PADDING_PX = 4;

/**
 * Place a tooltip so its box stays inside the chart host.
 *
 * Prefer to the right of `anchor` (same as the former CSS
 * `translate(10px, -50%)`). If that overflows the right edge, flip to
 * the left of the anchor; then clamp both axes into the host.
 */
export function placeTooltipInHost(
  host: { width: number; height: number },
  anchor: { left: number; top: number },
  tipSize: { width: number; height: number },
  options?: { offsetX?: number; padding?: number },
): { left: number; top: number } {
  const offsetX = options?.offsetX ?? CHART_TOOLTIP_OFFSET_X_PX;
  const padding = options?.padding ?? CHART_TOOLTIP_EDGE_PADDING_PX;

  const maxLeft = Math.max(padding, host.width - tipSize.width - padding);
  const maxTop = Math.max(padding, host.height - tipSize.height - padding);

  let left = anchor.left + offsetX;
  if (left + tipSize.width > host.width - padding) {
    left = anchor.left - offsetX - tipSize.width;
  }
  left = Math.min(Math.max(left, padding), maxLeft);

  let top = anchor.top - tipSize.height / 2;
  top = Math.min(Math.max(top, padding), maxTop);

  return { left, top };
}

export function emptyChartTooltip(
  accent = "#6366F1",
): ChartTooltipContent {
  return {
    visible: false,
    left: 0,
    top: 0,
    title: "",
    value: "",
    accent,
  };
}
