import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import { ref, watch } from "vue";
import CustomTabs from "./Index.vue";
import type { TabItem } from "./types";
import { TABS_APPEARANCES } from "./types";

const textItems: TabItem[] = [
  { id: "home", label: "Home" },
  { id: "opportunity", label: "Opportunity" },
  { id: "analyze", label: "Analyze" },
  { id: "plan", label: "Plan", disabled: true },
];

const iconItems: TabItem[] = [
  { id: "home", label: "Home", icon: "sidebar-home" },
  { id: "opportunity", label: "Opportunity", icon: "sidebar-opportunity" },
  { id: "analyze", label: "Analyze", icon: "sidebar-analyze" },
  { id: "plan", label: "Plan", icon: "sidebar-plan", disabled: true },
];

const meta: Meta<typeof CustomTabs> = {
  title: "Components/CustomTabs",
  component: CustomTabs,
  tags: ["autodocs"],
  argTypes: {
    items: propDoc({
      description:
        "Tab definitions with `id`, `label`, and optional `icon` and `disabled`.",
      type: "TabItem[]",
      required: true,
      control: "object",
      detail: "{ id: string; label: string; icon?: string; disabled?: boolean }[]",
    }),
    modelValue: propDoc({
      description: "Active tab id (v-model).",
      type: "string",
      required: true,
    }),
    appearance: propDoc({
      description:
        "Visual style: `segmented` for button-like tabs, `underline` for a sliding active indicator.",
      type: formatUnionType(TABS_APPEARANCES),
      options: TABS_APPEARANCES,
      defaultValue: "segmented",
    }),
    contained: propDoc({
      description:
        "Outer tray around the tab group. Defaults to `true` when appearance is `segmented`.",
      type: "boolean",
      defaultValue: "auto (true when appearance is segmented)",
    }),
  },
  args: {
    appearance: "segmented",
    contained: true,
    modelValue: "home",
    items: iconItems,
  },
};

export default meta;
type Story = StoryObj<typeof CustomTabs>;

/**
 * Default uses local v-model so clicking tabs updates active state.
 * Controls still work via `args` for appearance / contained / items.
 */
export const Default: Story = {
  render: (args) => ({
    components: { CustomTabs },
    setup() {
      const active = ref(args.modelValue);
      watch(
        () => args.modelValue,
        (value) => {
          active.value = value;
        },
      );
      return { args, active };
    },
    template: `
      <CustomTabs
        v-model="active"
        :appearance="args.appearance"
        :contained="args.contained"
        :items="args.items"
      />
    `,
  }),
};

export const ContainedWithIcons: Story = {
  name: "Contained / with icons",
  render: () => ({
    components: { CustomTabs },
    setup() {
      const active = ref("home");
      return { active, iconItems };
    },
    template: `
      <CustomTabs
        v-model="active"
        appearance="segmented"
        :contained="true"
        :items="iconItems"
      />
    `,
  }),
};

export const ContainedWithoutIcons: Story = {
  name: "Contained / without icons",
  render: () => ({
    components: { CustomTabs },
    setup() {
      const active = ref("home");
      return { active, textItems };
    },
    template: `
      <CustomTabs
        v-model="active"
        appearance="segmented"
        :contained="true"
        :items="textItems"
      />
    `,
  }),
};

export const UnderlineWithIcons: Story = {
  name: "Underline / with icons",
  render: () => ({
    components: { CustomTabs },
    setup() {
      const active = ref("home");
      return { active, iconItems };
    },
    template: `
      <CustomTabs
        v-model="active"
        appearance="underline"
        :contained="false"
        :items="iconItems"
      />
    `,
  }),
};

export const UnderlineWithoutIcons: Story = {
  name: "Underline / without icons",
  render: () => ({
    components: { CustomTabs },
    setup() {
      const active = ref("home");
      return { active, textItems };
    },
    template: `
      <CustomTabs
        v-model="active"
        appearance="underline"
        :contained="false"
        :items="textItems"
      />
    `,
  }),
};

export const SegmentedWithIcons: Story = {
  name: "Segmented / with icons",
  render: () => ({
    components: { CustomTabs },
    setup() {
      const active = ref("home");
      return { active, iconItems };
    },
    template: `
      <CustomTabs
        v-model="active"
        appearance="segmented"
        :contained="false"
        :items="iconItems"
      />
    `,
  }),
};

export const SegmentedWithoutIcons: Story = {
  name: "Segmented / without icons",
  render: () => ({
    components: { CustomTabs },
    setup() {
      const active = ref("home");
      return { active, textItems };
    },
    template: `
      <CustomTabs
        v-model="active"
        appearance="segmented"
        :contained="false"
        :items="textItems"
      />
    `,
  }),
};

export const AllVariants: Story = {
  name: "All variants",
  render: () => ({
    components: { CustomTabs },
    setup() {
      const containedIcons = ref("home");
      const containedText = ref("home");
      const underlineIcons = ref("home");
      const underlineText = ref("home");
      const segmentedIcons = ref("home");
      const segmentedText = ref("home");
      return {
        containedIcons,
        containedText,
        underlineIcons,
        underlineText,
        segmentedIcons,
        segmentedText,
        textItems,
        iconItems,
      };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem;">
        <div>
          <p style="margin: 0 0 0.5rem; font-size: 12px; color: var(--color-text-3);">Contained / with icons</p>
          <CustomTabs v-model="containedIcons" appearance="segmented" :contained="true" :items="iconItems" />
        </div>
        <div>
          <p style="margin: 0 0 0.5rem; font-size: 12px; color: var(--color-text-3);">Contained / without icons</p>
          <CustomTabs v-model="containedText" appearance="segmented" :contained="true" :items="textItems" />
        </div>
        <div>
          <p style="margin: 0 0 0.5rem; font-size: 12px; color: var(--color-text-3);">Underline / with icons</p>
          <CustomTabs v-model="underlineIcons" appearance="underline" :contained="false" :items="iconItems" />
        </div>
        <div>
          <p style="margin: 0 0 0.5rem; font-size: 12px; color: var(--color-text-3);">Underline / without icons</p>
          <CustomTabs v-model="underlineText" appearance="underline" :contained="false" :items="textItems" />
        </div>
        <div>
          <p style="margin: 0 0 0.5rem; font-size: 12px; color: var(--color-text-3);">Segmented / with icons</p>
          <CustomTabs v-model="segmentedIcons" appearance="segmented" :contained="false" :items="iconItems" />
        </div>
        <div>
          <p style="margin: 0 0 0.5rem; font-size: 12px; color: var(--color-text-3);">Segmented / without icons</p>
          <CustomTabs v-model="segmentedText" appearance="segmented" :contained="false" :items="textItems" />
        </div>
      </div>
    `,
  }),
};
