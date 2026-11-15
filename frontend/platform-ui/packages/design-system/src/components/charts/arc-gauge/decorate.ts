import { BAR_STRIPE_OVERLAY } from "../shared";
import {
  ARC_GAUGE_TIP_DIAMETER,
  ARC_GAUGE_TIP_OUTLINE,
} from "./constants";
import { scaleStep } from "./scale";

const STRIPE_PATTERN_ID = "ds-arc-gauge-stripe";
const STRIPE_OVERLAY_ATTR = "data-ds-arc-stripe";
const TIP_ATTR = "data-ds-arc-tip";

const PLACEHOLDER_STROKES = new Set([
  "#eaecf0",
  "#e4e7ec",
  "#f2f4f7",
  "#e5e7eb",
  "#ced4da",
  "#dee2e6",
]);

export type ArcGaugeDecorateOptions = {
  /** Pointer / tip outline color. */
  color: string;
  /** Apply diagonal stripe hatch on the filled value arc. */
  stripeOverlay?: boolean;
  /** Clamped value (for min/max tip anchors). */
  value?: number;
  /** Scale minimum. Default: `0`. */
  min?: number;
  /** Scale maximum. Default: `100`. */
  max?: number;
};

type Pt = { x: number; y: number };

function ensureStripePattern(svg: SVGSVGElement) {
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  if (defs.querySelector(`#${STRIPE_PATTERN_ID}`)) {
    return;
  }

  const period = BAR_STRIPE_OVERLAY.width + BAR_STRIPE_OVERLAY.gap;
  const pattern = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "pattern",
  );
  pattern.setAttribute("id", STRIPE_PATTERN_ID);
  pattern.setAttribute("width", String(period));
  pattern.setAttribute("height", String(period));
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("patternTransform", "rotate(45)");

  const stripe = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  stripe.setAttribute("width", String(BAR_STRIPE_OVERLAY.width));
  stripe.setAttribute("height", String(period));
  stripe.setAttribute("fill", BAR_STRIPE_OVERLAY.color);

  pattern.appendChild(stripe);
  defs.appendChild(pattern);
}

function clearDecorations(svg: SVGSVGElement) {
  svg
    .querySelectorAll(`[${STRIPE_OVERLAY_ATTR}], [${TIP_ATTR}]`)
    .forEach((node) => node.remove());
}

function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
}

function isPlaceholderStroke(stroke: string): boolean {
  const n = normalizeColor(stroke);
  return !n || n === "none" || PLACEHOLDER_STROKES.has(n);
}

function collectGaugePaths(svg: SVGSVGElement): SVGPathElement[] {
  return Array.from(
    svg.querySelectorAll<SVGPathElement>(
      `path:not([${STRIPE_OVERLAY_ATTR}])`,
    ),
  );
}

/**
 * Prefer stroke color over draw order — Kendo path order can put the
 * placeholder after the value, which would stripe the gray track.
 */
function splitPaths(
  paths: SVGPathElement[],
  color: string,
): { value: SVGPathElement | null; placeholder: SVGPathElement | null } {
  const want = normalizeColor(color);

  const byColor =
    paths.find(
      (path) => normalizeColor(path.getAttribute("stroke") || "") === want,
    ) ?? null;
  const placeholder =
    paths.find((path) =>
      isPlaceholderStroke(path.getAttribute("stroke") || ""),
    ) ?? null;

  if (byColor) {
    return {
      value: byColor,
      placeholder:
        placeholder && placeholder !== byColor ? placeholder : null,
    };
  }

  const nonPlaceholder =
    paths.find(
      (path) => !isPlaceholderStroke(path.getAttribute("stroke") || ""),
    ) ?? null;

  if (nonPlaceholder) {
    return {
      value: nonPlaceholder,
      placeholder:
        placeholder && placeholder !== nonPlaceholder ? placeholder : null,
    };
  }

  if (paths.length >= 2) {
    return { placeholder: paths[0]!, value: paths[1]! };
  }

  if (paths.length === 1) {
    const only = paths[0]!;
    if (isPlaceholderStroke(only.getAttribute("stroke") || "")) {
      return { value: null, placeholder: only };
    }
    return { value: only, placeholder: null };
  }

  return { value: null, placeholder: null };
}

