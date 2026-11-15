import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import StrategyResultsPanel from '@/modules/buyers/components/customerCard/StrategyResultsPanel.vue'
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
        },
      },
      arCustomerCard: {
        notAvailable: '—',
        strategyResults: {
          title: 'Strategy results',
          provisional: 'Provisional',
          description: 'These figures come from the calculation tables.',
          notCalculated: 'This version has not been calculated yet.',
          noStrategyApplied: 'No strategy applied to this buyer.',
          winner: 'Winner',
          proposedTerm: 'Proposed term',
          selectionOutcome: 'Selection outcome',
          selectionOutcomes: {
            selected: 'Selected',
            cappedByRegulation: 'Capped by regulation',
            longerThanSelected: 'Longer than selected',
            noReduction: 'No reduction',
            notApplicable: 'Not applicable',
            notACandidate: 'Not a candidate',
          },
        },
      },
    },
  },
})

function mountPanel(strategyBreakdown: BuyerCardStrategyResultDto[] | null, winningStrategy: string | null) {
  return mount(StrategyResultsPanel, {
    props: { strategyBreakdown, winningStrategy },
    global: { plugins: [i18n] },
  })
}

describe('StrategyResultsPanel', () => {
  const winner: BuyerCardStrategyResultDto = {
    strategy: 'BuyerStandardStrategy',
    proposedTerm: 30,
    applicabilityReason: null,
    selectionOutcome: 'selected',
    inputs: { occurrences: 8 },
  }
  const loser: BuyerCardStrategyResultDto = {
    strategy: 'BuyerParentMinStrategy',
    proposedTerm: null,
    applicabilityReason: 'No parent on file',
    selectionOutcome: 'not_applicable',
    inputs: null,
  }

  it('shows the "not calculated" notice when strategyBreakdown is null, not a table', () => {
    const panel = mountPanel(null, null)

    expect(panel.text()).toContain('This version has not been calculated yet.')
    expect(panel.text()).not.toContain('No strategy applied to this buyer.')
    expect(panel.find('dl').exists()).toBe(false)
  })

  it('shows a different "no strategy applied" notice when strategyBreakdown is empty, not an empty table', () => {
    const panel = mountPanel([], null)

    expect(panel.text()).toContain('No strategy applied to this buyer.')
    expect(panel.text()).not.toContain('This version has not been calculated yet.')
    expect(panel.find('dl').exists()).toBe(false)
  })

  it('shows the applicabilityReason where the term would be for a row with a null proposedTerm, never a zero', () => {
    const panel = mountPanel([loser], null)

    expect(panel.text()).toContain('No parent on file')
    expect(panel.text()).not.toContain('0 days')
  })

  it('shows the formatted term for a row with a proposedTerm', () => {
    const panel = mountPanel([winner], 'BuyerStandardStrategy')

    expect(panel.text()).toContain('30 days')
  })

  it('marks the winning row and leaves the losing row unmarked', () => {
    const panel = mountPanel([winner, loser], 'BuyerStandardStrategy')

    const rows = panel.findAll('.strategy-results-row')
    const winnerRow = rows.find((row) => row.text().includes('BuyerStandardStrategy'))
    const loserRow = rows.find((row) => row.text().includes('BuyerParentMinStrategy'))

    expect(winnerRow?.text()).toContain('Winner')
    expect(loserRow?.text()).not.toContain('Winner')
  })

  it('marks no row as winner when winningStrategy is null', () => {
    const panel = mountPanel([winner, loser], null)

    expect(panel.text()).not.toContain('Winner')
  })

  // This is the test the whole design is bought with: a strategy this front end has never heard
  // of, whose inputs keys appear in no map, must render end to end with no change to this
  // component - the ordering and input-key humanizing live in strategyInputs.ts already. The
  // strategy name itself renders verbatim (never humanized, see deriveStrategyResultRow's own
  // comment), so this also pins that an unrecognised key is not silently prettified either.
  it('renders an unrecognised strategy verbatim and its unknown input keys humanized, with no change to the component', () => {
    const unknown: BuyerCardStrategyResultDto = {
      strategy: 'FutureFamilyStrategy',
      proposedTerm: 45,
      applicabilityReason: null,
      selectionOutcome: 'selected',
      inputs: { foo: 1, barBaz: 2 },
    }

    const panel = mountPanel([unknown], 'FutureFamilyStrategy')

    expect(panel.text()).toContain('FutureFamilyStrategy')
    expect(panel.text()).toContain('45 days')
    expect(panel.text()).toContain('Foo')
    expect(panel.text()).toContain('Bar Baz')
    expect(panel.text()).toContain('Winner')
  })

  it('shows the provisional marker in the header', () => {
    const panel = mountPanel([winner], null)

    expect(panel.text()).toContain('Provisional')
  })

  it("translates a known selection-outcome code to its label, not the raw snake_case token", () => {
    const panel = mountPanel([winner], null)

    expect(panel.text()).toContain('Selected')
    expect(panel.text()).not.toContain('selected')
  })

  it('translates a different known code (not_applicable) on the loser row', () => {
    const panel = mountPanel([loser], null)

    expect(panel.text()).toContain('Not applicable')
    expect(panel.text()).not.toContain('not_applicable')
  })

  // The backend can add a seventh outcome before the front end ships a translation for it - it
  // must still read as words, never a raw snake_case token and never blank.
  it('humanizes an unknown selection-outcome code instead of leaving it blank or raw', () => {
    const futureOutcome: BuyerCardStrategyResultDto = {
      strategy: 'BuyerStandardStrategy',
      proposedTerm: 30,
      applicabilityReason: null,
      selectionOutcome: 'some_future_outcome',
      inputs: null,
    }

    const panel = mountPanel([futureOutcome], null)

    expect(panel.text()).toContain('Some future outcome')
    expect(panel.text()).not.toContain('some_future_outcome')
  })
})
