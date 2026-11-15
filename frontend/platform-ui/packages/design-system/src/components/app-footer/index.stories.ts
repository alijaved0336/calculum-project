import type { Meta, StoryObj } from "@storybook/vue3";
import AppFooter from "./Index.vue";
import BodyText from "../primitives/typography/body-text/Index.vue";

/**
 * Chrome shell for the app footer (Figma bar: 52px, top border, surface, space-between row).
 * Page copy, version, and legal links go in the default slot — AP and AR own that content.
 */
const meta: Meta<typeof AppFooter> = {
  title: "Layout/AppFooter",
  component: AppFooter,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof AppFooter>;

export const Default: Story = {
  render: () => ({
    components: { AppFooter, BodyText },
    template: `
      <AppFooter>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <BodyText variant="xs" weight="semibold">© Calculum, Inc.</BodyText>
          <BodyText variant="xs" weight="semibold">All Rights Reserved</BodyText>
          <BodyText variant="xs" weight="semibold">Version: 1.100.0 - 20260814</BodyText>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <a href="/Calculum_Terms_of_Service.pdf" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">
            <BodyText variant="xs" weight="semibold">Term of Service</BodyText>
          </a>
          <button type="button" style="margin: 0; padding: 0; border: none; background: none; color: inherit; cursor: pointer;">
            <BodyText variant="xs" weight="semibold">Manage Cookies</BodyText>
          </button>
          <a href="/Privacy_Policy_Calculum.pdf" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">
            <BodyText variant="xs" weight="semibold">Privacy Policy</BodyText>
          </a>
        </div>
      </AppFooter>
    `,
  }),
};
