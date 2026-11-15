import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref, watch } from "vue";
import { propDoc } from "@ds-storybook/argTypes";
import RangeSlider from "./Index.vue";
import type { RangeSliderValue } from "./types";
import {
  RANGE_SLIDER_DEFAULT_STEP,
  RANGE_SLIDER_DEFAULT_TICK_COUNT,
} from "./types";

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;
const DEFAULT_START = 25;
const DEFAULT_END = 75;

const meta: Meta<typeof RangeSlider> = {
  title: "Primitives/Kendo Inputs/RangeSlider",
  component: RangeSlider,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template:
        '<div style="padding: 3rem 1.5rem 1.5rem; width: min(100%, 32rem);"><story /></div>',
    }),
  ],
  parameters: {
    controls: { sort: "requiredFirst" },
    docs: {
      description: {
        component: `
Thin wrapper around Kendo Vue \`RangeSlider\` ([docs](https://www.telerik.com/kendo-vue-ui/components/inputs/rangeslider)).

Drag either thumb or click the track. Values **snap to \`step\`** (including while dragging). Hover a thumb for a white tooltip with the current value.

\`\`\`vue
<RangeSlider
  v-model="range"
  :min="0"
  :max="100"
  :step="1"
  :tick-count="5"
/>
\`\`\`

Scale marks are evenly spaced. \`tickCount\` defaults to **5** (start + end included). Label text is rounded to an integer and does not follow \`step\`.

**Events**
- \`update:modelValue\` — for \`v-model\` (\`{ start, end }\`)
- \`change\` — same payload after a user change
        `.trim(),
      },
    },
  },
  argTypes: {
    min: propDoc({
      description: "Lower bound of the scale.",
      type: "number",
      required: true,
    }),
    max: propDoc({
      description: "Upper bound of the scale.",
      type: "number",
      required: true,
    }),
    step: propDoc({
      description:
        "Snap increment for drag, track click, and keyboard. Values are always multiples of `step` from `min`.",
      type: "number",
      defaultValue: String(RANGE_SLIDER_DEFAULT_STEP),
    }),
    modelValue: propDoc({
      description: "Selected range (`v-model`).",
      type: "RangeSliderValue",
      defaultValue: "undefined",
      detail: "{ start: number; end: number }",
      control: "object",
    }),
    tickCount: propDoc({
      description:
        "How many equally spaced scale marks to show, including min and max. Labels are rounded to integers (5 → 0, 25, 50, 75, 100; 6 → 0, 20, 40, 60, 80, 100). `0` hides labels. Ignored when `ticks` is set. Independent of `step`.",
      type: "number",
      defaultValue: String(RANGE_SLIDER_DEFAULT_TICK_COUNT),
    }),
    ticks: propDoc({
      description: "Explicit label positions. Overrides `tickCount`.",
      type: "number[]",
      defaultValue: "undefined",
      control: "object",
    }),
    disabled: propDoc({
      description: "Disabled state. Blocks drag/keyboard; cursor stays `not-allowed`.",
      type: "boolean",
      defaultValue: "false",
    }),
    vertical: propDoc({
      description: "Render vertically.",
      type: "boolean",
      defaultValue: "false",
    }),
    formatValue: propDoc({
      description:
        "Formats thumb tooltips and scale labels. Default is `String(value)`.",
      type: "(value: number) => string",
      defaultValue: "undefined",
      control: false,
    }),
    id: propDoc({
      description: "Native `id` on the slider root.",
      type: "string",
      defaultValue: "undefined",
    }),
  },
  args: {
    min: DEFAULT_MIN,
    max: DEFAULT_MAX,
    step: RANGE_SLIDER_DEFAULT_STEP,
    modelValue: { start: DEFAULT_START, end: DEFAULT_END },
    tickCount: RANGE_SLIDER_DEFAULT_TICK_COUNT,
    ticks: [],
    disabled: false,
    vertical: false,
    id: "",
  },
};

export default meta;
type Story = StoryObj<typeof RangeSlider>;

