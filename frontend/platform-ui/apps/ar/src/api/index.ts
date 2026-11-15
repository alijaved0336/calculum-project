/**
 * Client for the AR .NET API (Ada.Ar.Api) read endpoints that expose the sale-file
 * parse output: files/versions, imported lines (matches), the no-match bucket,
 * parse errors and parsed companies.
 *
 * The AR app talks to a single backend: VITE_BASE_URL (the same base the auth session
 * uses). Cross-origin in dev (8082 -> 65175) is allowed by the API's CORS policy.
 */
import { del, get, getAllPages, getNoContent, post, put } from './http'

export * from './currencies'

export interface SaleFileVersionSummary {
  id: number
  uuid: string
  version: number
  status: string | null
  statusDescription: string | null
  periodStartDate: string | null
  periodEndDate: string | null
  readRowCount: number
  importedLineCount: number
  noMatchRowCount: number
  errorCount: number
  parsedAt: string | null
}

export interface SaleFileSummary {
  id: number
  uuid: string
  name: string
  companyId: number
  versions: SaleFileVersionSummary[]
}

/**
 * One version row from `GET /api/companies/{companyUuid}/sale-file-versions` - flat, not
 * nested under its file: the parent file's identity (`saleFileId`/`saleFileUuid`/`saleFileName`)
 * rides alongside the version's own fields, because this endpoint lists every version of every
 * file a company owns as a single ordered feed (newest first), not a file picker that happens
 * to also carry versions.
 */
export interface CompanySaleFileVersionDto {
  id: number
  uuid: string
  version: number
  status: string | null
  statusDescription: string | null
  saleFileId: number
  saleFileUuid: string
  saleFileName: string
  periodStartDate: string | null
  periodEndDate: string | null
  readRowCount: number
  importedLineCount: number
  noMatchRowCount: number
  errorCount: number
  parsedAt: string | null
  dateLastRecalculated: string | null
  created: string
}

export interface CompanySaleFileVersionsResponse {
  companyUuid: string
  total: number
  versions: CompanySaleFileVersionDto[]
  /** Keyset cursor: the last row's own `id`, not a page number or opaque token. Null past the last page. */
  nextCursor: number | null
}

export interface SaleFileVersionDetail extends SaleFileVersionSummary {
  saleFileId: number
  skippedRowCount: number
  numberOfBuyingEntities: number
  numberOfParents: number
  numberOfSuppliers: number
  numberOfCustomers: number
}

export interface ParseErrorGroup {
  sheet: string
  columnRef: string
  errorCode: string
  severity: string
  storedRows: number
}

export interface VersionDetailResponse {
  version: SaleFileVersionDetail
  /** Sum of the imported lines' volume, currencies NOT converted (informative). */
  totalVolume: number
  errorGroups: ParseErrorGroup[]
}

export interface SaleLineRow {
  id: number
  sourceRowNumber: number | null
  buyer: string | null
  supplier: string | null
  currency: string | null
  salesTeam: string | null
  volume: number
  actualPaymentTerms: number
  contractualPaymentTermsWithoutCashDiscounts: number | null
  contractualPaymentTermsWithCashDiscounts: number | null
  startDate: string
  endDate: string
  year: number
  periodInMonths: number
  commodity: string | null
  internalId: string | null
}

export interface LinesPageResponse {
  total: number
  page: number
  pageSize: number
  lines: SaleLineRow[]
}

export interface NoMatchRow {
  sourceRowNumber: number
  rawName: string
  reason: string
}

export interface ParseErrorRow {
  sheet: string
  rowNumber: number
  columnRef: string
  errorCode: string
  severity: string
  message: string
}

/** UC-MOD-01's structural role: "Self" (the tenant's own entity), "Counterparty" (AR's buyer)
 * or "Parent" (a counterparty's ultimate parent) — exactly ParsedCompanyDto.Role's three values,
 * not the UI label a screen chooses to show for one. */
export type PartyRole = 'Self' | 'Counterparty' | 'Parent'

export interface ParsedCompanyRow {
  id: number
  /**
   * Structural position in the trade: `Self`, `Counterparty` or `Parent`.
   *
   * Three fields where there was one. The backend replaced a single `companyType`
   * discriminator with three orthogonal axes (UC-MOD-01), because the old column
   * conflated structural role, matching progress and lifecycle, and a filter for one
   * of them could not avoid also filtering the others.
   */
  role: PartyRole
  /** Matching progress: `Named`, `Resolved` or `Enriched`. */
  resolution: string
  /** `Actual`, `Potential` or `Pilot`. */
  lifecycle: string
  sourceRowNumber: number
  companyName: string | null
  country: string | null
  industry: string | null
  ultimateParentId: number | null
  internalId: string | null
  annualRevenue: number | null
  /**
   * Added by UC-API-06 alongside the roster columns below, none of which the Companies tab (the
   * first caller of this endpoint) needed: the buyer roster is where "credit limit, credit
   * rating, parent and payment-term columns" is the whole point, not an incidental extra field.
   */
  creditLimit: number | null
  actualPaymentTermsAvg: number | null
  contractualPaymentTermsWithCashDiscountsAvg: number | null
  contractualPaymentTermsWithoutCashDiscountsAvg: number | null
  /** ADA's own internal letter grade for this party's credit-score band. Null until the strategy
   * chain has run for this buyer, or when neither tier produced a positive score. */
  creditRating: string | null
}

export interface CompanyCatalogEntry {
  id: number
  uuid: string
  name: string
  canonicName: string | null
  domain: string | null
  country: string | null
  industry: string | null
  created: string | null
  saleFileCount: number
}

export interface CompanyCatalogResponse {
  total: number
  companies: CompanyCatalogEntry[]
}

/**
 * The company (or companies) this session may act as, with how many sale files each one owns.
 *
 * A single active company per session (AP parity), so `companies` holds at most one row today —
 * it stays a list because it is what a company picker binds to.
 */
export const fetchCompanyCatalog = (search?: string): Promise<CompanyCatalogResponse> =>
  get('/api/companies', { search })

/** One company this session may work in (UC-ENT-19). */
export interface SwitchableCompany {
  uuid: string
  name: string
}

export interface SwitchableCompaniesResponse {
  companies: SwitchableCompany[]

  /**
   * The company the session is scoped to right now, or null when there is none.
   *
   * **The picker preselects this and not what the browser remembered.** Those two could not
   * disagree while a user had one receivables company; with two they can, and the disagreement is
   * invisible — the control renders company B while every request is scoped to A.
   *
   * It can also name a company that is NOT in `companies`: the session's company can lose
   * `MODULE_AR`, or the caller can be disabled at it, and then it is no longer switchable. That is
   * why it is one field rather than a flag on each row.
   */
  activeCompanyUuid: string | null
}

/**
 * The receivables companies this session may switch between (UC-ENT-19).
 *
 * **Not `fetchCompanyCatalog`.** That reads `/api/companies`, which is scoped to the session's own
 * company and therefore answers at most one row by construction — which is why a user entitled to
 * two saw one, and why their second company was unreachable rather than badly rendered.
 */
export const fetchSwitchableCompanies = (): Promise<SwitchableCompaniesResponse> =>
  get('/api/session/companies')

/**
 * Points the session at another of the caller's receivables companies (UC-ENT-19).
 *
 * **Resolves on 204 and throws on anything else**, which is what lets the picker put itself back:
 * 404 for a company that is not the caller's, 403 for one that is theirs and no longer usable in
 * receivables, 409 while the session is being written to. A caller that swallowed these would leave
 * a dropdown showing a company the session is not in.
 *
 * The next request is scoped to the new company, so whatever the caller has already loaded belongs
 * to the old one and has to be fetched again.
 */
export const switchActiveCompany = (companyUuid: string): Promise<void> =>
  put('/api/session/active-company', { companyUuid })

/**
 * Renews the receivables session before its access token expires (UC-ENT-08).
 *
 * **Resolves on 200 with an empty body**, which is the point: the rotated token is written into the
 * `HttpOnly` cookie and never returned to the page.
 *
 * Everything else throws an `HttpError` carrying the status, so a caller CAN branch on it. What
 * the server means by each:
 *
 * - **409** — another renewal for this session is in flight, or the store could not apply this one.
 *   Not a failure to report; the first caller's response already wrote the cookie into this same
 *   browser.
 * - **502** — B2C could not renew, or is refusing inside the grace window. The session is untouched
 *   and still valid until its own expiry, so this is a retry and emphatically not a sign-out.
 * - **401** — the session is already gone, and `getNoContent` has sent the browser to sign in.
 *
 * **The keep-alive deliberately branches on NONE of them**, and this line used to imply it did.
 * Raised in review of this pull request, where the doc read "the caller branches on the status" and
 * the only caller catches every rejection into one `console.warn`. That is the design rather than an
 * omission: 409 and 502 both mean "the session may or may not have moved, look at it again", which
 * is what the pass does next in either case, and the delay that follows comes from the session's own
 * expiry with a floor under it. A branch here would be two code paths computing the same delay, and
 * the first thing anybody would add to it is a retry counter — which is precisely what the floor
 * exists to avoid needing. A future caller that genuinely needs the distinction has it on the error.
 */
export const refreshSession = (): Promise<void> => getNoContent('/api/session/refresh-token')

/**
 * Every sale-file version belonging to one company, newest first. Paginates through the
 * endpoint's own keyset cursor (`versions`/`nextCursor`, not the `items`/`nextCursor` shape
 * `getAllPages` expects) so a company with more than one page of versions doesn't silently lose
 * the rest to whichever page happened to come back first.
 */
export const fetchSaleFilesByCompany = async (company: string): Promise<CompanySaleFileVersionDto[]> => {
  const versions: CompanySaleFileVersionDto[] = []
  let after: number | undefined

  for (;;) {
    const page = await get<CompanySaleFileVersionsResponse>(
      `/api/companies/${company}/sale-file-versions`,
      { after, limit: 500 },
    )
    versions.push(...page.versions)
    if (page.nextCursor == null) {
      return versions
    }
    after = page.nextCursor
  }
}

export const fetchSaleFiles = (): Promise<SaleFileSummary[]> =>
  getAllPages('/api/sale-files')

/** `currencyRate` scales `totalVolume` (and any other money figure the response carries) from
 * USD into the navbar's selected currency (`useArCurrenciesStore.currency`) - 1 leaves it in USD. */
export const fetchVersionDetail = (versionId: number, currencyRate = 1): Promise<VersionDetailResponse> =>
  get(`/api/sale-file-versions/${versionId}`, { currencyRate })

/**
 * UC-API-04: where one version's calculation stands right now. Polling only - the backend
 * offers no push channel, and its own doc header says so.
 *
 * `statusDescription` is the raw `[n/total] StepNN Name` text the pipeline wrote;
 * `currentStep`/`totalSteps`/`currentStepName` are the server's decode of it, and all three are
 * null whenever the text does not match that shape - including the pipeline's own initial
 * `[0/0] (not started)`, which carries no `StepNN`. A view renders the raw text and treats the
 * decoded triple as a bonus, never a guarantee.
 */
export interface CalculationStatus {
  saleFileVersionId: number
  status: string | null
  /** True only for `errorCalculating` and `errorReCalculating`. */
  isError: boolean
  statusDescription: string | null
  currentStep: number | null
  totalSteps: number | null
  currentStepName: string | null
  parsedAt: string | null
  dateLastRecalculated: string | null
}

export const fetchVersionStatus = (versionId: number): Promise<CalculationStatus> =>
  get(`/api/sale-file-versions/${versionId}/status`)

/** The 202 body of an accepted recalculation: the version as it now stands (`recalculateClaimed`). */
export interface RecalculateAccepted {
  saleFileVersionId: number
  status: string | null
}

/**
 * Asks for a recalculation (UC-FE-05a A1). Answers 202 with the claimed version, 404 for an
 * unknown or other-tenant version, and **409 when the status machine refuses the claim** - the
 * caller reads the refusal detail from the `HttpError`'s body rather than pre-checking, since
 * the status can move between the last poll and this request anyway.
 */
export const recalculateVersion = (versionId: number): Promise<RecalculateAccepted> =>
  post(`/api/sale-file-versions/${versionId}/recalculate`, {})

