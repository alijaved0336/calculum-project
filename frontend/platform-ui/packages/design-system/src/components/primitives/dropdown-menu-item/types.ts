export const DROPDOWN_MENU_ITEM_STARTS = ["none", "image", "logo"] as const;
export const DROPDOWN_MENU_ITEM_TRAILINGS = [
  "none",
  "check",
  "checkbox",
  "radio",
  "switch",
  "chevron",
] as const;

export type DropdownMenuItemStart =
  (typeof DROPDOWN_MENU_ITEM_STARTS)[number];
export type DropdownMenuItemTrailing =
  (typeof DROPDOWN_MENU_ITEM_TRAILINGS)[number];
