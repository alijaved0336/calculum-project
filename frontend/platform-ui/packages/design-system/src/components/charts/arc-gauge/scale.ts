import type { ArcScale, ColorRange } from "@progress/kendo-vue-gauges";
import { ARC_GAUGE_DEFAULT_SCALE } from "./constants";

export type ArcScaleBounds = { min: number; max: number };

export function scaleBounds(scale?: ArcScale | null): ArcScaleBounds {
  return {
    min: scale?.min ?? ARC_GAUGE_DEFAULT_SCALE.min ?? 0,
    max: scale?.max ?? ARC_GAUGE_DEFAULT_SCALE.max ?? 100,
  };
}

/** One scale unit (or 1% of span) — used for tip anchors at min/max. */
export function scaleStep(min: number, max: number): number {
  return Math.min(1, (max - min) * 0.01);
}

export function clampToScale(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Value passed to Kendo. At exact min the value path is omitted — plot as
 * `min + step` so the tip can sit where value `1` would.
 */
export function gaugePlotValue(
  clamped: number,
  min: number,
  max: number,
): number {
  if (clamped <= min) {
    return min + scaleStep(min, max);
  }
  return clamped;
}

export function resolveActiveColor(
  value: number,
  fallback: string,
  colors: ColorRange[] | undefined,
  min: number,
  max: number,
): string {
  if (!colors?.length) {
    return fallback;
  }
  for (const range of colors) {
    const from = range.from ?? min;
    const to = range.to ?? max;
    if (from <= value && value <= to && range.color) {
      return range.color;
    }
  }
  return fallback;
}

export function mergeArcScale(overrides?: ArcScale): ArcScale {
  return {
    ...ARC_GAUGE_DEFAULT_SCALE,
    ...overrides,
    labels: {
      ...ARC_GAUGE_DEFAULT_SCALE.labels,
      ...overrides?.labels,
    },
    majorTicks: {
      ...ARC_GAUGE_DEFAULT_SCALE.majorTicks,
      ...overrides?.majorTicks,
    },
    minorTicks: {
      ...ARC_GAUGE_DEFAULT_SCALE.minorTicks,
      ...overrides?.minorTicks,
    },
  };
}

export function parseSizePx(
  size: string | number | undefined,
  fallback: number,
): number {
  if (typeof size === "number") {
    return size;
  }
  if (size === undefined) {
    return fallback;
  }
  const parsed = Number.parseFloat(String(size));
  return Number.isFinite(parsed) ? parsed : fallback;
}