/** The 202 body of an accepted resync: every version the request actually enqueued. */
export interface OpportunityResyncAccepted {
  enqueuedVersionIds: number[]
}

/**
 * Rebuilds one version's opportunity projections from its calculation output — the summary facts
 * the Opportunity grids read, which are a projection rather than a source and so can be behind
 * whenever their shape changes without the version being recalculated.
 *
 * <p>Answers 202 with the ids it enqueued, 404 for an unknown or other-tenant version, and **409
 * when the version is not `ready`**: a version mid-calculation has a half-written enrichment row,
 * and projecting it would publish figures the pipeline is still changing. The refusal detail is
 * read from the `HttpError`'s `{ error }` body rather than pre-checked, since the status can move
 * between the list this was clicked from and the request itself.</p>
 */
export const resyncOpportunity = (versionId: number): Promise<OpportunityResyncAccepted> =>
  post(`/api/opportunity/resync/${versionId}`, {})

export const fetchLines = (versionId: number, page: number, pageSize: number): Promise<LinesPageResponse> =>
  get(`/api/sale-file-versions/${versionId}/lines`, { page, pageSize })

export const fetchNoMatches = (versionId: number): Promise<NoMatchRow[]> =>
  getAllPages(`/api/sale-file-versions/${versionId}/no-matches`)

export const fetchErrors = (versionId: number, severity?: string): Promise<ParseErrorRow[]> =>
  getAllPages(`/api/sale-file-versions/${versionId}/errors`, (after) =>
    after === undefined ? { severity } : { severity, after })

/**
 * The parsed parties of a version, optionally filtered to one structural role.
 *
 * The parameter is `role`, not `companyType`: the endpoint parses it into the
 * `PartyRole` enum and answers **400** for a value it does not recognise, so the old
 * `?companyType=buyer` did not degrade to an unfiltered list, it failed the request.
 */
export const fetchCompanies = (versionId: number, role?: PartyRole): Promise<ParsedCompanyRow[]> =>
  getAllPages(`/api/sale-file-versions/${versionId}/companies`, (after) =>
    after === undefined ? { role } : { role, after })

/**
 * The custom-attribute schema declared for one version's sale lines - what a line's own
 * `customAttributes` values (see SaleLineDto) are keyed against by `ordinal`, not the values
 * themselves. A bare array, not paged or wrapped: Ada-Platform's GetCustomAttributes deliberately
 * keeps the physical storage slot (family/index) out of the response, returning only the
 * declarations actually in use for this version.
 */
export interface CustomAttributeDefinition {
  ordinal: number
  title: string
  dataType: 'text' | 'integer' | 'decimal' | 'boolean' | 'date'
  aggregation: 'list' | 'number' | 'money' | 'days' | 'any' | 'every' | 'earliest' | 'latest'
  hasData: boolean
}

export const fetchCustomAttributes = (versionId: number): Promise<CustomAttributeDefinition[]> =>
  get(`/api/sale-file-versions/${versionId}/custom-attributes`)

/**
 * UC-OPP-14/16's two nine-box axes (`ProbabilityTier`/`CashFlowImpactTier` on
 * `OpportunityPortfolioRow` below), both Low/Medium/High. Null on either axis means the buyer is
 * unranked (UC-OPP-17 A1) — never defaulted to a tier.
 */
export type OpportunityTier = 'Low' | 'Medium' | 'High'

/**
 * UC-API-05: one buyer's opportunity row for a sale file version.
 *
 * Backs UC-UI-04 (nine-box). There is no dedicated cell-aggregate endpoint yet — `NineBoxCellSummaryFact`
 * is calculated and stored (UC-OPP-17) but nothing reads it back (checked directly against the
 * backend source, see the WI 19231 plan doc) — so the nine-box view fetches every row through this
 * endpoint and aggregates client-side (`nineBoxAggregation.ts`) rather than waiting on a backend
 * change. `nineBoxCell` (the backend's own on-the-fly `"{Probability}/{CashFlowImpact}"` string,
 * or null) rides along but is not what the aggregation groups by — it groups by the two tier
 * fields directly, so the aggregation doesn't depend on that string's exact format.
 */
export interface OpportunityPortfolioRow {
  id: number
  buyerId: number
  buyerName: string | null
  role: PartyRole
  winningStrategy: string | null
  recommendedTerm: number | null
  currentTerm: number | null
  value: number | null
  economicProfitImpact: number | null
  probabilityTier: OpportunityTier | null
  cashFlowImpactTier: OpportunityTier | null
  nineBoxCell: string | null
  noOpportunityReason: string | null
}

/** `currencyRate` scales every money field on each row from USD into the navbar's selected
 * currency (`useArCurrenciesStore.currency`) - 1 leaves them in USD. */
export const fetchOpportunities = (versionId: number, currencyRate = 1): Promise<OpportunityPortfolioRow[]> =>
  getAllPages(`/api/sale-file-versions/${versionId}/opportunities`, (after) =>
    after === undefined ? { currencyRate } : { currencyRate, after })

/**
 * UC-API-02: one buyer's identity, size, revenue and DPO position.
 *
 * DPO, not DSO: the benchmark for a payment term we propose to this buyer is how the buyer
 * already pays its own suppliers (trade payable over cost of goods sold), not how it collects
 * from its customers. The API still answers with the `dso*` aliases alongside these for one
 * release, carrying identical values; they are deprecated and deliberately not declared here,
 * so nothing new can bind to the wrong name.
 */
export interface CustomerCardResponse {
  id: number
  role: PartyRole
  resolution: string
  lifecycle: string
  companyName: string | null
  country: string | null
  industry: string | null
  legalForm: string | null
  isPublic: boolean | null
  internalId: string | null
  companySizeId: number | null
  estimatedCompanySize: boolean | null
  isCompanySizeFromParent: boolean | null
  annualRevenue: number | null
  annualRevenueIsEstimated: boolean | null
  employeesCount: number | null
  volume: number | null
  actualPaymentTermsAvg: number | null
  contractualPaymentTermsWithCashDiscountsAvg: number | null
  contractualPaymentTermsWithoutCashDiscountsAvg: number | null
  dpo: number | null
  dpoSource: string | null
  dpoStrategy: number | null
  dpoStrategyByParent: boolean | null
  dpoReference: number | null

  // Branding score (UC-ENR-06, step 4): the party's domain traffic band. Null exactly when step 4
  // has never run for this party.
  /** Foreign key onto `public.brand_value_reference` - the matched band's id. */
  brandValueReferenceId: number | null
  /** The matched band's display label (e.g. "Strong", "not-domain"). */
  brandLevel: string | null
  /** The matched band's payment-terms multiplier. */
  brandPaymentTermsFactor: number | null

  saleFileVersionId: number

  // Ratings and the opportunity block (UC-API-06/UC-API-07), added to the backend after this
  // interface was first written - see G-333/G-376 for what each carries and its own gaps.
  creditScore: number | null
  creditScoreReferenceId: number | null
  creditScoreSource: string | null
  creditRating: string | null

  /** UC-API-07 A2: null exactly when the version's strategy chain has not run - the whole
   * opportunity section is absent, not an empty list, so the Entity Card's Opportunity tab can
   * tell "not computed" from "computed, nothing applies" (UC-UI-06 A1). */
  strategyBreakdown: BuyerCardStrategyResultDto[] | null

  // UC-API-12 (UC-UI-07's own data): the opportunity valuation, straight reads off the same
  // calculation the strategy chain already ran. Absent under the same UC-API-07 A2 rule as
  // strategyBreakdown, since both come from the same not-yet-calculated buyer.

  /** The term the recommendation moves from (UC-OPP-15 step 1). */
  currentTerm: number | null
  /** The winning strategy's proposed term, whole days (UC-OPP-12 step 3). */
  recommendedTerm: number | null
  /** The one-off cash released by the move (UC-OPP-15 step 1). */
  cashFlowImpact: number | null
  /** The recurring economic profit of the move from the tenant's side (UC-OPP-15 step 2). */
  economicProfitImpact: number | null
  /** The mirror of {@link economicProfitImpact} from the buyer's side ("P&L Impact"). Always
   * null today (UC-OPP-15 A2, G-372). */
  economicProfitBuyerImpact: number | null
  /** The strategy UC-OPP-12 selected. Null when none applied - see {@link noOpportunityReason}. */
  winningStrategy: string | null
  /** Why there is no opportunity, when there is none - UC-UI-07 A1 requires a credit-constrained
   * buyer to show the ceiling as the binding constraint rather than an empty opportunity. */
  noOpportunityReason: string | null
  /** The probability-of-success band: `Low`, `Medium` or `High`. */
  probabilityTier: string | null
  /** The cash-flow-impact band, against the company's own configured thresholds. */
  cashFlowImpactTier: string | null
  /** `"{probabilityTier}/{cashFlowImpactTier}"`, or null when either tier is missing. */
  nineBoxCell: string | null
  /** The weighted probability-of-success total. What went into it is {@link probabilityScoreBreakdown}. */
  probabilityScore: number | null
  /** UC-UI-07's own requirement that the score be explained, not only tiered (G-84). Same
   * absent-vs-empty rule as strategyBreakdown. */
  probabilityScoreBreakdown: BuyerCardScoreComponentDto[] | null

  /** G-479, closed: `ParsedCompany`'s own credit limit and resolved ultimate-parent name, added
   * to `BuyersController.GetCard`'s projection alongside the strategy breakdown but never
   * declared here until UI-09 needed them for the Company Details tab's profile section. Neither
   * is calculation-derived, so both stay populated regardless of `StrategyChainHasRun`. */
  creditLimit: number | null
  /** Null when this buyer has no parent - not an error. Also read by the Company Details tab
   * (UC-UI-09), which shows `parentName` as plain text; that tab does not ask for a click-through
   * to the parent's own Entity Card, so this stays unused there rather than wired to one. */
  parentId: number | null
  /** Null exactly when {@link parentId} is null. */
  parentName: string | null
}

/** One strategy's proposed outcome for this buyer (part of {@link CustomerCardResponse.strategyBreakdown}).
 * `proposedTerm` null means the strategy did not apply, with `applicabilityReason` saying why. */
export interface BuyerCardStrategyResultDto {
  strategy: string
  proposedTerm: number | null
  applicabilityReason: string | null
  /** UC-OPP-33's verdict on this row: selected, capped_by_regulation, longer_than_selected,
   * no_reduction, not_applicable, not_a_candidate; null before the selector has run. */
  selectionOutcome: string | null
  /**
   * What the strategy recorded behind its term (ADR-0012), as the strategy's own input class named
   * it - for Peer Group Standard 2.0 `occurrences`, `min`, `q1`, `avg`, `q3`, `max` and
   * `calculationMethod`.
   *
   * Deliberately untyped per strategy rather than a shape keyed to one family: typed, this would
   * need rewriting for every family UC-OPP-30/32/34 moves onto rows, and that is exactly what lets
   * a further family show up here with no front-end change. The backend serialises a raw JSON
   * node, so in principle this can be an object, an array or a scalar - a reader narrows before
   * indexing into it rather than assuming an object shape. Null when the row carries no inputs, or
   * when what it stored is not valid JSON.
   *
   * `unknown`, not `Record<string, unknown> | null`, and that is the difference between a contract
   * a reader can honour and one that only looks safe. Declared as a record, `typeof inputs !==
   * 'object'` narrows to `never`, so the narrowing this comment asks for is a compile error, and a
   * consumer is invited instead to write `inputs?.occurrences` against a value that may be an array
   * or a scalar at runtime. `unknown` forces the check the JSON node actually requires -
   * `deriveInputRows` already takes `unknown` for exactly this reason.
   */
  inputs: unknown
}

/** One weighted input to {@link CustomerCardResponse.probabilityScore}, part of
 * {@link CustomerCardResponse.probabilityScoreBreakdown}. */
export interface BuyerCardScoreComponentDto {
  component: string
  score: number
  isMissing: boolean
}

/** `currencyRate` scales every money field on the card (volume, DPO reference, opportunity
 * figures, ...) from USD into the navbar's selected currency (`useArCurrenciesStore.currency`) -
 * 1 leaves them in USD. */
