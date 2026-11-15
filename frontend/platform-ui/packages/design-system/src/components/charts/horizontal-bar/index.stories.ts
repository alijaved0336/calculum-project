import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import { formatCompactChartNumber } from "../shared";
import HorizontalBarChart from "./Index.vue";
import type { HorizontalBarSeries } from "./types.js";

const categories = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const singleSeries: HorizontalBarSeries[] = [
  {
    name: "Visitors",
    data: [120, 180, 90, 210, 160, 140],
    color: "#6366F1",
    gap: 1.2,
  },
];

const multiSeries: HorizontalBarSeries[] = [
  {
    name: "Unique",
    data: [40, 60, 35, 80, 55, 45],
    color: "#6366F1",
    gap: 1,
    spacing: 0.25,
  },
  {
    name: "Total",
    data: [80, 120, 55, 130, 105, 95],
    color: "#E0E7FF",
  },
];

const stackedSeries: HorizontalBarSeries[] = [
  {
    name: "Organic",
    data: [30, 40, 25, 50, 35, 28],
    color: "#22C55E",
    stack: true,
    gap: 1,
  },
  {
    name: "Paid",
    data: [20, 30, 18, 35, 22, 20],
    color: "#6366F1",
  },
  {
    name: "Referral",
    data: [10, 15, 12, 18, 14, 11],
    color: "#EAB308",
  },
];

/** Mock rows matching the product dashboard sample (sorted desc). */
const productCategories = [
  "Hardware Supplies North",
  "Hardware Supplies East",
  "Hardware Supplies West",
  "Hardware Supplies Central",
  "Hardware Supplies South",
  "Hardware Supplies Online",
  "Hardware Supplies Retail",
];

const productSeries: HorizontalBarSeries[] = [
  {
    data: [112, 98, 84, 71, 58, 44, 31],
    color: "#8B5CF6",
    gap: 1.4,
    stripeOverlay: true,
  },
];

/** Stacked segments with white diagonal overlay (matches product mock). */
const stripeOverlaySeries: HorizontalBarSeries[] = [
  {
    name: "Segment A",
    data: [55],
    color: "#6366F1",
    stack: true,
    gap: 0.4,
    stripeOverlay: true,
  },
  {
    name: "Segment B",
    data: [28],
    color: "#3B82F6",
    stripeOverlay: true,
  },
  {
    name: "Segment C",
    data: [12],
    color: "#E5E7EB",
    stripeOverlay: true,
  },
];

const meta: Meta<typeof HorizontalBarChart> = {
  title: "Charts/HorizontalBarChart",
  component: HorizontalBarChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
Horizontal bar chart built on Kendo Charts (\`type: "bar"\`).

Height is **auto** from \`categories.length\` (so \`gap\` / \`spacing\` look consistent).
Pass \`height\` only when you need a fixed size.

Per-series \`stripeOverlay: true\` adds a white diagonal hatch (5px / 4px, 45°, 50% opacity) as an SVG \`<pattern>\` on top of the bar fill.

See [Kendo Vue Bar charts](https://www.telerik.com/kendo-vue-ui/components/charts/bar).

\`\`\`vue
<HorizontalBarChart
  :categories="['Jan', 'Feb', 'Mar']"
  :series="[{ name: 'Visitors', data: [120, 180, 90], stripeOverlay: true }]"
/>
\`\`\`
        `.trim(),
      },
    },
  },
  decorators: [
    () => ({
      template: '<div style="max-width: 40rem;"><story /></div>',
    }),
  ],
  argTypes: {
    categories: propDoc({
      description: "Category labels (Y-axis).",
      type: "string[]",
      required: true,
      control: "object",
    }),
    series: propDoc({
      description: "Bar series (`data` aligned with `categories`).",
      type: "HorizontalBarSeries[]",
      required: true,
      control: "object",
      detail:
        "{ name?; data; color?; stripeOverlay?; gap?; spacing?; stack? }[]",
    }),
    height: propDoc({
      description:
        "Optional fixed height in px. Leave empty / 0 for auto from categories.",
      type: "number",
      control: "number",
    }),
    legendVisible: propDoc({
      description:
        "Show legend. Default in component: auto (on when any series has a name).",
      type: "boolean",
      defaultValue: "true",
    }),
    tooltipVisible: propDoc({
      description: "Show series tooltips.",
      type: "boolean",
      defaultValue: "true",
    }),
    categoryAxisTitle: propDoc({
      description: 'Category (Y) axis title, e.g. "Active users".',
      type: "string",
      defaultValue: '""',
    }),
    categoryAxisTitleColor: propDoc({
      description: "Color of the category (Y) axis title.",
      type: "string",
      control: "color",
    }),
    categoryAxisTitleFontWeight: propDoc({
      description: "Font weight of the category (Y) axis title.",
      type: "number",
      control: "number",
      defaultValue: "400",
    }),
    categoryAxisTitleFontSize: propDoc({
      description: "Font size (px) of the category (Y) axis title.",
      type: "number",
      control: "number",
      defaultValue: "12",
    }),
    valueAxisTitle: propDoc({
      description: 'Value (X) axis title, e.g. "Month".',
      type: "string",
      defaultValue: '""',
    }),
    valueLabelsVisible: propDoc({
      description: "Show numeric labels at the end of each bar.",
      type: "boolean",
      defaultValue: "false",
    }),
    valueLabelsContent: propDoc({
      description: "Custom formatter for the bar-end value labels.",
      type: "(e: { value: number }) => string",
      control: false,
    }),
    valueAxisLabelsContent: propDoc({
      description: "Custom formatter for the value (X) axis tick labels.",
      type: "(e: { value: number }) => string",
      control: false,
    }),
    valueAxisLabelRotation: propDoc({
      description: 'Rotate value (X) axis tick labels (degrees, or "auto").',
      type: 'number | "auto"',
      control: "text",
    }),
    valueAxisLabelColor: propDoc({
      description: "Color of the value (X) axis tick labels.",
      type: "string",
      control: "color",
    }),
    valueAxisLabelFontWeight: propDoc({
      description: "Font weight of the value (X) axis tick labels.",
      type: "number",
      control: "number",
      defaultValue: "500",
    }),
    categoryLabelMaxLength: propDoc({
      description:
        "Truncate category labels with ellipsis after N chars. `0` = no truncate.",
      type: "number",
      control: "number",
      defaultValue: "0",
    }),
    roundedBars: propDoc({
      description:
        "Round bar corners (4px). Default on. Works with `stripeOverlay`.",
      type: "boolean",
      defaultValue: "true",
    }),
  },

  args: {
    categories,
    series: singleSeries,
    height: 364,
    // Concrete args so Controls show toggles/inputs (not "Set boolean/string")
    tooltipVisible: true,
    legendVisible: true,
    valueLabelsVisible: false,
    roundedBars: true,
    categoryAxisTitle: "",
    categoryAxisTitleColor: "#98A2B3",
    categoryAxisTitleFontWeight: 400,
    categoryAxisTitleFontSize: 12,
    valueAxisTitle: "",
    valueAxisLabelRotation: "auto",
    valueAxisLabelColor: "#98A2B3",
    valueAxisLabelFontWeight: 500,
    categoryLabelMaxLength: 0,
  },
};

