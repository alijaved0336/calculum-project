import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import NewsCard from "./Index.vue";

const demoImage =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&h=450";

const secondImage = "https://picsum.photos/id/180/800/450";

const placeholderImage =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#e2e8f0"/><text x="400" y="225" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-family="sans-serif" font-size="20">News placeholder</text></svg>`,
  );

const demoTitle =
  "ScanX reports Q2 trade volume surge as suppliers extend payment terms across APAC";

const demoDescription =
  "Global trade activity accelerated in the second quarter as buyers locked in longer payment windows and suppliers expanded credit lines. Analysts expect the trend to continue through year-end as working-capital programs scale across the region.";

const meta: Meta<typeof NewsCard> = {
  title: "Components/NewsCard",
  component: NewsCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
Presentational news card (image, source, calendar date, title, 2-line excerpt, outlined Read More). Default layout is vertical (image above content); set \`isVertical\` to \`false\` for image on the left.

**Navigation**
- Parent listens to \`@click\`; DS does not wrap an \`<a>\` and does not call \`window.open\`.
- Emit payload is \`(event: MouseEvent, url: string)\`. Root and Read More each emit once (Read More stops bubbling).
- Root click is mouse-only; Read More is the keyboard path unless the parent wraps the card.
        `.trim(),
      },
    },
  },
  decorators: [
    (_story, context) => ({
      template:
        context.parameters.newsCardLayout === "two-up"
          ? '<div style="padding: 1.5rem; background: var(--bg-page);"><story /></div>'
          : context.parameters.newsCardLayout === "horizontal"
            ? '<div style="max-width: 40rem;"><story /></div>'
            : '<div style="max-width: 24rem;"><story /></div>',
    }),
  ],
  argTypes: {
    title: propDoc({
      description:
        "Headline. Also used as image alt when `imageAlt` is omitted.",
      type: "string",
      required: true,
      control: "textarea",
    }),
    description: propDoc({
      description: "Excerpt under the title. Clamped to 2 lines.",
      type: "string",
      control: "textarea",
      defaultValue: '""',
    }),
    url: propDoc({
      description:
        "Article URL passed through on `click`. Parent opens it; the card does not navigate.",
      type: "string",
      defaultValue: '""',
    }),
    image: propDoc({
      description:
        "Photo URL. Media is omitted when empty/`null` and `placeholderImage` is also empty.",
      type: "string | null",
      defaultValue: "null",
    }),
    source: propDoc({
      description: "Publisher name in the meta row (accent color).",
      type: "string",
      defaultValue: '""',
    }),
    date: propDoc({
      description:
        "Already formatted display date (e.g. `Jun 3, 2026`). The card does not format timestamps.",
      type: "string",
      defaultValue: '""',
    }),
    readMoreLabel: propDoc({
      description: "Label for the outlined trailing-chevron button.",
      type: "string",
      defaultValue: "Read More",
    }),
    placeholderImage: propDoc({
      description:
        "Fallback photo when `image` is missing or fails to load. Empty string hides the media well if `image` is also empty.",
      type: "string",
      defaultValue: '""',
    }),
    imageAlt: propDoc({
      description: "Alt text for the photo. Defaults to `title` when omitted.",
      type: "string",
      defaultValue: "undefined",
    }),
    isVertical: propDoc({
      description:
        "When `true`, image stacks above content. When `false`, image sits to the left of content.",
      type: "boolean",
      defaultValue: "true",
    }),
    onClick: {
      action: "click",
      description:
        "Emitted as `click` from the card root (mouse) and Read More (keyboard-accessible). Payload: `MouseEvent`, `url`.",
    },
  },
  args: {
    title: demoTitle,
    description: demoDescription,
    url: "https://scanx.trade/news/q2-trade-volume",
    image: demoImage,
    source: "scanx.trade",
    date: "Jun 3, 2026",
    readMoreLabel: "Read More",
    placeholderImage: "",
    imageAlt: "",
    isVertical: true,
  },
};

export default meta;
type Story = StoryObj<typeof NewsCard>;

export const Default: Story = {};

export const Horizontal: Story = {
  name: "Horizontal",
  args: {
    isVertical: false,
  },
  parameters: {
    newsCardLayout: "horizontal",
  },
};

export const NoImage: Story = {
  name: "No image",
  args: {
    image: "",
    placeholderImage: "",
  },
};

export const ImageError: Story = {
  name: "Image error / placeholder",
  args: {
    image: "https://invalid.example/missing.jpg",
    placeholderImage,
  },
};

export const LongCopy: Story = {
  name: "Long copy",
  args: {
    title:
      "European manufacturers renegotiate supplier contracts after ScanX data shows a sustained rise in days payable outstanding across automotive, industrial, and consumer goods verticals",
    description:
      "Procurement teams are extending payment windows while suppliers add late-fee clauses and volume discounts to protect cash. The excerpt on this card is intentionally longer than two lines so the 2-line ellipsis clamp is visible in Storybook. Extra sentences confirm that overflow is clipped rather than stretching the card body. A fourth sentence keeps the block well past the Figma limit.",
  },
};
