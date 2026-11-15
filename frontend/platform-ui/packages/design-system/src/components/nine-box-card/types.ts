export const NINE_BOX_CARD_ACCENTS = [
  "blue-700",
  "primary-700",
  "teal-700",
  "gray-600",
  "gray-500",
  "gray-400",
] as const;

export type NineBoxCardAccent = (typeof NINE_BOX_CARD_ACCENTS)[number];

/**
 * Per-accent color set, ported field-by-field from AP's `box-group-color-*` classes
 * (apps/ap/src/modules/home/analyze/components/NineBoxesBox.vue `<style>`). Every
 * field is spelled out explicitly (no shared defaults) because AP's own values don't
 * follow one uniform rule across accents — most notably `teal-700`, whose *unselected*
 * background/badge is a shade lighter than its own name (`teal-600`/`teal-100`), and
 * the three `gray-*` accents, whose *selected* row text (`neutral-700`) differs from
 * their *selected* badge text (`neutral-600`).
 */
export type NineBoxCardAccentTokens = {
  /** Unselected card background. */
  bg: string;
  /** Unselected badge border. */
  badgeBorder: string;
  /** Unselected badge text (every accent but `teal-700` leaves this as AP's plain
   * white digit; `teal-700`'s badge overrides it to stay legible on `teal-600`). */
  badgeText: string;
  /** Selected-state card border. */
  selectedBorder: string;
  /** Selected-state row (label/value) text, and non-gray accents' selected badge text. */
  selectedText: string;
  /** Selected-state badge text — only the three `gray-*` accents diverge from `selectedText`. */
  selectedBadgeText: string;
  /** Selected-state badge border. */
  selectedBadgeBorder: string;
};

export const NINE_BOX_CARD_ACCENT_TOKENS: Record<
  NineBoxCardAccent,
  NineBoxCardAccentTokens
> = {
  "blue-700": {
    bg: "var(--blue-700)",
    badgeBorder: "var(--blue-300)",
    badgeText: "var(--neutral-0)",
    selectedBorder: "var(--blue-700)",
    selectedText: "var(--blue-700)",
    selectedBadgeText: "var(--blue-700)",
    selectedBadgeBorder: "var(--blue-500)",
  },
  "primary-700": {
    bg: "var(--nine-box-primary-700)",
    badgeBorder: "var(--nine-box-primary-300)",
    badgeText: "var(--neutral-0)",
    selectedBorder: "var(--nine-box-primary-700)",
    selectedText: "var(--nine-box-primary-700)",
    selectedBadgeText: "var(--nine-box-primary-700)",
    selectedBadgeBorder: "var(--nine-box-primary-500)",
  },
  "teal-700": {
    bg: "var(--nine-box-teal-600)",
    badgeBorder: "var(--nine-box-teal-100)",
    badgeText: "var(--nine-box-teal-100)",
    selectedBorder: "var(--nine-box-teal-300)",
    selectedText: "var(--nine-box-teal-700)",
    selectedBadgeText: "var(--nine-box-teal-700)",
    selectedBadgeBorder: "var(--nine-box-teal-700)",
  },
  "gray-400": {
    bg: "var(--neutral-400)",
    badgeBorder: "var(--neutral-300)",
    badgeText: "var(--neutral-0)",
    selectedBorder: "var(--neutral-400)",
    selectedText: "var(--neutral-700)",
    selectedBadgeText: "var(--neutral-600)",
    selectedBadgeBorder: "var(--neutral-500)",
  },
  "gray-500": {
    bg: "var(--neutral-500)",
    badgeBorder: "var(--neutral-300)",
    badgeText: "var(--neutral-0)",
    selectedBorder: "var(--neutral-300)",
    selectedText: "var(--neutral-700)",
    selectedBadgeText: "var(--neutral-600)",
    selectedBadgeBorder: "var(--neutral-500)",
  },
  "gray-600": {
    bg: "var(--neutral-600)",
    badgeBorder: "var(--neutral-300)",
    badgeText: "var(--neutral-0)",
    selectedBorder: "var(--neutral-300)",
    selectedText: "var(--neutral-700)",
    selectedBadgeText: "var(--neutral-600)",
    selectedBadgeBorder: "var(--neutral-500)",
  },
};

/**
 * Row-major grid position (0 = top-left … 8 = bottom-right) → accent, ported 1:1 from
 * AP's `boxGroupMap` (its `cashFlow` box type) in
 * apps/ap/src/modules/home/analyze/components/NineBoxes.vue — the only one of AP's
 * four such maps consumed here. AP's other three box types (`financing`/`scf9Box`
 * use `primary-700` in place of `blue-700`, `vcard` uses `teal-700`) keep deriving
 * their per-box accent from NineBoxes.vue's own `boxGroupMap`/`boxGroupMapFinancing`/
 * `boxGroupMapVcard` — unchanged — rather than from a position array here, since that
 * logic already existed and there was no other caller for the other three arrays.
 */
export const NINE_BOX_POSITION_ACCENTS: NineBoxCardAccent[] = [
  "gray-600",
  "blue-700",
  "blue-700",
  "gray-500",
  "gray-600",
  "blue-700",
  "gray-400",
  "gray-500",
  "gray-600",
];

/**
 * Row-major grid position (0 = top-left … 8 = bottom-right) → AP's own box number (1-9,
 * `boxNumberMap` in the same file as `NINE_BOX_POSITION_ACCENTS`'s source) — box 1 is
 * High/High (top-right, the strongest cell), box 9 is Low/Low (bottom-left, the
 * weakest). A structural fact about the grid layout, not data: known before any
 * per-cell aggregate loads, so a consumer can resolve "which box number is this
 * position" (e.g. to build a multi-select filter) independently of whether its own
 * backend response has arrived yet.
 */
export const NINE_BOX_POSITION_NUMBERS: number[] = [7, 4, 1, 8, 5, 2, 9, 6, 3];

export type NineBoxCardRow = {
  label: string;
  value: string;
};
