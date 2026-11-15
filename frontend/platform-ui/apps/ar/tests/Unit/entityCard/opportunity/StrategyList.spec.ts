import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import StrategyList from '@/modules/entityCard/components/opportunity/StrategyList.vue'
import type { BuyerCardStrategyResultDto } from '@/api'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      arEntityCard: {
        opportunity: {
          days: '{count} day | {count} days',
          strategyList: { title: 'Every Strategy Evaluated', winner: 'Winner' },
        },
      },
    },
  },
})

function mountList(breakdown: BuyerCardStrategyResultDto[], winningStrategy: string | null) {
  return mount(StrategyList, {
    props: { strategyBreakdown: breakdown, winningStrategy },
    global: { plugins: [i18n] },
  })
}

describe('StrategyList', () => {
  const winner: BuyerCardStrategyResultDto = {
    strategy: 'BuyerStandardStrategy',
    proposedTerm: 30,
    applicabilityReason: null,
  }
  const loser: BuyerCardStrategyResultDto = {
    strategy: 'BuyerParentMinStrategy',
    proposedTerm: null,
    applicabilityReason: 'No parent on file',
  }

  it('marks the winning row with a Winner badge', () => {
    const list = mountList([winner, loser], 'BuyerStandardStrategy')

    const rows = list.findAll('li')
    const winnerRow = rows.find((row) => row.text().includes('Buyer Standard Strategy'))
    expect(winnerRow?.text()).toContain('Winner')
  })

  it("shows a loser's applicability reason and no Winner badge", () => {
    const list = mountList([winner, loser], 'BuyerStandardStrategy')

    const rows = list.findAll('li')
    const loserRow = rows.find((row) => row.text().includes('Buyer Parent Min Strategy'))
    expect(loserRow?.text()).toContain('No parent on file')
    expect(loserRow?.text()).not.toContain('Winner')
  })

  it('gives every row no Winner badge when no strategy won', () => {
    const list = mountList([winner, loser], null)

    expect(list.text()).not.toContain('Winner')
  })
})
