/**
 * AB#20702: the switches between the mocked Setup APIs and the real ones, one per API so each goes
 * live when its backend does. Screens import from here and never from a concrete client.
 *
 * - Strategies + status (#20701, Rolando): real. The wire contract is `setupStrategies.wire.ts`.
 * - Harmonization (#20732, Aldo): real, on Aldo's `ada/ar-team/s-119/h-20718/company-harmonization-groups`.
 * - Client Standard groups (#20759, Aldo): real, on Aldo's `ada/ar-team/s-119/h-20746/client-standard-groups-api`
 *   (PR 15105). The wire contract is `clientStandardGroups.wire.ts`.
 * - Cash flow basis (#20761): mocked until `AdminCashFlowBasisController` is deployed.
 *
 * To take one live: flip its constant, check its client against the backend's contract, then delete
 * its `*.mock.ts` file.
 */
import { mockSetupStrategiesApi } from './setupStrategies.mock'
import { realSetupStrategiesApi } from './setupStrategies'
import type { SetupStrategiesApi } from './setupStrategies.types'
import type { SetupTabId } from '../composables/useSetupSections'
import { mockHarmonizationApi } from './harmonization.mock'
import { realHarmonizationApi, type HarmonizationApi } from './harmonization'
import { mockClientStandardApi } from './clientStandardGroups.mock'
import { realClientStandardApi, type ClientStandardApi } from './clientStandardGroups'
import { mockCashFlowBasisApi } from './cashFlowBasis.mock'
import { realCashFlowBasisApi, type CashFlowBasisApi } from './cashFlowBasis'

export const SETUP_STRATEGIES_API_MOCKED = false
export const HARMONIZATION_API_MOCKED = false
export const CLIENT_STANDARD_API_MOCKED = false
export const CASH_FLOW_BASIS_API_MOCKED = true

/**
 * The tabs whose backend is in Ada-Platform master. A tab still on a mock stays hidden (`v-show`) and
 * shows up when its flag flips. Cash Flow also waits on the impact limits controller, not in master yet.
 */
export const SETUP_TAB_READY: Record<SetupTabId, boolean> = {
  'payment-terms': true,
  'client-standard': !CLIENT_STANDARD_API_MOCKED,
  'cash-flow': !CASH_FLOW_BASIS_API_MOCKED,
}

/** True while a visible Setup section still answers from a mock (the view shows a preview notice). */
export const SETUP_API_MOCKED = SETUP_STRATEGIES_API_MOCKED || HARMONIZATION_API_MOCKED
  || (SETUP_TAB_READY['client-standard'] && CLIENT_STANDARD_API_MOCKED)
  || (SETUP_TAB_READY['cash-flow'] && CASH_FLOW_BASIS_API_MOCKED)

export const setupApi: SetupStrategiesApi = SETUP_STRATEGIES_API_MOCKED ? mockSetupStrategiesApi : realSetupStrategiesApi
export const harmonizationApi: HarmonizationApi = HARMONIZATION_API_MOCKED ? mockHarmonizationApi : realHarmonizationApi
export const clientStandardApi: ClientStandardApi = CLIENT_STANDARD_API_MOCKED ? mockClientStandardApi : realClientStandardApi
export const cashFlowBasisApi: CashFlowBasisApi = CASH_FLOW_BASIS_API_MOCKED ? mockCashFlowBasisApi : realCashFlowBasisApi

export * from './setupStrategies.types'
export { fieldErrorsFromWire, type WireRefusalBody } from './setupStrategies.wire'
export type * from './harmonization'
export type * from './clientStandardGroups'
export type * from './cashFlowBasis'