export default meta;
type Story = StoryObj<typeof HorizontalBarChart>;

export const Default: Story = {};

export const MultipleSeries: Story = {
  args: {
    series: multiSeries,
  },
};

export const Stacked: Story = {
  name: "Stacked",
  args: {
    series: stackedSeries,
  },
};

export const Stacked100: Story = {
  name: "100% stacked",
  args: {
    series: [
      {
        ...stackedSeries[0],
        stack: { type: "100%" },
      },
      stackedSeries[1],
      stackedSeries[2],
    ],
  },
};

/**
 * Demonstrates every available prop on the component and every field
 * on `HorizontalBarSeries` so you can see what's configurable at a glance.
 */
export const AllProps: Story = {
  name: "All Props",
  args: {
    categories: ["Alpha", "Beta", "Gamma", "Delta"],
    height: 360,
    legendVisible: true,
    tooltipVisible: true,
    categoryAxisTitle: "Category",
    valueAxisTitle: "Value",
    valueLabelsVisible: true,
    categoryLabelMaxLength: 8,
    series: [
      {
        name: "Primary",
        data: [50, 80, 60, 90],
        color: "#6366F1",
        gap: 0.8,
        spacing: 0.3,
        stack: true,
      },
      {
        name: "Secondary",
        data: [30, 45, 25, 55],
        color: "#22C55E",
      },
      {
        name: "Tertiary",
        data: [20, 30, 15, 35],
        color: "#EAB308",
      },
    ],
  },
};

/**
 * Single series with a per-bar highlight color and compact ("k"/"m") number
 * formatting on both the bar-end labels and the value-axis ticks — matches
 * the "Reason for Exclusion" style dashboard chart, with the third bar
 * selected.
 */
export const HighlightedSelection: Story = {
  name: "Highlighted selection + compact numbers",
  args: {
    categories: ["CZ26183960", "752602818", "472668132", "29AAFCC4489H1Z8"],
    categoryAxisTitle: "Reason for Exclusion (Top 4)",
    categoryAxisTitleColor: "#222222",
    categoryAxisTitleFontWeight: 700,
    categoryAxisTitleFontSize: 14,
    valueLabelsVisible: true,
    valueLabelsContent: (e) => formatCompactChartNumber(e.value),
    valueAxisLabelsContent: (e) => formatCompactChartNumber(e.value),
    valueAxisLabelRotation: 45,
    valueAxisLabelColor: "#222222",
    valueAxisLabelFontWeight: 700,
    legendVisible: false,
    series: [
      {
        data: [
          427300,
          { value: 324500, color: "#FF2C4F" },
          294700,
          118700,
        ],
        color: "#4A5578",
      },
    ],
  },
};

/**
 * Product-style horizontal bars: stripe overlay, axis titles, truncated
 * categories, and value labels outside each bar.
 */
export const ProductSample: Story = {
  name: "Product sample",
  decorators: [
    () => ({
      template:
        '<div style="max-width: 36rem; padding: 1rem; background: #fff; border: 1px solid #EAECF0; border-radius: 12px;"><story /></div>',
    }),
  ],
  args: {
    categories: productCategories,
    series: productSeries,
    categoryAxisTitle: "Active users",
    valueAxisTitle: "Month",
    legendVisible: false,
    valueLabelsVisible: true,
    categoryLabelMaxLength: 10,
    tooltipVisible: true,
    roundedBars: true,
    height: 436,
  },
};

/**
 * White diagonal stripe overlay (5px / 4px, 45°, 50% opacity) drawn inside
 * each bar’s SVG path — enable per series via `stripeOverlay: true`.
 */
export const StripeOverlay: Story = {
  name: "Stripe overlay",
  decorators: [
    () => ({
      template:
        '<div style="max-width: 28rem; padding: 1.5rem; background: #F9FAFB;"><story /></div>',
    }),
  ],
  args: {
    categories: ["Hardware Supplies"],
    series: stripeOverlaySeries,
    legendVisible: false,
    tooltipVisible: true,
    roundedBars: true,
    height: 72,
  },
};
