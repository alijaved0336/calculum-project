import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import PieChart from "./Index.vue";
import type { PieChartItem } from "./types";

const items: PieChartItem[] = [
  { category: "Included", value: 720, color: "#2E90FA" },
  { category: "Excluded", value: 280, color: "#4A5578" },
];

const meta: Meta<typeof PieChart> = {
  title: "Charts/PieChart",
  component: PieChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
Pie chart built on Kendo Charts. Slices are fully caller-resolved (\`category\` +
\`value\`, optional \`color\`) — pass already-highlighted colors for a selected
slice rather than relying on the component for selection state.

\`\`\`vue
<PieChart
  :items="[{ category: 'Included', value: 720 }, { category: 'Excluded', value: 280 }]"
  @slice-click="({ category, index }) => ..."
/>
\`\`\`
        `.trim(),
      },
    },
  },
  decorators: [
    () => ({
      template: '<div style="max-width: 30rem;"><story /></div>',
    }),
  ],
  argTypes: {
    items: propDoc({
      description: "Slices to render.",
      type: "PieChartItem[]",
      required: true,
      control: "object",
      detail: "{ category: string; value: number; color?: string }[]",
    }),
    labelsVisible: propDoc({
      description: "Show the value/percentage label on each slice.",
      type: "boolean",
      defaultValue: "true",
    }),
    legendVisible: propDoc({
      description: "Show the chart legend.",
      type: "boolean",
      defaultValue: "true",
    }),
    tooltipVisible: propDoc({
      description: "Show slice tooltips.",
      type: "boolean",
      defaultValue: "true",
    }),
    height: propDoc({
      description: "Chart height (CSS length or px number).",
      type: "string | number",
      control: "text",
      defaultValue: '"300px"',
    }),
    labelContent: propDoc({
      description:
        "Custom slice label formatter. Defaults to value and percentage, e.g. `120 (35%)`.",
      type: "(e: PieChartLabelArgs) => string",
      control: false,
    }),
  },
  args: {
    items,
    labelsVisible: true,
    legendVisible: true,
    tooltipVisible: true,
    height: "300px",
  },
};

export default meta;
type Story = StoryObj<typeof PieChart>;

export const Default: Story = {};

export const ManySlices: Story = {
  name: "Many slices",
  args: {
    items: [
      { category: "Matched", value: 540, color: "#2E90FA" },
      { category: "Unmatched", value: 210, color: "#98A2B3" },
      { category: "Excluded", value: 130, color: "#4A5578" },
      { category: "Pending", value: 60, color: "#FFB524" },
    ],
  },
};

export const WithoutLegend: Story = {
  name: "Without legend",
  args: {
    legendVisible: false,
  },
};

export const WithoutColors: Story = {
  name: "Without per-item colors",
  parameters: {
    docs: {
      description: {
        story: "Every item omits `color` - regression case for a bug where slices with no "
          + "`colorField` value rendered with no fill at all instead of falling back to the "
          + "theme palette (only their floating labels showed).",
      },
    },
  },
  args: {
    items: [
      { category: "South Asia", value: 44 },
      { category: "Northern America", value: 90 },
      { category: "Southern Europe", value: 47 },
      { category: "Western Europe", value: 57 },
      { category: "Eastern Europe", value: 62 },
      { category: "Northern Europe", value: 60 },
    ],
  },
};
