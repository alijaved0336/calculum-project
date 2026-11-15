import * as globalColumns from "@ada/design-system/data/globalColumns";
import type {
  GraphqlGridColumn,
  GraphqlGridColumnOrGroup,
} from "@ada/design-system/components/graphql-grid/types";
import { customAttributeColumnGroup } from "@/utils/customAttributeColumns";
import { translate } from "@/utils/translation";

// Mirrors the parent/children shape of apps/ap/src/modules/home/overview/data/graphqlColumns.ts
// (matchColumnsGrid) - same two-group split: headline identity/status fields first, then every
// buyer/sale attribute being matched. This is the final column list the backend team confirmed
// for the sale-match list; every field below comes from design-system's shared globalColumns
// catalog, mapped against whichever AP export already covers that same field:
//   backend field                         -> globalColumns export        (AP's own group)
//   confidenceScore                       -> confidenceScore             (results)
//   buyerName                             -> buyerNameAR                (results, ~matchSupplierName)
//   originalBuyerName                     -> originalBuyerName          (suppliersAnalyzedAndMatched, ~matchSupplierNameReceived)
//   aggregatedLinesCount                  -> aggregatedLinesCount        (suppliersAnalyzedAndMatched)
//   originalIdNumber                      -> originalIdNumber           (suppliersAnalyzedAndMatched)
//   parentCompanyName                     -> matchParentCompanyName     (suppliersAnalyzedAndMatched)
//   originalParentCompanyName             -> matchParentCompanyNameReceived (suppliersAnalyzedAndMatched)
//   volume                                -> volume                     (suppliersAnalyzedAndMatched)
//   commodity                             -> matchCommodity             (suppliersAnalyzedAndMatched)
//   address / originalAddress             -> matchAddress / matchAddressReceived (suppliersAnalyzedAndMatched)
//   city / originalCity                   -> matchCity / macthCityReceived (suppliersAnalyzedAndMatched)
//   state / originalState                 -> matchState / matchStateReceived (suppliersAnalyzedAndMatched)
//   zipCode / originalZipCode             -> matchZipCode / matchZipCodeReceived (suppliersAnalyzedAndMatched)
//   country                               -> matchCountry               (suppliersAnalyzedAndMatched)
//   buyerCountryCode                      -> buyerCountryCode            (suppliersAnalyzedAndMatched, ~matchCountry)
//   domain                                -> matchDomain                 (suppliersAnalyzedAndMatched)
//   currency                              -> macthCurrency               (suppliersAnalyzedAndMatched)
//   originalPaymentTermDescription        -> matchOriginalPaymentTermDescription (suppliersAnalyzedAndMatched)
//   contractualPaymentTermsWithoutCashDiscounts, actualPaymentTerms,
//   contractualPaymentTermsWithCashDiscounts, cashDiscounts, capturedCashDiscounts -> same-named exports (suppliersAnalyzedAndMatched)
//   noMatchReason                         -> noMatchReason               (suppliersAnalyzedAndMatched, ~reason)
//   sourceRowNumber                       -> sourceRowNumber            (n/a, AR-only field)
//
// The parent entries are pure visual grouping (a GraphqlGridColumnGroup) - they carry no
// `hidden`/`filterable` of their own because ColumnSelector never reads it, only their
// `children` are ever individually shown/hidden or filtered (see ColumnSelector.vue).
// `columnMenu: false` on each group opts its own header cell out of GraphqlGrid's column menu -
// a group header has nothing of its own to filter or sort by, only its `children` do (see
// Index.vue's `gridColumns`, which otherwise assigns the column-menu header cell to every group
// too, not just leaf columns).
//
// Footer totals (column parity, 2026-10-02, like AP's own Match grid): Sales Volume summed and the
// three payment terms as a volume-weighted day average - exactly what Ada-Platform's
// /api/filters/match/sales/summary computes (MatchFiltersController). `withFooters` sets those and
// clears every other footer the reused globalColumns exports carry (e.g. captured cash discount).
// The grouped headers stay: GraphqlGrid no longer hangs on a grouped grid with a footer (WI#18884,
// see visibleGraphqlGridColumns in graphql-grid/types.ts).
//
// Column parity (2026-10-02, AP's Match grid): the order, AR wording and default visibility below
// follow the parity document. Matched / Excluded are gone (decision: Match Status replaces them;
// the backend's SaleMatchRowFilterInputType keeps both fields, so a saved filter still parses),
// and No Match Reason is titled "Exclusion Reason". Titles reuse the Opportunity lists'
// `arOpportunity.list.gridColumns.*` wording so a column reads the same in every AR grid.
const title = (key: string) => translate.t(`arOpportunity.list.gridColumns.${key}`);
const titled = (column: unknown[], key: string, overrides: Partial<GraphqlGridColumn> = {}): GraphqlGridColumn => ({
  ...(column[0] as GraphqlGridColumn),
  title: title(key),
  ...overrides,
});

