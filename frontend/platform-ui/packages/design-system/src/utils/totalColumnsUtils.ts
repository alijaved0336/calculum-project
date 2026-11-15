// AB#20356: AR's Opportunity Overview List (apps/ar) opts columns into a footer the same way
// AP/Match do (a `footerCell` on the column definition), but a column also has to have its field
// name listed here before that footer is actually requested - a mismatch between the two is a
// silent no-op (no error, the field just never reaches the request payload). AR's own
// `opportunity*`-prefixed exports in globalColumns.ts introduced field names of their own
// (notably the "Avg"-suffixed party-grain variants) that were never added here when those exports
// gained a `footerCell` - the 3 lines below marked AB#20356 are that backfill.
// AB#19872: opportunityCashFlow is the pre-AB#19950 name of this field; no column declares it any
// more (globalColumns.ts uses modelCashFlow), so it is renamed here rather than added alongside.
const getFieldsBySummation = ['volume','spendCounts', 'supplierCounts', 'capturedCashDiscount','vCardCashFlowGainFull','vCardCashFlowEpFull','vCardRebateFull','vCardRebateEpFull','vCardTotalEconomicProfitFull','modelCashFlow','targetCashFlow','cashFlowContribution','agreedCashFlow','outstanding','vCardRebate', 'forecastValue', 'forecastVolume', 'saleLineCount', 'cashFlowImpact', 'cashFlowAgreed', 'buyerCount'] // AR column parity (2026-10-02): Number of Sales Lines, Cash Flow - Opportunity / Agreed, Number of Buyers

const getFieldsByWeightedAvg = ['averageDaysToApproveInvoice','contractualPaymentTermsWithoutCashDiscounts','actualPaymentTerms','contractualPaymentTermsWithCashDiscounts','proposedPaymentTerms','termsWithoutCashDiscount','termsWithCashDiscount', 'actualPaymentTermsAvg', 'contractualPaymentTermsWithoutCashDiscountsAvg', 'contractualPaymentTermsWithCashDiscountsAvg', 'recommendedTerm', 'targetPaymentTerms'] // AB#20356: the 3 "Avg"-suffixed AR buyer/parent-grain fields added; column parity (2026-10-02): recommendedTerm / targetPaymentTerms (Payment Terms - Opportunity / Target)

const getFieldsByTrueValue= ['isSME','isVCardApplied','entityEthnicMinorityOwnedBusiness','entityWomanOwnedBusiness','entityVeteranOwnedBusiness', 'isMinorityOwned', 'isWomanOwned', 'isVeteranOwned'] // AB#20356: AR's own ownership field names added

// AB#20356 follow-up: capturedCashDiscounts (AR's own field, both sale-line and buyer/parent grain)
// belongs in the request's plain `weightedAverage` bucket - Ada-Platform's OpportunitySummaryNatures.cs
// only ever defines it under SaleLineWeightedAverage/PartyWeightedAverage, never under
// SaleLineSum/PartySum, so the backend 400s the whole summary request if it were requested as a sum.
// Not the `weightedCeilingAverage` one getFieldsByWeightedAvg feeds either - that's a different,
// ceil-rounded backend nature, already used by the payment-terms averages above and by many AP
// callers this list must not disturb.
const getFieldsByPlainWeightedAvg = ['capturedCashDiscounts']

// Only Custom Data Points 21-26 are numeric (decimal) and aggregatable; 1-20 are free TEXT
// columns and must never enter a summary bucket (SUM(text) errors out on the backend and nulls
// the whole summary). 21-26 are bucketed by their Spend File type (from customDataPointTypes):
// `days` -> weighted avg (ceil), everything else (number/money) -> sum. When the type map is not
// provided the field falls back to sum. Matches the backend contract (^customDataPoint(2[1-6])$).
const CUSTOM_DATA_POINT_RE = /^customDataPoint(2[1-6])$/;

export const getTotalFieldsSummation = (selectedFields: Array<any>, customTypes: Record<string, string> = {}) => {
    return selectedFields.filter(value => {
      if (CUSTOM_DATA_POINT_RE.test(value)) return (customTypes[value] ?? 'number') !== 'days';
      return getFieldsBySummation.includes(value);
    });
};

export const getTotalFieldsWeightedAvg = (selectedFields: Array<any>, customTypes: Record<string, string> = {}) => {
  return selectedFields.filter(value => {
    if (CUSTOM_DATA_POINT_RE.test(value)) return (customTypes[value] ?? 'number') === 'days';
    return getFieldsByWeightedAvg.includes(value);
  });
};

export const getTotalFieldsPlainWeightedAvg = (selectedFields: Array<any>) => {
  return selectedFields.filter(value => getFieldsByPlainWeightedAvg.includes(value));
};


export const getTotalFieldsCountByTrueValue = (selectedFields: Array<any>) => {
    return selectedFields.filter(value => getFieldsByTrueValue.includes(value));
};


export const getActiveColumnsArray = (columns: any) => {

    const selectedFields: Array<any> = []

    columns.forEach(function(data: any) {
      if (data.hidden === false) {
        selectedFields.push(data.field)
      }
    });
    return selectedFields;
  };


/**
 *
 * @param totalsFields
 * @param columsGrid
 * @param successData
 * @param summationColumns
 * @param avgWeightedColumns
 * @param trueValueColumns ??
 * @returns
 */


export const getTotalFieldsFooter = async (totalsFields: Array<any | null>, columsGrid: Array<any>, successData: any, summationColumns: any, avgWeightedColumns: any, trueValueColumns: any) => {

    const totals = totalsFields as {
      sum?: Record<string, number>;
      ["avg.weighted.ceil"]?: Record<string, number>;
      ["count.true"]?: Record<string, number>;
    };

    let totalRow: Record<string, any> = {};

    if (successData.length > 0) {
    totalRow = columsGrid.reduce((acc, col) => {
      const field = col.field;
      if (field) {
        const sumValue = totals?.sum?.[field];
        const avgValue = totals?.["avg.weighted.ceil"]?.[field];
        const counTrue = totals?.["count.true"]?.[field];

        if (summationColumns.includes(field) && typeof sumValue === "number") {
          acc[field] = "Sum: " + sumValue;
        } else if (avgWeightedColumns.includes(field) && typeof avgValue === "number") {
          acc[field] =  "Avg Weighted: " +  avgValue;
        }
        else if (trueValueColumns.includes(field) && typeof avgValue === "number") {
          acc[field] =  "Count: " +  counTrue;
        }
         else {
          acc[field] = "";
        }
      }
      return acc;
    }, {});
  }

  return totalRow



};
