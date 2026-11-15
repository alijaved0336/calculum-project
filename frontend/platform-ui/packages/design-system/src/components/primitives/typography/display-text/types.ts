export const DISPLAY_VARIANTS = ['2xl', 'lg', 'md', 'sm'] as const;

export type DisplayVariant = (typeof DISPLAY_VARIANTS)[number];

export const DISPLAY_LABELS: Record<DisplayVariant, string> = {
  '2xl': 'Display 2xl / Bold / 72px',
  lg: 'Display lg / Bold / 48px',
  md: 'Display md / Bold / 36px',
  sm: 'Display sm / Semi Bold / 30px',
};
