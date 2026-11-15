import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import ContentBoxBody from "./Index.vue";
import BodyText from "../../primitives/typography/body-text/Index.vue";

const meta: Meta<typeof ContentBoxBody> = {
  title: "Components/ContentBox/Body",
  component: ContentBoxBody,
  tags: ["autodocs"],
  argTypes: {
    isTransparent: propDoc({
      description:
        "Removes background, border, and padding from the body container.",
      type: "boolean",
      defaultValue: "false",
    }),
  },
  args: {
    isTransparent: false,
  },
};

export default meta;
type Story = StoryObj<typeof ContentBoxBody>;

export const Default: Story = {
  args: {
    isTransparent: false,
  },
  render: (args) => ({
    components: { ContentBoxBody, BodyText },
    setup: () => ({ args }),
    template: `
      <ContentBoxBody v-bind="args" style="max-width: 320px;">
        <BodyText variant="lg" weight="bold" as="p" style="margin: 0;">123.6k</BodyText>
      </ContentBoxBody>
    `,
  }),
};

export const Transparent: Story = {
  name: "Transparent",
  args: {
    isTransparent: true,
  },
  render: (args) => ({
    components: { ContentBoxBody, BodyText },
    setup: () => ({ args }),
    template: `
      <ContentBoxBody
        v-bind="args"
        style="max-width: 320px; display: flex; flex-direction: column; gap: 0.25rem;"
      >
          <BodyText variant="lg" weight="bold" as="p" style="margin: 0;">1.5m</BodyText>

      </ContentBoxBody>
    `,
  }),
};
