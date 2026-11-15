/**
 * Ported from apps/ap/src/utils/ColorsGroups.ts at commit d004458f63 (UC-UI-00 / AB#19226).
 *
 * Trimmed to the subset RadarChart.vue actually uses — AP's file also carries level colors,
 * avatar colors, phase colors and waterfall-specific colors for views that were not ported (the
 * waterfall's own bucket color logic moved to design-system's WaterfallChart, which does not use
 * AP's bucket vocabulary). Values match the design tokens `@ada/design-system` already loads
 * (packages/design-system/src/styles/variables/_colors.scss), same as AP's original.
 */

/** Kendo chart series colors, cycled by phase index. */
export const chartFirstGroup = '#2e90fa' // $color-blue-500

export const restColor = '#98A2B3' // $color-gray-400

/** AB#20517: AP's own "Platform's Data" legend swatch color (ColorsGroups.ts's `supplierStandard`) -
 * the Receivables Waterfall's legend mirrors AP's Payables one, this is the one color from it AR
 * didn't already carry over. */
export const platformDataColor = '#0040C1' // $color-blue-dark-800
