import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { TooltipButton } from '@ada/design-system'
import EntityCardCompanyDetailsTab from '@/modules/entityCard/components/tabs/EntityCardCompanyDetailsTab.vue'
import type { CustomerCardResponse } from '@/api'

const CREDIT_RATING_DISCLAIMER =
  "Credit rating is estimated from the parent company's profile and is not an independent assessment of this entity."
const CREDIT_LIMIT_DISCLAIMER =
  'Credit limit is informational only and should not be relied on for a risk or credit decision.'

const messages = {
  en: {
    arBuyers: {
      table: {
        tooltips: {
          creditRatingDisclaimer: CREDIT_RATING_DISCLAIMER,
          creditLimitDisclaimer: CREDIT_LIMIT_DISCLAIMER,
        },
      },
    },
    arEntityCard: {
      companyDetails: {
        sections: {
          profile: 'Company Profile',
          ratingsAndMetrics: 'Ratings and Metrics',
          creditRating: 'Credit Rating',
          industryRisk: 'Industry Risk',
          leverage: 'Leverage',
        },
        fields: {
          country: 'Country',
          industry: 'Industry',
          legalForm: 'Legal form',
          isPublic: 'Public company',
          internalId: 'Internal ID',
          parent: 'Parent',
          creditLimit: 'Credit limit',
          companySize: 'Company size',
          estimatedCompanySize: 'Estimated size',
          isCompanySizeFromParent: 'Size attributed to parent',
          annualRevenue: 'Annual revenue',
          annualRevenueIsEstimated: 'Revenue is estimated',
          employeesCount: 'Employees',
          creditRating: 'Credit rating',
          creditScore: 'Credit score',
          creditScoreSource: 'Credit score source',
          industryRisk: 'Industry risk',
          buyerLeverage: 'Buyer leverage',
          supplierLeverage: 'Supplier leverage',
        },
        yesNo: { true: 'Yes', false: 'No' },
      },
    },
    arMatch: {
      progress: { notAvailable: 'Not available' },
    },
  },
}

function baseCard(overrides: Partial<CustomerCardResponse> = {}): CustomerCardResponse {
  return {
    id: 36,
    role: 'Counterparty',
    resolution: 'Enriched',
    lifecycle: 'Actual',
    companyName: 'Acme Corp',
    country: 'USA',
    industry: 'Manufacturing',
    legalForm: 'LLC',
    isPublic: true,
    internalId: 'INT-1',
    companySizeId: 3,
    estimatedCompanySize: false,
    isCompanySizeFromParent: false,
    annualRevenue: 12_000_000,
    annualRevenueIsEstimated: false,
    employeesCount: 250,
    volume: 1_300_000_000,
    actualPaymentTermsAvg: 30,
    contractualPaymentTermsWithCashDiscountsAvg: null,
    contractualPaymentTermsWithoutCashDiscountsAvg: null,
    dpo: null,
    dpoSource: null,
    dpoStrategy: null,
    dpoStrategyByParent: null,
    dpoReference: null,
    saleFileVersionId: 73,
    creditScore: 82,
    creditScoreReferenceId: 5,
    creditScoreSource: 'Internal',
    creditRating: 'BBB',
    strategyBreakdown: null,
    creditLimit: 500_000,
    parentId: 12,
    parentName: 'Acme Holdings',
    ...overrides,
  }
}

function mountTab(card: CustomerCardResponse) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(EntityCardCompanyDetailsTab, {
    props: { card },
    global: { plugins: [i18n] },
  })
}

describe('EntityCardCompanyDetailsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the company profile fields (UC-UI-09 basic flow step 1)', () => {
    const view = mountTab(baseCard())

    expect(view.text()).toContain('USA')
    expect(view.text()).toContain('Manufacturing')
    expect(view.text()).toContain('LLC')
    expect(view.text()).toContain('INT-1')
    expect(view.text()).toContain('Acme Holdings')
    expect(view.text()).toContain('250')
  })

  it("renders Credit Limit and Annual Revenue with the selected currency's symbol, other numeric fields unaffected (UC-UI-23)", () => {
    const view = mountTab(baseCard())

    const fieldRow = (label: string) =>
      view.findAll('dt').find((dt) => dt.text() === label)?.element.nextElementSibling?.textContent

    expect(fieldRow('Credit limit')).toBe('$500,000')
    expect(fieldRow('Annual revenue')).toBe('$12,000,000')
    // Non-money numeric fields on this same tab must never receive a symbol.
    expect(fieldRow('Employees')).not.toContain('$')
    expect(fieldRow('Credit score')).not.toContain('$')
  })

  it('renders "Not available" for absent profile text fields rather than blank', () => {
    const view = mountTab(baseCard({ country: null, industry: null, legalForm: null, internalId: null, parentName: null }))

    // Per-row, not a whole-page count: industryRisk, buyerLeverage and supplierLeverage also
    // always render "Not available" (nothing backs them yet), so a bare count of the marker
    // across the page cannot tell a regression in one of these five profile fields from a
    // stable count elsewhere on the tab.
    const fieldRow = (label: string) => view.findAll('dt').find((dt) => dt.text() === label)?.element.nextElementSibling?.textContent
    expect(fieldRow('Country')).toBe('Not available')
    expect(fieldRow('Industry')).toBe('Not available')
    expect(fieldRow('Legal form')).toBe('Not available')
    expect(fieldRow('Internal ID')).toBe('Not available')
    expect(fieldRow('Parent')).toBe('Not available')
  })

  it('shows a real zero credit limit as $0, not as "not available" (a truthiness check would collapse the two)', () => {
    const view = mountTab(baseCard({ creditLimit: 0 }))

    expect(view.text()).toContain('$0')
    // The zero must not have been swallowed by the "not available" fallback.
    const creditLimitRow = view.findAll('dt').find((dt) => dt.text() === 'Credit limit')
    expect(creditLimitRow?.element.nextElementSibling?.textContent).toBe('$0')
  })

  it('shows a null credit limit as "Not available", the same marker every other absent field on this tab uses, distinct from zero', () => {
    const view = mountTab(baseCard({ creditLimit: null }))

    const creditLimitRow = view.findAll('dt').find((dt) => dt.text() === 'Credit limit')
    expect(creditLimitRow?.element.nextElementSibling?.textContent).toBe('Not available')
  })

  it('renders the credit rating as a badge when present (UC-UI-09 basic flow step 2)', () => {
    const view = mountTab(baseCard({ creditRating: 'BBB' }))

    expect(view.text()).toContain('BBB')
  })

  it('shows the credit rating as absent distinctly, never as a fabricated grade (A1)', () => {
    const view = mountTab(baseCard({ creditRating: null }))

    const ratingRow = view.findAll('dt').find((dt) => dt.text() === 'Credit rating')
    expect(ratingRow?.element.nextElementSibling?.textContent).toBe('—')
  })

  it('shows a real zero credit score as 0, distinct from an absent one (A1: zero is a real, bad rating on some scales)', () => {
    const view = mountTab(baseCard({ creditScore: 0 }))

    const scoreRow = view.findAll('dt').find((dt) => dt.text() === 'Credit score')
    expect(scoreRow?.element.nextElementSibling?.textContent).toBe('0')
  })

  it('shows a null credit score as "Not available", the same marker every other absent field on this tab uses, distinct from zero (A1)', () => {
    const view = mountTab(baseCard({ creditScore: null }))

    const scoreRow = view.findAll('dt').find((dt) => dt.text() === 'Credit score')
    expect(scoreRow?.element.nextElementSibling?.textContent).toBe('Not available')
  })

  it('distinguishes a false boolean from an absent one rather than collapsing both to "Not available"', () => {
    const view = mountTab(baseCard({ isPublic: false }))

    const publicRow = view.findAll('dt').find((dt) => dt.text() === 'Public company')
    expect(publicRow?.element.nextElementSibling?.textContent).toBe('No')
  })

  it('shows "Not available" for a null boolean, distinct from both Yes and No', () => {
    const view = mountTab(baseCard({ isPublic: null }))

    const publicRow = view.findAll('dt').find((dt) => dt.text() === 'Public company')
    expect(publicRow?.element.nextElementSibling?.textContent).toBe('Not available')
  })

  it('names industry risk and buyer/supplier leverage as not available rather than inventing a value (UC-UI-09 basic flow step 2, no backend field exists for any of the three today)', () => {
    const view = mountTab(baseCard())

    const industryRiskRow = view.findAll('dt').find((dt) => dt.text() === 'Industry risk')
    const buyerLeverageRow = view.findAll('dt').find((dt) => dt.text() === 'Buyer leverage')
    const supplierLeverageRow = view.findAll('dt').find((dt) => dt.text() === 'Supplier leverage')

    expect(industryRiskRow?.element.nextElementSibling?.textContent).toBe('Not available')
    expect(buyerLeverageRow?.element.nextElementSibling?.textContent).toBe('Not available')
    expect(supplierLeverageRow?.element.nextElementSibling?.textContent).toBe('Not available')
  })

  it('carries the credit-rating disclaimer via the shared BuyerCreditRating badge (UC-UI-21 FR-1)', () => {
    const view = mountTab(baseCard({ creditRating: 'BBB', creditLimit: null }))

    expect(view.findComponent(TooltipButton).props('text')).toBe(CREDIT_RATING_DISCLAIMER)
  })

  it('carries the credit-limit disclaimer alongside a real limit (UC-UI-21 FR-2)', () => {
    const view = mountTab(baseCard({ creditLimit: 500_000, creditRating: null }))

    expect(view.findComponent(TooltipButton).props('text')).toBe(CREDIT_LIMIT_DISCLAIMER)
  })

  it('renders no credit-limit disclaimer when there is no limit on record (UC-UI-21 AF-1)', () => {
    const view = mountTab(baseCard({ creditLimit: null, creditRating: null }))

    expect(view.findComponent(TooltipButton).exists()).toBe(false)
  })
})
