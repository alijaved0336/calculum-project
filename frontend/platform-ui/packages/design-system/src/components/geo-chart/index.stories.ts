import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import GeoChart from "./Index.vue";
import type { GeoChartRow } from "./types";

const sampleData: GeoChartRow[] = [
  { code: "US", value: 4_882_021, tooltip: "Sales Volume: 4.9m" },
  { code: "DE", value: 2_193_875, tooltip: "Sales Volume: 2.2m" },
  { code: "GB", value: 1_048_687, tooltip: "Sales Volume: 1.0m" },
  { code: "FR", value: 380_963, tooltip: "Sales Volume: 380.9k" },
  { code: "IN", value: 5_882, tooltip: "Sales Volume: 5.9k" },
];

const meta: Meta<typeof GeoChart> = {
  title: "Charts/GeoChart",
  component: GeoChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
World choropleth — countries colored by value on a sequential scale, via Google Charts'
\`GeoChart\`. The app hosting this component must serve \`/scripts/charts_loader.js\` (copy it from
\`apps/ap/public/scripts/\` — already present in both \`apps/ap\` and \`apps/ar\`).

\`\`\`vue
<GeoChart :data="rows" value-label="Sales Volume" @on-event-click="onCountryClicked" />
\`\`\`
        `.trim(),
      },
    },
  },
  decorators: [
    () => ({
      template: '<div style="max-width: 48rem;"><story /></div>',
    }),
  ],
  argTypes: {
    data: propDoc({
      description: "One row per country. A code with no known region, or a null value, simply doesn't draw.",
      type: "GeoChartRow[]",
      required: true,
      control: false,
      detail: "{ code: string; value: number; key?: string; tooltip?: string }[]",
    }),
    valueLabel: propDoc({
      description: "Header label for the value column. Not shown anywhere visible today.",
      type: "string",
      defaultValue: '"Value"',
    }),
    height: propDoc({
      description: "Fixed height (CSS length). Ignored when fullBleedBreakpoints is set.",
      type: "string",
      defaultValue: '"450px"',
    }),
    fullBleedBreakpoints: propDoc({
      description: "AP's Program Overview breakpoint sizing instead of a fixed height — a new caller should leave this off.",
      type: "boolean",
      defaultValue: "false",
    }),
    mapUnavailableMessage: propDoc({
      description: "Message shown if the Google Charts script fails to load.",
      type: "string",
      defaultValue: '"Map will be available shortly. Please refresh the page."',
    }),
  },
  args: {
    data: sampleData,
    valueLabel: "Sales Volume",
    height: "450px",
    fullBleedBreakpoints: false,
    mapUnavailableMessage: "Map will be available shortly. Please refresh the page.",
  },
};

export default meta;
type Story = StoryObj<typeof GeoChart>;

export const Default: Story = {};

export const NoData: Story = {
  args: {
    data: [],
  },
};
