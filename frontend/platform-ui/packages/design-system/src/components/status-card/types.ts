export const STATUS_CARD_VARIANTS = [
  "success",
  "warning",
  "danger",
] as const;

export type StatusCardVariant = (typeof STATUS_CARD_VARIANTS)[number];

export type StatusCardItem = {
  label: string;
  value: string;
};
