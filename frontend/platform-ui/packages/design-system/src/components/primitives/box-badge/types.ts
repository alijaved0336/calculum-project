export const BOX_BADGE_VARIANTS = [
  "green-top-center",
  "green-top-right",
  "green-center-right",
  "yellow-top-left",
  "yellow-center",
  "yellow-bottom-right",
  "red-bottom-left",
  "red-center-left",
  "red-bottom-center",
] as const;

export type BoxBadgeVariant = (typeof BOX_BADGE_VARIANTS)[number];
