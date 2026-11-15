import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import NoDataAvailable from "./Index.vue";

const meta: Meta<typeof NoDataAvailable> = {
  title: "Components/NoDataAvailable",
  component: NoDataAvailable,
  tags: ["autodocs"],
  argTypes: {
    title: propDoc({
      description: "Primary heading shown in the empty state.",
      type: "string",
      defaultValue: '"No Data Available"',
    }),
    message: propDoc({
      description: "Supporting text below the title.",
      type: "string",
      defaultValue: '""',
    }),
    icon: propDoc({
      description:
        "Asset name from design-system icons. Icon block is hidden when omitted.",
      type: "string",
    }),
  },
  args: {
    title: "No Data Available",
    message: "There is nothing to display yet.",
    icon: "sidebar-analyze",
  },
};

export default meta;
type Story = StoryObj<typeof NoDataAvailable>;

export const Default: Story = {};

export const TitleOnly: Story = {
  args: {
    title: "No results found",
    message: "",
    icon: "sidebar-home",
  },
};

export const WithoutIcon: Story = {
  args: {
    title: "No Data Available",
    message: "Icon block is hidden when `icon` is omitted.",
    icon: "",
  },
};

export const WithDifferentIcons: Story = {
  render: () => ({
    components: { NoDataAvailable },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
        <NoDataAvailable
          icon="sidebar-analyze"
          title="Analyze"
          message="No analyze data yet."
        />
        <NoDataAvailable
          icon="sidebar-suppliers"
          title="Suppliers"
          message="No suppliers to display."
        />
        <NoDataAvailable
          icon="sidebar-plan"
          title="Plan"
          message="No plan items found."
        />
      </div>
    `,
  }),
};
