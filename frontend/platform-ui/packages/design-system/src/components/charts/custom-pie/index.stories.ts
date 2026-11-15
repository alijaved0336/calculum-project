import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import CustomPieChart from "./Index.vue";
import type { CustomPieSlice } from "./types";

const emailSlices: CustomPieSlice[] = [
  { category: "Bounced", value: 23, color: "#6366F1" },
  { category: "Opened", value: 13, color: "#3B82F6" },
  { category: "Replied", value: 12, color: "#A855F7" },
  { category: "Sent", value: 44, color: "#22C55E" },
];

const statusSlices: CustomPieSlice[] = [
  { category: "Agreed (Extended)", value: 23, color: "#818CF8" },
  { category: "Agreed (Not Ext)", value: 13, color: "#3B82F6" },
  { category: "Escalated", value: 12, color: "#22C55E" },
  { category: "In progress", value: 44, color: "#A855F7" },
  { category: "No answer", value: 44, color: "#EF4444" },
];

const defaultArgs = {
  data: emailSlices,
  size: 168,
  tooltipVisible: true,
  legendVisible: true,
  totalLabel: "Total",
  showPercentages: true,
} as const;

const meta: Meta<typeof CustomPieChart> = {
  title: "Charts/CustomPieChart",
  component: CustomPieChart,
  tags: ["autodocs"],
  args: { ...defaultArgs },
  parameters: {
    docs: {
      description: {
        component: `
Pie chart built on Kendo Charts (\`type: "pie"\`), with a side legend (Total + value/percent rows).

\`size\` is the pie diameter in px (series padding is \`0\`, so little empty chrome).

See [Kendo Vue Pie charts](https://www.telerik.com/kendo-vue-ui/components/charts/pie).

\`\`\`vue
<CustomPieChart
  :data="[
    { category: 'Sent', value: 44 },
    { category: 'Opened', value: 13 },
  ]"
/>
\`\`\`
        `.trim(),
      },
    },
  },
  argTypes: {
    data: propDoc({
      description: "Pie slices (`category`, `value`, optional `color`).",
      type: "CustomPieSlice[]",
      required: true,
      control: "object",
    }),
    size: propDoc({
      description: "Pie diameter (px number or CSS length).",
      type: "number | string",
      control: "number",
      defaultValue: "168",
    }),
    tooltipVisible: propDoc({
      description: "Show hover tooltips.",
      type: "boolean",
      defaultValue: "true",
    }),
    legendVisible: propDoc({
      description: "Show Total + legend rows beside the pie.",
      type: "boolean",
      defaultValue: "true",
    }),
    totalLabel: propDoc({
      description: "Label above the total.",
      type: "string",
      defaultValue: '"Total"',
    }),
    showPercentages: propDoc({
      description: "Show percentages in legend and tooltips.",
      type: "boolean",
      defaultValue: "true",
    }),
  },
};

export default meta;

type Story = StoryObj<typeof CustomPieChart>;

export const Default: Story = {
  args: { ...defaultArgs },
};

export const StatusBreakdown: Story = {
  name: "Status breakdown",
  args: {
    ...defaultArgs,
    data: statusSlices,
  },
};

export const AllProps: Story = {
  name: "All Props",
  args: {
    ...defaultArgs,
    size: 200,
    totalLabel: "Total",
  },
};

export const WithoutLegend: Story = {
  name: "Without legend",
  args: {
    ...defaultArgs,
    legendVisible: false,
  },
};
