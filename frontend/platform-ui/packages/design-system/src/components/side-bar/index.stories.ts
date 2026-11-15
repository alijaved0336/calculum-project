import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import SideBar from "./Index.vue";
import type { SideBarItem } from "./types";
import { SideBarLogo } from "./logo";
import { SideBarLink } from "./link";

const navItems: SideBarItem[][] = [
  [{ icon: "sidebar-home", title: "Home", key: "home" }],
  [
    { icon: "sidebar-analyze", title: "Analyze", key: "analyze" },
    { icon: "sidebar-opportunity", title: "Opportunity", key: "opportunity" },
    { icon: "sidebar-plan", title: "Plan", key: "plan" },
    { icon: "sidebar-suppliers", title: "Suppliers", key: "suppliers" },
    { icon: "sidebar-manage", title: "Manage", key: "manage" },
  ],
  [
    { icon: "sidebar-compare", title: "Compare", key: "compare" },
    { icon: "sidebar-match", title: "Match", key: "match" },
    { icon: "settings", title: "Setup", key: "setup" },
  ],
];

const meta: Meta<typeof SideBar> = {
  title: "Components/SideBar/SideBar",
  component: SideBar,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template:
        '<div style="max-height: 600px; height: 600px; display: flex;"><story /></div>',
    }),
  ],
  argTypes: {
    items: propDoc({
      description:
        "Primary navigation groups. Each inner array is a `SideBarLink` cluster; `sidebar__top-divider` is rendered between groups.",
      type: "SideBarItem[][]",
      required: true,
      control: "object",
      detail: "{ icon: string; title: string; key: string }[][]",
    }),
    activeKey: propDoc({
      description: "Key of the currently active navigation item.",
      type: "string",
      defaultValue: "home",
    }),
  },
  args: {
    items: navItems,
    activeKey: "home",
  },
};

export default meta;
type Story = StoryObj<typeof SideBar>;

export const Default: Story = {
  render: (args) => ({
    components: { SideBar, SideBarLogo, SideBarLink },
    setup: () => ({ args }),
    template: `
    <SideBar
      :items="args.items"
      :active-key="args.activeKey || 'home'"
      @navigate="(key) => { args.activeKey = key }"
    >
      <template #secondary-list>
        <SideBarLink
          icon="edit"
          title="Secondary"
          :is-active="args.activeKey === 'secondary'"
          @click="() => { args.activeKey = 'secondary' }"
        />
      </template>
      <template #footer>
        <SideBarLogo />
      </template>
    </SideBar>
  `,
  }),
};
