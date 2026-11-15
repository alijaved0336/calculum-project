import { get, postNoContent } from './http'

/** API-23's own response shape (`Ada.Ar.Api.Models.DisclaimerAcknowledgementStatusResponse`). */
export interface DisclaimerAcknowledgementStatusResponse {
  /** True when this caller has never acknowledged the disclaimer - UI-22's modal is still owed. */
  owed: boolean
}

/** Whether the current user still owes UI-22's mandatory first-login disclaimer modal. */
export const fetchDisclaimerAcknowledgementStatus = (): Promise<DisclaimerAcknowledgementStatusResponse> =>
  get('/api/disclaimer-acknowledgement')

/** Records the current user's acknowledgment. Idempotent - a repeat call for an already-
 * acknowledged user is a no-op on the backend, not a duplicate record. */
export const acknowledgeDisclaimer = (): Promise<void> =>
  postNoContent('/api/disclaimer-acknowledgement')