export const fetchCustomerCard = (versionId: number, buyerId: number, currencyRate = 1): Promise<CustomerCardResponse> =>
  get(`/api/sale-file-versions/${versionId}/buyers/${buyerId}`, { currencyRate })

/**
 * The Customer Card's Company Details tab (UC-UI-06): one buyer's enrichment profile - identity,
 * industry/commodity, ownership, location, SME classification and its own custom attributes.
 *
 * A separate endpoint/DTO from {@link CustomerCardResponse} rather than folded into it: this route
 * is scoped by the version's `uuid` (`/api/buyers/{versionUuid}/{buyerId}/company-details`), not
 * the numeric sale-file-version id every other buyer-scoped route here takes, and it carries fields
 * (`description`, `bvdIdNumber`, `smeSource`, ...) that `CustomerCardResponse` has no equivalent
 * for. The Opportunity tab is untouched and keeps reading `CustomerCardResponse`. `CustomerCardHeader`
 * no longer does either: on a direct URL with no caller-seeded `initialBuyer`, `CustomerCardView`
 * fetches this response itself and maps it onto the header's shape through `toHeaderIdentity`
 * (UC-UI-26 FR3).
 */
export interface BuyerCompanyDetailsResponse {
  id: number
  uuid: string
  role: PartyRole
  resolution: string
  lifecycle: string
  companyName: string | null
  description: string | null
  externalId: string | null
  typeOfIdNumber: string | null
  idNumber: string | null
  bvdIdNumber: string | null
  catalogCompanyId: number | null
  legalForm: string | null
  foundedYear: number | null
  employeesCount: number | null
  phoneNumber: string | null
  address: string | null
  city: string | null
  zipCode: string | null
  /** Null until the backend geocodes this buyer's address - `LocationMap` on the Company Details
   * tab only renders once both are present. */
  latitude: number | null
  longitude: number | null
  url: string | null
  countryCode: string | null
  countryName: string | null
  countryFlagUrl: string | null
  logoUrl: string | null
  regionName: string | null
  supplierCountryCode: string | null
  supplierCountryName: string | null
  supplierRegionName: string | null
  supplierContinent: string | null
  industryCode: string | null
  industryName: string | null
  commodity: string | null
  sector: string | null
  creditScore: number | null
  creditScoreReferenceId: number | null
  creditRating: string | null
  ratingDescription: string | null
  brandValueReferenceId: number | null
  brandLevel: string | null
  brandPaymentTermsFactor: number | null
  buyerLeverage: number | null
  supplierLeverage: number | null
  companySizeId: number | null
  estimatedCompanySize: boolean | null
  salesTeam: string | null
  averageDaysToApproveInvoice: number | null
  dateOfLastTermNegotiation: string | null
  negotiationStatus: string | null
  negotiationStatusCode: string | null
  negotiationStatusUpdatedAt: string | null
  originalName: string | null
  isMinorityOwned: boolean | null
  isVeteranOwned: boolean | null
  isWomanOwned: boolean | null
  parentId: number | null
  parentName: string | null
  parentUuid: string | null
  currencyCode: string | null
  confidenceScore: number | null
  smeClassificationStatus: string | null
  isSme: boolean | null
  smeSource: string | null
  relationshipSinceYear: string | null
  supplierEntities: string | null  
  /** The tenant's own declared custom attributes for this buyer, same shape as
   * {@link SaleLineCustomAttributeValue} (UC-MOD-08's vocabulary is shared across grains). */
  customAttributes: SaleLineCustomAttributeValue[]
}

export const fetchBuyerCompanyDetails = (versionUuid: string, buyerId: number): Promise<BuyerCompanyDetailsResponse> =>
  get(`/api/buyers/${encodeURIComponent(versionUuid)}/${buyerId}/company-details`)

/** A described, colored bucket a raw score/ratio falls into (e.g. `{ description: "Very Strong
 * Credit Rating", color: "#0F9D58" }`) - rendered as-is, never re-derived on the front end. */
export interface BuyerRatingsMetricsBand {
  description: string
  color: string
}

/** One of {@link BuyerRatingsMetricsResponse}'s four completeness scores (overall/general
 * info/financial metrics/payment terms) - how much of the buyer's own record is filled in. */
export interface BuyerRatingsMetricsDataDepth {
  valueToDisplay: number
  description: string
  color: string
}

/** {@link BuyerRatingsMetricsResponse.countryRating.countryInfo}'s five discrete risk levels, plus
 * free-text strengths/weaknesses - `null` on the whole `countryInfo` object when the country has
 * no risk reference row at all, not on these individual fields. */
export interface BuyerRatingsMetricsCountryInfo {
  economicRisk: BuyerRatingsMetricsBand
  businessEnvironmentRisk: BuyerRatingsMetricsBand
  politicalRisk: BuyerRatingsMetricsBand
  commercialRisk: BuyerRatingsMetricsBand
  financingRisk: BuyerRatingsMetricsBand
  strengths: string
  weaknesses: string
}

/** {@link BuyerRatingsMetricsResponse.countryRating.countryAmBestInfo}'s 13-field AM Best
 * breakdown - `null` on the whole object when the country has no AM Best row. */
export interface BuyerRatingsMetricsCountryAmBestInfo {
  date: string
  overall: BuyerRatingsMetricsBand
  economicRisk: BuyerRatingsMetricsBand
  politicalRisk: BuyerRatingsMetricsBand
  financingSystemRisk: BuyerRatingsMetricsBand
  internationalTransactionsPolicy: BuyerRatingsMetricsBand
  monetaryPolicy: BuyerRatingsMetricsBand
  fiscalPolicy: BuyerRatingsMetricsBand
  businessEnvironment: BuyerRatingsMetricsBand
  laborFlexibility: BuyerRatingsMetricsBand
  governmentStability: BuyerRatingsMetricsBand
  socialStability: BuyerRatingsMetricsBand
  regionalStability: BuyerRatingsMetricsBand
  legalSystem: BuyerRatingsMetricsBand
}

/** The buyer's country credit standing - agency letter grades, five discrete risk levels, and an
 * optional AM Best sub-score breakdown. `source` reads `"external"` today; a Super Admin
 * per-version override exists in ADA with no AR table yet. */
export interface BuyerRatingsMetricsCountryRating {
  countryName: string
  creditScore: number | null
  source: string
  creditScoreBand: BuyerRatingsMetricsBand | null
  spRating: string | null
  moodysRating: string | null
  fitchRating: string | null
  flagUrl: string | null
  countryInfo: BuyerRatingsMetricsCountryInfo | null
  countryAmBestInfo: BuyerRatingsMetricsCountryAmBestInfo | null
}

/** One financial ratio ({@link BuyerRatingsMetricsFinancialMetrics.returnOnAssets}/`.leverage`/
 * `.interestCoverage`) - `null` once its financials are older than 3 years, ADA's own staleness
 * guard, rather than showing a stale number as current. */
export interface BuyerRatingsMetricsRatio {
  maxValue: number
  valueToDisplay: number
  description: string
  color: string
}

/** A WACC figure ({@link BuyerRatingsMetricsFinancialMetrics.wacc}'s `preTax`/`afterTax`) -
 * `value` can be `null` while `description`/`color` still resolve (ADA's own zero-coalesce quirk),
 * so read those two even when `value` is absent. */
export interface BuyerRatingsMetricsWaccBand {
  value: number | null
  description: string
  color: string
}

/**
 * The buyer's own funding cost, or its ultimate parent's ({@link BuyerRatingsMetricsFinancialMetrics.fundingCosts}
 * carries the same shape twice, independently nullable - `null` as a whole when the rate is
 * missing or matches no bucket). `value`, `baseRate` and `finalSpread` are 0-1 fractions:
 * `value` is the combined rate, `baseRate` its currency base-rate component and `finalSpread` its
 * credit-spread component (Ada-Platform's `FundingCostsDto`).
 */
export interface BuyerRatingsMetricsFundingCost {
  value: number
  maxValue: number
  description: string | null
  color: string | null
  finalSpread: number | null
  baseRate: number | null
  /** Always empty today - nothing backend-side populates the bond-level detail yet. */
  details: unknown[]
}

/** WACC, funding cost, and three financial ratios - every ratio field is `null` once its
 * financials are stale (see {@link BuyerRatingsMetricsRatio}). */
export interface BuyerRatingsMetricsFinancialMetrics {
  /** The tenant's own pick (e.g. `"fr"`), shown uninterpreted. */
  financingStrategyMethod: string
  fundingCosts: {
    entity: BuyerRatingsMetricsFundingCost | null
    parent: BuyerRatingsMetricsFundingCost | null
  }
  wacc: {
    maxValue: number
    source: string | null
    preTax: BuyerRatingsMetricsWaccBand
    afterTax: BuyerRatingsMetricsWaccBand
  }
  returnOnAssets: BuyerRatingsMetricsRatio | null
  leverage: BuyerRatingsMetricsRatio | null
  interestCoverage: BuyerRatingsMetricsRatio | null
  /** A plain percentage (e.g. `3.4` for 3.4%), unlike `returnOnAssets`/`leverage`/
   * `interestCoverage` - this one carries no `maxValue`/`description`/`color` band of its own. */
  revenueGrowth: number | null
  /** `"parent"` when the parent's own growth won the preference over the buyer's, else `null`. */
  revenueGrowthSource: string | null
  /** Always `null` today (G-671) - the Super Admin manual-override feature isn't built in AR yet. */
  customRevenueY: number | null
  customRevenueY1: number | null
  dsoStrategy: { terms: number | null; byParent: boolean }
}

/** {@link BuyerRatingsMetricsIndustryRating.industryInfo}'s own forecast pair. */
export interface BuyerRatingsMetricsIndustryPerformanceForecast {
  forecast: string
  description: string
}

/** Free-text industry commentary ({@link BuyerRatingsMetricsIndustryRating.industryInfo}) - not
 * rendered by any card yet, same situation as {@link BuyerRatingsMetricsCountryRating.countryInfo}. */
export interface BuyerRatingsMetricsIndustryInfo {
  performanceForecast: BuyerRatingsMetricsIndustryPerformanceForecast
  industryDetails: string
  performance: string
}

/** The buyer's industry risk assessment - backs the Industry Risk card. `industryRiskScore`/
 * `industryRiskFlag` at the root are unrelated placeholder fields the backend reserved before this
 * object existed; this is the real thing. */
export interface BuyerRatingsMetricsIndustryRating {
  industryName: string
  /** 0-`maxValue` raw score - `assessmentBand.description` is what the card actually displays. */
  assessment: number
  assessmentBand: BuyerRatingsMetricsBand
  maxValue: number
  atradiusScore: string
  industryInfo: BuyerRatingsMetricsIndustryInfo
}

/** {@link BuyerRatingsMetricsResponse.creditScore} - grouped by the backend (2026-09-14) from what
 * used to be five separate root fields (`creditScore`, `creditScoreReferenceId`,
 * `creditScoreSource`, `creditRating`, `ratingDescription`) into this one object; same meanings. */
export interface BuyerRatingsMetricsCreditScore {
  score: number | null
  referenceId: number | null
  source: 'internal' | 'external' | null
  rating: string | null
  description: string | null
  /** `credit_score_reference.level` of the row `referenceId` names (e.g. "Very Strong Credit
   * Rating") - the company's own Rating Description (AB#21151). */
  level: string | null
}

/** {@link BuyerRatingsMetricsResponse.countryRisk} - grouped (2026-09-14) from root
 * `countryRiskScore`/`countryRiskFlag`. From the buyer's region; not read by any card yet. */
export interface BuyerRatingsMetricsCountryRisk {
  score: number | null
  flag: boolean | null
}

/** {@link BuyerRatingsMetricsResponse.creditLimitOutsanding} - grouped (2026-09-14) from root
 * `creditLimitMax`/`creditOutstanding`/`creditOutstandingWithPastDue`/`creditUsage` - backs the
 * Credit Limit card and Credit Limit vs Outstandings' bars. `limitMax` is the buyer's own credit
 * ceiling, `outstanding` the current balance against it, `outstandingWithPastDue` the subset of
 * that balance which is past due, and `usage` the 0-1 fraction of `limitMax` currently drawn. */
