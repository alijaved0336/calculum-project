/** Kendo Tooltip positions relative to the trigger. */
export const TOOLTIP_POSITIONS = ['auto', 'top', 'bottom', 'left', 'right'] as const;

export type TooltipPosition = (typeof TOOLTIP_POSITIONS)[number];

/** Accessible name / Kendo `title` when `text` is empty and `#content` is used. */
export const TOOLTIP_BUTTON_FALLBACK_TEXT = 'More information';
