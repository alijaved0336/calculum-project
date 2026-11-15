export type PhaseProgressItem = {
  id: string | number;
  name: string;
  /** 0–100 fill of this phase’s pill track. Omit → 0. */
  progress?: number;
  /** CSS color. Omit → `var(--accent)` (`--brand-500`) when this phase is active. */
  color?: string;
};

/**
 * Props for presentational `PhaseProgress`.
 *
 * v-model is `activePhaseId` + `update:activePhaseId` (no `defineModel`).
 * Emits to declare on the SFC: `update:activePhaseId: [id: string | number]`,
 * `select: [phase: PhaseProgressItem, event: MouseEvent]`.
 * Index labels are not a prop: `String(index + 1).padStart(2, "0")`.
 * `withDefaults`: `phases: []`, `disabled: false`, `openLabel: "Open"`.
 */
export type PhaseProgressProps = {
  phases: PhaseProgressItem[];
  /** v-model. Omit → first phase is treated as active for coloring (no emit on mount). */
  activePhaseId?: string | number;
  disabled?: boolean;
  /** CustomButton `text` for the hover icon-only control. */
  openLabel?: string;
};
