import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import informationUrl from "@ada/design-system/assets/icons/information.svg?url";
import LevelBar from "./Index.vue";
import LevelBarGroup from "../level-bar-group/Index.vue";
import {
  LEVEL_BAR_LEVELS,
  LEVEL_BAR_SEGMENT_COUNT,
  type LevelBarLevel,
} from "./types";

const meta: Meta<typeof LevelBar> = {
  title: "Primitives/LevelBar",
  component: LevelBar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Segmented level indicator. `segments` sets total cells (default 3). `level` sets fill color and how many leading cells are filled (low ≈ 1/3, medium ≈ 2/3, high = all). Prop `label` is a text string only (rendered with BodyText sm/bold). Named slot `#label` replaces that text and may contain any content (block, image, or other text). When neither slot nor non-empty `label` is set, only the bar is shown. Equal bar widths across rows come from wrapping them in `LevelBarGroup` (shared label column).",
      },
    },
  },
  argTypes: {
    level: propDoc({
      description:
        "Sets fill color and fill ratio: `low` (≈1/3 / red), `medium` (≈2/3 / yellow), `high` (all / green).",
      type: formatUnionType(LEVEL_BAR_LEVELS),
      options: LEVEL_BAR_LEVELS,
      defaultValue: "medium",
    }),
    segments: propDoc({
      description:
        "Total horizontal bar cells. Non-finite or &lt; 1 values clamp to 1; fractional values are rounded.",
      type: "number",
      defaultValue: String(LEVEL_BAR_SEGMENT_COUNT),
    }),
    label: propDoc({
      description:
        "Text string only. Ignored when slot `#label` is provided — use that slot for any element (block, image, or other text).",
      type: "string",
      defaultValue: "",
    }),
  },
  args: {
    level: "medium",
    segments: LEVEL_BAR_SEGMENT_COUNT,
    label: "Medium",
  },
};

export default meta;
type Story = StoryObj<typeof LevelBar>;

/** Label + medium level — primary Controls / Autodocs story. */
export const Default: Story = {};

const LEVEL_SAMPLES: { label: string; level: LevelBarLevel }[] = [
  { label: "Low", level: "low" },
  { label: "Medium", level: "medium" },
  { label: "High", level: "high" },
];

/** All three levels as stacked rows with equal bar widths via LevelBarGroup. */
export const AllLevels: Story = {
  name: "All levels",
  args: {
    level: "medium",
    segments: LEVEL_BAR_SEGMENT_COUNT,
    label: "Medium",
  },
  render: (args) => ({
    components: { LevelBar, LevelBarGroup },
    setup() {
      return { items: LEVEL_SAMPLES, segments: args.segments };
    },
    template: `
      <div style="width: 100%; max-width: 28rem;">
        <LevelBarGroup>
          <LevelBar
            v-for="item in items"
            :key="item.level"
            :level="item.level"
            :segments="segments"
            :label="item.label"
          />
        </LevelBarGroup>
      </div>
    `,
  }),
};

/** Same three levels with more than three cells so variable segment count is visible. */
export const FiveSegments: Story = {
  name: "Five segments",
  args: {
    level: "medium",
    segments: 5,
    label: "Medium",
  },
  render: (args) => ({
    components: { LevelBar, LevelBarGroup },
    setup() {
      return { items: LEVEL_SAMPLES, segments: args.segments };
    },
    template: `
      <div style="width: 100%; max-width: 28rem;">
        <LevelBarGroup>
          <LevelBar
            v-for="item in items"
            :key="item.level"
            :level="item.level"
            :segments="segments"
            :label="item.label"
          />
        </LevelBarGroup>
      </div>
    `,
  }),
};

/** Custom `#label` slot (block + image) — not the string `label` prop. */
export const SlotLabel: Story = {
  name: "Slot label",
  args: {
    level: "high",
    segments: LEVEL_BAR_SEGMENT_COUNT,
    label: "",
  },
  render: (args) => ({
    components: { LevelBar },
    setup() {
      return { args, informationUrl };
    },
    template: `
      <div style="width: 100%; max-width: 28rem;">
        <LevelBar v-bind="args">
          <template #label>
            <div style="display: flex; align-items: center; gap: 0.375rem;">
              <img
                :src="informationUrl"
                alt=""
                width="16"
                height="16"
              />
              <span>Risk score</span>
            </div>
          </template>
        </LevelBar>
      </div>
    `,
  }),
};

/** Segments only — no label prop and no label slot. */
export const BarsOnly: Story = {
  name: "Bars only",
  args: {
    level: "medium",
    segments: LEVEL_BAR_SEGMENT_COUNT,
    label: "",
  },
  render: (args) => ({
    components: { LevelBar },
    setup() {
      return { args };
    },
    template: `
      <div style="width: 100%; max-width: 28rem;">
        <LevelBar v-bind="args" />
      </div>
    `,
  }),
};
