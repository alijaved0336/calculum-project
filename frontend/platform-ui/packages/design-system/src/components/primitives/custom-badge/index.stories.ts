import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import CustomBadge from "./Index.vue";
import {
  CUSTOM_BADGE_VARIANTS,
  type CustomBadgeOutlineVariant,
  type CustomBadgeSoftVariant,
} from "./types";

const meta: Meta<typeof CustomBadge> = {
  title: "Primitives/CustomBadge",
  component: CustomBadge,
  tags: ["autodocs"],
  argTypes: {
    text: propDoc({
      description: "Badge label text.",
      type: "string",
      required: true,
    }),
    variant: propDoc({
      description:
        "Visual style. Soft filled: `success` / `warning` / `danger` / `veryLow` / `veryHigh` / `red` / `orange` / `yellow` / `blue` / `info` / `sme` / `potential` / `parent` / `muted`. Outlined status: `agreed` / `contacted` / `analyzed` / `planned` / `missed` / `onHold`.",
      type: formatUnionType(CUSTOM_BADGE_VARIANTS),
      options: CUSTOM_BADGE_VARIANTS,
      defaultValue: "info",
    }),
    dot: propDoc({
      description:
        "Show a 6×6 status circle before the label. Ignored when `icon` resolves to a DS asset.",
      type: "boolean",
      defaultValue: "true",
    }),
    icon: propDoc({
      description:
        "Asset name from design-system icons, e.g. `calendar`. Optional. When resolved, replaces the status dot.",
      type: "string",
      defaultValue: "undefined",
    }),
  },
  args: {
    text: "Agreed",
    variant: "agreed",
    dot: true,
    icon: "",
  },
};

export default meta;
type Story = StoryObj<typeof CustomBadge>;

/** Full prop set for Controls / Autodocs. */
export const Default: Story = {};

const SOFT_SAMPLES: { text: string; variant: CustomBadgeSoftVariant }[] = [
  { text: "Very High", variant: "veryHigh" },
  { text: "High", variant: "success" },
  { text: "Medium", variant: "warning" },
  { text: "Low", variant: "danger" },
  { text: "Very Low", variant: "veryLow" },
  { text: "Red", variant: "red" },
  { text: "Orange", variant: "orange" },
  { text: "Yellow", variant: "yellow" },
  { text: "Blue", variant: "blue" },
  { text: "F1, Base + 1.20%", variant: "info" },
  { text: "SME", variant: "sme" },
  { text: "POTENTIAL", variant: "potential" },
  { text: "PARENT", variant: "parent" },
];

export const SoftVariants: Story = {
  name: "Soft variants",
  render: () => ({
    components: { CustomBadge },
    setup() {
      return { items: SOFT_SAMPLES };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
        <CustomBadge
          v-for="item in items"
          :key="item.variant"
          :text="item.text"
          :variant="item.variant"
          :dot="false"
        />
      </div>
    `,
  }),
};

const OUTLINE_SAMPLES: { text: string; variant: CustomBadgeOutlineVariant }[] =
  [
    { text: "Agreed", variant: "agreed" },
    { text: "Contacted", variant: "contacted" },
    { text: "Analyzed", variant: "analyzed" },
    { text: "Planned", variant: "planned" },
    { text: "Missed", variant: "missed" },
    { text: "On hold", variant: "onHold" },
  ];

export const OutlineWithDot: Story = {
  name: "Outline with dot",
  render: () => ({
    components: { CustomBadge },
    setup() {
      return { items: OUTLINE_SAMPLES };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;">
        <CustomBadge
          v-for="item in items"
          :key="item.variant"
          :text="item.text"
          :variant="item.variant"
        />
      </div>
    `,
  }),
};

export const OutlineWithoutDot: Story = {
  name: "Outline without dot",
  render: () => ({
    components: { CustomBadge },
    setup() {
      return { items: OUTLINE_SAMPLES };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;">
        <CustomBadge
          v-for="item in items"
          :key="item.variant"
          :text="item.text"
          :variant="item.variant"
          :dot="false"
        />
      </div>
    `,
  }),
};

const ICON_SAMPLES: { text: string; icon: string }[] = [
  { text: "Plan name", icon: "calendar" },
  { text: "8", icon: "comment" },
];

export const WithIcon: Story = {
  name: "With icon",
  render: () => ({
    components: { CustomBadge },
    setup() {
      return { items: ICON_SAMPLES };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
        <CustomBadge
          v-for="item in items"
          :key="item.icon"
          :text="item.text"
          variant="muted"
          :icon="item.icon"
        />
      </div>
    `,
  }),
};
