export const CUSTOM_BUTTON_VARIANTS = ["default", "accent", "plain"] as const;

export type CustomButtonVariant = (typeof CUSTOM_BUTTON_VARIANTS)[number];

export const CUSTOM_BUTTON_ICON_POSITIONS = ["start", "end"] as const;

export type CustomButtonIconPosition =
  (typeof CUSTOM_BUTTON_ICON_POSITIONS)[number];

export const CUSTOM_BUTTON_SIZES = [
  "xxs",
  "xs",
  "s",
  "md",
  "lg",
  "xl",
] as const;

export type CustomButtonSize = (typeof CUSTOM_BUTTON_SIZES)[number];

/** Fallback icon when `showLabel` is false and `icon` is missing or unresolved. */
export const CUSTOM_BUTTON_DEFAULT_ICON = "settings";

/** Icon edge length (px) per button size. Square — aspect-ratio 1. */
export const CUSTOM_BUTTON_ICON_SIZE_PX: Record<CustomButtonSize, number> = {
  xxs: 12,
  xs: 16,
  s: 20,
  md: 20,
  lg: 20,
  xl: 20,
};