const MATCH_FOOTERS: Readonly<Record<string, string>> = {
  volume: "TotalsBycolumnsSum",
  contractualPaymentTermsWithoutCashDiscounts: "TotalsBycolumnsAvgWeightedCeil",
  actualPaymentTerms: "TotalsBycolumnsAvgWeightedCeil",
  contractualPaymentTermsWithCashDiscounts: "TotalsBycolumnsAvgWeightedCeil",
};
const withFooters = (columns: GraphqlGridColumn[]): GraphqlGridColumn[] =>
  columns.map((column) => ({ ...column, footerCell: MATCH_FOOTERS[column.field] }));

export const saleMatchColumnsGrid: GraphqlGridColumnOrGroup[] = [
  {
    title: translate.t("arMatch.groups.results"),
    resizable: false,
    columnMenu: false,
    children: withFooters([
      titled(globalColumns.matchStatus, "matchStatus"),
      ...globalColumns.confidenceScore,
      titled(globalColumns.buyerNameAR, "buyerName", { hidden: false }),
    ] as GraphqlGridColumn[]),
  },
  {
    title: translate.t("arMatch.groups.matchDetails"),
    resizable: false,
    columnMenu: false,
    children: withFooters([
      titled(globalColumns.originalBuyerName, "receivedBuyerName", { hidden: false }),
      ...globalColumns.aggregatedLinesCount,
      ...globalColumns.originalIdNumber,
      titled(globalColumns.matchParentCompanyName, "parents"),
      titled(globalColumns.matchParentCompanyNameReceived, "receivedParents"),
      // AB#20537: never globalColumns.volume's own title - that shared key is AP's "Spend Volume".
      titled(globalColumns.volume, "salesVolume"),
      ...globalColumns.matchCommodity,
      ...globalColumns.matchAddress,
      ...globalColumns.matchAddressReceived,
      ...globalColumns.matchCity,
      ...globalColumns.macthCityReceived,
      ...globalColumns.matchState,
      ...globalColumns.matchStateReceived,
      ...globalColumns.matchZipCode,
      ...globalColumns.matchZipCodeReceived,
      titled(globalColumns.matchCountry, "countryBuyer"),
      titled(globalColumns.buyerCountryCode, "countryCodeBuyer"),
      titled(globalColumns.matchDomain, "url"),
      ...globalColumns.macthCurrency,
      ...globalColumns.matchOriginalPaymentTermDescription,
      ...globalColumns.contractualPaymentTermsWithoutCashDiscounts,
      titled(globalColumns.actualPaymentTerms, "averageDaysPaid"),
      ...globalColumns.contractualPaymentTermsWithCashDiscounts,
      ...globalColumns.cashDiscounts,
      titled(globalColumns.noMatchReason, "exclusionReason", { hidden: false }),
      ...globalColumns.capturedCashDiscounts,
    ] as GraphqlGridColumn[]),
  },
  // The twenty static placeholders, titled per tenant once ListMatch.vue resolves the version
  // schema. Shared with the Opportunity overview grid, which shows the same attributes at its own
  // three levels — see @/utils/customAttributeColumns for why the columns are static and the titles
  // are not, and for why they are filterable without being fields of any filter input.
  customAttributeColumnGroup(translate.t("arMatch.groups.customAttributes")),
];
