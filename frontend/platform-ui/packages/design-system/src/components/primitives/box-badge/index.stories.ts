import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import BoxBadge from "./Index.vue";
import { BOX_BADGE_VARIANTS, type BoxBadgeVariant } from "./types";

const meta: Meta<typeof BoxBadge> = {
  title: "Primitives/BoxBadge",
  component: BoxBadge,
  tags: ["autodocs"],
  argTypes: {
    text: propDoc({
      description: "Badge label text.",
      type: "string",
      required: true,
    }),
    variant: propDoc({
      description:
        "Closed set of designer icon variants (`color-position`). Invalid combinations are not representable.",
      type: formatUnionType(BOX_BADGE_VARIANTS),
      options: BOX_BADGE_VARIANTS,
      defaultValue: "green-top-center",
    }),
  },
  args: {
    text: "Box 2",
    variant: "green-top-center",
  },
};

export default meta;
type Story = StoryObj<typeof BoxBadge>;

/** Full prop set for Controls / Autodocs. */
export const Default: Story = {};

const ALL_VARIANTS: { text: string; variant: BoxBadgeVariant }[] =
  BOX_BADGE_VARIANTS.map((variant) => ({
    text: "Box 2",
    variant,
  }));

export const AllVariants: Story = {
  name: "All variants",
  render: () => ({
    components: { BoxBadge },
    setup() {
      return { items: ALL_VARIANTS };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;">
        <BoxBadge
          v-for="item in items"
          :key="item.variant"
          :text="item.text"
          :variant="item.variant"
        />
      </div>
    `,
  }),
};
