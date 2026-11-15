import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import TooltipButton from "./Index.vue";
import { TOOLTIP_BUTTON_FALLBACK_TEXT, TOOLTIP_POSITIONS } from "./types";
import BodyText from "../typography/body-text/Index.vue";
import CustomButton from "../custom-button/Index.vue";

const textTemplate = `Payment terms progress shows the contractual vs agreed days.`;

const meta: Meta<typeof TooltipButton> = {
  title: "Primitives/TooltipButton",
  component: TooltipButton,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: "<div ><story /></div>",
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
Hover tooltip. Default trigger is the question-mark icon; override via the default slot.

**Content**
- \`text\` — plain-text popup (existing usage). Also the trigger accessible name when \`#content\` is used. Hidden when both \`text\` and \`#content\` are empty.
- \`fallbackText\` — Kendo \`title\` / accessible name when \`text\` is empty and \`#content\` is used (default \`${TOOLTIP_BUTTON_FALLBACK_TEXT}\`). Prefer passing \`text\`.
- \`#content\` — structured popup (headings, lists, \`CustomButton\`, …). Replaces the plain-text popup. Stays open while the pointer is over the trigger or popup; also opens on click/focus and closes on Escape / outside press so keyboard, touch, and a Button CTA are reachable.

**Custom trigger**
A custom \`#default\` trigger should set \`title\` (and \`aria-label\` when there is no visible text). TooltipButton also copies the trigger label onto a wrapper and the slotted root if \`title\` is missing, so Kendo can still open.

\`\`\`vue
<TooltipButton text="This is a tooltip" position="right">
  <template #content>
    <BodyText variant="sm" weight="bold" as="h3">This is a tooltip</BodyText>
    <p>Tooltips are used to describe or identify an element.</p>
    <CustomButton text="Button CTA" variant="accent" icon="edit" />
  </template>
</TooltipButton>
\`\`\`
        `.trim(),
      },
    },
  },
  argTypes: {
    text: propDoc({
      description:
        "Plain-text popup content. Also used as the trigger `title` / accessible name when `#content` is provided (Kendo needs a non-empty title to open). Hidden when both `text` and `#content` are empty.",
      type: "string",
      control: "textarea",
      defaultValue: '""',
    }),
    fallbackText: propDoc({
      description:
        "Accessible name / Kendo `title` when `text` is empty and `#content` is used.",
      type: "string",
      defaultValue: TOOLTIP_BUTTON_FALLBACK_TEXT,
    }),
    position: propDoc({
      description: "Kendo Tooltip position relative to the trigger.",
      type: formatUnionType(TOOLTIP_POSITIONS),
      control: "select",
      options: [...TOOLTIP_POSITIONS],
      defaultValue: "top",
    }),
    default: propDoc({
      description:
        "Trigger. Defaults to the question-mark icon button. Custom triggers should set `title` (and `aria-label` when there is no visible text). TooltipButton also copies `text` / `fallbackText` onto a wrapper and the slotted root if `title` is missing, so Kendo can still open.",
      type: "slot",
      control: false,
    }),
    content: propDoc({
      description:
        "Structured popup (headings, lists, CustomButton, …). Replaces the plain `text` popup when present. Driven in controlled mode so pointer, keyboard, and touch can reach interactive children.",
      type: "slot",
      control: false,
    }),
  },
  args: {
    text: textTemplate,
    fallbackText: TOOLTIP_BUTTON_FALLBACK_TEXT,
    position: "auto",
  },
};

export default meta;
type Story = StoryObj<typeof TooltipButton>;

/** Full prop set for Controls / Autodocs. */
export const Default: Story = {};

export const Top: Story = {
  args: {
    text: textTemplate,
    position: "top",
  },
};

export const Bottom: Story = {
  args: {
    text: textTemplate,
    position: "bottom",
  },
};

export const Left: Story = {
  args: {
    text: textTemplate,
    position: "left",
  },
};

export const Right: Story = {
  name: "Right (HomeDashBoard)",
  args: {
    text: textTemplate,
    position: "right",
  },
};

