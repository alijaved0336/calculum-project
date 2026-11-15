import { StringUtils } from '@/utils';

export interface ForecastValues {
  foreCastComputedPercentage: number;
  isForeCastPositiveValue: boolean;
  foreCastPercentageComputedBigNumbers: string;
  foreCastComputedIfExists: boolean;
  forecastValueComputed: string;
}

/**
 * Calculate forecast values based on spend volume and forecast volume
 * @param spendVolume The current spend volume
 * @param forecastVolume The forecasted spend volume
 * @returns Object containing all forecast-related computed values
 */
export function calculateForecastValues(
  spendVolume: number | null | undefined,
  forecastVolume: number | null | undefined
): ForecastValues {
  // Calculate percentage difference
  const foreCastComputedPercentage = calculateForecastPercentage(spendVolume, forecastVolume);

  // Check if positive value
  const isForeCastPositiveValue = foreCastComputedPercentage !== null && foreCastComputedPercentage >= 0;

  // Format percentage as big numbers string
  const foreCastPercentageComputedBigNumbers = StringUtils.formatBigNumbers(foreCastComputedPercentage ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Check if forecast exists and is not zero percentage
  const foreCastComputedIfExists = !StringUtils.isNullUndefinedOrEmpty(forecastVolume) && foreCastComputedPercentage !== 0;

  // Format forecast value as big numbers string
  const forecastValueComputed = StringUtils.formatBigNumbers(forecastVolume ?? 0);

  return {
    foreCastComputedPercentage,
    isForeCastPositiveValue,
    foreCastPercentageComputedBigNumbers,
    foreCastComputedIfExists,
    forecastValueComputed
  };
}

/**
 * Calculate the percentage difference between forecast and actual
 * @param spendVolume The actual spend volume
 * @param forecastVolume The forecasted spend volume
 * @returns The percentage difference rounded to 2 decimal places
 */
export function calculateForecastPercentage(
  spendVolume: number | null | undefined,
  forecastVolume: number | null | undefined
): number {
  if (!spendVolume || forecastVolume == null) return 0;
  const diff = forecastVolume - spendVolume;
  return Math.round((diff / spendVolume) * 100 * 100) / 100;
}
