import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import CustomChartLegend from "./Index.vue";

const meta: Meta<typeof CustomChartLegend> = {
  title: "Charts/CustomChartLegend",
  component: CustomChartLegend,
  tags: ["autodocs"],
  argTypes: {
    legendItems: propDoc({
      description: "Legend rows (`color` swatch + `text` label).",
      type: "ChartLegendItem[]",
      required: true,
      control: "object",
      detail: "{ color: string; text: string }[]",
    }),
  },
  args: {
    legendItems: [
      { color: "#2E90FA", text: "Actual" },
      { color: "#F79009", text: "Forecast" },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof CustomChartLegend>;

export const Default: Story = {};