export interface BuyerRatingsMetricsCreditLimitOutstanding {
  limitMax: number | null
  usage: number | null
  outstanding: number | null
  outstandingWithPastDue: number | null
}

/** {@link BuyerRatingsMetricsResponse.exposure} - grouped (2026-09-24) from root
 * `totalSales`/`outstandingToSalesRatio` - backs the Exposure card. Each figure has a `parent*`
 * counterpart shown as that stat's "Parent" line. `outstanding` includes past dues (unlike
 * `creditLimitOutsanding.outstanding`), so it squares with `outstandingToSalesRatio`. */
export interface BuyerRatingsMetricsExposure {
  totalSales: number | null
  outstandingToSalesRatio: number | null
  parentTotalSales: number | null
  parentOutstandingToSalesRatio: number | null
  outstanding: number | null
  parentOutstanding: number | null
}

/**
 * UC-API-?? (Buyer Card API, endpoint 2 of 4): everything `CustomerCardRatingNMetrics` needs for
 * its Credit Rating/Country Rating/Credit Limit/Industry Risk cards, plus data-depth and
 * financial-metrics figures this tab does not render yet - one call rather than one round trip per
 * widget. Credit rating, leverage, brand, risk, credit-limit and industry figures here are already
 * computed upstream by the calculation pipeline; this endpoint reads them, it does not derive them.
 *
 * ESG is on the backend's response (`esg`) but deliberately not declared here - no card reads it
 * yet (2026-09-14).
 *
 * `industryRiskScore`/`industryRiskFlag` below are a SEPARATE, still-unbacked pair of placeholder
 * fields the backend reserved before `industryRating` existed - do not confuse the two.
 */
export interface BuyerRatingsMetricsResponse {
  id: number
  role: PartyRole
  creditScore: BuyerRatingsMetricsCreditScore
  /** 0-1 fraction. */
  probabilityOfDefault: number | null
  /** `null` when the buyer's industry has no safety score on file. */
  industryRiskScore: number | null
  industryRiskFlag: boolean | null
  countryRisk: BuyerRatingsMetricsCountryRisk
  /** Volume share of total exposure. */
  buyerLeverage: number | null
  supplierLeverage: number | null
  /** `null` unless the buyer has a brand match. */
  brandValueReferenceId: number | null
  brandLevel: string | null
  brandPaymentTermsFactor: number | null
  /** Backend's own field name, typo included ("Outsanding") - kept verbatim rather than
   * "corrected" locally, since this must match the wire shape exactly. */
  creditLimitOutsanding: BuyerRatingsMetricsCreditLimitOutstanding
  overallDataDepth: BuyerRatingsMetricsDataDepth
  generalInfoDataDepth: BuyerRatingsMetricsDataDepth
  financialMetricsDataDepth: BuyerRatingsMetricsDataDepth
  paymentTermsDataDepth: BuyerRatingsMetricsDataDepth
  countryRating: BuyerRatingsMetricsCountryRating
  financialMetrics: BuyerRatingsMetricsFinancialMetrics
  /** Absent/`null` rather than always present - a first-seen field, and unlike `countryRating`/
   * `financialMetrics` there is no confirmation yet that every buyer gets one (e.g. a buyer with
   * no NAICS industry mapped might not). */
  industryRating?: BuyerRatingsMetricsIndustryRating | null,
  supplierLeverageLevel: string | null,
  /** Buyer Leverage's own backend-supplied band, same contract as `supplierLeverageLevel` - optional
   * while the backend rolls it out (2026-09-29). */
  buyerLeverageLevel?: string | null,
  marketShareLevel: string | null,
  /** Switching Cost's own backend-supplied Low/Medium/High band - never re-banded here (G-746),
   * same contract as `marketShareLevel`. */
  switchingCostLevel: string | null,
  exposure: BuyerRatingsMetricsExposure
}

export const fetchBuyerRatingsMetrics = (
  versionUuid: string,
  buyerId: number,
  // Scales the response's own money fields from USD into the navbar's selected currency
  // (`useArCurrenciesStore.currency`) - 1 leaves them in USD.
  currencyRate = 1,
): Promise<BuyerRatingsMetricsResponse> =>
  get(`/api/buyers/${encodeURIComponent(versionUuid)}/${buyerId}/ratings-metrics`, { currencyRate })

/** {@link BuyerOpportunityResponse.header} - the buyer identity/at-a-glance strip
 * `CustomerCardOpportunityTab` renders above its cards. `creditInsured` is a raw 0-1 fraction as a
 * string, straight off the wire (unparsed elsewhere in this codebase too - see
 * `globalColumns.opportunityCreditInsured`, a plain-text grid column). */
export interface BuyerOpportunityHeader {
  creditLimit: number | null
  parentUploadedCreditLimit: number | null
  creditInsured: string | null
  totalSales: number | null
  parentTotalSales: number | null
  supplierEntities: string | null
  currencyCode: string | null
  creditRating: string | null
  parentName: string | null
  salesMateriality: string | null
}

/** {@link BuyerOpportunityResponse.paymentTerms} - backs the Payment Terms card's figures.
 * `pastDueDays`/`pastDueOutstanding` back the contractual side's own "Past dues" figures (the
 * buyer's actual, current situation); `projectedPastDueDays`/`projectedPastDueOutstanding` back
 * the opportunity side's. */
export interface BuyerOpportunityPaymentTerms {
  currentTerm: number | null
  recommendedTerm: number | null
  outstanding: number | null
  projectedOutstanding: number | null
  pastDueDays: number | null
  pastDueOutstanding: number | null
  /** AB#21137: the opportunity side's past due - with Past Due ON the same as `pastDueDays`/
   * `pastDueOutstanding`, with it OFF 0. `projectedPastDueOutstanding` already carries the
   * currency rate. */
  projectedPastDueDays: number | null
  projectedPastDueOutstanding: number | null
  /** OPP-48 (AB#20530): Avg. Days Paid (DSO). */
  actualPaymentTermsAvg: number | null
  /** OPP-48: the contractual term net of cash discounts. */
  contractualPaymentTermsWithoutCashDiscountsAvg: number | null
  /** OPP-48: the contractual term with cash discounts. */
  contractualPaymentTermsWithCashDiscountsAvg: number | null
  /** OPP-48: the cash discount offered, as a fraction (0.02 = 2%). */
  cashDiscounts: number | null
  /** AB#20657: the party's own raw target (volume-weighted across its lines), null when none.
   * `recommendedTerm` already carries the coalesced Opportunity/Target - this one only pre-fills the
   * Target modal. Optional until Ada-Platform ships it. */
  targetPaymentTerms?: number | null
  /** AB#20657: at least one of the party's lines carries a target (the card's "Target" badge). */
  hasTarget?: boolean
}

/** {@link BuyerOpportunityResponse.supplierImpact} - backs the Supplier Impact card's Cash Flow
 * and Economic Impact figures; this endpoint has no Credit Usage figure. */
export interface BuyerOpportunitySupplierImpact {
  cashFlowImpact: number | null
  economicProfitImpact: number | null
  cashFlowImpactPercentOfSales: number | null
}

/** {@link BuyerOpportunityResponse.probabilityOfSuccess} - backs the "Probability of Success"
 * card's every row (the radar chart itself is deliberately not rendered - see the component's own
 * doc): Priority, Probability of Success (`probabilityTier`), Cash Flow Impact, Terms Decrease,
 * Supplier Leverage, Buyer Leverage, Economic Profit Impact and Number of Insights
 * (`insightsCount`/`insightsTier` together - the tier drives the row's `LevelBar`, the count is
 * what the row's own value text shows). Every field is a `Low`/`Medium`/`High` tier string except
 * `probabilityScore` (a raw number, no card slot of its own today) and `insightsCount` (a raw
 * count). `supplierLeverage`/`buyerLeverage` read as tiers here, NOT the raw 0-1 fraction
 * `BuyerRatingsMetricsResponse`'s own same-named fields carry - two different endpoints' shapes for
 * two different cards, not the same field reused. */
export interface BuyerOpportunityProbabilityOfSuccess {
  priority: string | null
  probabilityScore: number | null
  probabilityTier: string | null
  cashFlowImpactTier: string | null
  termsDecreaseTier: string | null
  supplierLeverage: string | null
  buyerLeverage: string | null
  economicProfitImpactTier: string | null
  insightsCount: number | null
  insightsTier: string | null
}

/** Every top-level {@link OpportunityStrategy.key} Ada-Platform's `OpportunityStrategies.Build`
 * can emit, in its own fixed order. */
export type OpportunityStrategyKey =
  | 'PaymentOnTerms'
  | 'CounterPartyStandard2'
  | 'PeerGroupStandard2'
  | 'BuyerOrParentMin'
  | 'IndustryRegionGroup'
  | 'BuyerPolicy'
  | 'BuyersRegulatory'
  | 'CreditLimitMax'
  | 'ClientStandard'
  | 'DaysOutstanding'
  | 'BuyerStandardStrategyOnParents'
  /** Steps 49-52: the decided term at its level, or the weighted average above it. No `extra`,
   * only its own `infoCards`. */
  | 'Harmonization'

/** A key of {@link OpportunityStrategy.extra} - a combinator's members (`BuyerMin`/`ParentBuyerMin`
 * under `BuyerOrParentMin`, `IndustryGroup`/`RegionGroup` under `IndustryRegionGroup`) never appear
 * as a top-level key of their own. */
export type OpportunityStrategyExtraKey =
  | OpportunityStrategyKey
  | 'BuyerMin'
  | 'ParentBuyerMin'
  | 'IndustryGroup'
  | 'RegionGroup'

/** The figure a strategy actually picked its term from - the shared waterfall engine's own wire
 * vocabulary (`MetricsExtensions.ToWireString`). `3q` has no matching {@link OpportunityStrategyDetails}
 * field. */
export type OpportunityStrategyCalculationMethod = 'min' | 'avg' | '1q' | '3q' | 'max'

/** The figures behind one strategy's term - first quartile, not third. Two runtime shapes: the
 * standards / Industry-Region send the figures (plus `saleLineCount`), while Buyer Min / Parent
 * Min send `{ saleLineCount }` alone (ADA's `spends`) - hence every field optional. */
export interface OpportunityStrategyDetails {
  average?: number | null
  firstQuartile?: number | null
  min?: number | null
  max?: number | null
  occurrences?: number | null
  /** The sale lines behind the term - for Parent Min, the parent family's. */
  saleLineCount?: number | null
}

/** One member of an {@link OpportunityStrategy.extra}. `details` is null when the member has no
 * figures (e.g. every `IndustryRegionGroup` member); `calculationMethod` is only ever sent by
 * `CounterPartyStandard2`/`PeerGroupStandard2`. */
export interface OpportunityStrategyExtra {
  terms: number | null
  details: OpportunityStrategyDetails | null
  calculationMethod: OpportunityStrategyCalculationMethod | null
}

/** One metric card of a strategy's/term's drill-down panel - ADA's `infoCards[]` shape. The panel
 * renders only these cards, as-is, and none until the backend sends them. */
export interface OpportunityInfoCard {
  key: string
  value: number | string | null
}

/** The backend carries a strategy's/term's `infoCards` inside its own `extra`, next to the
 * members - one list per entry, not per member. */
export interface OpportunityExtraInfoCards {
  infoCards?: OpportunityInfoCard[] | null
}

/** Every {@link OpportunityTerm.key}, in ADA's order - all three are always sent. */
export type OpportunityTermKey = 'contractualTerms' | 'currentTerms' | 'proposedTerms' | 'targetTerms'

/** A key of {@link OpportunityTerm.extra}. `proposedTerms`' single member is `harmonization` when
 * the company has harmonization enabled (the same setting Step 52 reads), `opportunityTerms`
 * otherwise. */
export type OpportunityTermExtraKey = 'contractualTerms' | 'currentTerms' | 'opportunityTerms' | 'harmonization' | 'targetTerms'

/** {@link BuyerOpportunityResponse.terms} - Contractual (contractual without cash discounts),
 * Current (actual days paid) and Proposed (the recommended term). Always all three entries, in
 * this order, even when a `terms` is null. Unlike a strategy's extra, a member here carries only
 * its `terms` - no figures, no calculation method. */
