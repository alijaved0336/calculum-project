/**
 * Props for the presentational `NewsCard`.
 *
 * Navigation is left to the parent: the card never calls `window.open` and is
 * not wrapped in an `<a>`. Root and Read More each emit a single `click`
 * (`MouseEvent`, `url`). Listen to `@click` and open `url` there so the card
 * cannot double-open. Root click is mouse-only (no tabindex/keyboard handler);
 * Read More is the keyboard-accessible path unless the parent wraps the card.
 */
export type NewsCardProps = {
  title: string;
  description?: string;
  url?: string;
  image?: string | null;
  source?: string;
  /** Already formatted display string (e.g. `Jun 3, 2026`). */
  date?: string;
  readMoreLabel?: string;
  placeholderImage?: string;
  /** Defaults to `title` when omitted. */
  imageAlt?: string;
  /**
   * When `true` (default), image stacks above content.
   * When `false`, image sits to the left of content.
   */
  isVertical?: boolean;
};
