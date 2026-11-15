import { describe, expect, it, vi } from 'vitest'
import { formatDays } from '@/modules/entityCard/components/opportunity/format'

// formatCurrency (this file's own money formatter) was removed under UC-UI-23: it was hardcoded
// to USD regardless of the app's selected display currency, which the story's AC#2 requires. Its
// one caller (SupplierImpactCard.vue) now goes through the shared `formatMoney`
// (utils/moneyFormatting.ts, its own spec) with `useArCurrenciesStore().selectedCurrencySymbol`.

describe('formatDays', () => {
  const translate = (key: string, params: { count: number }) => `${key}:${params.count}`

  it('routes the count through translate(), never a hardcoded English suffix', () => {
    expect(formatDays(30, translate)).toBe('arEntityCard.opportunity.days:30')
  })

  it('renders null/undefined as an em dash, never as 0 days, without calling translate()', () => {
    const spy = vi.fn(translate)

    expect(formatDays(null, spy)).toBe('—')
    expect(formatDays(undefined, spy)).toBe('—')
    expect(spy).not.toHaveBeenCalled()
  })
})