export interface OpportunityTerm {
  key: OpportunityTermKey
  terms: number | null
  extra: (Partial<Record<OpportunityTermExtraKey, { terms: number | null }>> & OpportunityExtraInfoCards) | null
  infoCards?: OpportunityInfoCard[] | null
}

/** {@link BuyerOpportunityResponse.strategies} - one entry per strategy that ran for this buyer
 * (one that never ran is left out entirely, not sent as null). `terms` may still be null for an
 * entry that is present; `extra` is null when none of its members ran, and otherwise only carries
 * the members that did. */
export interface OpportunityStrategy {
  key: OpportunityStrategyKey
  terms: number | null
  extra: (Partial<Record<OpportunityStrategyExtraKey, OpportunityStrategyExtra>> & OpportunityExtraInfoCards) | null
  infoCards?: OpportunityInfoCard[] | null
}

/** `GET /api/buyers/{versionUuid}/{buyerId}/opportunity` - `CustomerCardOpportunityTab`'s own
 * endpoint. Same uuid-scoped route shape as `ratings-metrics`/`company-details`. The Payment Terms
 * Negotiation panel (tabs, Buyer Standard Average/1st Quartile bars, Number of Occurrences) has no
 * field on this response at all - it stays a static placeholder in the component until a later
 * endpoint covers it. */
export interface BuyerOpportunityResponse {
  id: number
  role: PartyRole
  header: BuyerOpportunityHeader
  paymentTerms: BuyerOpportunityPaymentTerms
  supplierImpact: BuyerOpportunitySupplierImpact
  probabilityOfSuccess: BuyerOpportunityProbabilityOfSuccess
  terms: OpportunityTerm[]
  strategies: OpportunityStrategy[]
}

export const fetchBuyerOpportunity = (
  versionUuid: string,
  buyerId: number,
  // Scales the response's own money fields from USD into the navbar's selected currency
  // (`useArCurrenciesStore.currency`) - 1 leaves them in USD.
  currencyRate = 1,
  // Omitted (the buyer-level default) unless a caller wants this specific sale line's own figures
  // instead (`CustomerCardOpportunityTab`'s Sale Line tab strip) - `level` rides along only when
  // `saleLineId` is actually given, never sent on its own.
  saleLineId?: number,
  // A `Parent`-role buyer has no sale line of its own to ask for, but still needs `level=Parent`
  // rather than the buyer-level default (`CustomerCardOpportunityTab`'s own `role` prop) - mutually
  // exclusive with `saleLineId`: a `Parent` never has a sale-line tab to select in the first place.
  // 2026-09-24: briefly reverted the same day once the THEN-current backend build 404'd every
  // Parent-role buyer (its `level=Parent` resolved the REQUESTED buyer's own `UltimateParentId`,
  // not a family view of the buyer itself) - re-added once the backend team confirmed they are
  // updating that grain to answer the requesting Parent-role buyer's own family data instead.
  isParentRole?: boolean,
): Promise<BuyerOpportunityResponse> => {
  let level: string | undefined
  if (saleLineId !== undefined) {
    level = 'SaleLine'
  } else if (isParentRole) {
    level = 'Parent'
  }
  return get(`/api/buyers/${encodeURIComponent(versionUuid)}/${buyerId}/opportunity`, {
    currencyRate,
    level,
    saleLineId,
  })
}

/** AB#20657: a target is always written on sale lines - the party, `role`, `all` and `saleLineIds`
 * say which ones. */
export type TargetPaymentTermsLevel = 'SaleLine'

/** AB#20657: the kind of entity the Customer Card is open for - a family (`Parent`) or a buyer
 * (`Counterparty`). */
export type TargetPaymentTermsRole = 'Parent' | 'Counterparty'

export interface TargetPaymentTermsScope {
  level: TargetPaymentTermsLevel
  /** The buyer's id, or the parent's for a family - the same party the route names, carried in
   * the body too so the scope reads whole on its own. */
  partyId: number
  role: TargetPaymentTermsRole
  /** Every line of the party (narrowed by `telerikFilter`) was selected - `saleLineIds` is then
   * `null`. `false` means exactly `saleLineIds`. */
  all: boolean
  saleLineIds: number[] | null
  /** The Kendo filter descriptor applied in the modal's lines grid, JSON-encoded; an empty `and`
   * when the grid is unfiltered. */
  telerikFilter: string
}

const targetPaymentTermsPath = (versionUuid: string, partyId: number): string =>
  `/api/buyers/${encodeURIComponent(versionUuid)}/${partyId}/target-payment-terms`

/** AB#20657: `PUT api/buyers/{versionUuid}/{partyId}/target-payment-terms` - stores `value` (whole
 * days, 0-365) on the scope's lines and queues the version's opportunity recalculation. 400 for an
 * invalid value, 409 while the version is recalculating or not ready. */
export const saveTargetPaymentTerms = (
  versionUuid: string,
  partyId: number,
  body: TargetPaymentTermsScope & { value: number },
): Promise<void> => put(targetPaymentTermsPath(versionUuid, partyId), body)

/** AB#20657: `DELETE` on the same route - Clear. The scope rides a JSON body, as the
 * implementation plan's contract describes; `del` has no body parameter of its own, so it goes
 * through `init`. */
