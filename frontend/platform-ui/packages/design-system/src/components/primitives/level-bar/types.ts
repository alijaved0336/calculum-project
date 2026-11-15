import type { InjectionKey } from "vue";

export const LEVEL_BAR_LEVELS = ["low", "medium", "high"] as const;

export type LevelBarLevel = (typeof LEVEL_BAR_LEVELS)[number];

/**
 * Provided by `LevelBarGroup` so nested `LevelBar` roots use `display: contents`
 * and place label/track into the group's shared columns.
 */
export const LEVEL_BAR_GROUP_KEY: InjectionKey<boolean> = Symbol("LevelBarGroup");

/** Fill ratio of leading segments for each level (of total `segments`). */
export const LEVEL_BAR_FILL_RATIO: Record<LevelBarLevel, number> = {
  low: 1 / 3,
  medium: 2 / 3,
  high: 1,
};

/** Fill color token per level. */
export const LEVEL_BAR_FILL_COLOR: Record<LevelBarLevel, string> = {
  low: "var(--red-600)",
  medium: "var(--yellow-500)",
  high: "var(--green-500)",
};

/** Default total segment (cell) count. */
export const LEVEL_BAR_SEGMENT_COUNT = 3;

/** Clamp `segments` to a finite integer ≥ 1 (`Math.round`; invalid → 1). */
export function clampLevelBarSegments(segments: number): number {
  if (!Number.isFinite(segments)) {
    return 1;
  }
  const rounded = Math.round(segments);
  return rounded < 1 ? 1 : rounded;
}

/**
 * How many leading cells are filled for `level` given total `segments`.
 * `high` always fills every cell; `low`/`medium` keep at least one filled
 * and (when total > 1) at least one empty after rounding. A missing `level`
 * (null/undefined - no data to plot) fills nothing, rendering an empty bar.
 */
export function getLevelBarFilledCount(
  level: LevelBarLevel | null | undefined,
  segments: number,
): number {
  const total = clampLevelBarSegments(segments);
  if (level == null) {
    return 0;
  }
  if (level === "high") {
    return total;
  }
  let filled = Math.round(total * LEVEL_BAR_FILL_RATIO[level]);
  if (filled < 1) {
    filled = 1;
  }
  if (filled >= total && total > 1) {
    filled = total - 1;
  }
  return filled;
}
