/**
 * Presentational `SupplierCard` API.
 *
 * Maps AP `EntityCardRecentSearchCompany` (Suppliers Entity Card, cards view) to
 * typed unions, formatted strings, and URLs. Do not import AP domain types
 * (`EntityType`, `NegotiationStatus`, GraphQL `supplier`) into this package.
 *
 * | Current AP prop | DS prop / handling |
 * |-----------------|--------------------|
 * | `name` | `name` (required, truncated) |
 * | `originalSupplierName` | `legalName` (subtitle) |
 * | `logoUrl` | `logoSrc` |
 * | `domain` / first letter of name | `logoFallback` (default first char of `name`; AP currently uses `name[0]`, not `domain`) |
 * | `country` | `countryName` + new `flagSrc` (circular flag; AP will resolve URL later) |
 * | `isSME` / `companyType` | `types` (`"sme"` / `"parent"` / `"potential"`) |
 * | `buyers` / `spendsAmount` / `spendVolume` | `metrics` (label → already-formatted value) |
 * | `parentName` | dedicated `parentsValue` + optional parents link (not inside `metrics`) |
 * | nested-supplier footer | `suppliers` / `suppliersCount` / `suppliersLabel` |
 * | `showCloseAction` / `showRemoveRecentCard` | `showClose` (default true) |
 * | `id` | stay in AP wrapper |
 * | `supplier` (object, modal + forecast) | stay in AP wrapper |
 * | `negotiationStatus` / `negotiationStatusCodes` | not in screenshots — omit from DS |
 * | `receivedName` | not in screenshots — omit from DS |
 * | `isApprovedAndReadyToPublish` / pending badge | omit from DS |
 * | `smeSource` | optional `smeTitle` (tooltip); otherwise AP tooltip later |
 * | `pilot` / blur / cursor rules | AP wrapper (`disabled` on DS if needed, like `KanbanCard`) |
 * | `industry` / `region` (always `"-"`) | omit from DS |
 * | forecast volume UI | omit from DS (not in screenshots) |
 *
 * AP events: `openEntityModal` → DS `click`; `removedRecentCard` → DS `close`.
 *
 * Accent strip (derived, not a free color prop): parent → yellow, else potential →
 * grey, else sme → blue, else **no strip**. Parent wins when both `"parent"` and
 * `"potential"` are in `types`. Badges follow membership independently (fixed
 * order SME, POTENTIAL, PARENT).
 *
 * Metric rows hide when their value is empty. Default labels are English; AP i18n
 * stays in the wrapper. Root `click` is mouse-only; `close` and `parentClick`
 * must stop propagation so they do not also fire `click`. DS does not navigate.
 */

export const SUPPLIER_CARD_TYPES = ["parent", "potential", "sme"] as const;

export type SupplierCardType = (typeof SUPPLIER_CARD_TYPES)[number];

/** Accent strip kind — same values as `SupplierCardType`. */
export type SupplierCardAccentKind = SupplierCardType;

/** Top accent strip — CSS custom properties from `tokens.css`, not hex. */
export const SUPPLIER_CARD_ACCENTS: Record<SupplierCardAccentKind, string> = {
  parent: "var(--yellow-500)",
  potential: "var(--neutral-400)",
  sme: "var(--blue-400)",
};

/**
 * Parent wins (yellow). Else potential (grey). Else sme (blue). Empty / no
 * matching types → `null` (no strip).
 */
export function resolveSupplierCardAccentKind(
  types: readonly SupplierCardType[] | undefined,
): SupplierCardAccentKind | null {
  const list = types ?? [];
  if (list.includes("parent")) {
    return "parent";
  }
  if (list.includes("potential")) {
    return "potential";
  }
  if (list.includes("sme")) {
    return "sme";
  }
  return null;
}

export const SUPPLIER_CARD_DEFAULT_LABELS = {
  parents: "Parents",
  suppliers: "Suppliers",
} as const;

export type SupplierCardSupplierItem = {
  id?: string;
  label: string;
};

export type SupplierCardProps = {
  name: string;
  legalName?: string;
  logoSrc?: string;
  /** Defaults to the first character of `name` when omitted. */
  logoFallback?: string;
  flagSrc?: string;
  countryName?: string;
  /**
   * Card kinds shown as badges and used to derive the accent strip.
   * Treated as a set (`includes`); duplicates are ignored.
   */
  types?: SupplierCardType[];
  /** Optional SME badge tooltip (AP `smeSource` copy). */
  smeTitle?: string;
  /**
   * Metric rows: visible label → already-formatted value. Rendered in
   * insertion order. Hide a row when the value is empty/whitespace.
   * Do not put Parents in this object.
   */
  metrics?: Record<string, string>;
  /** Parent card name. Row hidden when empty. */
  parentsValue?: string;
  parentsLabel?: string;
  /** External-link control on the Parents value; emits `parentClick`. */
  showParentLink?: boolean;
  /** Defaults to `true`. */
  showClose?: boolean;
  /**
   * Presentational dropdown items for the suppliers footer
   * (`{ id?: string; label: string }[]`).
   */
  suppliers?: SupplierCardSupplierItem[];
  /**
   * Number shown in the footer pill (`Suppliers (N)`). If omitted, uses
   * `suppliers.length`. Footer is hidden when this count is 0 and the
   * items array is empty.
   */
  suppliersCount?: number;
  /**
   * Left footer label and pill prefix (the word before `(N)`).
   */
  suppliersLabel?: string;
  disabled?: boolean;
};

export type SupplierCardEmits = {
  click: [event: MouseEvent];
  close: [event: MouseEvent];
  parentClick: [event: MouseEvent];
  supplierClick: [item: SupplierCardSupplierItem, event: MouseEvent];
};
