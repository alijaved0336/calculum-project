import type { Meta, StoryObj } from "@storybook/vue3";
import ContentBox from "./Index.vue";
import ContentBoxBody from "./body/Index.vue";
import BodyText from "../primitives/typography/body-text/Index.vue";
import TooltipButton from "../primitives/tooltip-button/Index.vue";

const meta: Meta<typeof ContentBox> = {
  title: "Components/ContentBox",
  component: ContentBox,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Card layout with header, default body slot, and optional footer. Configure content via slots: `header-title`, `header-controls`, default, and `footer`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ContentBox>;

export const Default: Story = {
  render: () => ({
    components: { ContentBox, ContentBoxBody, BodyText },
    template: `
    <ContentBox style="max-width: 320px;">
      <template #header-title>
        <BodyText variant="sm" weight="semibold" as="h3">Payment Terms (Days)</BodyText>
      </template>

      <ContentBoxBody >
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; ">
          <BodyText variant="lg" weight="bold" as="span">60</BodyText>
          <span style="color: var(--color-text-3);">→</span>
          <BodyText variant="lg" weight="bold" as="span">90</BodyText>
        </div>
      </ContentBoxBody>
    </ContentBox>
  `,
  }),
};

export const WithHeaderControls: Story = {
  name: "With header controls",
  render: () => ({
    components: { ContentBox, ContentBoxBody, BodyText, TooltipButton },
    template: `
    <ContentBox style="max-width: 320px;">
      <template #header-title>
        <BodyText variant="sm" weight="semibold" as="h3">Spend Volume</BodyText>
      </template>

      <template #header-controls>
        <TooltipButton
          text="Total spend volume for the selected period."
          position="top"
        />
        <TooltipButton
          text="Total spend volume for the selected period."
          position="top"
        />
      </template>

      <ContentBoxBody>
        <div>
          <BodyText variant="lg" weight="bold" as="p" style="margin: 0;">123.6k</BodyText>
        </div>
      </ContentBoxBody>
    </ContentBox>
  `,
  }),
};

export const WithFooter: Story = {
  name: "With footer",
  render: () => ({
    components: { ContentBox, ContentBoxBody, BodyText, TooltipButton },
    template: `
    <ContentBox style="max-width: 320px;">
      <template #header-title>
        <BodyText variant="sm" weight="semibold" as="h3">Cash Flow Opportunity</BodyText>
      </template>

      <template #header-controls>
        <TooltipButton
          text="Potential cash flow improvement from payment term changes."
          position="top"
        />
      </template>

      <ContentBoxBody>
        <div>
          <BodyText variant="lg" weight="bold" as="p" style="margin: 0;">1.5m</BodyText>
        </div>
      </ContentBoxBody>

      <template #footer>
        <BodyText variant="xs" weight="medium" as="span" style="color: var(--color-text-3);">
          or 0.74% Discount
        </BodyText>
      </template>
    </ContentBox>
  `,
  }),
};
export const WithTransparentBody: Story = {
  name: "With transparent body",
  render: () => ({
    components: { ContentBox, ContentBoxBody, BodyText, TooltipButton },
    template: `
    <ContentBox style="max-width: 320px;">
      <template #header-title>
        <BodyText variant="sm" weight="semibold" as="h3">Cash Flow Opportunity</BodyText>
      </template>

      <template #header-controls>
        <TooltipButton
          text="Potential cash flow improvement from payment term changes."
          position="top"
        />
      </template>

      <ContentBoxBody :is-transparent="true" style="display: flex;gap: 0.25rem;">
      <div style="display: flex; flex-direction: column; gap: 0.25rem;">
        <ContentBoxBody>
          <BodyText variant="lg" weight="bold" as="p" style="margin: 0;">1.5m</BodyText>
        </ContentBoxBody>
        <ContentBoxBody>
          <BodyText variant="lg" weight="bold" as="p" style="margin: 0;">1.5m</BodyText>
        </ContentBoxBody>
        <ContentBoxBody>
          <BodyText variant="lg" weight="bold" as="p" style="margin: 0;">1.5m</BodyText>
        </ContentBoxBody>
        </div>
                  <ContentBoxBody>
          <BodyText variant="lg" weight="bold" as="p" style="margin: 0;">1.5m</BodyText>
        </ContentBoxBody>
      </ContentBoxBody>

      <template #footer>
        <BodyText variant="xs" weight="medium" as="span" style="color: var(--color-text-3);">
          or 0.74% Discount
        </BodyText>
      </template>
    </ContentBox>
  `,
  }),
};
