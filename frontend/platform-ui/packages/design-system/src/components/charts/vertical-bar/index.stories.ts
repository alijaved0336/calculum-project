import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import VerticalBarChart from "./Index.vue";
import type { VerticalBarSeries } from "./types";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const multiSeries: VerticalBarSeries[] = [
  {
    name: "Unique",
    data: [40, 60, 35, 80, 55, 45],
    color: "#6366F1",
    gap: 1.2,
    spacing: 0.2,
  },
  {
    name: "Total",
    data: [80, 120, 55, 130, 105, 95],
    color: "#A5B4FC",
  },
];

/** Peer-group layout matching the product mock (sparse series + legend). */
const peerCategories = Array.from({ length: 7 }, (_, i) => `C${i + 1}`);

const peerSeries: VerticalBarSeries[] = [
  {
    name: "Global International Platform",
    color: "#6366F1",
    // stack + sparse nulls → one centered column per category (product mock)
    stack: true,
    data: [80, null, null, null, null, null, null],
    gap: 0.8,
  },
  {
    name: "Global (Peer Group)",
    color: "#3B82F6",
    data: [null, 55, 132, 80, 23, 108, null],
  },
  {
    name: "Competitors",
    color: "#22C55E",
    data: [null, null, null, null, null, null, 150],
  },
];

const widePeerCategories = Array.from({ length: 17 }, (_, i) => `C${i + 1}`);

const widePeerSeries: VerticalBarSeries[] = [
  {
    name: "Global International Platform",
    color: "#6366F1",
    stack: true,
    data: [80, ...Array(16).fill(null)],
    gap: 0.5,
  },
  {
    name: "Global (Peer Group)",
    color: "#3B82F6",
    data: [
      null,
      55,
      87,
      41,
      90,
      150,
      11,
      112,
      52,
      23,
      64,
      64,
      100,
      38,
      23,
      108,
      null,
    ],
  },
  {
    name: "Competitors",
    color: "#22C55E",
    data: [...Array(16).fill(null), 150],
  },
];

