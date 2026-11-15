import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import KanbanCard from "./Index.vue";
import { KANBAN_CARD_STATUSES } from "./types";

const flagSrc =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#006aa7"/><rect x="6.5" y="0" width="3" height="16" fill="#fecc00"/><rect x="0" y="6.5" width="16" height="3" fill="#fecc00"/></svg>`,
  );

const logoSrc =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#e2e8f0"/><text x="16" y="21" text-anchor="middle" fill="#475569" font-family="sans-serif" font-size="14" font-weight="600">V</text></svg>`,
  );

const avatarPhotoA =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96";

const avatarPhotoB =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&h=96";

const STATUS_COLUMN_LABELS: Record<(typeof KANBAN_CARD_STATUSES)[number], string> = {
  analyzed: "Analyzed",
  onHold: "On Hold",
  planned: "Planned",
  contacted: "Contacted",
  agreed: "Agreed - Not Improved",
  agreedExtended: "Agreed",
};

const meta: Meta<typeof KanbanCard> = {
  title: "Components/KanbanCard",
  component: KanbanCard,
  tags: ["autodocs"],
  decorators: [
    (_story, context) => ({
      template:
        context.parameters.kanbanCardLayout === "row"
          ? '<div style="overflow-x: auto;"><story /></div>'
          : '<div style="max-width: 16rem;"><story /></div>',
    }),
  ],
  argTypes: {
    entityName: propDoc({
      description: "Entity title in the header. Truncated with ellipsis; full name is in `title`.",
      type: "string",
      required: true,
    }),
    status: propDoc({
      description: "Column status. Drives the 3px inline-start accent border.",
      type: formatUnionType(KANBAN_CARD_STATUSES),
      control: "select",
      options: [...KANBAN_CARD_STATUSES],
      defaultValue: "analyzed",
    }),
    logoSrc: propDoc({
      description: "Logo URL. Empty or failed load shows `logoFallback` (or the first letter of `entityName`).",
      type: "string",
      defaultValue: '""',
    }),
    logoFallback: propDoc({
      description:
        "Initial shown when `logoSrc` is empty or broken. Defaults to the first character of `entityName`.",
      type: "string",
      defaultValue: "undefined",
    }),
    flagSrc: propDoc({
      description: "Country flag URL. Rendered as a circle in the header. Hidden when empty or broken.",
      type: "string",
      defaultValue: '""',
    }),
    countryName: propDoc({
      description: "Flag `alt` / `title`.",
      type: "string",
      defaultValue: '""',
    }),
    spendLabel: propDoc({
      description: "Spend metric label (`Spend Line:`, `Spend Lines:`, `Suppliers:`).",
      type: "string",
      defaultValue: "Spend Line:",
    }),
    spendValue: propDoc({
      description: "Already formatted spend value (`Spend 1`, `12`, `-`).",
      type: "string",
      defaultValue: '""',
    }),
    paymentTermsLabel: propDoc({
      description: "Payment-terms row label.",
      type: "string",
      defaultValue: "Payment Terms (days):",
    }),
    paymentTermsValue: propDoc({
      description: "Already formatted payment-terms value (e.g. `30 → 60`).",
      type: "string",
      defaultValue: '""',
    }),
    cashFlowLabel: propDoc({
      description: "Cash-flow row label (Target / Achieved / Agreed Type).",
      type: "string",
      defaultValue: "Cash Flow Target:",
    }),
    cashFlowValue: propDoc({
      description: "Already formatted cash-flow value (e.g. `2.4m`).",
      type: "string",
      defaultValue: '""',
    }),
    rebateLabel: propDoc({
      description: "Rebate row label. Row is hidden when `rebateValue` is empty.",
      type: "string",
      defaultValue: "Rebate Target:",
    }),
    rebateValue: propDoc({
      description: "Already formatted rebate value. Empty string hides the row.",
      type: "string",
      defaultValue: '""',
    }),
    teamLabel: propDoc({
      description:
        "Team initials circle in the footer when `avatars` is empty (old-card people fallback).",
      type: "string",
      defaultValue: '""',
    }),
    partialLabel: propDoc({
      description: "Partial-entity badge text. Hidden when empty.",
      type: "string",
      defaultValue: '""',
    }),
    updatedAt: propDoc({
      description: "Already formatted extra-row date (Home recent-changes). Hidden when empty.",
      type: "string",
      defaultValue: '""',
    }),
    statusLabel: propDoc({
      description: "Extra-row status pill. Hidden when empty.",
      type: "string",
      defaultValue: '""',
    }),
    plans: propDoc({
      description: "Plan-name chips under the metrics. Hidden when empty.",
      type: "string[]",
      control: "object",
      detail: "string[]",
      defaultValue: "[]",
    }),
    commentCount: propDoc({
      description: "Footer comment count. Hidden when `null`. `0` still shows.",
      type: "number | null",
      control: "number",
      defaultValue: "null",
    }),
    avatars: propDoc({
      description:
        "Stacked footer avatars (up to 3, then `+N`). When empty, `teamLabel` can show one initials circle.",
      type: "KanbanCardAvatar[]",
      control: "object",
      detail: "{ src?: string; name?: string; initials?: string }[]",
      defaultValue: "[]",
    }),
    disabled: propDoc({
      description: "Non-interactive card (shared 0.5 opacity disabled treatment). Suppresses `click`.",
      type: "boolean",
      defaultValue: "false",
    }),
    onClick: {
      action: "click",
      description:
        "Emitted as `click` from the card root when not disabled. Payload: `MouseEvent`.",
    },
  },
  args: {
    entityName: "Volvo Group AB",
    status: "analyzed",
    logoSrc,
    logoFallback: "",
    flagSrc,
    countryName: "Sweden",
    spendLabel: "Spend Line:",
    spendValue: "Spend 1",
    paymentTermsLabel: "Payment Terms (days):",
    paymentTermsValue: "30 → 60",
    cashFlowLabel: "Cash Flow Target:",
    cashFlowValue: "2.4m",
    rebateLabel: "Rebate Target:",
    rebateValue: "",
    teamLabel: "",
    partialLabel: "",
    updatedAt: "",
    statusLabel: "",
    plans: ["Plan name", "Plan name"],
    commentCount: 8,
    avatars: [
      { src: avatarPhotoA, initials: "AB", name: "Alex Berg" },
      { src: avatarPhotoB, initials: "CD", name: "Chris Diaz" },
      { initials: "EF", name: "Eva Falk" },
    ],
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof KanbanCard>;

export const Default: Story = {};

export const AllStatuses: Story = {
  name: "All statuses",
  parameters: {
    kanbanCardLayout: "row",
  },
  render: (args) => ({
    components: { KanbanCard },
    setup() {
      return { args, statuses: KANBAN_CARD_STATUSES, labels: STATUS_COLUMN_LABELS };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start;">
        <div
          v-for="status in statuses"
          :key="status"
          style="width: 16rem; flex-shrink: 0;"
        >
          <p style="margin: 0 0 0.5rem; font: 600 0.875rem/1.25 sans-serif;">
            {{ labels[status] }}
          </p>
          <KanbanCard v-bind="args" :status="status" />
        </div>
      </div>
    `,
  }),
};

export const SpendLineLevel: Story = {
  name: "Spend line level",
  args: {
    teamLabel: "CH",
    avatars: [],
    plans: [],
    commentCount: null,
    paymentTermsValue: "60 → 105",
    cashFlowValue: "960.8k",
  },
  argTypes: {
    commentCount: { control: false, table: { disable: true } },
  },
};

export const SupplierLevel: Story = {
  name: "Supplier level",
  args: {
    spendLabel: "Spend Lines:",
    spendValue: "12",
  },
};

export const AgreedAchieved: Story = {
  name: "Agreed achieved",
  args: {
    status: "agreed",
    cashFlowLabel: "Cash Flow Achieved:",
  },
};

export const WithRebate: Story = {
  name: "With rebate",
  args: {
    rebateLabel: "Rebate Target:",
    rebateValue: "-312.8k",
  },
};

export const Partial: Story = {
  args: {
    partialLabel: "Partial",
  },
};

export const ExtraData: Story = {
  name: "Extra data",
  args: {
    updatedAt: "Aug 12, 2026",
    statusLabel: "Analyzed",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const LogoFallback: Story = {
  name: "Logo fallback",
  args: {
    logoSrc: "",
  },
};

export const NoFooterExtras: Story = {
  name: "No footer extras",
  args: {
    plans: [],
    commentCount: null,
    avatars: [],
  },
  argTypes: {
    commentCount: { control: false, table: { disable: true } },
  },
};