export const InHeading: Story = {
  name: "In heading",
  render: () => ({
    components: { TooltipButton, BodyText },
    template: `
      <BodyText variant="md" weight="bold" as="h5" style="display: inline-flex; align-items: center; gap: 0.25rem; margin: 0;">
        Payment Terms Progress
        <TooltipButton
          text="Payment terms progress shows the contractual vs agreed days."
          position="right"
        />
      </BodyText>
    `,
  }),
};

export const AllPositions: Story = {
  name: "All positions",
  render: () => ({
    components: { TooltipButton, BodyText },
    setup: () => ({ TOOLTIP_POSITIONS }),
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 3rem; padding: 4rem; justify-content: center;">
        <div
          v-for="position in TOOLTIP_POSITIONS"
          :key="position"
          style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;"
        >
          <BodyText variant="xs" weight="medium" as="span" style="color: var(--color-text-3);">
            {{ position }}
          </BodyText>
          <TooltipButton
            :text="'Tooltip position: ' + position"
            :position="position"
          />
        </div>
      </div>
    `,
  }),
};

export const RichContent: Story = {
  name: "Rich content",
  render: () => ({
    components: { TooltipButton, BodyText, CustomButton },
    template: `
      <div style="padding: 8rem 2rem;">
        <TooltipButton
          text="This is a tooltip"
          position="right"
        >
          <template #content>
            <BodyText variant="sm" weight="bold" as="h3">This is a tooltip</BodyText>
            <BodyText variant="xs" weight="regular" as="p">
              Tooltips are used to describe or identify an element. In most scenarios, tooltips help the user understand meaning, function or alt-text.
            </BodyText>
            <CustomButton text="Button CTA" variant="accent" icon="edit" />
          </template>
        </TooltipButton>
      </div>
    `,
  }),
};

export const WithList: Story = {
  name: "With list",
  render: () => ({
    components: { TooltipButton, BodyText, CustomButton },
    template: `
      <div style="padding: 8rem 2rem;">
        <TooltipButton
          text="Tooltip with a list"
          position="right"
        >
          <template #content>
            <BodyText variant="sm" weight="bold" as="h3">This is a tooltip</BodyText>
            <BodyText variant="xs" weight="medium" as="p">Use it to explain:</BodyText>
            <ul>
              <li>Meaning of a control</li>
              <li>What an action will do</li>
              <li>Alternative text for an icon</li>
            </ul>
            <CustomButton text="Button CTA" variant="accent" icon="edit" />
          </template>
        </TooltipButton>
      </div>
    `,
  }),
};

export const ContentWithoutText: Story = {
  name: "Content without text",
  render: () => ({
    components: { TooltipButton, BodyText, CustomButton },
    setup: () => ({ TOOLTIP_BUTTON_FALLBACK_TEXT }),
    template: `
      <div style="padding: 8rem 2rem;">
        <TooltipButton position="right">
          <template #content>
            <BodyText variant="sm" weight="bold" as="h3">This is a tooltip</BodyText>
            <BodyText variant="xs" weight="regular" as="p">
              No \`text\` prop — the trigger uses the "{{ TOOLTIP_BUTTON_FALLBACK_TEXT }}" fallback.
            </BodyText>
            <CustomButton text="Button CTA" variant="accent" icon="edit" />
          </template>
        </TooltipButton>
      </div>
    `,
  }),
};

export const CustomTriggerWithContent: Story = {
  name: "Custom trigger with content",
  render: () => ({
    components: { TooltipButton, BodyText, CustomButton },
    template: `
      <div style="padding: 8rem 2rem; display: flex; align-items: center; gap: 1rem;">
        <TooltipButton
          text="Help about filters"
          position="right"
        >
          <button
            type="button"
            title="Help about filters"
            aria-label="Help about filters"
            style="margin: 0; padding: 0.25rem 0.5rem; cursor: pointer;"
          >
            Custom trigger
          </button>
          <template #content>
            <BodyText variant="sm" weight="bold" as="h3">Filters</BodyText>
            <BodyText variant="xs" weight="regular" as="p">
              Custom \`#default\` triggers should set \`title\` (and \`aria-label\` when there is no visible text).
            </BodyText>
            <CustomButton text="Button CTA" variant="accent" icon="edit" />
          </template>
        </TooltipButton>
      </div>
    `,
  }),
};

