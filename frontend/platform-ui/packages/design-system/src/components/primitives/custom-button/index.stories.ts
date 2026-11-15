import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import CustomButton from "./Index.vue";
import {
  CUSTOM_BUTTON_DEFAULT_ICON,
  CUSTOM_BUTTON_ICON_POSITIONS,
  CUSTOM_BUTTON_SIZES,
  CUSTOM_BUTTON_VARIANTS,
} from "./types";

const meta: Meta<typeof CustomButton> = {
  title: "Primitives/CustomButton",
  component: CustomButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
Button always renders something visible.

**Rules**
- \`text\` is always required (visible label, or a11y when label is hidden).
- Icon is shown only when \`icon\` resolves to a real asset.
- \`showLabel\` controls the text label (\`true\` by default).
- If \`showLabel\` is \`false\` and \`icon\` is missing/invalid, fallback icon \`${CUSTOM_BUTTON_DEFAULT_ICON}\` is used.
- \`size\` defaults to \`xs\` (padding / gap / icon scale). Icon-only uses square padding per size.

| \`showLabel\` | \`icon\` | Result |
| --- | --- | --- |
| \`true\` | valid | icon + label |
| \`true\` | missing / invalid | label only |
| \`false\` | valid | icon only (\`text\` → title / aria-label) |
| \`false\` | missing / invalid | \`${CUSTOM_BUTTON_DEFAULT_ICON}\` icon only |
        `.trim(),
      },
    },
  },
  argTypes: {
    text: propDoc({
      description:
        "Always required. Visible label when `showLabel` is true; otherwise used as `title` and `aria-label`.",
      type: "string",
      required: true,
      defaultValue: "Text",
    }),
    variant: propDoc({
      description: "Visual style of the button.",
      type: formatUnionType(CUSTOM_BUTTON_VARIANTS),
      options: CUSTOM_BUTTON_VARIANTS,
      defaultValue: "default",
    }),
    icon: propDoc({
      description: `Asset name from design-system icons, e.g. \`edit\`. Optional. When unresolved and \`showLabel\` is false, falls back to \`${CUSTOM_BUTTON_DEFAULT_ICON}\`.`,
      type: "string",
    }),
    iconPosition: propDoc({
      description:
        "Visual icon placement. DOM order stays icon-then-label; `end` uses row-reverse.",
      type: formatUnionType(CUSTOM_BUTTON_ICON_POSITIONS),
      options: CUSTOM_BUTTON_ICON_POSITIONS,
      defaultValue: "start",
    }),
    showLabel: propDoc({
      description:
        "Show the text label. When false, only the icon is shown (with settings fallback if needed).",
      type: "boolean",
      defaultValue: "true",
    }),
    size: propDoc({
      description:
        "Padding, gap, and icon scale. Icon-only buttons use uniform padding on all sides.",
      type: formatUnionType(CUSTOM_BUTTON_SIZES),
      options: CUSTOM_BUTTON_SIZES,
      defaultValue: "xs",
    }),
    disabled: propDoc({
      description: "Disables interaction and applies reduced opacity.",
      type: "boolean",
      defaultValue: "false",
    }),
    type: propDoc({
      description: "Native button `type` attribute.",
      type: "'button' | 'submit' | 'reset'",
      options: ["button", "submit", "reset"],
      defaultValue: "button",
    }),
  },
  args: {
    text: "Edit Peers",
    variant: "default",
    icon: "",
    iconPosition: "start",
    showLabel: true,
    size: "xs",
    disabled: false,
    type: "button",
  },
};

export default meta;
type Story = StoryObj<typeof CustomButton>;

export const IconWithLabel: Story = {
  name: "Icon + label",
  args: {
    text: "Edit Peers",
    variant: "default",
    icon: "edit",
    showLabel: true,
  },
};

export const TrailingIcon: Story = {
  name: "Trailing icon (Read More)",
  args: {
    text: "Read More",
    variant: "default",
    icon: "chevron-right",
    iconPosition: "end",
    showLabel: true,
  },
};

export const LabelOnly: Story = {
  name: "Label only (no icon)",
  args: {
    text: "Edit Peers",
    variant: "default",
    showLabel: true,
  },
};

export const LabelOnlyInvalidIcon: Story = {
  name: "Label only (invalid icon ignored)",
  args: {
    text: "Edit Peers",
    variant: "default",
    icon: "does-not-exist",
    showLabel: true,
  },
};

export const IconOnly: Story = {
  name: "Icon only",
  render: () => ({
    components: { CustomButton },
    template: `
    <div style="display: flex; gap: 0.5rem; align-items: center;">
      <CustomButton text="Filters" variant="default" icon="filters" :show-label="false" />
      <CustomButton text="More options" variant="default" icon="vertical-ellipsis" :show-label="false" />
    </div>
  `,
  }),
};

export const IconOnlyFallbackSettings: Story = {
  name: "Icon only (fallback to settings)",
  args: {
    text: "Settings",
    variant: "default",
    showLabel: false,
  },
};

export const IconOnlyInvalidFallsBackToSettings: Story = {
  name: "Icon only (invalid icon → settings)",
  args: {
    text: "Settings",
    variant: "default",
    icon: "does-not-exist",
    showLabel: false,
  },
};

export const PlainWithIcon: Story = {
  name: "Plain with icon",
  args: {
    text: "Show Details",
    variant: "plain",
    icon: "question-tooltip",
    showLabel: true,
  },
};

export const AccentWithIcon: Story = {
  name: "Accent with icon",
  args: {
    text: "Calculate",
    variant: "accent",
    icon: "calculate",
    showLabel: true,
  },
};

export const Sizes: Story = {
  name: "Sizes",
  render: () => ({
    components: { CustomButton },
    setup() {
      return { sizes: CUSTOM_BUTTON_SIZES };
    },
    template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <CustomButton
          v-for="size in sizes"
          :key="'label-' + size"
          :text="size"
          variant="default"
          icon="edit"
          :size="size"
          :show-label="true"
        />
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <CustomButton
          v-for="size in sizes"
          :key="'icon-' + size"
          :text="size"
          variant="default"
          icon="filters"
          :size="size"
          :show-label="false"
        />
      </div>
    </div>
  `,
  }),
};

export const AllVariants: Story = {
  name: "All variants",
  render: () => ({
    components: { CustomButton },
    template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
        <CustomButton text="Edit Peers" variant="default" icon="edit" :show-label="true" />
        <CustomButton text="Edit Peers" variant="default" :show-label="true" />
        <CustomButton text="Filters" variant="default" icon="filters" :show-label="false" />
        <CustomButton text="Settings" variant="default" :show-label="false" />
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
        <CustomButton text="Show Details" variant="plain" icon="question-tooltip" :show-label="true" />
        <CustomButton text="Undo" variant="plain" icon="edit" :show-label="true" />
        <CustomButton text="Calculate" variant="accent" icon="calculate" :show-label="true" />
        <CustomButton text="More options" variant="default" icon="vertical-ellipsis" :show-label="false" />
      </div>
    </div>
  `,
  }),
};
