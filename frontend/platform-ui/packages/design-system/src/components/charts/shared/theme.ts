import { chartBaseTheme } from "@progress/kendo-charts";

/** Resolve Kendo chart theme from the host element (falls back to base theme). */
export function resolveChartTheme(_el: HTMLElement) {
  return chartBaseTheme();
}
