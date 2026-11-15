import type { Meta, StoryObj } from "@storybook/vue3";
import { ref, watch } from "vue";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import TextInput from "./Index.vue";
import {
  TEXT_INPUT_FILL_MODES,
  TEXT_INPUT_ROUNDEDS,
  TEXT_INPUT_SIZES,
} from "./types";

const meta: Meta<typeof TextInput> = {
  title: "Primitives/Kendo Inputs/TextInput",
  component: TextInput,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template:
        '<div style="padding: 1rem; width: min(100%, 20rem);"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Thin wrapper around Kendo Vue `Input` (`@progress/kendo-vue-inputs`). Theme from `kendo-theme.css`.",
      },
    },
  },
  argTypes: {
    modelValue: propDoc({
      description: "Value (`v-model`).",
      type: "string",
      defaultValue: '""',
    }),
    placeholder: propDoc({
      description: "Placeholder text.",
      type: "string",
      defaultValue: "undefined",
    }),
    label: propDoc({
      description: "Optional floating/field label.",
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
      type: formatUnionType(TEXT_INPUT_SIZES),
      control: "select",
      options: [...TEXT_INPUT_SIZES],
      defaultValue: "medium",
    }),
    fillMode: propDoc({
      description: "Kendo fill mode.",
      type: formatUnionType(TEXT_INPUT_FILL_MODES),
      control: "select",
      options: [...TEXT_INPUT_FILL_MODES],
      defaultValue: "outline",
    }),
    rounded: propDoc({
      description: "Kendo rounded.",
      type: formatUnionType(TEXT_INPUT_ROUNDEDS),
      control: "select",
      options: [...TEXT_INPUT_ROUNDEDS],
      defaultValue: "medium",
    }),
    type: propDoc({
      description: "Native input `type`.",
      type: "string",
      defaultValue: "text",
    }),
    name: propDoc({
      description: "Native `name` attribute.",
      type: "string",
      defaultValue: "undefined",
    }),
    id: propDoc({
      description: "Native `id` attribute.",
      type: "string",
      defaultValue: "undefined",
    }),
  },
  args: {
    modelValue: "",
    placeholder: "Type here…",
    label: "Label",
    disabled: false,
    size: "medium",
    fillMode: "outline",
    rounded: "medium",
    type: "text",
    name: "",
    id: "",
  },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
  render: (args) => ({
    components: { TextInput },
    setup() {
      const value = ref(String(args.modelValue ?? ""));
      watch(
        () => args.modelValue,
        (next) => {
          value.value = String(next ?? "");
        },
      );
      return { args, value };
    },
    template: `<TextInput v-bind="args" v-model="value" />`,
  }),
};

export const Disabled: Story = {
  args: {
    modelValue: "Read only value",
    disabled: true,
  },
};
