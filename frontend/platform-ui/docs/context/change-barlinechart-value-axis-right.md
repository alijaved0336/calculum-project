# Checklist: BarLineChart – Combo Chart with Two Value Axes

## Context
BarLineChart is a **combo chart**: two series in one (Payment Terms = line, Spend Volume = column), so it needs **two value axes** — Payment Terms on the left, Spend Volume on the right.

## Findings
- Kendo Vue Charts: position of value axes is controlled by **`axisCrossingValue`** on the **category axis**.
- For **two** value axes use an **array**: `axisCrossingValue: [0, categories.length]` → first axis crosses at 0 (left), second at end (right).
- One `ChartCategoryAxis` + one `ChartValueAxis` with two `ChartValueAxisItem` (termsAxis, volumeAxis).

## Checklist
- [x] Single category axis with `:axis-crossing-value="axisCrossingValues"` where `axisCrossingValues = [0, categories.length]`.
- [x] Single ChartValueAxis with both ChartValueAxisItem: termsAxis (Payment Terms), volumeAxis (Spend Volume).
- [x] Line series bound to `termsAxis`, column series to `volumeAxis`.
- [x] Expose `axisCrossingValues` in setup.

## Files Modified
- `src/modules/home/entityCard/components/opportunity/BarLineChart.vue`
