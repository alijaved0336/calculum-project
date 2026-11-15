import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import SupplierCard from "./Index.vue";
import {
  SUPPLIER_CARD_DEFAULT_LABELS,
  SUPPLIER_CARD_TYPES,
  type SupplierCardSupplierItem,
  type SupplierCardType,
} from "./types";

const flagSrc =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#006aa7"/><rect x="6.5" y="0" width="3" height="16" fill="#fecc00"/><rect x="0" y="6.5" width="16" height="3" fill="#fecc00"/></svg>`,
  );

const logoSrc =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#e2e8f0"/><text x="16" y="21" text-anchor="middle" fill="#475569" font-family="sans-serif" font-size="14" font-weight="600">A</text></svg>`,
  );

const demoSuppliers: SupplierCardSupplierItem[] = [
  { id: "ns-1", label: "Acme Industrial Ltd" },
  { id: "ns-2", label: "Northwind Supplies" },
  { id: "ns-3", label: "Contoso Parts" },
];

const parentArgs = {
  types: ["sme", "parent"] as SupplierCardType[],
  metrics: {
    "Spend Volume": "48.3m",
    "Buying Entities": "NHS Supply Chain",
  },
  parentsValue: "",
  suppliers: demoSuppliers,
  suppliersCount: 99,
};

