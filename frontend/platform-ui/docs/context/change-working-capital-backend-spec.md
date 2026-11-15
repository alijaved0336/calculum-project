# Working Capital Improvement — Backend API Specification

> **Status:** Frontend complete with mock data (`USE_MOCK = true`).
> Backend must implement both endpoints below. Once stable, set `USE_MOCK = false` in
> `apps/ap/src/modules/home/workingCapital/api/mock.ts`.

---

## Overview

The Working Capital Improvement dashboard requires two REST endpoints:

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 1 | `GET` | `/api/working-capital/versions` | List all spend-file versions for the active company |
| 2 | `GET` | `/api/working-capital/compare` | Run the comparison between two versions |

Both endpoints are called with the existing Axios client that injects auth headers automatically. Errors (non-2xx) are caught and surfaced via `giveAnswer()` — the frontend expects a standard `{ success, code, data }` envelope.

---

## Endpoint 1 — GET `/api/working-capital/versions`

### Request

No query parameters. Auth context (company / spend file) comes from the session token.

### Response body

```json
{
  "versions": [ <WCVersion>, <WCVersion>, ... ]
}
```

#### `WCVersion` object

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | `string` | Unique identifier used as `baseVersion` param in `/compare` |
| `version` | `number` | Integer version number (display only) |
| `name` | `string` | Human-readable name for the spend file |
| `initialDate` | `string` | ISO 8601 date — start of the version period |
| `finalDate` | `string` | ISO 8601 date — end of the version period |
| `year` | `string` | Short year label shown in chart legends (e.g. `"2024"`) |

#### Business rules

- The array must be **ordered newest-first** (index `[0]` = latest, index `[1]` = previous, etc.).
- The frontend auto-selects `versions[0]` as the *to* version and `versions[1]` as the default *from* version.
- The version selector dropdown is only shown when `versions.length >= 3`. With exactly 2 versions the selector is hidden and the comparison runs automatically.

#### Example

```json
{
  "versions": [
    {
      "uuid": "abc-latest",
      "version": 4,
      "name": "Acme Corp",
      "initialDate": "2025-01-01",
      "finalDate": "2025-12-31",
      "year": "2025"
    },
    {
      "uuid": "abc-base",
      "version": 3,
      "name": "Acme Corp",
      "initialDate": "2024-01-01",
      "finalDate": "2024-12-31",
      "year": "2024"
    }
  ]
}
```

---

## Endpoint 2 — GET `/api/working-capital/compare`

### Request query parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `baseVersion` | `string` | Yes | UUID of the **from** (baseline) version selected by the user |
| `toVersion` | `string` | Yes | UUID of the **to** version — the platform-level active spend file. Always sent by the frontend; backend must use this exact version as the comparison target, not infer it from session state. |
| `minDays` | `number` | No | Minimum payment-term extension to count a supplier as improved. Default `5`. Must be returned in the response so the UI stays in sync. |

### Response body — top-level

```json
{
  "baseVersion":   <WCVersion>,
  "latestVersion": <WCVersion>,
  "minDays":        5,
  "currency":       "USD",
  "summary":        { ... },
  "supplierCoverage": { ... },
  "wapt":           { ... },
  "cashFlowByCountry":    [ ... ],
  "paymentTermsByCountry": [ ... ],
  "topSuppliers":   [ ... ],
  "topSuppliersTotal": 1236
}
```

---

### `summary` object

KPI aggregates used by the four top cards.

| Field | Type | Description |
|-------|------|-------------|
| `totalImprovedCashFlow` | `number` | Total cash flow improvement in `currency` units |
| `targetCashFlow` | `number` | Target cash flow improvement goal |
| `suppliersImproved` | `number` | Count of suppliers whose payment terms were extended ≥ `minDays` |
| `targetAchievementPct` | `number` | Integer percentage: `totalImprovedCashFlow / targetCashFlow × 100` |

#### Example

```json
{
  "totalImprovedCashFlow": 194559413,
  "targetCashFlow": 246588076,
  "suppliersImproved": 1236,
  "targetAchievementPct": 79
}
```

---

### `supplierCoverage` object

Donut chart and legend data (Supplier Match Coverage card).

| Field | Type | Description |
|-------|------|-------------|
| `matchedIncreased` | `number` | Suppliers matched **and** improved (≥ `minDays` extension) |
| `matchedNotIncreased` | `number` | Suppliers matched but extension < `minDays` |
| `notMatched` | `number` | Suppliers not matched in this version |
| `totalAnalyzed` | `number` | Total suppliers in scope for the comparison |

> `matchedIncreased + matchedNotIncreased + notMatched` should equal `totalAnalyzed`.

#### Example

```json
{
  "matchedIncreased":    1236,
  "matchedNotIncreased": 9100,
  "notMatched":          9559,
  "totalAnalyzed":       19795
}
```

---

### `wapt` object

Weighted Average Payment Terms data used in the WAPT Improvement chart.

