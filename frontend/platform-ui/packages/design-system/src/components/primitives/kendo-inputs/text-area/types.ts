export const TEXT_AREA_SIZES = ["small", "medium", "large"] as const;
export const TEXT_AREA_FILL_MODES = ["solid", "flat", "outline"] as const;
export const TEXT_AREA_ROUNDEDS = ["small", "medium", "large", "full"] as const;

export type TextAreaSize = (typeof TEXT_AREA_SIZES)[number];
export type TextAreaFillMode = (typeof TEXT_AREA_FILL_MODES)[number];
export type TextAreaRounded = (typeof TEXT_AREA_ROUNDEDS)[number];
