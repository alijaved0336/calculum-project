export type TabsAppearance = "segmented" | "underline";

export type TabItem = {
  id: string;
  label: string;
  /** Asset name from design-system icons, or leave empty and use the icon slot */
  icon?: string;
  disabled?: boolean;
};

export const TABS_APPEARANCES = ["segmented", "underline"] as const;
