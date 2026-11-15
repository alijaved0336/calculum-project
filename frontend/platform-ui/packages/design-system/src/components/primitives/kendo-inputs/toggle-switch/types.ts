export const TOGGLE_SWITCH_SIZES = ["small", "medium", "large"] as const;
export const TOGGLE_SWITCH_ROUNDEDS = [
  "none",
  "small",
  "medium",
  "large",
  "full",
] as const;

export type ToggleSwitchSize = (typeof TOGGLE_SWITCH_SIZES)[number];
export type ToggleSwitchRounded = (typeof TOGGLE_SWITCH_ROUNDEDS)[number];
