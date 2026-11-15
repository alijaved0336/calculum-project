import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import { formatCompactChartNumber } from "../shared";
import WaterfallChart from "./Index.vue";
import type { WaterfallDataPoint } from "./types";

const phases: WaterfallDataPoint[] = [
  { category: "Avg. Days Paid", value: 62.4 },
  { category: "Supplier Standard", value: -8.1 },
  { category: "Financing", value: 3.6 },
  { category: "Total", summary: "total" },
];

const withOverride: WaterfallDataPoint[] = [
  { category: "Baseline", value: 40, color: "#6366F1" },
  { category: "Bucket A", value: 18 },
  { category: "Bucket B", value: -6 },
  { category: "Bucket C", value: 0.04 },
  { category: "Target", summary: "total" },
];

const meta: Meta<typeof WaterfallChart> = {
  title: "Charts/WaterfallChart",
  component: WaterfallChart,
  tags: ["autodocs"],
  args: {
    data: phases,
    height: 320,
    tooltipVisible: true,
    categoryAxisTitle: "",
    valueAxisTitle: "Days",
    valueLabelsVisible: true,
    categoryLabelsRotated: true,
    roundedBars: true,
  },
  parameters: {
    docs: {
      description: {
        component: `
Waterfall chart built on Kendo Charts (\`type: "waterfall"\`).

Each bar is a signed delta from the previous running total; a point with \`summary: "total"\`
(and no \`value\`) draws the running-total bar from zero instead of stacking. Uses shared chart
helpers (\`useKendoChart\`, \`ChartHoverTooltip\`, \`createBarVisual\`).

See [Kendo Vue Waterfall charts](https://www.telerik.com/kendo-vue-ui/components/charts/waterfall).

\`\`\`vue
<WaterfallChart
  :data="[
    { category: 'Avg. Days Paid', value: 62.4 },
    { category: 'Supplier Standard', value: -8.1 },
    { category: 'Total', summary: 'total' },
  ]"
  value-axis-title="Days"
/>
\`\`\`
        `.trim(),
      },
    },
  },
  argTypes: {
    data: propDoc({
      description:
        "Ordered bars. A point with `summary: \"total\"` (and no `value`) draws the running-total bar.",
      type: "WaterfallDataPoint[]",
      required: true,
      control: "object",
    }),
    height: propDoc({
      description: "Chart height (px number or CSS length).",
      type: "number | string",
      control: "number",
      defaultValue: "320",
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
    categoryAxisTitleColor: propDoc({
      description: "Color of the category (X) axis title.",
      type: "string",
      control: "color",
    }),
    categoryAxisTitleFontWeight: propDoc({
      description: "Font weight of the category (X) axis title.",
      type: "number",
      control: "number",
      defaultValue: "400",
    }),
    categoryAxisTitleFontSize: propDoc({
      description: "Font size (px) of the category (X) axis title.",
      type: "number",
      control: "number",
      defaultValue: "12",
    }),
    valueAxisTitle: propDoc({
      description: "Title on the value (Y) axis.",
      type: "string",
      defaultValue: '""',
    }),
    valueAxisTitleColor: propDoc({
      description: "Color of the value (Y) axis title.",
      type: "string",
      control: "color",
    }),
    valueAxisTitleFontWeight: propDoc({
      description: "Font weight of the value (Y) axis title.",
      type: "number",
      control: "number",
      defaultValue: "400",
    }),
    valueAxisTitleFontSize: propDoc({
      description: "Font size (px) of the value (Y) axis title.",
      type: "number",
      control: "number",
      defaultValue: "12",
    }),
    valueLabelsVisible: propDoc({
      description: "Show compact numeric labels centered on each bar.",
      type: "boolean",
      defaultValue: "true",
    }),
    valueLabelsContent: propDoc({
      description: "Custom formatter for the bar-center value labels.",
      type: "(value: number) => string",
      control: false,
    }),
    categoryLabelsRotated: propDoc({
      description: 'Rotate category labels ("auto") instead of keeping them horizontal.',
      type: "boolean",
      defaultValue: "true",
    }),
    categoryLabelMaxLength: propDoc({
      description: "Truncate category labels with ellipsis after N chars.",
      type: "number",
      control: "number",
    }),
    valueAxisLabelsContent: propDoc({
      description: "Custom formatter for the value (Y) axis tick labels.",
      type: "(e: { value: unknown }) => string",
      control: false,
    }),
    valueAxisLabelRotation: propDoc({
      description: 'Rotate value (Y) axis tick labels (degrees, or "auto").',
      type: 'number | "auto"',
      control: false,
    }),
    valueAxisLabelColor: propDoc({
      description: "Color of the value (Y) axis tick labels.",
      type: "string",
      control: "color",
    }),
    valueAxisLabelFontWeight: propDoc({
      description: "Font weight of the value (Y) axis tick labels.",
      type: "number",
      control: "number",
      defaultValue: "600",
    }),
    roundedBars: propDoc({
      description: "Round bar corners.",
      type: "boolean",
      defaultValue: "true",
    }),
  },
};

export default meta;

type Story = StoryObj<typeof WaterfallChart>;

export const Default: Story = {
  args: {
    data: phases,
    height: 320,
    valueAxisTitle: "Days",
    valueLabelsVisible: true,
    tooltipVisible: true,
    roundedBars: true,
  },
};

/** A per-bar color override, a near-zero bar (tooltip range text), and no rounded corners. */
export const CustomColorsAndNearZero: Story = {
  name: "Custom colors & near-zero value",
  args: {
    data: withOverride,
    height: 320,
    valueAxisTitle: "Days",
    valueLabelsVisible: true,
    tooltipVisible: true,
    roundedBars: false,
  },
};

/** Custom color, weight and size on both axis titles. */
export const CustomTitles: Story = {
  name: "Custom axis titles",
  args: {
    data: phases,
    height: 320,
    categoryAxisTitle: "Phase",
    categoryAxisTitleColor: "#222222",
    categoryAxisTitleFontWeight: 700,
    categoryAxisTitleFontSize: 14,
    valueAxisTitle: "Days",
    valueAxisTitleColor: "#6366F1",
    valueAxisTitleFontWeight: 700,
    valueAxisTitleFontSize: 14,
    valueLabelsVisible: true,
    tooltipVisible: true,
    roundedBars: true,
  },
};

/** Custom color/weight on the value-axis tick labels, rotated, with a custom formatter. */
export const CustomAxisLabels: Story = {
  name: "Custom axis labels",
  args: {
    data: phases,
    height: 320,
    valueAxisTitle: "Days",
    valueAxisLabelColor: "#6366F1",
    valueAxisLabelFontWeight: 700,
    valueAxisLabelRotation: -45,
    valueAxisLabelsContent: (e) => `${formatCompactChartNumber(e.value)}d`,
    categoryLabelMaxLength: 6,
    valueLabelsVisible: true,
    tooltipVisible: true,
    roundedBars: true,
  },
};

export const NoValueLabels: Story = {
  name: "No value labels",
  args: {
    data: phases,
    height: 320,
    valueAxisTitle: "Days",
    valueLabelsVisible: false,
    tooltipVisible: true,
    roundedBars: true,
  },
};

export const AllProps: Story = {
  name: "All Props",
  args: {
    data: phases,
    height: 360,
    tooltipVisible: true,
    categoryAxisTitle: "Phase",
    categoryAxisTitleColor: "#222222",
    categoryAxisTitleFontWeight: 700,
    categoryAxisTitleFontSize: 14,
    valueAxisTitle: "Days",
    valueAxisTitleColor: "#222222",
    valueAxisTitleFontWeight: 700,
    valueAxisTitleFontSize: 14,
    valueLabelsVisible: true,
    valueLabelsContent: (value) => `${formatCompactChartNumber(value)}d`,
    categoryLabelsRotated: true,
    categoryLabelMaxLength: 10,
    valueAxisLabelsContent: (e) => `${formatCompactChartNumber(e.value)}d`,
    valueAxisLabelRotation: 0,
    valueAxisLabelColor: "#222222",
    valueAxisLabelFontWeight: 700,
    roundedBars: true,
  },
};
