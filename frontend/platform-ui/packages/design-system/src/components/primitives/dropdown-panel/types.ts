export const DROPDOWN_PANEL_ALIGNS = ["start", "end"] as const;

export type DropdownPanelAlign = (typeof DROPDOWN_PANEL_ALIGNS)[number];

/** Where the popup attaches relative to the trigger. */
export const DROPDOWN_PANEL_PLACEMENTS = ["bottom", "side"] as const;

export type DropdownPanelPlacement =
  (typeof DROPDOWN_PANEL_PLACEMENTS)[number];
