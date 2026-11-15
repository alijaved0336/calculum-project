import { Group, Path, drawing } from "@progress/kendo-drawing";
import {
  BAR_CORNER_RADIUS_PX,
  BAR_MIN_VISIBLE_PX,
  BAR_STRIPE_OVERLAY,
  CHART_COLORS,
  STACK_SEGMENT_GAP_PX,
} from "./constants";

export type BarVisualEvent = {
  rect: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
  options: { color?: string };
  /** The point's own value - only read by `minVisibleSize`, to tell a tiny step from a zero one. */
  value?: number;
  // The raw data array entry behind this point (Kendo's `series.data[i]`) - a per-point color
  // override (`{ value, color }`) only ever lands here, never on `options.color` (that stays the
  // series/point-options color Kendo resolved before calling this custom visual).
  dataItem?: { color?: string } | number;
  createVisual: () => unknown;
};

export type BarStripeOverlayOptions = {
  /** Stripe color. Default: white @ 50%. */
  color?: string;
  /** Filled stripe thickness in px. Default: `5`. */
  width?: number;
  /** Unfilled gap between stripes in px. Default: `4`. */
  gap?: number;
};

export type BarVisualOptions = {
  /** Apply corner radius. */
  rounded: boolean;
  /**
   * Which corners to round.
   * - `"all"` — all four (horizontal bars default)
   * - `"value-end"` — only the tip along the value axis
   *   (column tops / bar right edge)
   */
  corners?: "all" | "value-end";
  /**
   * Inset along the value axis so stacked segments get a 1px gap.
   * Horizontal bars → inset left/right; vertical (column) → inset top/bottom.
   */
  stackGap: boolean;
  /** `"horizontal"` = bar; `"vertical"` = column. */
  orientation?: "horizontal" | "vertical";
  /**
   * Diagonal hatch overlay drawn as an SVG `<pattern>` on top of the bar fill
   * (not a DOM layer). Pass `true` for design defaults, or tune color/width/gap.
   */
  stripeOverlay?: boolean | BarStripeOverlayOptions;
  /**
   * Draw a non-zero bar at least `BAR_MIN_VISIBLE_PX` thick along the value axis (centered on its
   * own position), so a value far smaller than the axis scale still shows as a thin line.
   * A zero value is still skipped.
   */
  minVisibleSize?: boolean;
};

function drawRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  rounded: boolean,
  corners: "all" | "value-end",
  orientation: "horizontal" | "vertical",
  fill?: unknown,
) {
  const path = new Path({
    fill: fill ?? { color },
    stroke: { color: "transparent", width: 0 },
  });

  if (!rounded) {
    path
      .moveTo(x, y)
      .lineTo(x + width, y)
      .lineTo(x + width, y + height)
      .lineTo(x, y + height)
      .close();
    return path;
  }

  const radius = Math.min(BAR_CORNER_RADIUS_PX, height / 2, width / 2);
  const k = 0.5523 * radius;

  if (corners === "value-end" && orientation === "vertical") {
    // Round top-left + top-right only (column tip).
    path
      .moveTo(x, y + height)
      .lineTo(x, y + radius)
      .curveTo([x, y + radius - k], [x + radius - k, y], [x + radius, y])
      .lineTo(x + width - radius, y)
      .curveTo(
        [x + width - radius + k, y],
        [x + width, y + radius - k],
        [x + width, y + radius],
      )
      .lineTo(x + width, y + height)
      .close();
    return path;
  }

  if (corners === "value-end" && orientation === "horizontal") {
    // Round top-right + bottom-right only (bar tip).
    path
      .moveTo(x, y)
      .lineTo(x + width - radius, y)
      .curveTo(
        [x + width - radius + k, y],
        [x + width, y + radius - k],
        [x + width, y + radius],
      )
      .lineTo(x + width, y + height - radius)
      .curveTo(
        [x + width, y + height - radius + k],
        [x + width - radius + k, y + height],
        [x + width - radius, y + height],
      )
      .lineTo(x, y + height)
      .close();
    return path;
  }

  // All four corners.
  path
    .moveTo(x + radius, y)
    .lineTo(x + width - radius, y)
    .curveTo(
      [x + width - radius + k, y],
      [x + width, y + radius - k],
      [x + width, y + radius],
    )
    .lineTo(x + width, y + height - radius)
    .curveTo(
      [x + width, y + height - radius + k],
      [x + width - radius + k, y + height],
      [x + width - radius, y + height],
    )
    .lineTo(x + radius, y + height)
    .curveTo(
      [x + radius - k, y + height],
      [x, y + height - radius + k],
      [x, y + height - radius],
    )
    .lineTo(x, y + radius)
    .curveTo(
      [x, y + radius - k],
      [x + radius - k, y],
      [x + radius, y],
    )
    .close();

  return path;
}

