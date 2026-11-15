import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import AreaChart from "./Index.vue";
import type { AreaChartSeries } from "./types";

const LEGEND_POSITIONS = ["top", "bottom", "left", "right"] as const;

const categories = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const singleSeries: AreaChartSeries[] = [
  {
    name: "Revenue",
    data: [120, 180, 90, 210, 160, 140],
    color: "#6366F1",
  },
];

const multiSeries: AreaChartSeries[] = [
  {
    name: "Revenue",
    data: [120, 180, 90, 210, 160, 140],
    color: "#6366F1",
  },
  {
    name: "Cost",
    data: [80, 120, 55, 130, 105, 95],
    color: "#E0E7FF",
  },
];

const mixedTypeSeries: AreaChartSeries[] = [
  {
    name: "Actual",
    type: "area",
    data: [120, 180, 90, 210, 160, 140],
    color: "#6366F1",
  },
  {
    name: "Target",
    type: "line",
    data: [100, 150, 120, 180, 170, 150],
    color: "#22C55E",
  },
];

const gapSeries: AreaChartSeries[] = [
  {
    name: "Revenue",
    data: [120, 180, null, 210, 160, null],
    color: "#6366F1",
  },
];

const meta: Meta<typeof AreaChart> = {
  title: "Charts/AreaChart",
  component: AreaChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
Area chart built on Kendo Charts. Supports multiple series, mixed series
\`type\` (e.g. area + line), and \`null\` data points (rendered as gaps).

See [Kendo Vue Area charts](https://www.telerik.com/kendo-vue-ui/components/charts/area).

\`\`\`vue
<AreaChart
  :categories="['Jan', 'Feb', 'Mar']"
  :series="[{ name: 'Revenue', data: [120, 180, 90] }]"
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
      description: "Category labels (X-axis).",
      type: "string[]",
      required: true,
      control: "object",
    }),
    series: propDoc({
      description: "One or more series, rendered in the given order.",
      type: "AreaChartSeries[]",
      required: true,
      control: "object",
      detail: "{ name?: string; type?: AreaChartSeriesType; data: (number | null)[]; color?: string }[]",
    }),
    height: propDoc({
      description: "Chart height (CSS length or px number).",
      type: "string | number",
      control: "text",
      defaultValue: '"300px"',
    }),
    legendVisible: propDoc({
      description: "Show the chart legend.",
      type: "boolean",
      defaultValue: "true",
    }),
    legendPosition: propDoc({
      description: "Legend position.",
      type: formatUnionType(LEGEND_POSITIONS),
      options: LEGEND_POSITIONS,
      defaultValue: '"bottom"',
    }),
    tooltipVisible: propDoc({
      description: "Show series tooltips.",
      type: "boolean",
      defaultValue: "true",
    }),
    categoryAxisTitle: propDoc({
      description: 'Title along the category (X) axis, e.g. "Month".',
      type: "string",
      defaultValue: '""',
    }),
    valueAxisTitle: propDoc({
      description: 'Title along the value (Y) axis, e.g. "Revenue".',
      type: "string",
      defaultValue: '""',
    }),
    valueMajorUnit: propDoc({
      description: "Fixed step between value-axis labels/gridlines. Omit to let Kendo auto-calculate.",
      type: "number",
      control: "number",
    }),
    valueLabelsContent: propDoc({
      description: "Custom formatter for value-axis labels, e.g. `(e) => `${e.value / 1000}k``.",
      type: "(e: { value: number }) => string",
      control: false,
    }),
  },
  args: {
    categories,
    series: singleSeries,
    height: "300px",
    tooltipVisible: true,
    legendVisible: true,
    legendPosition: "bottom",
    categoryAxisTitle: "",
    valueAxisTitle: "",
    valueMajorUnit: 50,
  },
};

export default meta;
type Story = StoryObj<typeof AreaChart>;

export const Default: Story = {};

export const MultipleSeries: Story = {
  name: "Multiple series",
  args: {
    series: multiSeries,
  },
};

export const MixedSeriesTypes: Story = {
  name: "Mixed series types (area + line)",
  args: {
    series: mixedTypeSeries,
  },
};

export const WithGaps: Story = {
  name: "With gaps (null values)",
  args: {
    series: gapSeries,
  },
};

export const LegendLeft: Story = {
  name: "Legend on the left",
  args: {
    series: multiSeries,
    legendPosition: "left",
  },
};

/**
 * Demonstrates every available prop on the component.
 */
export const AllProps: Story = {
  name: "All Props",
  args: {
    categories: ["Alpha", "Beta", "Gamma", "Delta"],
    height: 360,
    legendVisible: true,
    legendPosition: "top",
    tooltipVisible: true,
    categoryAxisTitle: "Category",
    valueAxisTitle: "Value",
    valueMajorUnit: 50,
    series: [
      {
        name: "Primary",
        data: [50, 80, 60, 90],
        color: "#6366F1",
      },
      {
        name: "Secondary",
        type: "line",
        data: [30, 45, 25, 55],
        color: "#22C55E",
      },
    ],
  },
};
