export interface RangeSliderValue {
  start: number;
  end: number;
}

export type RangeSliderFormatValue = (value: number) => string;

export const RANGE_SLIDER_DEFAULT_TICK_COUNT = 5;
export const RANGE_SLIDER_DEFAULT_STEP = 1;
