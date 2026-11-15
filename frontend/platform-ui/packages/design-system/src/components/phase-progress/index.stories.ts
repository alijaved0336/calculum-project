import type { Meta, StoryObj } from "@storybook/vue3";
import { ref, watch } from "vue";
import { propDoc } from "@ds-storybook/argTypes";
import PhaseProgress from "./Index.vue";
import type { PhaseProgressItem } from "./types";

function makePhase(
  id: string | number,
  name: string,
  progress?: number,
  color?: string,
): PhaseProgressItem {
  const phase: PhaseProgressItem = { id, name };
  if (progress !== undefined) {
    phase.progress = progress;
  }
  if (color !== undefined) {
    phase.color = color;
  }
  return phase;
}

function makePhases(
  items: Array<[id: string | number, name: string, progress?: number, color?: string]>,
): PhaseProgressItem[] {
  return items.map((item) => makePhase(...item));
}

const defaultPhases = makePhases([["1", "Opportunity", 42]]);

const severalPhases = makePhases([
  ["1", "Collect", 100],
  ["2", "Analyze", 100],
  ["3", "Opportunity", 58],
  ["4", "Plan", 0],
  ["5", "Execute", 0],
]);

const manyPhases = makePhases([
  ["1", "Data collection", 100],
  ["2", "Data quality review", 100],
  ["3", "Spend analysis", 100],
  ["4", "Opportunity identification", 100],
  ["5", "Supplier outreach", 65],
  ["6", "Negotiation", 0],
  ["7", "Agreement", 0],
  ["8", "Implementation", 0],
  ["9", "Monitoring", 0],
  ["10", "Optimization", 0],
  ["11", "Close-out review", 0],
]);

const playgroundPhases = makePhases([
  ["1", "Collect", 100, "#3b82f6"],
  ["2", "Analyze", 100, "#8b5cf6"],
  ["3", "Opportunity", 58, "#ef4444"],
  ["4", "Plan", 0, "#f59e0b"],
  ["5", "Execute", 0, "#10b981"],
]);

const collapsedPhases: PhaseProgressItem[] = Array.from(
  { length: 100 },
  (_, index) =>
    makePhase(
      String(index + 1),
      `Phase ${index + 1}`,
      index < 40 ? 100 : index === 40 ? 45 : 0,
    ),
);

const meta: Meta<typeof PhaseProgress> = {
  title: "Components/PhaseProgress",
  component: PhaseProgress,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
Presentational equal-width phase bar (index, name, CSS pill track, hover open icon).

**Color:** the entire graph (dividers + filled pills) uses the **active** phase \`color\`, or \`var(--accent)\` when that phase has no color. Hovering another phase does not recolor the graph.

**v-model:** \`activePhaseId\` + \`update:activePhaseId\`. Parent owns selection. DS does not navigate.
        `.trim(),
      },
    },
  },
  decorators: [
    () => ({
      template:
        '<div style="width: 100%; padding: 1.5rem; background: var(--bg-page);"><story /></div>',
    }),
  ],
  argTypes: {
    phases: propDoc({
      description:
        "Equal-width columns. Each item: `id`, `name`, optional `progress` (0–100 fill of that column’s pills), optional `color` (used only when this phase is active).",
      type: "PhaseProgressItem[]",
      control: "object",
      detail:
        "{ id: string | number; name: string; progress?: number; color?: string }[]",
      defaultValue: "[]",
    }),
    activePhaseId: propDoc({
      description:
        "v-model. Omit → first phase is treated as active for coloring (no emit on mount).",
      type: "string | number",
      defaultValue: "undefined",
    }),
    disabled: propDoc({
      description:
        "Non-interactive bar (shared 0.5 opacity disabled treatment). Suppresses hover chrome and `select` / `update:activePhaseId`.",
      type: "boolean",
      defaultValue: "false",
    }),
    openLabel: propDoc({
      description: "CustomButton `text` for the hover icon-only control.",
      type: "string",
      defaultValue: "Open",
    }),
    onSelect: {
      action: "select",
      description:
        "Emitted as `select` from a column (or the open icon) when not disabled. Payload: `PhaseProgressItem`, `MouseEvent`.",
    },
    "onUpdate:activePhaseId": {
      action: "update:activePhaseId",
      description:
        "Emitted as `update:activePhaseId` with the clicked phase `id` when not disabled.",
    },
  },
  args: {
    phases: defaultPhases,
    activePhaseId: "1",
    openLabel: "Open",
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof PhaseProgress>;

export const Default: Story = {};

export const Several: Story = {
  args: {
    phases: severalPhases,
    activePhaseId: "3",
  },
};

export const Many: Story = {
  args: {
    phases: manyPhases,
    activePhaseId: "5",
  },
};

export const ActiveColor: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Second phase is active (`color: #ef4444`). The entire graph (dividers + filled pills) is red. Hovering the first (blue) phase must not turn the graph blue — color follows the active phase only.",
      },
    },
  },
  args: {
    phases: makePhases([
      ["blue", "Intake", 100, "#3b82f6"],
      ["red", "Negotiate", 40, "#ef4444"],
    ]),
    activePhaseId: "red",
  },
};

export const Collapsed: Story = {
  args: {
    phases: collapsedPhases,
    activePhaseId: "41",
  },
};

export const Disabled: Story = {
  args: {
    phases: severalPhases,
    activePhaseId: "3",
    disabled: true,
  },
};

/**
 * Local v-model so clicking a column recolors the graph. Controls still
 * update `activePhaseId`; `@select` is logged as an action.
 */
export const Playground: Story = {
  args: {
    phases: playgroundPhases,
    activePhaseId: "3",
  },
  render: (args) => ({
    components: { PhaseProgress },
    setup() {
      const activePhaseId = ref(args.activePhaseId);
      watch(
        () => args.activePhaseId,
        (value) => {
          activePhaseId.value = value;
        },
      );
      function onUpdateActivePhaseId(id: string | number) {
        activePhaseId.value = id;
        args["onUpdate:activePhaseId"]?.(id);
      }
      return { args, activePhaseId, onUpdateActivePhaseId };
    },
    template: `
      <PhaseProgress
        :phases="args.phases"
        :disabled="args.disabled"
        :open-label="args.openLabel"
        :active-phase-id="activePhaseId"
        @update:activePhaseId="onUpdateActivePhaseId"
        @select="args.onSelect"
      />
    `,
  }),
};