function resolveStripeOverlay(
  overlay: boolean | BarStripeOverlayOptions | undefined,
): BarStripeOverlayOptions | null {
  if (!overlay) {
    return null;
  }
  if (overlay === true) {
    return { ...BAR_STRIPE_OVERLAY };
  }
  return {
    color: overlay.color ?? BAR_STRIPE_OVERLAY.color,
    width: overlay.width ?? BAR_STRIPE_OVERLAY.width,
    gap: overlay.gap ?? BAR_STRIPE_OVERLAY.gap,
  };
}

/**
 * Kendo series `visual` factory for bar/column shapes with optional radius,
 * stack gap, and diagonal stripe overlay (SVG `<pattern>`).
 * Reusable by horizontal and vertical bar charts.
 */
export function createBarVisual(options: BarVisualOptions) {
  const orientation = options.orientation ?? "horizontal";
  const corners = options.corners ?? "all";
  const stripe = resolveStripeOverlay(options.stripeOverlay);

  // Shared across all segments of this series — one SVG `<defs>` entry.
  const stripePattern = stripe
    ? drawing.diagonalStripesPattern({
        color: stripe.color,
        width: stripe.width,
        gap: stripe.gap,
      })
    : null;

  return (e: BarVisualEvent) => {
    const { origin, size } = e.rect;
    let { width, height } = size;
    let x = origin.x;
    let y = origin.y;

    if (options.minVisibleSize && typeof e.value === "number" && e.value !== 0) {
      if (orientation === "vertical" && height < BAR_MIN_VISIBLE_PX) {
        y += (height - BAR_MIN_VISIBLE_PX) / 2;
        height = BAR_MIN_VISIBLE_PX;
      } else if (orientation === "horizontal" && width < BAR_MIN_VISIBLE_PX) {
        x += (width - BAR_MIN_VISIBLE_PX) / 2;
        width = BAR_MIN_VISIBLE_PX;
      }
    }

    // Skip degenerate / zero-value segments (do not fall back to default
    // visual — that can leave a 1px stripe in stacked sparse series).
    if (width <= 0 || height <= 0) {
      return new Path();
    }

    if (options.stackGap) {
      if (orientation === "horizontal" && width > STACK_SEGMENT_GAP_PX) {
        const inset = STACK_SEGMENT_GAP_PX / 2;
        x += inset;
        width -= STACK_SEGMENT_GAP_PX;
      } else if (orientation === "vertical" && height > STACK_SEGMENT_GAP_PX) {
        const inset = STACK_SEGMENT_GAP_PX / 2;
        y += inset;
        height -= STACK_SEGMENT_GAP_PX;
      }
    }

    if (width <= 0 || height <= 0) {
      return new Path();
    }

    const pointColor = typeof e.dataItem === "object" ? e.dataItem?.color : undefined;
    const color = pointColor ?? e.options.color ?? CHART_COLORS.defaultSeries;
    const solid = drawRectPath(
      x,
      y,
      width,
      height,
      color,
      options.rounded,
      corners,
      orientation,
    );

    if (!stripePattern) {
      return solid;
    }

    // Same rounded geometry, filled with the SVG hatch pattern (overlay).
    const hatch = drawRectPath(
      x,
      y,
      width,
      height,
      color,
      options.rounded,
      corners,
      orientation,
      stripePattern,
    );

    const group = new Group();
    group.append(solid, hatch);
    return group;
  };
}
