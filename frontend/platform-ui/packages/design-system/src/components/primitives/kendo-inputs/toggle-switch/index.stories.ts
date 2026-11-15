import type { Meta, StoryObj } from "@storybook/vue3";
import { ref, watch } from "vue";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import ToggleSwitch from "./Index.vue";
import { TOGGLE_SWITCH_ROUNDEDS, TOGGLE_SWITCH_SIZES } from "./types";

const meta: Meta<typeof ToggleSwitch> = {
  title: "Primitives/Kendo Inputs/ToggleSwitch",
  component: ToggleSwitch,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div style="padding: 1rem;"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Thin wrapper around Kendo Vue `Switch`. Bootstrap theme hides labels by default — this wrapper shows them when `labelOn` / `labelOff` are non-empty. Prop names avoid Vue’s `on*` event-listener collision.",
      },
    },
  },
  argTypes: {
    modelValue: propDoc({
      description: "On/off (`v-model`).",
      type: "boolean",
      defaultValue: "false",
    }),
    disabled: propDoc({
      description: "Disabled state.",
      type: "boolean",
      defaultValue: "false",
    }),
    size: propDoc({
      description: "Kendo size.",
      type: formatUnionType(TOGGLE_SWITCH_SIZES),
      control: "select",
      options: [...TOGGLE_SWITCH_SIZES],
      defaultValue: "small",
    }),
    rounded: propDoc({
      description: "Corner radius for track and thumb.",
      type: formatUnionType(TOGGLE_SWITCH_ROUNDEDS),
      control: "select",
      options: [...TOGGLE_SWITCH_ROUNDEDS],
      defaultValue: "full",
    }),
    labelOn: propDoc({
      description: "Label shown when on (Kendo `onLabel`). Empty by default.",
      type: "string",
      defaultValue: '""',
    }),
    labelOff: propDoc({
      description: "Label shown when off (Kendo `offLabel`). Empty by default.",
      type: "string",
      defaultValue: '""',
    }),
  },
  args: {
    modelValue: false,
    disabled: false,
    size: "small",
    rounded: "full",
    labelOn: "",
    labelOff: "",
  },
};

export default meta;
type Story = StoryObj<typeof ToggleSwitch>;

export const Default: Story = {
  render: (args) => ({
    components: { ToggleSwitch },
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
    template: `<ToggleSwitch v-bind="args" v-model="value" />`,
  }),
};

export const Disabled: Story = {
  args: {
    modelValue: true,
    disabled: true,
  },
};