const stackedSeries: VerticalBarSeries[] = [
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

const meta: Meta<typeof VerticalBarChart> = {
  title: "Charts/VerticalBarChart",
  component: VerticalBarChart,
  tags: ["autodocs"],
  args: {
    categories: months,
    series: multiSeries,
    height: 320,
    legendVisible: true,
    tooltipVisible: true,
    categoryAxisTitle: "",
    valueAxisTitle: "Days",
    valueLabelsVisible: false,
    valueLabelOutsideBelow: 35,
    categoryLabelsVisible: true,
    categoryLabelMaxLength: 0,
    roundedBars: true,
    signedNegativeValues: false,
  },
  parameters: {
    docs: {
      description: {
        component: `
Vertical column chart built on Kendo Charts (\`type: "column"\`).

Uses shared chart helpers (\`useKendoChart\`, \`ChartHoverTooltip\`, \`createBarVisual\` with top-only rounding).

See [Kendo Vue Bar / Column charts](https://www.telerik.com/kendo-vue-ui/components/charts/bar) and [axes](https://www.telerik.com/kendo-vue-ui/components/charts/elements/axes).

\`\`\`vue
<VerticalBarChart
  :categories="['Jan', 'Feb', 'Mar']"
  :series="[{ name: 'Visitors', data: [40, 60, 35] }]"
  value-axis-title="Days"
  value-labels-visible
/>
\`\`\`
        `.trim(),
      },
    },
  },
  argTypes: {
    categories: propDoc({
      description: "Category labels (X-axis).",
      type: "string[]",
      required: true,
      control: "object",
    }),
    series: propDoc({
      description:
        "Column series (`data` aligned with categories; `null` skips a slot).",
      type: "VerticalBarSeries[]",
      required: true,
      control: "object",
    }),
    height: propDoc({
      description: "Chart height (px number or CSS length).",
      type: "number | string",
      control: "number",
      defaultValue: "320",
    }),
    legendVisible: propDoc({
      description:
        "Show legend. Default in component: auto (on when any series has a name).",
      type: "boolean",
      defaultValue: "true",
    }),
    tooltipVisible: propDoc({
      description: "Show hover tooltips.",
      type: "boolean",
      defaultValue: "true",
    }),
    categoryAxisTitle: propDoc({
      description: "Title on the category (X) axis.",
      type: "string",
      defaultValue: '""',
    }),
    valueAxisTitle: propDoc({
      description: 'Title on the value (Y) axis, e.g. "Days".',
      type: "string",
      defaultValue: '""',
    }),
    valueAxisLabelsContent: propDoc({
      description:
        "Custom formatter for value-axis ticks. Default: {0:N1}.",
      type: "(e: { value: unknown }) => string",
      defaultValue: "undefined",
    }),
    valueLabelsVisible: propDoc({
      description: "Show numeric labels on columns.",
      type: "boolean",
      defaultValue: "false",
    }),
    valueLabelsContent: propDoc({
      description:
        "Custom formatter for bar labels and tooltips. Default: formatChartNumber.",
      type: "(value: number) => string",
      defaultValue: "undefined",
    }),
    valueLabelOutsideBelow: propDoc({
      description: "Below this value, labels render above the column.",
      type: "number",
      control: "number",
      defaultValue: "35",
    }),
    categoryLabelsVisible: propDoc({
      description: "Show category axis labels.",
      type: "boolean",
      defaultValue: "true",
    }),
    categoryLabelMaxLength: propDoc({
      description: "Truncate category labels (ellipsis).",
      type: "number",
      control: "number",
      defaultValue: "undefined",
    }),
    roundedBars: propDoc({
      description: "Round column tops (4px).",
      type: "boolean",
      defaultValue: "true",
    }),
    signedNegativeValues: propDoc({
      description:
        "Plot negatives as absolute magnitude (red); labels/tooltips show the signed value.",
      type: "boolean",
      defaultValue: "false",
    }),
  },
};

export default meta;

type Story = StoryObj<typeof VerticalBarChart>;

export const Default: Story = {
  args: {
    categories: months,
    series: multiSeries,
    height: 320,
    valueAxisTitle: "Days",
    valueLabelsVisible: true,
    tooltipVisible: true,
    roundedBars: true,
    signedNegativeValues: false,
  },
};

export const PeerGroupSample: Story = {
  name: "Peer group sample",
  args: {
    categories: peerCategories,
    series: peerSeries,
    height: 340,
    valueAxisTitle: "Days",
    valueLabelsVisible: true,
    categoryLabelsVisible: false,
    tooltipVisible: true,
    roundedBars: true,
  },
};

export const WidePeerGroup: Story = {
  name: "Wide peer group",
  args: {
    categories: widePeerCategories,
    series: widePeerSeries,
    height: 360,
    valueAxisTitle: "Days",
    valueLabelsVisible: true,
    categoryLabelsVisible: false,
    tooltipVisible: true,
    roundedBars: true,
  },
};

export const Stacked: Story = {
  args: {
    categories: months,
    series: stackedSeries,
    height: 320,
    valueAxisTitle: "Days",
    valueLabelsVisible: false,
    tooltipVisible: true,
    roundedBars: true,
  },
};

const signedNegativeSeries: VerticalBarSeries[] = [
  {
    name: "Impact",
    data: [80, -40, 55, -25, 70, 45],
    color: "#6366F1",
    gap: 1.2,
  },
];

export const SignedNegativeValues: Story = {
  name: "Signed negative values",
  args: {
    categories: months,
    series: signedNegativeSeries,
    height: 320,
    valueAxisTitle: "Days",
    valueLabelsVisible: true,
    tooltipVisible: true,
    roundedBars: true,
    signedNegativeValues: true,
  },
};

/** Custom axis ticks and bar labels — defaults elsewhere stay `{0:N1}` / `formatChartNumber`. */
export const CustomFormatters: Story = {
  name: "Custom formatters",
  args: {
    categories: months,
    series: multiSeries,
    height: 320,
    valueAxisTitle: "Days",
    valueLabelsVisible: true,
    tooltipVisible: true,
    roundedBars: true,
    valueAxisLabelsContent: (e: { value: unknown }) =>
      `${String(e.value ?? "")}d`,
    valueLabelsContent: (value: number) => `${value} days`,
  },
};

export const AllProps: Story = {
  name: "All Props",
  args: {
    categories: months,
    series: multiSeries,
    height: 360,
    legendVisible: true,
    tooltipVisible: true,
    categoryAxisTitle: "Month",
    valueAxisTitle: "Days",
    valueLabelsVisible: true,
    valueLabelOutsideBelow: 35,
    categoryLabelsVisible: true,
    categoryLabelMaxLength: 8,
    roundedBars: true,
    signedNegativeValues: false,
  },
};