function bindRange(args: {
  modelValue?: RangeSliderValue;
  min?: number;
  max?: number;
}) {
  const range = ref<RangeSliderValue>({
    start: Number(args.modelValue?.start ?? args.min ?? DEFAULT_MIN),
    end: Number(args.modelValue?.end ?? args.max ?? DEFAULT_MAX),
  });

  watch(
    () => args.modelValue,
    (next) => {
      if (!next) {
        return;
      }
      if (next.start === range.value.start && next.end === range.value.end) {
        return;
      }
      range.value = { start: next.start, end: next.end };
    },
    { deep: true },
  );

  watch(
    range,
    (next) => {
      args.modelValue = { start: next.start, end: next.end };
    },
    { deep: true },
  );

  const sliderProps = computed(() => args);

  return { args, range, sliderProps };
}

export const Default: Story = {
  render: (args) => ({
    components: { RangeSlider },
    setup() {
      return bindRange(args);
    },
    template: `
      <div>
        <RangeSlider v-bind="sliderProps" v-model="range" />
        <p style="margin: 0.75rem 0 0; font-size: 0.75rem; color: var(--color-text-3);">
          start: {{ range.start }} · end: {{ range.end }}
        </p>
      </div>
    `,
  }),
};

export const Percent: Story = {
  name: "Percent",
  args: {
    modelValue: { start: 25, end: 50 },
    min: 0,
    max: 100,
    step: 1,
    tickCount: 5,
  },
  render: (args) => ({
    components: { RangeSlider },
    setup() {
      const bound = bindRange(args);
      const formatValue = (value: number) => `${value}%`;
      return { ...bound, formatValue };
    },
    template: `<RangeSlider v-bind="sliderProps" v-model="range" :format-value="formatValue" />`,
  }),
};

export const Step: Story = {
  name: "Step of 10",
  args: {
    modelValue: { start: 20, end: 70 },
    min: 0,
    max: 100,
    step: 10,
    tickCount: 6,
  },
  render: (args) => ({
    components: { RangeSlider },
    setup() {
      return bindRange(args);
    },
    template: `
      <div>
        <RangeSlider v-bind="sliderProps" v-model="range" />
        <p style="margin: 0.75rem 0 0; font-size: 0.75rem; color: var(--color-text-3);">
          step 10 · start: {{ range.start }} · end: {{ range.end }}
        </p>
      </div>
    `,
  }),
};

export const SixMarks: Story = {
  name: "Six marks",
  args: {
    modelValue: { start: 20, end: 80 },
    min: 0,
    max: 100,
    step: 1,
    tickCount: 6,
  },
  render: (args) => ({
    components: { RangeSlider },
    setup() {
      return bindRange(args);
    },
    template: `<RangeSlider v-bind="sliderProps" v-model="range" />`,
  }),
};

export const CustomTicks: Story = {
  name: "Custom ticks",
  args: {
    modelValue: { start: 20, end: 80 },
    min: 0,
    max: 100,
    step: 5,
    ticks: [0, 20, 50, 80, 100],
  },
  render: (args) => ({
    components: { RangeSlider },
    setup() {
      return bindRange(args);
    },
    template: `<RangeSlider v-bind="sliderProps" v-model="range" />`,
  }),
};

export const NoLabels: Story = {
  name: "No labels",
  args: {
    modelValue: { start: 25, end: 75 },
    min: 0,
    max: 100,
    tickCount: 0,
  },
  render: (args) => ({
    components: { RangeSlider },
    setup() {
      return bindRange(args);
    },
    template: `<RangeSlider v-bind="sliderProps" v-model="range" />`,
  }),
};

export const Disabled: Story = {
  args: {
    modelValue: { start: 30, end: 70 },
    min: 0,
    max: 100,
    disabled: true,
  },
  render: (args) => ({
    components: { RangeSlider },
    setup() {
      return bindRange(args);
    },
    template: `<RangeSlider v-bind="sliderProps" v-model="range" />`,
  }),
};

export const Vertical: Story = {
  args: {
    modelValue: { start: 25, end: 75 },
    min: 0,
    max: 100,
    step: 1,
    vertical: true,
    tickCount: 5,
  },
  decorators: [
    () => ({
      template:
        '<div style="padding: 3rem 4rem 1.5rem; min-height: 22rem;"><story /></div>',
    }),
  ],
  render: (args) => ({
    components: { RangeSlider },
    setup() {
      return bindRange(args);
    },
    template: `<RangeSlider v-bind="sliderProps" v-model="range" />`,
  }),
};
