import type { Meta, StoryObj } from "@storybook/vue3";
import { ref, watch } from "vue";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import CheckBox from "./Index.vue";
import { CHECK_BOX_ROUNDEDS, CHECK_BOX_SIZES } from "./types";

const meta: Meta<typeof CheckBox> = {
  title: "Primitives/Kendo Inputs/CheckBox",
  component: CheckBox,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div style="padding: 1rem;"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: "Thin wrapper around Kendo Vue `Checkbox`.",
      },
    },
  },
  argTypes: {
    modelValue: propDoc({
      description: "Checked (`v-model`).",
      type: "boolean",
      defaultValue: "false",
    }),
    label: propDoc({
      description: "Optional label text.",
      type: "string",
      defaultValue: "undefined",
    }),
    ariaLabel: propDoc({
      description: "Accessible name when used without a visible label.",
      type: "string",
      defaultValue: "undefined",
    }),
    disabled: propDoc({
      description: "Disabled state.",
      type: "boolean",
      defaultValue: "false",
    }),
    size: propDoc({
      description: "Kendo size.",
      type: formatUnionType(CHECK_BOX_SIZES),
      control: "select",
      options: [...CHECK_BOX_SIZES],
      defaultValue: "medium",
    }),
    rounded: propDoc({
      description: "Corner radius.",
      type: formatUnionType(CHECK_BOX_ROUNDEDS),
      control: "select",
      options: [...CHECK_BOX_ROUNDEDS],
      defaultValue: "medium",
    }),
    indeterminate: propDoc({
      description: "Indeterminate visual state.",
      type: "boolean",
      defaultValue: "false",
    }),
  },
  args: {
    modelValue: false,
    label: "Accept terms",
    ariaLabel: "",
    disabled: false,
    size: "medium",
    rounded: "medium",
    indeterminate: false,
  },
};

export default meta;
type Story = StoryObj<typeof CheckBox>;

export const Default: Story = {
  render: (args) => ({
    components: { CheckBox },
    setup() {
      const value = ref(Boolean(args.modelValue));
      watch(
        () => args.modelValue,
        (next) => {
          value.value = Boolean(next);
        },
      );
      return { args, value };
    },
    template: `<CheckBox v-bind="args" v-model="value" />`,
  }),
};

export const Disabled: Story = {
  args: {
    modelValue: true,
    disabled: true,
  },
};
