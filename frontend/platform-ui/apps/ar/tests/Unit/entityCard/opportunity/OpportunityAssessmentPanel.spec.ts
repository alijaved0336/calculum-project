import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

vi.mock('@ada/design-system', () => ({
  BigNumberTwoCol: {
    props: ['bigNumberTitle', 'bigNumberValue', 'listOfSecondaryItems'],
    template: `<div>
      <span class="main">{{ bigNumberTitle }}: {{ bigNumberValue }}</span>
      <span v-for="item in listOfSecondaryItems" :key="item.title" class="secondary">{{ item.title }}: {{ item.value }}</span>
    </div>`,
  },
  CustomBadge: { props: ['text', 'variant'], template: '<span class="badge" :data-variant="variant">{{ text }}</span>' },
}))

import OpportunityAssessmentPanel from '@/modules/entityCard/components/opportunity/OpportunityAssessmentPanel.vue'
import type { BuyerCardScoreComponentDto } from '@/api'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      arEntityCard: {
        opportunity: {
          assessment: {
            title: 'Opportunity Assessment',
            priority: 'Priority',
            probability: 'Probability of Success',
            cashFlowImpactTier: 'Cash Flow Impact Tier',
            scoreBreakdownTitle: 'What went into this score',
            missingComponent: 'not available',
          },
          tiers: {
            low: 'Low', medium: 'Medium', high: 'High',
            lowMasculine: 'Low', mediumMasculine: 'Medium', highMasculine: 'High',
          },
        },
      },
      arMatch: { progress: { notAvailable: 'Not available' } },
    },
  },
})

function mountPanel(
  probabilityTier: string | null,
  cashFlowImpactTier: string | null,
  scoreBreakdown: BuyerCardScoreComponentDto[] = [],
  probabilityScore: number | null = null,
) {
  return mount(OpportunityAssessmentPanel, {
    props: { probabilityTier, probabilityScore, cashFlowImpactTier, scoreBreakdown },
    global: { plugins: [i18n] },
  })
}

describe('OpportunityAssessmentPanel', () => {
  it('headlines Priority (both tiers, translated and joined) and lists Probability and Cash Flow Impact tier (AC-04)', () => {
    const panel = mountPanel('High', 'Medium', [], 62)

    expect(panel.find('.main').text()).toBe('Priority: High/Medium')
    expect(panel.text()).toContain('Probability of Success: High (62)')
    expect(panel.text()).toContain('Cash Flow Impact Tier: Medium')
  })

  it('shows "Not available" for a tier not yet calculated (AC-06)', () => {
    const panel = mountPanel(null, null)

    expect(panel.find('.main').text()).toBe('Priority: Not available')
  })

  /** UC-OPP-17 A1, mirrored client-side: Priority is null unless BOTH tiers are present - never
   * guessed from one tier alone, the same rule the backend's own NineBoxCell.Of follows. */
  it('shows "Not available" for Priority when only one of the two tiers is present', () => {
    const panel = mountPanel('High', null)

    expect(panel.find('.main').text()).toBe('Priority: Not available')
  })

  /**
   * Found by review, beyond the flagged formatDays i18n bypass: the tier names are the same
   * class of English-only string rendered beside translated labels.
   *
   * Found by a second review pass: "Probabilidad" (probability) is feminine, "Nivel" (impact
   * level) is masculine - Spanish adjective gender must agree with each, so cashFlowImpactTier
   * ("Bajo") and probabilityTier ("Alta") cannot share one vocabulary for the same tier value.
   */
  it('translates each tier name, in the grammatical gender the field it modifies needs', () => {
    const es = createI18n({
      legacy: false,
      locale: 'es',
      fallbackLocale: 'es',
      messages: {
        es: {
          arEntityCard: {
            opportunity: {
              assessment: {
                title: 'x', priority: 'Prioridad', probability: 'Probabilidad de éxito',
                cashFlowImpactTier: 'Nivel de impacto', scoreBreakdownTitle: 'x', missingComponent: 'x',
              },
              tiers: {
                low: 'Baja', medium: 'Media', high: 'Alta',
                lowMasculine: 'Bajo', mediumMasculine: 'Medio', highMasculine: 'Alto',
              },
            },
          },
          arMatch: { progress: { notAvailable: 'No disponible' } },
        },
      },
    })
    const panel = mount(OpportunityAssessmentPanel, {
      props: { probabilityTier: 'High', probabilityScore: null, cashFlowImpactTier: 'Low', scoreBreakdown: [] },
      global: { plugins: [es] },
    })

    expect(panel.find('.main').text()).toBe('Prioridad: Alta/Bajo')
    expect(panel.text()).toContain('Probabilidad de éxito: Alta')
    expect(panel.text()).toContain('Nivel de impacto: Bajo')
  })

  /** G-84: the weighted score sits beside its own (translated) tier, since the breakdown list
   * below explains that number, not the band alone. */
  it('shows the translated tier alone when the score itself has not been calculated', () => {
    const panel = mountPanel('High', 'Medium', [], null)

    expect(panel.text()).toContain('Probability of Success: High')
    expect(panel.text()).not.toContain('Probability of Success: High (')
  })

  /** UC-UI-07's own requirement beyond AP's AC-04: the probability score is explained via its
   * weighted components, not only its tier (G-84). */
  it('explains the probability score with one badge per weighted component', () => {
    const panel = mountPanel('High', 'Medium', [
      { component: 'TermReduction', score: 40, isMissing: false },
      { component: 'BuyerLeverage', score: 0, isMissing: true },
    ])

    const badges = panel.findAll('.badge')
    const termReduction = badges.find((b) => b.text() === 'Term Reduction')
    expect(termReduction?.attributes('data-variant')).toBe('info')
    expect(panel.text()).toContain('40')

    const buyerLeverage = badges.find((b) => b.text() === 'Buyer Leverage')
    expect(buyerLeverage?.attributes('data-variant')).toBe('warning')
    expect(panel.text()).toContain('not available')
  })

  it('renders no score breakdown section when there is nothing to explain yet', () => {
    const panel = mountPanel('High', 'Medium', [])

    expect(panel.text()).not.toContain('What went into this score')
  })
})
