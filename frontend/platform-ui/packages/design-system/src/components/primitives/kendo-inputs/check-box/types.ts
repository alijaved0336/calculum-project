export const CHECK_BOX_SIZES = ["small", "medium", "large"] as const;
export const CHECK_BOX_ROUNDEDS = ["none", "small", "medium", "large"] as const;

export type CheckBoxSize = (typeof CHECK_BOX_SIZES)[number];
export type CheckBoxRounded = (typeof CHECK_BOX_ROUNDEDS)[number];
