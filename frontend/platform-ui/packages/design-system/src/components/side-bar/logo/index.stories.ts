import type { Meta, StoryObj } from "@storybook/vue3";
import SideBarLogo from "./Index.vue";

const meta: Meta<typeof SideBarLogo> = {
  title: "Components/SideBar/SideBarLogo",
  component: SideBarLogo,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Footer logo link to calculum.ai. The component has no props; content and behavior are fixed.",
      },
    },
  },
  decorators: [
    () => ({
      template:
        '<div style="padding: 1rem; background: var(--bg-navigation);"><story /></div>',
    }),
  ],
};

export default meta;
type Story = StoryObj<typeof SideBarLogo>;

export const Default: Story = {
  args: {},
};
