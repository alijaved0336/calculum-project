import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import NineBoxEmptyState from "./Index.vue";

const meta: Meta<typeof NineBoxEmptyState> = {
  title: "Components/NineBoxEmptyState",
  component: NineBoxEmptyState,
  tags: ["autodocs"],
  argTypes: {
    message: propDoc({
      description: "The prompt text - callers own translation.",
      type: "string",
    }),
  },
  args: {
    message: "Click on one or multiple boxes to view the corresponding details.",
  },
};

export default meta;
type Story = StoryObj<typeof NineBoxEmptyState>;

export const Default: Story = {
  render: (args) => ({
    components: { NineBoxEmptyState },
    setup: () => ({ args }),
    template: `<div style="max-width: 360px;"><NineBoxEmptyState v-bind="args" /></div>`,
  }),
};
