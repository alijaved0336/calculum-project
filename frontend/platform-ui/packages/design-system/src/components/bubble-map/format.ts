/**
 * Minimal port of apps/ap/src/utils/StringUtils.ts::formatBigNumbers's suffix logic
 * (k/m/b/t/q/i/s). Duplicated rather than imported since StringUtils is local to the AP app,
 * not reachable from a shared package.
 */
const SUFFIX_THRESHOLDS: Array<[number, string]> = [
  [1.0e21, "s"],
  [1.0e18, "i"],
  [1.0e15, "q"],
  [1.0e12, "t"],
  [1.0e9, "b"],
  [1.0e6, "m"],
  [1.0e3, "k"],
];

/** Formats a big number with a suffix, e.g. 1_000_000 -> "1.0m", 1_500 -> "1.5k". */
export function formatBubbleMapNumber(value: number): string {
  if (Math.abs(value) === 0) {
    return "0";
  }

  for (const [threshold, suffix] of SUFFIX_THRESHOLDS) {
    if (Math.abs(value) >= threshold) {
      return (
        (value / threshold).toLocaleString("en-US", {
          maximumFractionDigits: 1,
          minimumFractionDigits: 1,
        }) + suffix
      );
    }
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}
