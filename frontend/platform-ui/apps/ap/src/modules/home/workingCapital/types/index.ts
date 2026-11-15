export interface CashFlowByCountryItem {
  country: string
  amount: number
}

export interface PaymentTermsByCountryItem {
  country: string
  waptFrom: number
  increase: number
}

export interface TopSupplierItem {
  supplier:  string
  country:   string
  cashFlow:  number
  termsFrom: number
  termsTo:   number
  extension: number
}

// WI#20545 BR-01 — a supplier of the active file, as the Achievement List shows it.
export type SupplierListStatus = 'matchedIncreased' | 'matched' | 'notMatched'

// One row of the Achievement List (WI#20545). Amounts are in the company currency;
// the List converts them to the top-bar currency. Every comparison-file value is null
// when the supplier was not found there, and each cash flow opportunity is null when
// that file has no payment terms or no target (EF-1).
export interface SupplierListItem {
  supplier: string
  country: string
  status: SupplierListStatus
  currentPt: number | null
  currentVolume: number
  currentCfOpportunity: number | null
  currentTargetPt: number | null
  comparisonPt: number | null
  comparisonVolume: number | null
  comparisonCfOpportunity: number | null
  comparisonTargetPt: number | null
}

// One supplier group's four WAPT day-values: both sides and both targets.
export interface WaptSideDays {
  waptFrom: number
  waptTo: number
  waptTargetFrom: number
  waptTarget: number
}

// Frontend flat shape consumed by all chart components
export interface WorkingCapitalComparisonResult {
  totalImprovedCashFlow: number
  targetCashFlow: number
  improvedTargetCashFlow: number
  suppliersImproved: number
  suppliersMatchNotIncreased: number
  suppliersNotMatched: number
  suppliersPresentOnlyInOlderFile: number
  totalAnalyzed: number
  waptGainDays: number
  waptFromDays: number
  waptToDays: number
  // Each side reports its OWN target: the target moves between versions (a new
  // program model raises it), so waptTargetFromDays is the base version's target
  // and waptTargetDays stays the latest version's.
  waptTargetFromDays: number
  waptTargetDays: number
  targetAchievementPct: number
  matchedSuppliers: WaptSideDays
  improvedSuppliers: WaptSideDays
  fromYear: string
  toYear: string
  // Raw ISO finalDate of each version, for month+year display (e.g. WAPT Improvement
  // chart labels) where a bare year is ambiguous across spend files with different
  // period boundaries. Additive alongside fromYear/toYear, which stay as-is for
  // consumers that only need the bare year.
  fromDate: string
  toDate: string
  currency: string
  cashFlowByCountry: CashFlowByCountryItem[]
  paymentTermsByCountry: PaymentTermsByCountryItem[]
  topSuppliers: TopSupplierItem[]
  // AC-09 — the FULL matched-supplier list (not just the top-ranked/improved entries
  // in `topSuppliers`), untruncated. Named distinctly from `matchedSuppliers` above
  // (that one is the WAPT aggregate, not a supplier list) to avoid confusion.
  allMatchedSuppliers: TopSupplierItem[]
  // WI#20545 — every supplier of the active file, uncapped, for the List sub-tab.
  supplierList: SupplierListItem[]
}

// Version object as returned by GET /api/working-capital/versions and /compare
export interface WCVersion {
  uuid: string
  version: number
  name: string
  initialDate: string
  finalDate: string
  year: string
}

// Raw response shape from GET /api/working-capital/versions
export interface WCVersionsApiResponse {
  versions: WCVersion[]
  minDays: number
}

// Raw response shape from GET /api/working-capital/compare
// summary / supplierCoverage / wapt are filled by WI#17229; arrays by WI#17231
export interface WorkingCapitalCompareApiResponse {
  baseVersion: WCVersion
  latestVersion: WCVersion
  minDays: number
  currency: string
  summary: Record<string, number>
  supplierCoverage: Record<string, number>
  wapt: Record<string, any>
  cashFlowByCountry: CashFlowByCountryItem[]
  paymentTermsByCountry: PaymentTermsByCountryItem[]
  topSuppliers: TopSupplierItem[]
  topSuppliersTotal: number
  // AC-09 — optional so existing mock/test payloads without it keep compiling.
  allMatchedSuppliers?: TopSupplierItem[]
  // WI#20545 — optional for the same reason.
  supplierList?: SupplierListItem[]
}