const edgeOverflowText = `Viewport collision check: this copy is intentionally long so the popup would overflow the screen when the trigger sits flush against a viewport edge. Positioning must flip or shift against the device viewport, not a page-local container.`;

const edgeAnchors = [
  {
    id: "top-left",
    label: "Top left",
    style: "top: 0; left: 0;",
    position: "top" as const,
  },
  {
    id: "top-right",
    label: "Top right",
    style: "top: 0; right: 0;",
    position: "top" as const,
  },
  {
    id: "bottom-left",
    label: "Bottom left",
    style: "bottom: 0; left: 0;",
    position: "bottom" as const,
  },
  {
    id: "bottom-right",
    label: "Bottom right",
    style: "bottom: 0; right: 0;",
    position: "bottom" as const,
  },
  {
    id: "mid-left",
    label: "Mid left",
    style: "top: calc(50% - 1rem); left: 0;",
    position: "left" as const,
  },
  {
    id: "mid-right",
    label: "Mid right",
    style: "top: calc(50% - 1rem); right: 0;",
    position: "right" as const,
  },
];

/** Triggers flush to viewport corners/edges with overflow-length copy — verifies flip/shift. */
export const ViewportEdgeCollision: Story = {
  name: "Viewport edge collision",
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Places triggers at extreme viewport corners and edges with long text that would overflow. Hover each control — the popup must stay on screen (flip/shift against the device viewport).",
      },
    },
  },
  render: () => ({
    components: { TooltipButton, BodyText },
    setup: () => ({ edgeAnchors, edgeOverflowText }),
    template: `
      <div
        style="
          position: relative;
          box-sizing: border-box;
          width: 100%;
          height: 100vh;
          margin: 0;
          background: var(--bg-surface, #fff);
        "
      >
        <BodyText
          variant="sm"
          weight="medium"
          as="p"
          style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            margin: 0;
            max-width: 22rem;
            text-align: center;
            color: var(--color-text-3);
          "
        >
          Hover the ? controls at every edge and corner. Tooltips must stay inside the viewport.
        </BodyText>
        <div
          v-for="anchor in edgeAnchors"
          :key="anchor.id"
          :style="'position: absolute; ' + anchor.style"
        >
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.25rem;">
            <BodyText variant="xs" weight="medium" as="span" style="color: var(--color-text-3); white-space: nowrap;">
              {{ anchor.label }}
            </BodyText>
            <TooltipButton
              :text="edgeOverflowText"
              :position="anchor.position"
            />
          </div>
        </div>
      </div>
    `,
  }),
};

/** Same extreme anchors with rich `#content` (taller popup) — still viewport-clamped. */
export const ViewportEdgeCollisionRich: Story = {
  name: "Viewport edge collision (rich)",
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Rich `#content` popups at viewport corners/edges. Tall interactive content must flip/shift within the device viewport.",
      },
    },
  },
  render: () => ({
    components: { TooltipButton, BodyText, CustomButton },
    setup: () => ({ edgeAnchors, edgeOverflowText }),
    template: `
      <div
        style="
          position: relative;
          box-sizing: border-box;
          width: 100vw;
          height: 100vh;
          margin: 0;
          background: var(--bg-surface, #fff);
        "
      >
        <div
          v-for="anchor in edgeAnchors"
          :key="anchor.id"
          :style="'position: absolute; ' + anchor.style"
        >
          <TooltipButton
            :text="edgeOverflowText"
            :position="anchor.position"
          >
            <template #content>
              <BodyText variant="sm" weight="bold" as="h3">{{ anchor.label }}</BodyText>
              <BodyText variant="xs" weight="regular" as="p">
                {{ edgeOverflowText }}
              </BodyText>
              <CustomButton text="Button CTA" variant="accent" icon="edit" />
            </template>
          </TooltipButton>
        </div>
      </div>
    `,
  }),
};
