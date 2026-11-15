import type { CalculationStatus } from '@/api'

/** One UC-API-04 payload factory for every suite that drives the progress feature. */
export const statusOf = (
  status: string | null,
  extra: Partial<CalculationStatus> = {},
): CalculationStatus => ({
  saleFileVersionId: 73,
  status,
  isError: false,
  statusDescription: null,
  currentStep: null,
  totalSteps: null,
  currentStepName: null,
  parsedAt: null,
  dateLastRecalculated: null,
  ...extra,
})
