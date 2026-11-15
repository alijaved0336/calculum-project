export const TEXT_VARIANTS = ["xl", "lg", "md", "sm", "xs", "xxs"] as const;

export type TextVariant = (typeof TEXT_VARIANTS)[number];

export const TEXT_WEIGHTS = ["regular", "medium", "semibold", "bold"] as const;

export type TextWeight = (typeof TEXT_WEIGHTS)[number];
