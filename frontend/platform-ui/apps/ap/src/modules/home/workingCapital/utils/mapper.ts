import type { WaptSideDays, WorkingCapitalComparisonResult, WorkingCapitalCompareApiResponse } from '../types'

// waptTargetFrom is newer than the rest of the wapt block, so a backend that has
// not shipped it yet reads as 0 rather than undefined reaching the bar widths.
function withTargetFrom(side: any): WaptSideDays {
  return {
    waptFrom:       side?.waptFrom       ?? 0,
    waptTo:         side?.waptTo         ?? 0,
    waptTargetFrom: side?.waptTargetFrom ?? 0,
    waptTarget:     side?.waptTarget     ?? 0,
  }
}

// AC-08/AC-09 — ranked lists show up to 10 entries; fewer entries are shown as-is (no padding).
const MAX_LIST_ITEMS = 10

export function mapApiResponseToResult(data: WorkingCapitalCompareApiResponse): WorkingCapitalComparisonResult {
  const s = data.summary as any
  const c = data.supplierCoverage as any
  const w = data.wapt as any
  return {
    totalImprovedCashFlow:      s?.totalImprovedCashFlow      ?? 0,
    targetCashFlow:             s?.targetCashFlow             ?? 0,
    // AC-03 — improved-suppliers-only cash flow target. Not populated by the backend yet
    // (WorkingCapitalComparisonService.php only accumulates targetCashFlow across all
    // matched suppliers); defaults to 0 like every other field here until that ships.
    improvedTargetCashFlow:     s?.improvedTargetCashFlow     ?? 0,
    suppliersImproved:          s?.suppliersImproved          ?? data.topSuppliersTotal ?? 0,
    suppliersMatchNotIncreased: c?.matchedNotIncreased        ?? 0,
    suppliersNotMatched:        c?.notMatched                 ?? 0,
    suppliersPresentOnlyInOlderFile: c?.presentOnlyInOlderFile ?? 0,
    totalAnalyzed:              c?.totalAnalyzed              ?? 0,
    targetAchievementPct:       s?.targetAchievementPct       ?? 0,
    waptGainDays:               w?.gainDays                   ?? 0,
    waptFromDays:               w?.fromDays                   ?? 0,
    waptToDays:                 w?.toDays                     ?? 0,
    waptTargetFromDays:         w?.targetFromDays             ?? 0,
    waptTargetDays:             w?.targetDays                 ?? 0,
    matchedSuppliers:  withTargetFrom(w?.matchedSuppliers),
    improvedSuppliers: withTargetFrom(w?.improvedSuppliers),
    fromYear: data.baseVersion.year,
    toYear:   data.latestVersion.year,
    fromDate: data.baseVersion.finalDate,
    toDate:   data.latestVersion.finalDate,
    currency: data.currency,
    cashFlowByCountry:     (data.cashFlowByCountry ?? []).slice(0, MAX_LIST_ITEMS),
    paymentTermsByCountry: (data.paymentTermsByCountry ?? []).slice(0, MAX_LIST_ITEMS),
    topSuppliers:          (data.topSuppliers ?? []).slice(0, MAX_LIST_ITEMS),
    // AC-09 — the full matched-supplier list, untruncated (unlike the lists above).
    allMatchedSuppliers:   data.allMatchedSuppliers ?? [],
    // WI#20545 — every active-file supplier for the List sub-tab: never capped, the
    // List and its Excel must hold all of them (AC-02, AC-13).
    supplierList:          data.supplierList ?? [],
  }
}
