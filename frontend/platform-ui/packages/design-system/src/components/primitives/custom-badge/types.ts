export const CUSTOM_BADGE_SOFT_VARIANTS = [
  "success",
  "warning",
  "danger",
  "veryLow",
  "veryHigh",
  "red",
  "orange",
  "yellow",
  "blue",
  "info",
  "sme",
  "potential",
  "parent",
  "muted",
] as const;

/** Outlined status badges — text/dot use palette `*-600` tokens. */
export const CUSTOM_BADGE_OUTLINE_VARIANTS = [
  "agreed",
  "contacted",
  "analyzed",
  "planned",
  "missed",
  "onHold",
] as const;

export const CUSTOM_BADGE_VARIANTS = [
  ...CUSTOM_BADGE_SOFT_VARIANTS,
  ...CUSTOM_BADGE_OUTLINE_VARIANTS,
] as const;

export type CustomBadgeSoftVariant = (typeof CUSTOM_BADGE_SOFT_VARIANTS)[number];
export type CustomBadgeOutlineVariant =
  (typeof CUSTOM_BADGE_OUTLINE_VARIANTS)[number];
export type CustomBadgeVariant = (typeof CUSTOM_BADGE_VARIANTS)[number];

export const isCustomBadgeOutlineVariant = (
  variant: CustomBadgeVariant,
): variant is CustomBadgeOutlineVariant =>
  (CUSTOM_BADGE_OUTLINE_VARIANTS as readonly string[]).includes(variant);
