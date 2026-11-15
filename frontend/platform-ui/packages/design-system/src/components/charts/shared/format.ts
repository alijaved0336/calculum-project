/** Truncate category / axis labels with an ellipsis. */
export function truncateChartLabel(
  value: unknown,
  maxLength?: number,
): string {
  const text = String(value ?? "");
  if (!maxLength || text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(maxLength - 1, 1))}…`;
}

/** Format a numeric point value for labels / tooltips. */
export function formatChartNumber(
  value: unknown,
  fractionDigits?: number,
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return String(value ?? "");
  }
  if (fractionDigits !== undefined) {
    return n.toFixed(fractionDigits);
  }
  return n.toLocaleString();
}

/** Format a 0–1 ratio (or precomputed percent) as `"25.00%"`. */
export function formatChartPercent(
  ratio: number,
  fractionDigits = 2,
): string {
  if (!Number.isFinite(ratio)) {
    return "";
  }
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

export const COMPACT_NUMBER_SUFFIXES: [threshold: number, suffix: string][] = [
  [1e21, "s"],
  [1e18, "i"],
  [1e15, "q"],
  [1e12, "t"],
  [1e9, "b"],
  [1e6, "m"],
  [1e3, "k"],
];

/** Format a number with a magnitude suffix, e.g. `1500 -> "1.5k"`. */
export function formatCompactChartNumber(
  value: unknown,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return String(value ?? "");
  }

  const { maximumFractionDigits = 1, minimumFractionDigits = 1 } = options ?? {};
  const abs = Math.abs(n);

  for (const [threshold, suffix] of COMPACT_NUMBER_SUFFIXES) {
    if (abs >= threshold) {
      return (n / threshold).toLocaleString("en-US", { maximumFractionDigits, minimumFractionDigits }) + suffix;
    }
  }

  return abs === 0 ? "0" : n.toLocaleString("en-US", { maximumFractionDigits, minimumFractionDigits });
}