| Field | Type | Description |
|-------|------|-------------|
| `gainDays` | `number` | Net WAPT improvement for improved suppliers (decimal days) |
| `fromDays` | `number` | WAPT in the base version |
| `toDays` | `number` | WAPT in the latest version |
| `targetDays` | `number` | WAPT target |
| `matchedSuppliers.waptFrom` | `number` | WAPT base — all matched suppliers |
| `matchedSuppliers.waptTo` | `number` | WAPT latest — all matched suppliers |
| `matchedSuppliers.waptTarget` | `number` | WAPT target — all matched suppliers |
| `improvedSuppliers.waptFrom` | `number` | WAPT base — improved suppliers only |
| `improvedSuppliers.waptTo` | `number` | WAPT latest — improved suppliers only |
| `improvedSuppliers.waptTarget` | `number` | WAPT target — improved suppliers only |

#### Example

```json
{
  "gainDays":   27.4,
  "fromDays":   85.1,
  "toDays":    112.5,
  "targetDays": 116.8,
  "matchedSuppliers":  { "waptFrom": 70.7, "waptTo": 76.5,  "waptTarget": 93.4  },
  "improvedSuppliers": { "waptFrom": 85.1, "waptTo": 112.5, "waptTarget": 116.8 }
}
```

---

### `cashFlowByCountry` array

Bar chart showing cash flow improvement by country.

| Field | Type | Description |
|-------|------|-------------|
| `country` | `string` | Country name |
| `amount` | `number` | Total improved cash flow for that country |

- Return **top 7** countries, ordered by `amount` descending.

#### Example

```json
[
  { "country": "Japan",          "amount": 159091748 },
  { "country": "United States",  "amount":  10967501 },
  { "country": "Germany",        "amount":   4134189 }
]
```

---

### `paymentTermsByCountry` array

Stacked bar chart showing base payment terms + increase per country.

| Field | Type | Description |
|-------|------|-------------|
| `country` | `string` | Country name |
| `waptFrom` | `number` | Weighted average payment terms in the **base** version (days) |
| `increase` | `number` | Average extension gained in the **latest** version (days) |

- Return **top 7** countries, ordered by `increase` descending.

#### Example

```json
[
  { "country": "Japan",   "waptFrom": 95.6, "increase": 27.2 },
  { "country": "Italy",   "waptFrom": 68.2, "increase":  4.6 },
  { "country": "Germany", "waptFrom": 60.9, "increase":  3.4 }
]
```

---

### `topSuppliers` array

Ranked table of suppliers by cash flow improvement.

| Field | Type | Description |
|-------|------|-------------|
| `supplier` | `string` | Supplier name |
| `country` | `string` | Supplier country |
| `cashFlow` | `number` | Cash flow improvement for this supplier |
| `termsFrom` | `number` | Payment terms in the base version (integer days) |
| `termsTo` | `number` | Payment terms in the latest version (integer days) |
| `extension` | `number` | `termsTo - termsFrom` (integer days) |

- Return **top N** suppliers ordered by `cashFlow` descending. The frontend displays however many are returned; there is no client-side pagination.
- `topSuppliersTotal` is the total count of improved suppliers (used in the badge "Top N of X").

#### Example

```json
[
  {
    "supplier":  "Aska Pharmaceutical Co., Ltd.",
    "country":   "Japan",
    "cashFlow":  34942876,
    "termsFrom": 120,
    "termsTo":   150,
    "extension": 30
  }
]
```

---

## Field-to-UI mapping summary

| UI Component | Source fields |
|---|---|
| KPI Card "Working Capital Improvement" | `summary.totalImprovedCashFlow`, `summary.targetCashFlow` |
| KPI Card "Suppliers Improved" | `summary.suppliersImproved`, `supplierCoverage.matchedIncreased + matchedNotIncreased`, `supplierCoverage.totalAnalyzed` |
| KPI Card "WAPT Gain" | `wapt.gainDays`, `wapt.fromDays`, `wapt.toDays` |
| KPI Card "Target Achievement" | `summary.targetAchievementPct`, `summary.totalImprovedCashFlow`, `summary.targetCashFlow` |
| Supplier Match Coverage (donut) | `supplierCoverage.*` |
| WAPT Improvement (bar chart) | `wapt.*` |
| Cash Flow by Country | `cashFlowByCountry[]` |
| Payment Terms by Country | `paymentTermsByCountry[]` |
| Top Suppliers (table) | `topSuppliers[]`, `topSuppliersTotal` |
| Cash Flow vs Target (progress bars) | `summary.totalImprovedCashFlow`, `summary.targetCashFlow` |
| Version selector dropdown | `versions[]` from `/versions` endpoint |
| Chart year legends | `baseVersion.year`, `latestVersion.year` |

---

## Enabling the real endpoints

Once the backend is deployed, remove the mock flag in the frontend:

```typescript
// apps/ap/src/modules/home/workingCapital/api/mock.ts
export const USE_MOCK = false   // ← change this
```

No other changes are needed in the frontend.
