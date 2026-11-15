import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import ArcGauge from "./Index.vue";
import type { ArcScale, ColorRange } from "./types";

const trafficColors: ColorRange[] = [
  { from: 0, to: 33, color: "#EF4444" },
  { from: 33, to: 66, color: "#EAB308" },
  { from: 66, to: 100, color: "#22C55E" },
];

const defaultScale: ArcScale = {
  min: 0,
  max: 100,
  rangeSize: 16,
  rangePlaceholderColor: "#EAECF0",
  rangeLineCap: "round",
};

/**
 * Default story args — every prop filled with a realistic product sample.
 * (Docs Default column still lists component `withDefaults`, not these demo values.)
 */
const defaultArgs = {
  value: 70,
  color: "#6366F1",
  colors: [] as ColorRange[],
  opacity: 1,
  scale: defaultScale,
  transitions: true,
  size: 300,
  showCenterValue: true,
  centerSuffix: "%",
  centerCaption: "All agreed",
  centerMetric: "Source: internal",
  stripeOverlay: true,
  dottedTrack: true,
};

const meta: Meta<typeof ArcGauge> = {
  title: "Charts/ArcGauge",
  component: ArcGauge,
  tags: ["autodocs"],
  args: { ...defaultArgs },
  parameters: {
    docs: {
      description: {
        component: `
Arc gauge built on Kendo Vue \`ArcGauge\` (\`@progress/kendo-vue-gauges\`).

- Diagonal **stripe overlay** on the filled value arc (\`BAR_STRIPE_OVERLAY\`).
- Tip: white 16×16 with an **outer** 8px colored border.
- Optional **dotted track** under the arc (\`dottedTrack\`).
- Center: \`centerCaption\` / value / \`centerMetric\`.
- Plot uses arc aspect ratio (~0.54 × width); root \`min-width: 300px\`.

See [Kendo Vue ArcGauge](https://www.telerik.com/kendo-vue-ui/components/gauges/arcgauge).

\`\`\`vue
<ArcGauge
  :value="70"
  center-suffix="%"
  center-caption="All agreed"
  center-metric="Source: internal"
/>
\`\`\`
        `.trim(),
      },
    },
  },
  argTypes: {
    value: propDoc({
      description:
        "Current gauge value on the scale. Display and plot are clamped to `scale.min` / `scale.max`.",
      type: "number",
      required: true,
      control: "number",
    }),
    color: propDoc({
      description: "Pointer color when `colors` is not set.",
      type: "string",
      control: "color",
      defaultValue: "#6366F1",
    }),
    colors: propDoc({
      description:
        "Optional color ranges (`from`, `to`, `color`). Overrides `color` by value.",
      type: "ColorRange[]",
      control: "object",
      defaultValue: "undefined",
    }),
    opacity: propDoc({
      description: "Pointer opacity (0–1).",
      type: "number",
      control: "number",
      defaultValue: "undefined",
    }),
    scale: propDoc({
      description:
        "Scale options merged over DS defaults (min/max, rangeSize, angles, ticks…).",
      type: "ArcScale",
      control: "object",
      defaultValue: "undefined",
      detail:
        "DS merges onto { min: 0, max: 100, rangeSize: 16, rangePlaceholderColor: #EAECF0, rangeLineCap: round, ticks/labels hidden }",
    }),
    transitions: propDoc({
      description: "Play enter/update animations.",
      type: "boolean",
      defaultValue: "true",
    }),
    size: propDoc({
      description:
        "Gauge width in px (number) or CSS length. Height follows the arc aspect ratio.",
      type: "number | string",
      control: "number",
      defaultValue: "300",
    }),
    showCenterValue: propDoc({
      description:
        "Show built-in center block. Ignored when `#center` slot is used.",
      type: "boolean",
      defaultValue: "true",
    }),
    centerSuffix: propDoc({
      description: "Text after the center value (e.g. %).",
      type: "string",
      control: "text",
      defaultValue: "%",
    }),
    centerCaption: propDoc({
      description: "Small label above the center value.",
      type: "string",
      control: "text",
      defaultValue: "undefined",
    }),
    centerMetric: propDoc({
      description: "Secondary line under the center value.",
      type: "string | number",
      control: "text",
      defaultValue: "undefined",
    }),
    stripeOverlay: propDoc({
      description:
        "Diagonal stripe hatch on the filled value arc (same as horizontal bars).",
      type: "boolean",
      defaultValue: "true",
    }),
    dottedTrack: propDoc({
      description: "Concentric dotted track under the arc.",
      type: "boolean",
      defaultValue: "true",
    }),
  },
};

export default meta;

type Story = StoryObj<typeof ArcGauge>;

/** Default playground with every prop set to a realistic product sample. */
export const Default: Story = {
  args: { ...defaultArgs },
};

export const ColorRanges: Story = {
  name: "Color ranges",
  args: {
    ...defaultArgs,
    value: 48,
    color: "#22C55E",
    colors: trafficColors,
    centerCaption: "Health",
    centerMetric: "48",
  },
};

export const CustomCenter: Story = {
  name: "Custom center",
  args: {
    ...defaultArgs,
    value: 86,
    showCenterValue: false,
    centerCaption: "",
    centerMetric: "",
  },
  render: (args) => ({
    components: { ArcGauge },
    setup() {
      return { args };
    },
    template: `
      <ArcGauge v-bind="args">
        <template #center="{ value, color }">
          <div style="text-align: center; line-height: 1.2;">
            <div style="font-size: 0.75rem; font-weight: 500; color: var(--color-text-4);">Agreed</div>
            <div :style="{ color, fontSize: '48px', lineHeight: '60px', fontWeight: 700 }">{{ value }}%</div>
          </div>
        </template>
      </ArcGauge>
    `,
  }),
};

export const WithoutStripe: Story = {
  name: "Without stripe",
  args: {
    ...defaultArgs,
    stripeOverlay: false,
  },
};

export const WithoutDottedTrack: Story = {
  name: "Without dotted track",
  args: {
    ...defaultArgs,
    dottedTrack: false,
  },
};
