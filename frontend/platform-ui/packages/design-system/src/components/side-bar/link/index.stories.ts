import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import SideBarLink from "./Index.vue";

const meta: Meta<typeof SideBarLink> = {
  title: "Components/SideBar/SideBarLink",
  component: SideBarLink,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template:
        '<div style="padding: 1rem; background: var(--bg-navigation); width: max-content;"><story /></div>',
    }),
  ],
  argTypes: {
    icon: propDoc({
      description: "Asset name from design-system sidebar icons.",
      type: "string",
      required: true,
    }),
    title: propDoc({
      description:
        "Accessible label shown in `TooltipButton` to the right of the icon.",
      type: "string",
      required: true,
    }),
    isActive: propDoc({
      description: "Whether the link is in the active (selected) state.",
      type: "boolean",
      required: true,
    }),
  },
  args: {
    icon: "sidebar-home",
    title: "Home",
    isActive: true,
  },
};

export default meta;
type Story = StoryObj<typeof SideBarLink>;

export const Default: Story = {
  args: {
    icon: "sidebar-home",
    title: "Home",
    isActive: true,
  },
  render: (args) => ({
    components: { SideBarLink },
    setup: () => ({ args }),
    template: '<SideBarLink v-bind="args" />',
  }),
};

export const Inactive: Story = {
  args: {
    icon: "sidebar-analyze",
    title: "Analyze",
    isActive: false,
  },
  render: (args) => ({
    components: { SideBarLink },
    setup: () => ({ args }),
    template: '<SideBarLink v-bind="args" />',
  }),
};

export const AllIcons: Story = {
  render: () => ({
    components: { SideBarLink },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <SideBarLink icon="sidebar-home" title="Home" :is-active="true" />
        <SideBarLink icon="sidebar-opportunity" title="Opportunity" :is-active="false" />
        <SideBarLink icon="sidebar-analyze" title="Analyze" :is-active="false" />
        <SideBarLink icon="sidebar-match" title="Match" :is-active="false" />
        <SideBarLink icon="sidebar-plan" title="Plan" :is-active="false" />
        <SideBarLink icon="sidebar-suppliers" title="Suppliers" :is-active="false" />
        <SideBarLink icon="sidebar-manage" title="Manage" :is-active="false" />
        <SideBarLink icon="sidebar-compare" title="Compare" :is-active="false" />
      </div>
    `,
  }),
};
