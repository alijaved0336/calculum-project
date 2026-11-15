export const TEXT_INPUT_SIZES = ["small", "medium", "large"] as const;
export const TEXT_INPUT_FILL_MODES = ["solid", "flat", "outline"] as const;
export const TEXT_INPUT_ROUNDEDS = ["small", "medium", "large", "full"] as const;

export type TextInputSize = (typeof TEXT_INPUT_SIZES)[number];
export type TextInputFillMode = (typeof TEXT_INPUT_FILL_MODES)[number];
export type TextInputRounded = (typeof TEXT_INPUT_ROUNDEDS)[number];
