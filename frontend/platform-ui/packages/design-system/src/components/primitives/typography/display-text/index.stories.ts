import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import DisplayText from "./Index.vue";
import { DISPLAY_LABELS, DISPLAY_VARIANTS } from "./types";

const meta: Meta<typeof DisplayText> = {
  title: "Primitives/Typography/DisplayText",
  component: DisplayText,
  tags: ["autodocs"],
  argTypes: {
    variant: propDoc({
      description: "Display typography size preset.",
      type: formatUnionType(DISPLAY_VARIANTS),
      required: true,
      options: DISPLAY_VARIANTS,
    }),
    as: propDoc({
      description: "HTML element rendered by the component.",
      type: "string",
      defaultValue: "span",
    }),
  },
  args: {
    variant: "2xl",
    as: "h1",
  },
};

export default meta;
type Story = StoryObj<typeof DisplayText>;

export const Display2xl: Story = {
  args: {
    variant: "2xl",
    as: "h1",
  },
  render: (args) => ({
    components: { DisplayText },
    setup: () => ({ args }),
    template: '<DisplayText v-bind="args">Display 2xl</DisplayText>',
  }),
};

export const DisplayLg: Story = {
  args: { variant: "lg", as: "h2" },
  render: (args) => ({
    components: { DisplayText },
    setup: () => ({ args }),
    template: '<DisplayText v-bind="args">Display lg</DisplayText>',
  }),
};

export const DisplayMd: Story = {
  args: { variant: "md", as: "h3" },
  render: (args) => ({
    components: { DisplayText },
    setup: () => ({ args }),
    template: '<DisplayText v-bind="args">Display md</DisplayText>',
  }),
};

export const DisplaySm: Story = {
  args: { variant: "sm", as: "h4" },
  render: (args) => ({
    components: { DisplayText },
    setup: () => ({ args }),
    template: '<DisplayText v-bind="args">Display sm</DisplayText>',
  }),
};

export const AllVariants: Story = {
  render: () => ({
    components: { DisplayText },
    setup: () => ({ DISPLAY_VARIANTS, DISPLAY_LABELS }),
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem;">
        <div v-for="variant in DISPLAY_VARIANTS" :key="variant">
          <p style="margin: 0 0 0.5rem; font-size: 12px; color: var(--color-text-3);">
            {{ DISPLAY_LABELS[variant] }}
          </p>
          <DisplayText :variant="variant">The quick brown fox</DisplayText>
        </div>
      </div>
    `,
  }),
};
