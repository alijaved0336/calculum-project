import type { Meta, StoryObj } from "@storybook/vue3";
import { reactive, ref, watch } from "vue";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import StatusCard from "./Index.vue";
import {
  STATUS_CARD_VARIANTS,
  type StatusCardItem,
  type StatusCardVariant,
} from "./types";

const sampleItems: StatusCardItem[] = [
  { label: "Spend Line:", value: "Spend 1" },
  { label: "Payment Terms (days):", value: "30 → 60" },
  { label: "Cash Flow Target:", value: "2.4m" },
];

const meta: Meta<typeof StatusCard> = {
  title: "Components/StatusCard",
  component: StatusCard,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div style="max-width: 16rem;"><story /></div>',
    }),
  ],
  argTypes: {
    index: propDoc({
      description: "Large index in the top-left badge.",
      type: "string | number",
      required: true,
    }),
    variant: propDoc({
      description: "Color theme for accent / selected surface.",
      type: formatUnionType(STATUS_CARD_VARIANTS),
      defaultValue: "success",
      control: "select",
      options: [...STATUS_CARD_VARIANTS],
    }),
    modelValue: propDoc({
      description: "Selection state (`v-model`).",
      type: "boolean",
      defaultValue: "false",
    }),
    items: propDoc({
      description: "Label / value rows in the card body.",
      type: "StatusCardItem[]",
      control: "object",
      detail: "{ label: string; value: string }[]",
    }),
    disabled: propDoc({
      description: "Disables selection.",
      type: "boolean",
      defaultValue: "false",
    }),
  },
  args: {
    index: 2,
    variant: "success",
    modelValue: false,
    items: sampleItems,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof StatusCard>;

export const Default: Story = {
  render: (args) => ({
    components: { StatusCard },
    setup() {
      const checked = ref(args.modelValue);
      watch(
        () => args.modelValue,
        (next) => {
          checked.value = next;
        },
      );
      return { args, checked };
    },
    template: `
      <StatusCard
        v-model="checked"
        :index="args.index"
        :variant="args.variant"
        :items="args.items"
        :disabled="args.disabled"
      />
    `,
  }),
};

export const Selected: Story = {
  args: {
    index: 2,
    variant: "success",
    modelValue: true,
    items: sampleItems,
  },
  render: (args) => ({
    components: { StatusCard },
    setup() {
      const checked = ref(args.modelValue);
      return { args, checked };
    },
    template: `
      <StatusCard
        v-model="checked"
        :index="args.index"
        :variant="args.variant"
        :items="args.items"
      />
    `,
  }),
};