export const clearTargetPaymentTerms = (
  versionUuid: string,
  partyId: number,
  body: TargetPaymentTermsScope,
): Promise<void> =>
  del(targetPaymentTermsPath(versionUuid, partyId), {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

/**
 * UC-API-08: the corporate tree around one buyer (the Entity Card's Corporate Tree tab, UC-UI-08)
 * - the parent chain walked upward and the subsidiary structure walked downward, both bounded
 * server-side. `edges` is always acyclic: an edge that would have closed a loop is recorded in
 * `cycles` instead, which is what `partial` reports; `truncated` marks a depth or node bound that
 * stopped the walk while more structure provably existed. The screen states both explicitly
 * rather than a bounded tree silently looking like the group simply ends there.
 */
export interface CorporateTreeResponse {
  buyerId: number
  nodes: CorporateTreeNodeDto[]
  edges: CorporateTreeEdgeDto[]
  cycles: CorporateTreeEdgeDto[]
  partial: boolean
  truncated: boolean
}

/** One party in the tree (part of {@link CorporateTreeResponse.nodes}). */
export interface CorporateTreeNodeDto {
  id: number
  companyName: string | null
  /** Self, Counterparty or Parent (UC-MOD-01's role axis) - the same vocabulary as {@link PartyRole}. */
  role: PartyRole
  /** Named, Resolved or Enriched (UC-MOD-01's resolution axis). */
  resolution: string
  /** True on exactly the node the route's buyer id names. */
  isRequestedBuyer: boolean
}

/** A parent-to-child relationship, in {@link CorporateTreeResponse.edges} or, when it would close
 * a loop, in {@link CorporateTreeResponse.cycles}. */
export interface CorporateTreeEdgeDto {
  parentId: number
  childId: number
}

export const fetchCorporateTree = (
  versionId: number,
  buyerId: number,
  // `CorporateTreeNodeDto` carries no money fields of its own today, but the endpoint still takes
  // the navbar's selected currency (`useArCurrenciesStore.currency`) the same way every other
  // buyer-scoped fetch here does - 1 leaves it as USD.
  currencyRate = 1,
): Promise<CorporateTreeResponse> =>
  get(`/api/sale-file-versions/${versionId}/buyers/${buyerId}/corporate-tree`, { currencyRate })

/**
 * UC-API-08's buyer-scoped counterpart: `CustomerCardCorporateTreeTab`'s own corporate tree fetch,
 * scoped by the active version's `uuid` (`/api/buyers/{versionUuid}/{buyerId}/corporate-tree`) -
 * the same `{versionUuid}/{buyerId}` shape {@link fetchBuyerCompanyDetails}/
 * {@link fetchBuyerRatingsMetrics} already use - rather than {@link fetchCorporateTree}'s numeric
 * sale-file-version id. `entityCard`'s own Corporate Tree tab is untouched and keeps reading
 * {@link fetchCorporateTree}.
 *
 * Each node also carries the buyer-scoped figures {@link CorporateTreeNodeDto} has no equivalent
 * for (`volume`, payment terms, `cashFlow`, `country`) plus up to 50 of its own sales lines -
 * `salesLinesTruncated` is true only once a node has more than that 50-row cap.
 */
export interface BuyerCorporateTreeResponse {
  buyerId: number
  nodes: BuyerCorporateTreeNodeDto[]
  edges: CorporateTreeEdgeDto[]
  cycles: CorporateTreeEdgeDto[]
  partial: boolean
  truncated: boolean
}

/** One party in the tree (part of {@link BuyerCorporateTreeResponse.nodes}). */
export interface BuyerCorporateTreeNodeDto {
  id: number
  companyName: string | null
  /** Self, Counterparty or Parent (UC-MOD-01's role axis) - the same vocabulary as {@link PartyRole}. */
  role: PartyRole
  /** Named, Resolved or Enriched (UC-MOD-01's resolution axis). */
  resolution: string
  /** True on exactly the node the route's buyer id names. */
  isRequestedBuyer: boolean
  volume: number
  paymentTerms: number | null
  paymentTermsOpportunity: number | null
  cashFlow: number | null
  country: string | null
  /** Up to 50 of this node's own sales lines - see `salesLinesTruncated` for whether more exist. */
  salesLines: BuyerCorporateTreeSalesLineDto[]
  /** True once this node has more than 50 sales lines, so `salesLines` is a partial list. */
  salesLinesTruncated: boolean
  /** This node's own enrichment profile - the same information {@link fetchBuyerCompanyDetails}
   * fetches separately for the buyer the Customer Card is currently open on, embedded here so a
   * click on ANOTHER node in the tree (`CustomerCardCorporateTreeTab`'s `onNodeClick`) can seed
   * that node's own Customer Card modal (`customerCardModal.open`'s `initialBuyer`) immediately,
   * the same way `BuyersView`'s `openBuyer` seeds it from a roster row already on hand - without
   * this, the modal would open with no header until some other fetch happened to populate one. */
  companyDetails: BuyerCorporateTreeCompanyDetailsDto | null
  logoUrl: string | null
}

/** {@link BuyerCompanyDetailsResponse} plus `formattedAddress` - present on this nested
 * corporate-tree shape but not confirmed on the standalone `/company-details` endpoint's own
 * response, so it stays its own field here rather than being folded onto
 * {@link BuyerCompanyDetailsResponse} without evidence that endpoint sends it too. */
export interface BuyerCorporateTreeCompanyDetailsDto extends BuyerCompanyDetailsResponse {
  formattedAddress: string | null
}

/** One sales line under a {@link BuyerCorporateTreeNodeDto} (part of its `salesLines`). */
export interface BuyerCorporateTreeSalesLineDto {
  saleLineId: number
  volume: number
  cashFlow: number | null
  paymentTerms: number | null
  paymentTermsOpportunity: number | null
  supplierId: number
  supplierName: string | null
  commodity: string | null
}

export const fetchBuyerCorporateTree = (
  versionUuid: string,
  buyerId: number,
  // Scales each node's own money fields (volume, cashFlow, its sales lines' own) from USD into the
  // navbar's selected currency (`useArCurrenciesStore.currency`) - 1 leaves them in USD.
  currencyRate = 1,
): Promise<BuyerCorporateTreeResponse> =>
  get(`/api/buyers/${encodeURIComponent(versionUuid)}/${buyerId}/corporate-tree`, { currencyRate })

/**
 * UC-API-13: one buyer's own sale lines, paged - the list the provisional strategy panel drills
 * into ("which spends stood behind this entity's figure").
 *
 * Returns the EXISTING {@link LinesPageResponse}/{@link SaleLineRow} pair `fetchLines` already
 * uses, not a second declaration: the backend serves the same `SaleLinesPageResponse`/
 * `SaleLineDto` the Match lines list reads, at this buyer-scoped route instead of the
 * version-wide one, and a parallel type pair here would only drift from that one. `SaleLineDto`
 * carries a `customAttributes` field this task's callers do not read, which is why it is absent
 * from `SaleLineRow` - adding it is a change for whichever task first needs it, not this one.
 *
 * Reads `ar.sale_line`, never the summary fact (see `BuyersController.GetLines`'s own doc): the
 * fact is a projection the resync rebuilds, so a diagnostic list reading it could not tell a
 * calculation that wrote nothing from a projection that is behind.
 */
export const fetchBuyerLines = (
  versionId: number,
  buyerId: number,
  page: number,
  pageSize: number,
): Promise<LinesPageResponse> =>
  get(`/api/sale-file-versions/${versionId}/buyers/${buyerId}/lines`, { page, pageSize })

/**
 * UC-API-13: one line with everything it carries, and what each strategy produced for it - the
 * deepest of the three provisional surfaces the strategy panel can drill into (the buyer card,
 * then this buyer's own lines, then one line's own detail).
 */
export interface SaleLineDetailResponse {
  line: SaleLineDetailDto
  strategyResults: SaleLineStrategyResultDto[]
}

/**
 * One value of the tenant's own declared custom attributes (UC-MOD-08), at line-detail grain -
 * the same shape `SaleLineDto.customAttributes` already serves at list grain.
 */
export interface SaleLineCustomAttributeValue {
  ordinal: number
  title: string
  dataType: string
  aggregation: string
  value: unknown
  supplied: boolean
}

/**
 * Every mapped property of `SaleLine` and of `SaleLineEnrichment`, flattened onto one response -
 * mirrors `Ada.Ar.Api.Models.SaleLineDetailModels.SaleLineDetailDto` field for field, including
 * its nullability, so this file reads as that DTO's union rather than a curated subset.
 *
 * The audit block (`uuid`/`createdAt`/`updatedAt`/`createdBy`/`updatedBy`/`deletedAt`) is
 * deliberately absent, on both entities: `createdBy`/`updatedBy` carry a user identity that has
 * no business on a spend line, and this response not carrying a `uuid` is the documented premise
 * of why the backend's cross-tenant sweep cannot cover this route (see the backend's own
 * `SaleLineDetailDto` doc).
 *
 * Every enrichment-sourced field is nullable here, whether or not it already is on the entity: a
 * line the calculation has not reached yet has no enrichment row at all, and the whole block
 * still serialises as null rather than the response failing.
 */
export interface SaleLineDetailDto {
  // ----- SaleLine -----
  id: number
  saleFileVersionId: number
  companyId: number
  buyerId: number
  supplierId: number
  currencyId: number
  salesTeam: string | null
  startDate: string
  endDate: string
  year: number
  periodInMonths: number
  volume: number
  forecastVolume: number | null
  actualPaymentTerms: number
  contractualActual: number
  contractualPaymentTermsWithCashDiscounts: number | null
  contractualPaymentTermsWithoutCashDiscounts: number | null
  buyerPaymentTermPolicy: number | null
  cashDiscounts: number | null
  capturedCashDiscounts: number | null
  averageDaysToApproveInvoice: number | null
  dateOfLastTermNegotiation: string | null
  usingWorkingCapitalFinance: boolean | null
  commodity: string | null
  originalCommodity: string | null
  internalId: string | null
  aggregatedLinesCount: number
  alias: string | null
  reason: string | null
  reasonManuallySetAt: string | null
  creditScore: number | null
  dataQuality: number | null
  targetPaymentTerms: number | null
  // No regulatoryStrategyTermValue here. UC-OPP-32 dropped it from the API (G-717): the
  // regulated term is one of the entries in `strategyResults`, as the Regulations row's own
  // proposedTerm, not a field of its own. Do not restore it when re-deriving this interface
  // from the back-end shape - SaleLineDetailModels.cs and IBuyerCardStore.cs both say so.
  afterTaxWacc: number | null
  preTaxWacc: number | null
  waccSource: string | null
  waccFromParent: boolean | null
  negotiationStatus: string
  negotiationStatusCode: number
  negotiationStatusUpdatedAt: string | null
  isPilot: boolean
  vCardAverageTransactionSize: number | null
  vCardNumberOfPayments: number | null
  vCardNumberOfInvoices: number | null
  vCardIsAlreadyInUse: boolean
  vCardVolume: number | null
  vCardAcceptanceType: string | null
  vCardProvider: string | null
  vCardPaymentMethod: string | null
  vCardLargestTransactionSize: number | null
  vCardIndirectSpend: boolean

  /**
   * Structurally always null on every row, never a signal about THIS line specifically. This and
   * the four fields below it are the raw parse-time keys `SaleLine` itself resolves into
   * `buyerId`/`supplierId`/`currencyId` at ingestion and then EF `.Ignore()`s, so no read of a
   * stored line ever gets one back populated. Carried here anyway because the brief that scoped
   * this surface enumerates them as part of `SaleLine`'s mapped shape - called out so a reader
   * does not mistake the permanent null for a sign that resolution failed for this particular
   * line.
   */
  buyerName: string | null
  /** Same permanent-null contract as {@link buyerName}. */
  buyerCountry: string | null
  /** Same permanent-null contract as {@link buyerName}. */
  supplierEntityName: string | null
  /** Same permanent-null contract as {@link buyerName}. */
  supplierEntityCountry: string | null
  /** Same permanent-null contract as {@link buyerName}. */
  invoiceCurrency: string | null

  // ----- SaleLineEnrichment (saleFileVersionId/saleLineId omitted: duplicates of the line's own) -----
  calculatedPaymentTerms: number | null
  calculatedPaymentTermsSource: string | null
  weightedPaymentTerms: number | null
  effectiveCashDiscountRate: number | null
  fundingCost: number | null
  winningStrategy: string | null
  recommendedTerm: number | null
  currentTerm: number | null
  expectedTerm: number | null
  cashFlowImpact: number | null
  economicProfitImpact: number | null
  economicProfitBuyerImpact: number | null
  expectedCashFlowImpact: number | null
  expectedEconomicProfitImpact: number | null
  expectedEconomicProfitBuyerImpact: number | null
  financingRate: number | null
  /** The backend's Low/Medium/High band for this line's own Market Share - never re-banded here
   * (G-746). Same null rule as the rest of the enrichment block: null exactly when the calculation
   * has not reached this line yet. */
  marketShareLevel: string | null
  /** Switching Cost's own band, same contract as `marketShareLevel`. */
  switchingCostLevel: string | null

  /** The tenant's own data points for this line, in declaration order (UC-MOD-08). */
  customAttributes: SaleLineCustomAttributeValue[]
}

/**
 * One strategy's proposed outcome for this line, mirroring {@link BuyerCardStrategyResultDto}
 * field for field - same meaning, same "null `proposedTerm` means the strategy did not apply"
 * contract, one grain down. Strategies are never named or special-cased here: the figures travel
 * exactly as `ar.sale_line_strategy_result` stored them, so a further strategy family needs no
 * front-end change to show up.
 *
 * **One meaning does differ: which generation each surface shows.** The card's read
 * ({@link BuyerCardStrategyResultDto}) gates on the version's published strategy-result
 * generation; this one deliberately does not. Mid-recalculation the card still shows the last
 * published generation while a line's own rows here can already be the in-flight one - a reader
 * comparing an entity's card figure against the spends behind it can see this row's figure move
 * before the card's does, which is expected during a run and not a mismatch to chase.
 */
export interface SaleLineStrategyResultDto {
  strategy: string
  proposedTerm: number | null
  applicabilityReason: string | null
  selectionOutcome: string | null
  /** The strategy's own supporting figures, as stored (ADR-0012) - identical contract to
   * {@link BuyerCardStrategyResultDto.inputs}, including why it is `unknown` rather than a record. */
  inputs: unknown
}

export const fetchBuyerLine = (
  versionId: number,
  buyerId: number,
  lineId: number,
  // Scales the line's own money fields from USD into the navbar's selected currency
  // (`useArCurrenciesStore.currency`) - 1 leaves them in USD.
  currencyRate = 1,
): Promise<SaleLineDetailResponse> =>
  get(`/api/sale-file-versions/${versionId}/buyers/${buyerId}/lines/${lineId}`, { currencyRate })

/** The metric a Match Overview chart is currently broken down by. */
export type MatchMetric = 'numberOfCustomers' | 'numberOfInvoiceLines' | 'saleVolume'

export interface MatchInclusionBuckets {
  included: number
  excluded: number
  unmatched: number
}

export interface MatchMatchedBuckets {
  matched: number
  unmatched: number
}

export interface MatchIncludedBuckets {
  included: number
  excluded: number
}

export interface MatchExclusionReason {
  reason: string
  amount: number
}

export interface MatchCountryAggregate {
  countryCode: string | null
  geoLat: number | null
  geoLon: number | null
  partyCount: number
  saleLineCount: number
  volume: number
}

export interface MatchInfoResponse {
  saleFileVersionUuid: string
  dataQuality: {
    quality: number | null
    confidenceScore: number | null
    confidenceScoreLabel: string
  }
  lineChart: Record<MatchMetric, MatchInclusionBuckets>
  matchedPieChart: Record<MatchMetric, MatchMatchedBuckets>
  includedPieChart: Record<MatchMetric, MatchIncludedBuckets>
  excludedBarChart: Record<MatchMetric, MatchExclusionReason[]>
  countriesMap: {
    counterparties: MatchCountryAggregate[]
    ownEntities: MatchCountryAggregate[]
  }
}

export const fetchDataMatchInfo = (saleFileVersionUuid: string, currencyRate = 1): Promise<MatchInfoResponse> =>
  post(`/api/data-match/info/${saleFileVersionUuid}`, { currencyRate })

/**
 * UC-UI-03: one bar of the waterfall. `name` is the bucket's configured name, or null for the
 * buyers no configured bucket covers (UC-OPP-13's out-of-waterfall population, G-179). `value` is
 * the bucket's summed cash flow opportunity, null when no buyer in it carries a valuation yet -
 * distinct from a bucket genuinely worth zero.
 */
export interface OpportunityWaterfallBucketPoint {
  name: string | null
  value: number | null
}

export interface OpportunityWaterfallChartResponse {
  saleFileVersionId: number
  status: string | null
  measure: string
  dimension: string
  points: OpportunityWaterfallBucketPoint[]
}

/**
 * UC-UI-03's own bars, one point per waterfall bucket. Reads the Opportunity Overview's existing
 * generic dimension/measure chart endpoint (UC-API-03) rather than a purpose-built waterfall
 * endpoint over `WaterfallBucketSummaryFact` - no such endpoint exists in `Ada.Ar.Api` yet (G-481).
 *
 * Two consequences of that substitution, inherited rather than introduced here: a bucket with no
 * buyer produces no point at all (UC-UI-03 A1's "an empty bucket is drawn at zero" cannot be
 * honoured), and the points arrive sorted by value - the endpoint's own contract, shared with
 * every other chart it serves - rather than by the bucket's configured day range, which no
 * endpoint exposes. See G-481.
 */
export const fetchOpportunityWaterfallBuckets = (
  versionUuid: string,
): Promise<OpportunityWaterfallChartResponse> =>
  post('/api/opportunity-overview/chart', {
    filters: { targetSaleFileVersionUuid: versionUuid },
    measure: 'cashFlowOpportunity',
    dimension: 'waterfallBucket',
  })

// A grid footer-totals endpoint's own path segments - every module's totals controller (Match's,
// Opportunity's, and whatever comes next) shapes its route the same way:
// `/api/{transaction}/{section}/{level}/{operation}` (e.g. AP's `/api/filters/match/spends/
// summary`, AR's `/api/filters/match/sales/summary`, `/api/filters/opportunity/sales/summary`) -
// fetchFilterSummary takes this instead of a hardcoded path so one function works for all of them.
export interface FilterSummaryEndpoint {
  transaction: string
  section: string
  level: string
  operation: string
}

export interface MatchSummaryFilters {
  currencyRate?: number
  targetSaleFileVersionUuid: string
  telerikFilter?: string
  chartsFilter?: string
  searchText?: string
  fullDisabled?: boolean
}

export interface MatchSummaryOperations {
  sum: string[]
  'avg.weighted.ceil': string[]
  'count.true': string[]
}

export interface MatchSummaryResponse {
  sum: Record<string, number>
  'avg.weighted.ceil': Record<string, number>
  'avg.weighted'?: Record<string, number>
  'count.true': Record<string, number>
  totalCount: number
}

/**
 * Ada-Platform's Opportunity summary controller (`OpportunitySummaryModels.cs`, G-395) answers 4
 * camelCase buckets (`sum`, `weightedCeilingAverage`, `weightedAverage`, `countTrue`), not Match's
 * 3 dotted-key ones (`sum`, "avg.weighted.ceil", "count.true") - a caller must remap the response
 * before handing it to GraphqlGrid's footer, which still reads the dotted-key shape.
 */
export interface OpportunitySummaryOperations {
  sum: string[]
  weightedCeilingAverage: string[]
  weightedAverage: string[]
  countTrue: string[]
}

export interface OpportunitySummaryResponse {
  sum: Record<string, number>
  weightedCeilingAverage: Record<string, number>
  weightedAverage: Record<string, number>
  countTrue: Record<string, number>
  totalCount: number
}

/**
 * The Opportunity summary's filters: Match's, plus the Waterfall drill-in's step (column parity,
 * 2026-10-02). `waterfallStep` is the same key `waterfallSaleLineRows(step)` takes, so the footer
 * can total exactly the lines that step's drill-in lists. Not computed by Ada-Platform yet - its
 * summary must apply the step's cascade predicate (WaterfallHelper.BuildNotEqualExpr) for these
 * totals to match the rows; until it does, an unknown property is ignored, so nothing fails.
 */
export interface OpportunitySummaryFilters extends MatchSummaryFilters {
  waterfallStep?: string
}

export interface FetchFilterSummaryParams<TOperations> {
  endpoint: FilterSummaryEndpoint
  filters: MatchSummaryFilters | OpportunitySummaryFilters
  summary: TOperations
}

/**
 * One grid-footer-totals call for every module's summary endpoint - the path segments and the
 * request/response envelope are identical everywhere (see FilterSummaryEndpoint); only the
 * `summary` operations shape and the `TResponse` payload differ per controller, so those travel
 * as type parameters instead of each caller getting its own near-identical function:
 *
 *   fetchFilterSummary<MatchSummaryOperations, MatchSummaryResponse>({ endpoint, filters, summary })
 *   fetchFilterSummary<OpportunitySummaryOperations, OpportunitySummaryResponse>({ endpoint, filters, summary })
 */
export const fetchFilterSummary = <TOperations, TResponse>({
  endpoint,
  filters,
  summary,
}: FetchFilterSummaryParams<TOperations>): Promise<TResponse> =>
  post(`/api/${endpoint.transaction}/${endpoint.section}/${endpoint.level}/${endpoint.operation}`, { filters, summary })

// ---------------------------------------------------------------------------------------------
// Opportunity Overview (UC-API-03)
//
// The route says `opportunity-overview`, not `program-overview`: AR has no programs, the screen is
// scoped by a sale file version and by nothing else, and Ada-Platform renamed the controller and the
// route to match before this client existed. There is no compatibility shim for the old spelling
// because there was never a caller of it.
//
// Every figure below is nullable, and that is the contract rather than defensive typing. A version
// that has not been through the calculation projects no rows, and an aggregate over no rows is not
// zero: zero reads as "we looked and there is nothing to gain", which is a claim nobody made.
// `status` is what tells the two apart.
// ---------------------------------------------------------------------------------------------

/** The Payment Terms card, in whole days. */
export interface OverviewPaymentTerms {
  contractual: number | null
  /** What was actually paid — the "Avg. Days Paid" figure the card floats beside Contractual. */
  actual: number | null
  /** Where the term could move: the winning strategy's recommendation. */
  opportunity: number | null
  /** Where it is expected to land: the recommendation weighted by the odds of the move happening. */
  expected: number | null
  /**
   * AB#20609: the "Payment Float: N" captions of the redesigned summary row. Not sent by the API
   * yet - optional so today's responses stay valid, and only read while the row's undecided
   * figures are switched on (`overviewSummaryFlags.ts`).
   */
  opportunityPaymentFloat?: number | null
  expectedPaymentFloat?: number | null
}

/** One metric card: what the move is worth, and what it is worth after weighting by the odds. */
export interface OverviewOpportunityValue {
  opportunity: number | null
  expected: number | null
}

export interface OverviewSalesAndEntities {
  salesVolume: number | null
  parentCount: number | null
  buyerCount: number | null
  saleLineCount: number | null
  /** AB#20609: Sales Volume's trend, in percent. Not sent by the API yet - see `opportunityPaymentFloat`. */
  salesVolumeTrend?: number | null
}

export interface OpportunityOverviewSummaryResponse {
  saleFileVersionId: number
  /**
   * The version's own status, always present. It is what tells "not calculated yet" apart from
   * "calculated, with nothing to show" — nulls alone cannot.
   */
  status: string | null
  paymentTerms: OverviewPaymentTerms
  cashFlow: OverviewOpportunityValue
  /**
   * The P&L Impact card: the buyer-side economic profit of the move. Null on every real file
   * until the backend gains a buyer-side financing rate (G-372) — the card shows its N/A from
   * these nulls and lights up by itself when that gap closes.
   */
  plImpact: OverviewOpportunityValue
  economicProfit: OverviewOpportunityValue
  salesAndEntities: OverviewSalesAndEntities
}

/**
 * Every measure the chart endpoint accepts, mirroring the allow-list on the .NET side. A union
 * rather than a string so a typo is a compile error here instead of a 400 at runtime.
 *
 * The LIST the dropdown offers is no longer this union — it is whatever
 * {@link fetchOpportunityChartCatalog} returns, which is derived from that same .NET allow-list. This
 * union is what the code that names a measure literally is checked against; a server newer than this
 * file can therefore return a key not spelled here, which renders under its own name rather than
 * breaking (see the card's label fallback).
 */
export type OverviewChartMeasure =
  | 'actualPaymentTerms'
  | 'contractualPaymentTerms'
  | 'volume'
  // Sale volume's own number, drawn as a pie — AP's Spend Concentration, whose options all carry
  // `defaultType: "pie"` and share the volume query. The catalog says which renderer; see chartType.
  | 'saleConcentration'
  | 'buyers'
  | 'proposedPaymentTerms'
  | 'cashFlowOpportunity'
  // AP's own `isSME` group: a distinct count of the buyers classified as SMEs. Null rather than 0
  // for a bucket where nobody was ever classified, which is every buyer in every real file today —
  // the same gate the money measures carry, said about a count.
  | 'smeCount'

export type OverviewChartDimension =
  // Not a column: it names the tenant's own declared attributes, and WHICH one travels beside it as
  // `dimensionOrdinal`. Every entry the catalog returns with an `ordinal` uses this key.
  | 'customAttribute'
  | 'region'
  // The counterparty's own ISO code, drawn as a map today - `country` is "Per Country" and
  // `geography` is "Per Geography" (their own literal names), both currently served with
  // `defaultType: "world_map"` and byte-identical responses (confirmed live). Product wants
  // "Per Country" to be a bar chart instead, same as AP's own real `perCountry` - the remaining
  // step is backend-side (switching `country`'s own `defaultType` to `horizontal_bar`), not
  // something this frontend can decide on its own. `countryName` was an earlier, abandoned plan
  // for that same bar-of-NAMES pairing (the backend never added `Dimensions["countryName"]` to
  // the served menu) - kept rather than removed in case a later catalog does serve it, but
  // nothing here expects it any more.
  | 'country'
  | 'countryName'
  | 'geography'
  | 'industry'
  | 'buyer'
  // The company's own selling entities — the AR mirror of AP's "Per Buying Entities" and the
  // chart cards' default grouping.
  | 'supplier'
  | 'currency'
  // AP calls this one "Per Harmonization"; the key is the projection's own column name, because that
  // is what a reader of the data will search for.
  | 'waterfallBucket'
  // Line attributes the file always carried and no chart could reach until Ada-Platform's line
  // projection reached parity with the payables side. `salesTeam` is the receivables inversion of
  // the monolith's perProcurementTeam.
  | 'salesTeam'
  | 'commodity'
  // The SELLING side — the tenant's own entities. `supplier` above groups by their NAME; these two
  // group by where they are, and they are the monolith's own buyer_country family inverted
  // (perBuyerCountry/perBuyerRegion). Bars of NAMES, as they are there: the only country ever drawn
  // as a map is the counterparty's `country`.
  | 'supplierCountry'
  | 'supplierRegion'
  //
  // NOT here, because the SERVED MENU does not offer them: `parent`, `isSme`, `smeSource`,
  // `winningStrategy`, `negotiationStatus`, `probabilityTier`, `cashFlowImpactTier`, and the
  // enrichment attributes generally (`continent`, `countryCreditRating`, `supplierContinent`,
  // `creditScoreSource`, `smeClassificationStatus` and the four ownership flags). Every one is a
  // column the AR projection carries and the backend's own dimension dictionary could serve in one
  // line — the Overview's menu simply does not list them, so nothing here can be asked for them.
  // Several are still GRID columns, which is a different list (`arOpportunity.list.columns.*`).
  //
  // `isSme` took something with it: it was the one dimension a measure could turn into a share on
  // its own (AP draws its suppliers × perSME cell that way), so `OverviewChartRenderType`'s `pie`
  // now only ever arrives on Sale Concentration.

/** Which component draws a (measure, dimension) pairing - served PER pairing, not decided here or
 * per dimension alone: the same dimension can be a bar under one measure and something else under
 * another (sale concentration's every option is `pie`, because sale concentration IS sale volume
 * drawn as a share - see OverviewChartDimensionOption's own `defaultType`). */
export type OverviewChartRenderType = 'horizontal_bar' | 'pie' | 'world_map'

/**
 * One dimension option, nested under the measure it belongs to - not a flat, measure-independent
 * list. The same fixed column or tenant attribute can appear under every measure, but which chart
 * it renders as (`defaultType`) and whether it is that measure's own default (`selected`) are both
 * per (measure, dimension) facts, which is why this type lives inside
 * OverviewChartMeasureOption['options'] rather than beside it.
 */
export interface OverviewChartDimensionOption {
  name: OverviewChartDimension

  /** Which chart this (measure, dimension) pairing renders as. */
  defaultType: OverviewChartRenderType

  /** Alternate renderers this pairing could use. Always empty in every response seen so far -
   * `defaultType` is the only one read today; a future column-menu-style picker would read this. */
  chartTypes: OverviewChartRenderType[]

  /** Whether this is the measure's own default dimension - see useOverviewChartCatalog.ts for how
   * the fallback is picked when no option in a group is. */
  selected: boolean

  /** Which screen this option belongs to. Always `"opportunity"` from this endpoint; carried
   * through rather than assumed, in case the catalog ever serves more than one screen. */
  view: string

  /** The tenant's own name for the attribute, shown verbatim. Null for a fixed column, whose label
   * is an i18n key this app owns instead (see OverviewMetricsCard.vue's `labelOf`). */
  translation: string | null

  /**
   * Which of the tenant's attributes this entry is, sent back as the chart request's
   * `dimensionOrdinal`. Null for a fixed column — its `name` identifies it on its own.
   */
  ordinal: number | null

  /** `text`, `integer`, `boolean` or `date`. Null for a fixed column. */
  dataType: 'text' | 'integer' | 'boolean' | 'date' | null
}

/** One measure ("Select Value" entry) and every dimension it can be grouped by. */
export interface OverviewChartMeasureOption {
  /** The chart request's own `measure` value. */
  groupName: OverviewChartMeasure

  /** Display order - lower first. Not necessarily the array's own order, so a reader sorts by this
   * rather than trusting response order. */
  index: number

  /**
   * How the measure's value should be rendered — money takes the abbreviated big-number format,
   * days and counts do not. Sent by the server rather than inferred from the measure's name here,
   * because inferring means a second table of keys that has to be updated every time a measure is
   * added on the other side, which is the drift the catalog exists to end.
   *
   * Kept as a plain `string`, not a closed union: `"money"` and `"days"` are the two seen so far,
   * but nothing here reads anything but `=== 'money'` (see OverviewMetricsCard.vue's `isMoney`),
   * so an enum would just be a way for a server-added value to fail loudly for no functional reason.
   */
  numericType: string

  /** Present as `"category"` on every entry seen so far; nothing here reads it yet. Kept on the
   * type for fidelity to the response rather than dropped, in case a future catalog entry is not
   * one (a computed/derived measure, say) and this is how a reader would tell. */
  type: string

  /** Whether this is the screen's own default measure. */
  selected: boolean

  /** The tenant's own name for the measure, shown verbatim, on the rare measure that has one. Null
   * for every fixed measure seen so far, whose label is an i18n key this app owns instead. */
  translation: string | null

  options: OverviewChartDimensionOption[]
}

/**
 * The chart menu, as the server declares it: one entry per measure, each carrying its own
 * dimension list.
 *
 * Flat, not `{ defaultMeasure, defaultDimension, measures, dimensions }` (an earlier, incorrect
 * guess at this shape, made before the endpoint existed to check it against). Both "which is the
 * default" and "which chart renders it" are PER (measure, dimension) pairing here — `selected` and
 * `defaultType` living on the nested option — not global facts, which the guessed shape had no room
 * for and would have had to fake (see useOverviewChartCatalog.ts for how they're recovered per
 * measure instead).
 *
 * There used to be a hard-coded `OVERVIEW_CHART_DIMENSIONS` list before even that guess: the list
 * the dropdown offered and the allow-list the endpoint validated against were two sources of truth
 * for one question, and the way they failed was a dropdown entry answering 400. The server now
 * derives the menu (and its render types) from its own dictionaries, so nothing here can disagree
 * with it.
 */
export type OpportunityOverviewChartCatalogResponse = OverviewChartMeasureOption[]

export interface OverviewChartPoint {
  /**
   * Nullable because a dimension can genuinely be unknown — a buyer whose country never resolved to
   * a region, a line in no currency. The bars keep those rows rather than dropping them, so they
   * still sum to the card above them.
   */
  name: string | null
  value: number | null
}

export interface OpportunityOverviewChartResponse {
  saleFileVersionId: number
  status: string | null
  measure: OverviewChartMeasure
  dimension: OverviewChartDimension
  points: OverviewChartPoint[]
}

/**
 * What narrows the overview — the same object `MatchSummaryFilters` already is, by alias rather
 * than by a second declaration with the same fields.
 *
 * An alias and not a copy because the server side is field-for-field identical on purpose: the
 * screen builds one filter object and sends it to whichever endpoint it is talking to, and a second
 * interface that has to be kept in step with this one is a second interface that will not be. If the
 * two ever genuinely diverge, that is the moment to split them, and the split will be a real
 * decision instead of a copy nobody remembered to update.
 *
 * The version field said `targetSpendFileVersionUuid` until AP's noun came off AR's own aggregate —
 * this app has no spend files. `apps/ap` still sends the old spelling to the monolith, which is
 * correct there and is why nothing outside `apps/ar` changed.
 */
export type OpportunityOverviewFilters = MatchSummaryFilters

/**
 * The envelope both overview endpoints take, with `currencyRate` defaulted and the three narrowings
 * the server accepts-but-cannot-apply sent empty.
 *
 * Sending them empty rather than omitting them is deliberate: it is what the AP screen sends, and
 * the server distinguishes an empty filter (fine) from a real one (a 400, because applying it needs
 * a field map that does not exist yet — G-380). Building the empty shapes here, in one place, keeps
 * every caller on the accepted side of that line.
 */
const overviewFilters = (
  saleFileVersionUuid: string,
  currencyRate: number,
  fullDisabled: boolean,
): OpportunityOverviewFilters => ({
  currencyRate,
  targetSaleFileVersionUuid: saleFileVersionUuid,
  telerikFilter: '{"filters":[],"logic":"and"}',
  chartsFilter: '[]',
  searchText: '',
  fullDisabled,
})

/**
 * The three cards, in one request.
 *
 * POST, and the version in the body rather than the path: the endpoint takes the filter envelope,
 * and naming the version twice is how the two names get to disagree. Same shape as
 * `fetchMatchSalesSummary`.
 *
 * `currencyRate` defaults to 1 (USD); callers pass the navbar's selected rate
 * (`useArCurrenciesStore.currency`) instead. The rate scales money only — days and counts come
 * back untouched, which is the server's rule and not this client's.
 *
 * `fullDisabled` false leaves excluded lines out, which is what the screen shows by default; true
 * counts them, and is the only one of the six filter fields the server actually applies today
 * besides the rate.
 */
export const fetchOpportunityOverviewSummary = (
  saleFileVersionUuid: string,
  currencyRate = 1,
  fullDisabled = false,
): Promise<OpportunityOverviewSummaryResponse> =>
  post('/api/opportunity-overview/summary', {
    filters: overviewFilters(saleFileVersionUuid, currencyRate, fullDisabled),
  })

/**
 * One chart: a measure grouped by a dimension, already sorted by value descending.
 *
 * `measure` and `dimension` sit beside the filters rather than inside them, mirroring the server:
 * what to compute and what to narrow are different questions.
 */
export const fetchOpportunityOverviewChart = (
  saleFileVersionUuid: string,
  measure: OverviewChartMeasure,
  dimension: OverviewChartDimension,
  currencyRate = 1,
  fullDisabled = false,
  // Only for `dimension: 'customAttribute'`, and refused with anything else — the endpoint answers
  // 400 rather than ignoring it, because a caller that sent one believes it asked for something.
  dimensionOrdinal?: number,
): Promise<OpportunityOverviewChartResponse> =>
  post('/api/opportunity-overview/chart', {
    filters: overviewFilters(saleFileVersionUuid, currencyRate, fullDisabled),
    measure,
    dimension,
    ...(dimensionOrdinal === undefined ? {} : { dimensionOrdinal }),
  })

/**
 * What the two chart dropdowns may offer, and what the screen opens on.
 *
 * A GET, unlike every other overview call, because it takes no filter and returns no data. The
 * version is OPTIONAL and narrows only what is added: the fixed dimensions are the same for every
 * version, and the tenant's own declared attributes are what need one. Omitting it is a valid
 * request that answers the fixed menu — which is why the parameter could be added to a shipped
 * endpoint without breaking a caller.
 */
export const fetchOpportunityChartCatalog = (
  saleFileVersionUuid?: string,
): Promise<OpportunityOverviewChartCatalogResponse> =>
  get<OpportunityOverviewChartCatalogResponse>(
    saleFileVersionUuid === undefined
      ? '/api/opportunity-overview/chart-catalog'
      : `/api/opportunity-overview/chart-catalog?versionUuid=${encodeURIComponent(saleFileVersionUuid)}`)

/**
 * UC-API-18: one bar of the waterfall chart, in whichever unit its array carries. `period` is the
 * cascade step's own wire key (`payOnTerms`, `buyerStandard`, ..., `target`) - `byTerms`'s first
 * entry is the exception, keyed `actual` for step 01's own absolute level rather than a move (see
 * `WaterfallChartResponse` below). Bars the cascade moved nothing on are dropped by the server
 * rather than sent at zero, so this array's length and order are not assumed here - only read.
 */
export interface WaterfallChartBar {
  period: string
  amount: number
}

/**
 * UC-API-18's own response: `POST /api/opportunity-overview/waterfall-chart`, the AR sibling of
 * AP's `api/analyze/program/waterfall-chart`. Both `byTerms` and `byCashFlow` travel together so
 * the screen's unit toggle never refetches.
 *
 * The two arrays are not the same steps in another unit: `byTerms` opens with step 01's own level
 * (`actual`) and `byCashFlow` has no such entry (step 01 releases no cash), and a step can move the
 * weighted TERM without releasing any CASH (or the reverse) - see `WaterfallChartBar`'s own note.
 * The LAST bar of each array also carries the drift that reconciles it against the Overview cards,
 * so it is not purely that step's own move - the front end draws it as any other bar regardless,
 * per UC-API-18's own contract.
 */
export interface WaterfallChartResponse {
  /** Every step's absolute weighted level, keyed `NN_key` (`01_actual`, `02_payOnTerms`, ...). Not
   * drawn by this screen today - kept for fidelity to the response. */
  original: Record<string, number | null>
  byTerms: WaterfallChartBar[]
  byCashFlow: WaterfallChartBar[]
}

/**
 * UC-UI-15's Strategy Breakdown chart. Same envelope every other Opportunity Overview call sends
 * (`overviewFilters`) - `currencyRate` scales `byCashFlow` only, same rule as every other money
 * figure this controller returns.
 */
export const fetchOpportunityWaterfallChart = (
  saleFileVersionUuid: string,
  currencyRate = 1,
  fullDisabled = false,
): Promise<WaterfallChartResponse> =>
  post('/api/opportunity-overview/waterfall-chart', {
    filters: overviewFilters(saleFileVersionUuid, currencyRate, fullDisabled),
  })

/**
 * UC-API-14/UC-UI-04: which grain `fetchNineBoxTermsReduction` counts and sums — AR's own nouns
 * under AP's `spend | supplier | parent` inversion (`Ada.Ar.Api.Models.NineBoxLevels`): `buyers`
 * (AP's `supplier`, and the default — UC-UI-04 places buyers on the grid), `sales` (AP's `spend`,
 * i.e. one row per sale line) and `parents` (unchanged by the inversion).
 */
export type NineBoxLevel = 'buyers' | 'sales' | 'parents'

/**
 * One nine-box cell's server-side aggregate (`Ada.Ar.Api.Models.NineBoxCellRowDto`). `nineBox` is
 * 1-9 in AP's own layout (`7 4 1 / 8 5 2 / 9 6 3` — box 1 is High probability/High impact, the
 * top-right cell), or null on the trailing Unranked row (present only when it has buyers in it -
 * UC-OPP-17 A1). Every money field is null, not zero, when nothing in the cell was ever valued -
 * see the DTO's own doc for why a gated null and a real zero must not collapse into each other.
 */
export interface NineBoxCellRow {
  nineBox: number | null
  probabilityTier: OpportunityTier | null
  cashFlowImpactTier: OpportunityTier | null
  nineBoxCell: string | null
  /** The cell's High/Medium/Low band (UC-OPP-17, G-602) - redundant with the two tiers above for
   * a client that already keys off them, carried through for a caller that wants the band alone. */
  priority: OpportunityTier | null
  buyerCount: number
  saleLineCount: number
  volume: number | null
  totalValue: number | null
  /** `totalValue` weighted by each buyer's acceptance rate (UC-OPP-20) - what is realistically
   * likely to close, beside what is on the table. */
  expectedTotalValue: number | null
  economicProfitImpact: number | null
  /** The cell's volume-weighted payment terms, in whole DAYS — not money, so they are never scaled
   * by the currency rate. `contractualPaymentTerms` is `contractual ?? actual` (the same measure the
   * Overview card's Contractual row reads) and `averageDaysPaid` is the actual term alone.
   *
   * `paymentTermsOpportunity` and `expectedPaymentTerms` count a party with no proposal at the term
   * it already has, which is AB#20060's rule and what lets the four sit beside each other as one
   * range; both are null when NOBODY in the cell has a proposal, because repeating the contractual
   * term there would read as a forecast rather than as the absence of one. */
  contractualPaymentTerms: number | null
  averageDaysPaid: number | null
  paymentTermsOpportunity: number | null
  expectedPaymentTerms: number | null
}

/**
 * UC-UI-04's nine-box cell aggregates, computed server-side at request time over the same
 * projection the buyer-level rows (`fetchOpportunities`) read - so a cell's headline numbers and
 * the buyers a click into it lists can never disagree. Superseded the earlier client-side
 * aggregation this file's own history documents (`nineBoxAggregation.ts` still does that
 * per-buyer grouping, for the drill-down lists this endpoint does not carry).
 *
 * Always answers up to 9 rows plus, only when non-empty, a trailing Unranked row (`nineBox: null`)
 * - never fewer than the cells that have data, an absent Unranked row asserting every buyer has
 * both axes.
 */
export const fetchNineBoxTermsReduction = (
  saleFileVersionUuid: string,
  level: NineBoxLevel = 'buyers',
  currencyRate = 1,
  fullDisabled = false,
): Promise<NineBoxCellRow[]> =>
  post('/api/opportunity-overview/nine-boxes/terms-reduction', {
    filters: overviewFilters(saleFileVersionUuid, currencyRate, fullDisabled),
    level,
  })
