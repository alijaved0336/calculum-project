// Set USE_MOCK = false when the backend endpoints are stable.
import type { WorkingCapitalCompareApiResponse, WCVersion } from '../types'
import type { ApiResponse } from '@/services/api/response'

export const USE_MOCK = false

const BASE_VERSION: WCVersion  = { uuid: 'mock-base-uuid',   version: 3, name: 'Acme Corp', initialDate: '2024-01-01', finalDate: '2024-12-31', year: '2024' }
const LATEST_VERSION: WCVersion = { uuid: 'mock-latest-uuid', version: 4, name: 'Acme Corp', initialDate: '2025-01-01', finalDate: '2025-12-31', year: '2025' }

export const MOCK_VERSIONS_RESPONSE: ApiResponse = {
  success: true,
  code: 200,
  data: { versions: [LATEST_VERSION, BASE_VERSION], minDays: 5 },
}

// Story 3 — Backend's export-log endpoint (AC-08); response shape is a plain ack.
export const MOCK_EXPORT_LOG_RESPONSE: ApiResponse = {
  success: true,
  code: 200,
  data: { success: true },
}

export const MOCK_COMPARE_RESPONSE: ApiResponse = {
  success: true,
  code: 200,
  data: {
    baseVersion:   BASE_VERSION,
    latestVersion: LATEST_VERSION,
    minDays:       5,
    currency:      'USD',
    summary: {
      totalImprovedCashFlow:   194_559_413,
      targetCashFlow:          246_588_076,
      improvedTargetCashFlow:  198_741_202,
      suppliersImproved:       1_236,
      targetAchievementPct:    79,
    },
    supplierCoverage: {
      matchedIncreased:    1_236,
      matchedNotIncreased: 9_100,
      notMatched:          19_559,
      totalAnalyzed:       19_795,
    },
    wapt: {
      gainDays:   27.4,
      fromDays:   85.1,
      toDays:     112.5,
      targetFromDays: 98.2,
      targetDays: 116.8,
      matchedSuppliers:  { waptFrom: 70.7, waptTo: 76.5,  waptTargetFrom: 81.2, waptTarget: 93.4  },
      improvedSuppliers: { waptFrom: 85.1, waptTo: 112.5, waptTargetFrom: 98.2, waptTarget: 116.8 },
    },
    cashFlowByCountry: [
      { country: 'Japan',          amount: 159_091_748 },
      { country: 'United States',  amount:  10_967_501 },
      { country: 'Germany',        amount:   4_134_189 },
      { country: 'Italy',          amount:   2_521_634 },
      { country: 'Singapore',      amount:     267_697 },
      { country: 'Czech Republic', amount:     127_180 },
      { country: 'Ireland',        amount:     112_519 },
    ],
    paymentTermsByCountry: [
      { country: 'Japan',          waptFrom: 95.6, increase: 27.2 },
      { country: 'Italy',          waptFrom: 68.2, increase:  4.6 },
      { country: 'Germany',        waptFrom: 60.9, increase:  3.4 },
      { country: 'Romania',        waptFrom: 44.6, increase:  3.4 },
      { country: 'Singapore',      waptFrom: 57.1, increase:  1.6 },
      { country: 'Czech Republic', waptFrom: 32.9, increase:  1.1 },
      { country: 'Greece',         waptFrom: 64.3, increase:  1.1 },
    ],
    topSuppliers: [
      { supplier: 'Aska Pharmaceutical Co., Ltd.',      country: 'Japan',     cashFlow: 34_942_876, termsFrom: 120, termsTo: 150, extension: 30 },
      { supplier: 'Senju Pharmaceutical Co., Ltd.',     country: 'Japan',     cashFlow: 20_654_163, termsFrom: 120, termsTo: 150, extension: 30 },
      { supplier: 'Nichi-Iko Pharmaceutical Co., Ltd.', country: 'Japan',     cashFlow: 11_925_023, termsFrom: 120, termsTo: 150, extension: 30 },
      { supplier: 'Teijin Pharma Limited',              country: 'Japan',     cashFlow: 11_459_581, termsFrom: 179, termsTo: 210, extension: 31 },
      { supplier: 'Otsuka Pharmaceutical Co., Ltd.',    country: 'Japan',     cashFlow:  9_692_892, termsFrom:  30, termsTo:  45, extension: 15 },
      { supplier: 'Pfizer Japan Inc.',                  country: 'Japan',     cashFlow:  5_733_147, termsFrom:  90, termsTo: 120, extension: 30 },
      { supplier: 'RESOLUTION MEDIA INC.',              country: 'United States',       cashFlow:  4_999_979, termsFrom:  75, termsTo:  90, extension: 15 },
      { supplier: 'CBC CO., LTD.',                      country: 'Singapore', cashFlow:  4_900_824, termsFrom: 150, termsTo: 179, extension: 29 },
      { supplier: 'IDT Biologika GmbH',                 country: 'Germany',   cashFlow:  4_461_661, termsFrom:  75, termsTo:  90, extension: 15 },
    ],
    topSuppliersTotal: 1_236,
    // Story 3 — full matched list (AC-09): superset of topSuppliers, includes
    // matched-but-not-improved suppliers too (e.g. Kyowa below), unlike topSuppliers.
    allMatchedSuppliers: [
      { supplier: 'Aska Pharmaceutical Co., Ltd.',      country: 'Japan',     cashFlow: 34_942_876, termsFrom: 120, termsTo: 150, extension: 30 },
      { supplier: 'Senju Pharmaceutical Co., Ltd.',     country: 'Japan',     cashFlow: 20_654_163, termsFrom: 120, termsTo: 150, extension: 30 },
      { supplier: 'Nichi-Iko Pharmaceutical Co., Ltd.', country: 'Japan',     cashFlow: 11_925_023, termsFrom: 120, termsTo: 150, extension: 30 },
      { supplier: 'Teijin Pharma Limited',              country: 'Japan',     cashFlow: 11_459_581, termsFrom: 179, termsTo: 210, extension: 31 },
      { supplier: 'Otsuka Pharmaceutical Co., Ltd.',    country: 'Japan',     cashFlow:  9_692_892, termsFrom:  30, termsTo:  45, extension: 15 },
      { supplier: 'Pfizer Japan Inc.',                  country: 'Japan',     cashFlow:  5_733_147, termsFrom:  90, termsTo: 120, extension: 30 },
      { supplier: 'RESOLUTION MEDIA INC.',              country: 'United States',       cashFlow:  4_999_979, termsFrom:  75, termsTo:  90, extension: 15 },
      { supplier: 'CBC CO., LTD.',                      country: 'Singapore', cashFlow:  4_900_824, termsFrom: 150, termsTo: 179, extension: 29 },
      { supplier: 'IDT Biologika GmbH',                 country: 'Germany',   cashFlow:  4_461_661, termsFrom:  75, termsTo:  90, extension: 15 },
      { supplier: 'Kyowa Kirin Co., Ltd.',              country: 'Japan',     cashFlow:          0, termsFrom:  60, termsTo:  60, extension:  0 },
    ],
  } as WorkingCapitalCompareApiResponse,
}
