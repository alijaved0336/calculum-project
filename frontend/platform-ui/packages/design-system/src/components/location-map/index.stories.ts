import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import LocationMap from "./Index.vue";

const meta: Meta<typeof LocationMap> = {
  title: "Maps/LocationMap",
  component: LocationMap,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div style="max-width: 32rem;"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
A single-marker Google Map (\`vue3-google-map\`) for one company/entity's location.

\`apiKey\` is the caller's own Google Maps JavaScript API key - design-system carries none of its
own, so the map only actually renders in an app that supplies a real, billable key. The story below
renders with an empty key and will show Google's own "for development purposes only"/blank map
placeholder rather than a real map.

\`\`\`vue
<LocationMap :api-key="googleMapApiKey" :latitude="40.7128" :longitude="-74.006" />
\`\`\`
        `.trim(),
      },
    },
  },
  argTypes: {
    apiKey: propDoc({
      description: "Google Maps JavaScript API key, owned by the consuming app.",
      type: "string",
      required: true,
    }),
    latitude: propDoc({
      description: "Marker latitude.",
      type: "number",
      required: true,
    }),
    longitude: propDoc({
      description: "Marker longitude.",
      type: "number",
      required: true,
    }),
  },
  args: {
    apiKey: "",
    latitude: 40.7128,
    longitude: -74.006,
  },
};

export default meta;
type Story = StoryObj<typeof LocationMap>;

export const Default: Story = {};
