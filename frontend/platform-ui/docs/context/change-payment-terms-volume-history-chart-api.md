# Payment Terms Volume History Chart – API and Front-End Integration

## Summary

Integration of the **payment-terms-volume-history** API (Option B) for the BarLineChart: tooltip with Date, Contract PT, Avg days paid, PT discount, Volume; axis min/max from API; async load in parent's `onMounted`.

## API Contract

**Endpoint:** `GET api/entity-card/entity/{uuid}/payment-terms-volume-history`

**Response shape (Option B):**

```json
{
  "categories": ["1Q24", "2Q24", "3Q24", "4Q24", "1Q25", "2Q25", "3Q25", "4Q25"],
  "dateLabels": ["29 Sep 2024", "31 Dec 2024", "31 Mar 2025", "30 Jun 2025", "30 Sep 2025", "31 Dec 2025", "31 Mar 2026", "30 Jun 2026"],
  "series": {
    "spendVolume": [12, 0, 15, 8, 20, 0, 10, 25],
    "avgDaysPaid": [0, 25, 27, null, 40, 38, 36, 50],
    "contractPaymentTerms": [4, 25, 27, 50, 40, null, 36, 50],
    "ptDiscount": [0, 5, 5, null, 10, 8, 5, 10]
  },
  "meta": {
    "termsAxisMin": 0,
    "termsAxisMax": 60,
    "volumeAxisMin": 0,
    "volumeAxisMax": 30,
    "unitVolume": "M",
    "currency": "USD"
  }
}
```

- **categories**: X-axis labels (e.g. quarters). Length must match all series arrays.
- **dateLabels** (optional): Display date per point for tooltip (e.g. "29 Sep 2024"). Falls back to `categories` if omitted.
- **series.spendVolume**: Volume per period (bars).
- **series.avgDaysPaid**, **series.contractPaymentTerms**: Line series; `null` = gap.
- **series.ptDiscount** (optional): PT discount per period (e.g. 5 for 5%); used in tooltip.
- **meta**: Optional axis bounds and units. Front uses defaults (terms 0–60, volume 0–30, unit "M") when omitted.

## Tooltip Fields

The chart tooltip shows (as in design):

1. **Date** – from `dateLabels[i]` or `categories[i]`
2. **Contract PT** – from `series.contractPaymentTerms[i]`
3. **Avg days paid** – from `series.avgDaysPaid[i]`
4. **PT discount** – from `series.ptDiscount[i]` (e.g. "5%")
5. **Volume** – from `series.spendVolume[i]` with `meta.unitVolume` (e.g. "5M")

## Front-End Changes

1. **Types** (`entityCard/types/index.ts`): `PaymentTermsVolumeHistoryAPIResponse`, `PaymentTermsVolumeHistoryDataPoint`.
2. **API** (`entityCard/api/index.ts`): `getPaymentTermsVolumeHistory(entityUuid)` calling the GET endpoint.
3. **Store** (`stores/entityCard.ts`): Only action `getPaymentTermsVolumeHistory(params)` with `params: { entityUuid, callbackSuccess, callbackError }` (same pattern as `getPaymentTermsOpportunity`). No state nor getter.
4. **Parent** (`EntityPaymentTermsStrategies.vue`): Local state `chartVolumeHistoryData`; function `getPaymentTermsVolumeHistory()` that calls `entityCardStore.getPaymentTermsVolumeHistory({ entityUuid, callbackSuccess, callbackError })`; in `callbackSuccess` sets `data.chartVolumeHistoryData = callbackSuccessData`; in `callbackError` sets `data.chartVolumeHistoryData = null`. Called in `onMounted()` without await.
5. **BarLineChart** (`BarLineChart.vue`): Prop `chartData`; derives categories, series, and axis min/max from it; tooltip shows all five fields; chart only renders when `hasChartData` is true.

## Edge Cases

- Missing `dateLabels`: use `categories` for Date in tooltip.
- Missing `ptDiscount`: tooltip shows "—" for PT discount.
- Missing `meta` or axis values: use defaults (terms 0–60, volume 0–30, unit "M").
- API error or empty response: chart section not rendered (`hasChartData` false).

## Full API response and table (ListHistorical)

The API can return a full response with `referenceDate`, `table`, `chart`, plus the chart fields above. The parent maps it as follows:

- **BarLineChart**: receives only the chart shape `{ categories, dateLabels?, series, meta? }` (built via `buildChartPayloadFromRawResponse`).
- **ListHistorical**: receives `historicalData` from the same API response: `table` is mapped to `HistoricalRecord[]` with "-" for any missing value. When `historicalData` is provided, ListHistorical does not call GraphQL.

Types: `PaymentTermsVolumeHistoryRawAPIResponse` (full response), `PaymentTermsVolumeHistoryTableRow` (table row). Mapping: `contractualPaymentTerm` → contractualPayment, `averageDaysPaid` → avgDaysPaid, `contractualWithDiscount` → contractualWithDiscount, `description`, `dateOfAgreement`, `effectiveDate`, `spendFileSource` → source, `status` → ptStatus, `spendVolume`, `achievedCashFlow`; discount and recentlyAgreed are not in API (use "-" and 0).
