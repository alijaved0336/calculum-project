import type { Meta, StoryObj } from "@storybook/vue3";
import { ref, watch } from "vue";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import TextArea from "./Index.vue";
import {
  TEXT_AREA_FILL_MODES,
  TEXT_AREA_ROUNDEDS,
  TEXT_AREA_SIZES,
} from "./types";

const meta: Meta<typeof TextArea> = {
  title: "Primitives/Kendo Inputs/TextArea",
  component: TextArea,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template:
        '<div style="padding: 1rem; width: min(100%, 24rem);"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Thin wrapper around Kendo Vue `TextArea`. Theme from `kendo-theme.css`.",
      },
    },
  },
  argTypes: {
    modelValue: propDoc({
      description: "Value (`v-model`).",
      type: "string",
      control: "textarea",
      defaultValue: '""',
    }),
    placeholder: propDoc({
      description: "Placeholder text.",
      type: "string",
      defaultValue: "undefined",
    }),
    rows: propDoc({
      description: "Visible rows.",
      type: "number",
      defaultValue: "3",
    }),
    disabled: propDoc({
      description: "Disabled state.",
      type: "boolean",
      defaultValue: "false",
    }),
    size: propDoc({
      description: "Kendo size.",
      type: formatUnionType(TEXT_AREA_SIZES),
      control: "select",
      options: [...TEXT_AREA_SIZES],
      defaultValue: "medium",
    }),
    fillMode: propDoc({
      description: "Kendo fill mode.",
      type: formatUnionType(TEXT_AREA_FILL_MODES),
      control: "select",
      options: [...TEXT_AREA_FILL_MODES],
      defaultValue: "outline",
    }),
    rounded: propDoc({
      description: "Kendo rounded.",
      type: formatUnionType(TEXT_AREA_ROUNDEDS),
      control: "select",
      options: [...TEXT_AREA_ROUNDEDS],
      defaultValue: "medium",
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
    placeholder: "Enter notes…",
    rows: 3,
    disabled: false,
    size: "medium",
    fillMode: "outline",
    rounded: "medium",
    name: "",
    id: "",
  },
};

export default meta;
type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
  render: (args) => ({
    components: { TextArea },
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
    template: `<TextArea v-bind="args" v-model="value" />`,
  }),
};

export const Disabled: Story = {
  args: {
    modelValue: "Cannot edit",
    disabled: true,
  },
};
