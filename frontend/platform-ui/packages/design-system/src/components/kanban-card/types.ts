export const KANBAN_CARD_STATUSES = [
  "analyzed",
  "onHold",
  "planned",
  "contacted",
  "agreed",
  "agreedExtended",
] as const;

export type KanbanCardStatus = (typeof KANBAN_CARD_STATUSES)[number];

/** Left 3px inline-start border — CSS custom properties from `tokens.css`, not hex. */
export const KANBAN_CARD_STATUS_ACCENTS: Record<KanbanCardStatus, string> = {
  analyzed: "var(--neutral-700)",
  onHold: "var(--yellow-500)",
  planned: "var(--blue-400)",
  contacted: "var(--green-500)",
  agreed: "var(--red-500)",
  agreedExtended: "var(--brand-500)",
};

export type KanbanCardAvatar = {
  src?: string;
  name?: string;
  initials?: string;
};

export type KanbanCardProps = {
  entityName: string;
  status?: KanbanCardStatus;
  logoSrc?: string;
  /** Defaults to the first character of `entityName` when omitted. */
  logoFallback?: string;
  flagSrc?: string;
  countryName?: string;
  spendLabel?: string;
  spendValue?: string;
  paymentTermsLabel?: string;
  paymentTermsValue?: string;
  cashFlowLabel?: string;
  cashFlowValue?: string;
  rebateLabel?: string;
  rebateValue?: string;
  teamLabel?: string;
  partialLabel?: string;
  updatedAt?: string;
  statusLabel?: string;
  plans?: string[];
  commentCount?: number | null;
  avatars?: KanbanCardAvatar[];
  disabled?: boolean;
};
