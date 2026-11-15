import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import BodyText from "./Index.vue";
import { TEXT_VARIANTS, TEXT_WEIGHTS } from "./types";

const meta: Meta<typeof BodyText> = {
  title: "Primitives/Typography/BodyText",
  component: BodyText,
  tags: ["autodocs"],
  argTypes: {
    variant: propDoc({
      description: "Typography size preset for body copy.",
      type: formatUnionType(TEXT_VARIANTS),
      options: TEXT_VARIANTS,
      defaultValue: "md",
    }),
    weight: propDoc({
      description: "When omitted, base weight (400) is used.",
      type: formatUnionType(TEXT_WEIGHTS),
      options: TEXT_WEIGHTS,
      defaultValue: "regular",
    }),
    as: propDoc({
      description: "HTML element rendered by the component.",
      type: "string",
      defaultValue: "span",
    }),
  },
  args: {
    variant: "md",
    as: "span",
    weight: "regular",
  },
};

export default meta;
type Story = StoryObj<typeof BodyText>;

export const Default: Story = {
  args: {
    variant: "md",
    weight: "regular",
    as: "span",
  },
  render: (args) => ({
    components: { BodyText },
    setup: () => ({ args }),
    template: '<BodyText v-bind="args">Test body text</BodyText>',
  }),
};

export const Md: Story = {
  args: {
    variant: "md",
  },
  render: (args) => ({
    components: { BodyText },
    setup: () => ({ args }),
    template: '<BodyText v-bind="args">Text md</BodyText>',
  }),
};

export const Sm: Story = {
  args: {
    variant: "sm",
  },
  render: (args) => ({
    components: { BodyText },
    setup: () => ({ args }),
    template: '<BodyText v-bind="args">Text sm</BodyText>',
  }),
};

export const Xs: Story = {
  args: {
    variant: "xs",
  },
  render: (args) => ({
    components: { BodyText },
    setup: () => ({ args }),
    template: '<BodyText v-bind="args">Text xs</BodyText>',
  }),
};