function pointAlongPath(
  path: SVGPathElement,
  at: number,
  nudgeTowardEnd: boolean,
): Pt {
  const length = path.getTotalLength();
  const clamped = Math.min(length, Math.max(0, at));
  const pt = path.getPointAtLength(clamped);
  if (!nudgeTowardEnd || length <= 0) {
    return { x: pt.x, y: pt.y };
  }

  const sample = Math.min(2, length);
  const from =
    clamped <= sample
      ? path.getPointAtLength(0)
      : path.getPointAtLength(clamped - sample);
  const to = path.getPointAtLength(clamped);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const stroke =
    Number.parseFloat(
      path.getAttribute("stroke-width") ||
        getComputedStyle(path).strokeWidth ||
        "16",
    ) || 16;
  const nudge = (stroke / 2) * 0.15;
  return {
    x: pt.x + (dx / len) * nudge,
    y: pt.y + (dy / len) * nudge,
  };
}

/**
 * Tip on the value arc only (placeholder at 100% can map to the SVG origin).
 * At max → same geometry as `max - step` (e.g. 99); at min the plot is already
 * `min + step`, so the path end matches value `1`.
 */
function resolveTipPoint(
  valuePath: SVGPathElement | null,
  value: number,
  min: number,
  max: number,
): { point: Pt; host: SVGPathElement } | null {
  if (!valuePath) {
    return null;
  }

  try {
    const length = valuePath.getTotalLength();
    const span = max - min;
    if (!(length > 0) || !(span > 0)) {
      return null;
    }

    const atMax = value >= max;
    const at = atMax
      ? length * ((max - scaleStep(min, max) - min) / span)
      : length;

    return {
      point: pointAlongPath(valuePath, at, !atMax),
      host: valuePath,
    };
  } catch {
    return null;
  }
}

function appendTip(host: SVGPathElement, tip: Pt, color: string) {
  const parent = host.parentNode;
  if (!parent) {
    return;
  }

  const whiteR = ARC_GAUGE_TIP_DIAMETER / 2;
  const outerR = whiteR + ARC_GAUGE_TIP_OUTLINE;

  const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  ring.setAttribute(TIP_ATTR, "true");
  ring.setAttribute("cx", String(tip.x));
  ring.setAttribute("cy", String(tip.y));
  ring.setAttribute("r", String(outerR));
  ring.setAttribute("fill", color);
  ring.style.pointerEvents = "none";

  const disk = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  disk.setAttribute(TIP_ATTR, "true");
  disk.setAttribute("cx", String(tip.x));
  disk.setAttribute("cy", String(tip.y));
  disk.setAttribute("r", String(whiteR));
  disk.setAttribute("fill", "#ffffff");
  disk.style.pointerEvents = "none";

  parent.appendChild(ring);
  parent.appendChild(disk);
}

function appendStripeOverlay(svg: SVGSVGElement, valuePath: SVGPathElement) {
  ensureStripePattern(svg);
  const clone = valuePath.cloneNode(true) as SVGPathElement;
  clone.setAttribute(STRIPE_OVERLAY_ATTR, "true");
  clone.setAttribute("stroke", `url(#${STRIPE_PATTERN_ID})`);
  clone.setAttribute("fill", "none");
  clone.style.pointerEvents = "none";
  valuePath.parentNode?.insertBefore(clone, valuePath.nextSibling);
}

/**
 * Post-process Kendo ArcGauge SVG: stripe hatch on value arc + tip knob.
 */
export function decorateArcGaugeSvg(
  host: HTMLElement,
  options: ArcGaugeDecorateOptions,
) {
  const svg = host.querySelector("svg");
  if (!svg) {
    return;
  }

  clearDecorations(svg);

  const { value: valuePath } = splitPaths(
    collectGaugePaths(svg),
    options.color,
  );

  if (valuePath && options.stripeOverlay !== false) {
    appendStripeOverlay(svg, valuePath);
  }

  const resolved = resolveTipPoint(
    valuePath,
    options.value ?? 0,
    options.min ?? 0,
    options.max ?? 100,
  );
  if (!resolved) {
    return;
  }

  appendTip(resolved.host, resolved.point, options.color);
}
