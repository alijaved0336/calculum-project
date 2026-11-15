export const SUPPLIER_CARD_SLIDER_DEFAULT_SLIDES_PER_VIEW = 5;
export const SUPPLIER_CARD_SLIDER_DEFAULT_SPACE_BETWEEN = 16;

export type SupplierCardSliderProps = {
  /** Slide payloads. Opaque to the slider; rendered via the `#item` slot. */
  items: readonly unknown[];
  /**
   * Swiper `slidesPerView`. Default 5 — five full cards, no peek.
   * When `items.length` does not overflow this value, carousel chrome is off
   * (with the default, 0–5 items hide chrome; 6+ show it).
   */
  slidesPerView?: number;
  /** Gap between slides in px. Default 16. */
  spaceBetween?: number;
};

export type SupplierCardSliderItemSlot = {
  item: unknown;
  index: number;
};
