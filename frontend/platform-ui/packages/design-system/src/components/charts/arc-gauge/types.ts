import type { ArcScale, ColorRange } from "@progress/kendo-vue-gauges";

export type { ArcScale, ColorRange };

export type ArcGaugeProps = {
  /** Current gauge value. */
  value: number;
  /**
   * Pointer / fill color when `colors` is not used.
   * Default: chart brand indigo (`#6366F1`).
   */
  color?: string;
  /** Color ranges for the value pointer (see Kendo color ranges). */
  colors?: ColorRange[];
  /** Opacity of the value pointer (0–1). */
  opacity?: number;
  /**
   * Scale options (min/max, angles, ticks, labels, rangeSize, …).
   * Merged over DS defaults (0–100, hidden ticks/labels).
   */
  scale?: ArcScale;
  /** Play enter/update animations. Default: `true`. */
  transitions?: boolean;
  /**
   * Gauge **width** (CSS length or px number). Default: `300`.
   * Plot height follows the arc aspect ratio (~0.54 × width).
   */
  size?: string | number;
  /** Show the default center value label. Default: `true`. Ignored when `#center` is used. */
  showCenterValue?: boolean;
  /** Suffix after the center value (e.g. `"%"`). Default: `"%"`. */
  centerSuffix?: string;
  /** Optional caption above the center value (e.g. `"All agreed"`). */
  centerCaption?: string;
  /** Optional metric under the center value (e.g. `"Source: internal"`). */
  centerMetric?: string | number;
  /**
   * Diagonal stripe hatch on the **value** (filled) arc.
   * Default: `true`.
   */
  stripeOverlay?: boolean;
  /**
   * Concentric dotted track under the arc.
   * Default: `true`.
   */
  dottedTrack?: boolean;
};

export type ArcGaugeCenterSlotProps = {
  value: number;
  color: string;
};
