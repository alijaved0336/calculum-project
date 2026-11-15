export const RADIO_BUTTON_SIZES = ["small", "medium", "large"] as const;

export type RadioButtonSize = (typeof RADIO_BUTTON_SIZES)[number];
export type RadioButtonValue = string | number;