const meta: Meta<typeof SupplierCard> = {
  title: "Components/SupplierCard",
  component: SupplierCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
Presentational supplier entity card (top accent strip, header, optional metric rows, optional suppliers footer).

**Accent strip** (derived from \`types\`, not a prop): parent → yellow, else potential → grey, else sme → blue, else **no strip**. Parent wins when both \`"parent"\` and \`"potential"\` are present.

**Metrics:** \`metrics\` is a label→value map (insertion order). Parents is a separate row (\`parentsValue\` / \`parentsLabel\` / \`showParentLink\`), not a \`metrics\` key.

**Footer:** \`suppliers\` / \`suppliersCount\` / \`suppliersLabel\`. Hidden when the list is empty and the count is 0.

**Navigation:** parent listens to \`click\` / \`close\` / \`parentClick\` / \`supplierClick\`. The card does not navigate.
        `.trim(),
      },
    },
  },
  decorators: [
    () => ({
      template:
        '<div style="padding: 1.5rem; background: var(--bg-page);"><div style="max-width: 24rem;"><story /></div></div>',
    }),
  ],
  argTypes: {
    name: propDoc({
      description:
        "Supplier title in the header. Truncated with ellipsis; full name is in `title`.",
      type: "string",
      required: true,
      control: "text",
    }),
    legalName: propDoc({
      description: "Grey subtitle under the name. Hidden when empty.",
      type: "string",
      control: "text",
      defaultValue: '""',
    }),
    logoSrc: propDoc({
      description:
        "Logo URL. Empty or failed load shows `logoFallback` (or the first letter of `name`).",
      type: "string",
      control: "text",
      defaultValue: '""',
    }),
    logoFallback: propDoc({
      description:
        "Initial shown when `logoSrc` is empty or broken. Empty string uses the first character of `name`.",
      type: "string",
      control: "text",
      defaultValue: '""',
    }),
    flagSrc: propDoc({
      description:
        "Country flag URL. Rendered as a circle in the header. Hidden when empty or broken.",
      type: "string",
      control: "text",
      defaultValue: '""',
    }),
    countryName: propDoc({
      description: "Flag `alt` / `title`.",
      type: "string",
      control: "text",
      defaultValue: '""',
    }),
    types: propDoc({
      description:
        'Card kinds (`"sme"` / `"parent"` / `"potential"`). Drives badges (fixed order SME, POTENTIAL, PARENT) and the accent strip. Empty → no strip.',
      type: "SupplierCardType[]",
      control: "inline-check",
      options: [...SUPPLIER_CARD_TYPES],
      defaultValue: "[]",
    }),
    smeTitle: propDoc({
      description: "Optional SME badge tooltip (AP `smeSource` copy).",
      type: "string",
      control: "text",
      defaultValue: '""',
    }),
    metrics: propDoc({
      description:
        "Metric rows: visible label → already-formatted value, in insertion order. Empty values are hidden. Parents is a separate prop.",
      type: "Record<string, string>",
      control: "object",
      defaultValue: "{}",
    }),
    parentsValue: propDoc({
      description: "Already formatted parents value. Row hidden when empty.",
      type: "string",
      control: "text",
      defaultValue: '""',
    }),
    parentsLabel: propDoc({
      description: "Parents row label.",
      type: "string",
      control: "text",
      defaultValue: SUPPLIER_CARD_DEFAULT_LABELS.parents,
    }),
    showParentLink: propDoc({
      description:
        "External-link control on the Parents value; emits `parentClick` and does not navigate.",
      type: "boolean",
      control: "boolean",
      defaultValue: "false",
    }),
    showClose: propDoc({
      description:
        "Close (X) control after the flag. Emits `close` and does not also fire `click`.",
      type: "boolean",
      control: "boolean",
      defaultValue: "true",
    }),
    suppliers: propDoc({
      description:
        "Presentational dropdown items for the suppliers footer. Footer is hidden when the list is empty and the resolved count is 0 (including an explicit `0`).",
      type: "SupplierCardSupplierItem[]",
      control: "object",
      detail: "{ id?: string; label: string }[]",
      defaultValue: "[]",
    }),
    suppliersCount: propDoc({
      description:
        "Count in the `Suppliers (N)` pill. Defaults to `suppliers.length`. Not set in `withDefaults`.",
      type: "number",
      control: "number",
      defaultValue: "undefined",
    }),
    suppliersLabel: propDoc({
      description: "Footer row label and pill prefix.",
      type: "string",
      control: "text",
      defaultValue: SUPPLIER_CARD_DEFAULT_LABELS.suppliers,
    }),
    disabled: propDoc({
      description:
        "Non-interactive card (shared 0.5 opacity disabled treatment). Suppresses emits.",
      type: "boolean",
      control: "boolean",
      defaultValue: "false",
    }),
    onClick: {
      action: "click",
      description:
        "Emitted as `click` from the card root when not disabled. Payload: `MouseEvent`.",
    },
    onClose: {
      action: "close",
      description:
        "Emitted as `close` from the X control. Stops propagation so `click` does not also fire.",
    },
    onParentClick: {
      action: "parentClick",
      description:
        "Emitted as `parentClick` from the Parents external-link control. Stops propagation.",
    },
    onSupplierClick: {
      action: "supplierClick",
      description:
        "Emitted as `supplierClick` when a footer menu item is chosen. Payload: item, `MouseEvent`.",
    },
  },
  args: {
    name: "Alconex Specialty Products INC",
    legalName: "Alconex Specialty Products Incorporated",
    logoSrc,
    logoFallback: "",
    flagSrc,
    countryName: "United States",
    types: ["sme"] as SupplierCardType[],
    smeTitle: "",
    metrics: {
      "Spend Volume": "48.3m",
      "Spend Lines": "12",
      "Buying Entities": "NHS Supply Chain",
    },
    parentsValue: "Alconex Group",
    parentsLabel: SUPPLIER_CARD_DEFAULT_LABELS.parents,
    showParentLink: false,
    showClose: true,
    suppliers: [],
    suppliersCount: 0,
    suppliersLabel: SUPPLIER_CARD_DEFAULT_LABELS.suppliers,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof SupplierCard>;

export const SmeOnly: Story = {
  name: "SME only",
};

export const SmeWithParentLink: Story = {
  name: "SME with parent link",
  args: {
    showParentLink: true,
  },
};

export const Potential: Story = {
  args: {
    types: ["sme", "potential"],
  },
};

export const Parent: Story = {
  args: {
    ...parentArgs,
  },
};

export const WithoutClose: Story = {
  name: "Without close",
  args: {
    showClose: false,
  },
};

export const NoTypes: Story = {
  name: "No types",
  args: {
    types: [],
  },
};

export const PotentialAndParent: Story = {
  name: "Potential and parent",
  args: {
    types: ["sme", "potential", "parent"],
  },
};

export const Disabled: Story = {
  args: {
    ...parentArgs,
    disabled: true,
  },
};
