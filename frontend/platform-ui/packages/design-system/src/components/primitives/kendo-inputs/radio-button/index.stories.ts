import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import RadioButton from "./Index.vue";
import { RADIO_BUTTON_SIZES } from "./types";

const meta: Meta<typeof RadioButton> = {
  title: "Primitives/Kendo Inputs/RadioButton",
  component: RadioButton,
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
          "Thin wrapper around Kendo Vue `RadioButton` with group `v-model` (`modelValue === value`).",
      },
    },
  },
  argTypes: {
    modelValue: propDoc({
      description: "Selected value of the radio group (`v-model`).",
      type: "string | number | null",
      defaultValue: "null",
    }),
    value: propDoc({
      description: "Value emitted when this option is selected.",
      type: "string | number",
      required: true,
    }),
    name: propDoc({
      description: "Radio group `name`.",
      type: "string",
      defaultValue: "undefined",
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
      type: formatUnionType(RADIO_BUTTON_SIZES),
      control: "select",
      options: [...RADIO_BUTTON_SIZES],
      defaultValue: "medium",
    }),
  },
  args: {
    modelValue: "a",
    value: "a",
    name: "demo",
    label: "Option A",
    ariaLabel: "",
    disabled: false,
    size: "medium",
  },
};

export default meta;
type Story = StoryObj<typeof RadioButton>;

export const Group: Story = {
  name: "Group",
  render: () => ({
    components: { RadioButton },
    setup() {
      const selected = ref<string>("a");
      return { selected };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <RadioButton v-model="selected" value="a" name="demo" label="Option A" />
        <RadioButton v-model="selected" value="b" name="demo" label="Option B" />
        <RadioButton v-model="selected" value="c" name="demo" label="Option C" />
        <p style="margin: 0; font-size: 12px; color: var(--color-text-3);">Selected: {{ selected }}</p>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { RadioButton },
    template: `
      <RadioButton model-value="a" value="a" name="dis" label="Disabled" disabled />
    `,
  }),
};
