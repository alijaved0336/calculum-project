import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import NineBoxSummaryTable from '@/modules/opportunity/components/NineBoxSummaryTable.vue'
import type { NineBoxCellRow } from '@/api'
import type { OverviewGridLevel } from '@/modules/opportunity/data/overviewRows'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      global: { selection: 'Selection', total: 'Total', selectOneOrMore: 'Click on one or multiple boxes to view the corresponding details.' },
      arOpportunity: {
        nineBox: {
          summary: {
            buyers: 'Buyers',
            saleLines: 'Sales Lines',
            parents: 'Parents',
            volume: 'Sales Volume',
            cashFlowOpportunity: 'Cash Flow Opportunity',
            expectedCashFlow: 'Expected Cash Flow',
            contractualPaymentTerms: 'Contractual Payment Terms',
            avgDaysPaid: 'Avg. Days Paid',
            paymentTermsOpportunity: 'Payment Terms Opportunity',
            expectedPaymentTerms: 'Expected Payment Terms',
            economicProfitImpact: 'Expected Economic Profit',
          },
        },
      },
    },
  },
})

function cell(overrides: Partial<NineBoxCellRow> & { nineBox: number | null }): NineBoxCellRow {
  return {
    probabilityTier: 'High',
    cashFlowImpactTier: 'High',
    nineBoxCell: 'High/High',
    priority: 'High',
    buyerCount: 0,
    saleLineCount: 0,
    volume: null,
    totalValue: null,
    expectedTotalValue: null,
    economicProfitImpact: null,
    contractualPaymentTerms: null,
    averageDaysPaid: null,
    paymentTermsOpportunity: null,
    expectedPaymentTerms: null,
    ...overrides,
  }
}

function mountTable(summary: NineBoxCellRow[], selectedBoxes: number[], level: OverviewGridLevel = 'buyers') {
  return mount(NineBoxSummaryTable, { props: { summary, selectedBoxes, level }, global: { plugins: [i18n] } })
}

function rowFor(wrapper: ReturnType<typeof mountTable>, label: string) {
  const row = wrapper.findAll('tbody tr').find((tr) => tr.find('th').text() === label)!
  return row.findAll('td').map((td) => td.text())
}

describe('NineBoxSummaryTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it("prefixes every money row (volume/cashFlowOpportunity/economicProfitImpact) with the selected currency's symbol, count rows unaffected (UC-UI-23)", () => {
    const wrapper = mountTable(
      [cell({ nineBox: 1, buyerCount: 7, volume: 500, totalValue: 500, economicProfitImpact: 500 })],
      [1],
      'buyers',
    )

    expect(rowFor(wrapper, 'Sales Volume')[0]).toBe('$500')
    expect(rowFor(wrapper, 'Cash Flow Opportunity')[0]).toBe('$500')
    expect(rowFor(wrapper, 'Expected Economic Profit')[0]).toBe('$500')
    expect(rowFor(wrapper, 'Buyers')[1]).toBe('7')
  })

  it('places the symbol after the minus sign for a negative money row total, never "$-500"', () => {
    const wrapper = mountTable(
      [cell({ nineBox: 1, buyerCount: 7, economicProfitImpact: -500 })],
      [1],
      'buyers',
    )

    expect(rowFor(wrapper, 'Expected Economic Profit')[0]).toBe('-$500')
  })

  it('sums only the classified cells into "total", excluding the Unranked row (nineBox: null)', () => {
    const wrapper = mountTable(
      [
        cell({ nineBox: 1, buyerCount: 10, volume: 100 }),
        cell({ nineBox: 9, buyerCount: 5, volume: 50 }),
        // Unranked: must not count toward "total" any more than toward "selection".
        cell({ nineBox: null, buyerCount: 44, volume: 1000 }),
      ],
      // A box number absent from the data - "selected" reads 0 without an empty selection, which
      // would hide the table entirely (see the empty-state test below).
      [999],
    )

    expect(rowFor(wrapper, 'Buyers')).toEqual(['0', '15', '0.00%'])
    expect(rowFor(wrapper, 'Sales Volume')).toEqual(['$0', '$150', '0.00%'])
  })

  it('shows a "select one or more boxes" prompt instead of the table when nothing is selected - AP\'s own real screen does the same, unlike the rows grid below it', () => {
    const wrapper = mountTable([cell({ nineBox: 1, buyerCount: 10 })], [])

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.text()).toContain('Click on one or multiple boxes to view the corresponding details.')
  })

  it('falls back to the (zero-valued) table instead of the prompt when no box has a buyer to select - the prompt would otherwise be a dead end', () => {
    // Same sparse-environment case NineBoxRowsGrid's own "always render, zero rows" change exists
    // for (see this PR): NineBoxOverview.vue never lets a 0-buyer box become clickable, so
    // `selectedBoxes` can never leave `[]` here - the prompt has to yield to the table instead.
    const wrapper = mountTable([cell({ nineBox: 1, buyerCount: 0 }), cell({ nineBox: 2, buyerCount: 0 })], [])

    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Click on one or multiple boxes to view the corresponding details.')
    expect(rowFor(wrapper, 'Buyers')).toEqual(['0', '0', '-'])
  })

  it('sums only the selected boxes into "selection"', () => {
    const wrapper = mountTable(
      [
        cell({ nineBox: 1, buyerCount: 10, totalValue: 1000 }),
        cell({ nineBox: 2, buyerCount: 20, totalValue: 2000 }),
        cell({ nineBox: 3, buyerCount: 30, totalValue: 3000 }),
      ],
      [1, 3],
    )

    // 10 + 30 selected, out of 10 + 20 + 30 = 60 total.
    expect(rowFor(wrapper, 'Buyers')).toEqual(['40', '60', '66.67%'])
  })

  it('treats a null money field as 0 rather than NaN, and shows a dash when the total is 0', () => {
    const wrapper = mountTable([cell({ nineBox: 1, totalValue: null })], [1])

    expect(rowFor(wrapper, 'Cash Flow Opportunity')).toEqual(['$0', '$0', '-'])
  })

  it('shows both Cash Flow Opportunity and Expected Cash Flow rows, from their own backend fields', () => {
    const wrapper = mountTable(
      [cell({ nineBox: 1, totalValue: 500000, expectedTotalValue: 400000 })],
      [1],
    )

    expect(rowFor(wrapper, 'Cash Flow Opportunity')[0]).toContain('500')
    expect(rowFor(wrapper, 'Expected Cash Flow')[0]).toContain('400')
  })

  it("the first row's label and field follow the active level, matching each card's own 3rd row", () => {
    const rows = [cell({ nineBox: 1, buyerCount: 7, saleLineCount: 12 })]

    expect(rowFor(mountTable(rows, [999], 'buyers'), 'Buyers')[1]).toBe('7')
    expect(rowFor(mountTable(rows, [999], 'saleLines'), 'Sales Lines')[1]).toBe('12')
    // Parents has no field of its own in NineBoxCellRow - same as the party-level grid, it reads
    // buyerCount (already scoped server-side to parents+standalone buyers at that level).
    expect(rowFor(mountTable(rows, [999], 'parents'), 'Parents')[1]).toBe('7')
  })

  it('shows a small but real share with two decimals rather than rounding it to 0% - AP does the same', () => {
    // 59.32K of a 15.26M portfolio is 0.39%. Under Math.round that rendered "0%", which on a real
    // file is what nearly every money row looked like: a column that exists to show a share,
    // showing none.
    const wrapper = mountTable(
      [
        cell({ nineBox: 5, buyerCount: 2, volume: 59_320 }),
        cell({ nineBox: 9, buyerCount: 78, volume: 15_200_680 }),
      ],
      [5],
    )

    expect(rowFor(wrapper, 'Sales Volume')[2]).toBe('0.39%')
  })

  it('weights the 4 payment-terms rows by volume rather than averaging the cells evenly', () => {
    // 30 days on 300 of volume and 60 on 100: the even average is 45, the weighted one is 37.5,
    // which rounds to 38. Asserting the weighted figure is what makes this test about the rule
    // rather than about arithmetic both readings would pass.
    const wrapper = mountTable(
      [
        cell({ nineBox: 1, buyerCount: 3, volume: 300, contractualPaymentTerms: 30 }),
        cell({ nineBox: 9, buyerCount: 1, volume: 100, contractualPaymentTerms: 60 }),
      ],
      [1, 9],
    )

    expect(rowFor(wrapper, 'Contractual Payment Terms')).toEqual(['38', '38', '-'])
  })

  it('reports each payment-terms row from its own backend field', () => {
    const wrapper = mountTable(
      [
        cell({
          nineBox: 1,
          buyerCount: 2,
          volume: 100,
          contractualPaymentTerms: 60,
          averageDaysPaid: 72,
          paymentTermsOpportunity: 30,
          expectedPaymentTerms: 45,
        }),
      ],
      [1],
    )

    expect(rowFor(wrapper, 'Contractual Payment Terms')).toEqual(['60', '60', '-'])
    expect(rowFor(wrapper, 'Avg. Days Paid')).toEqual(['72', '72', '-'])
    expect(rowFor(wrapper, 'Payment Terms Opportunity')).toEqual(['30', '30', '-'])
    expect(rowFor(wrapper, 'Expected Payment Terms')).toEqual(['45', '45', '-'])
  })

  it('shows a dash for a payment-terms row no cell has a value for, rather than 0 days', () => {
    // The backend nulls Payment Terms Opportunity and Expected Payment Terms for a cell where
    // nobody has a proposal. Treating that as zero days would read as "we expect to be paid
    // immediately", which is the opposite of "there is no proposal here".
    const wrapper = mountTable(
      [cell({ nineBox: 9, buyerCount: 4, volume: 500, contractualPaymentTerms: 30 })],
      [9],
    )

    expect(rowFor(wrapper, 'Contractual Payment Terms')).toEqual(['30', '30', '-'])
    expect(rowFor(wrapper, 'Payment Terms Opportunity')).toEqual(['-', '-', '-'])
    expect(rowFor(wrapper, 'Expected Payment Terms')).toEqual(['-', '-', '-'])
  })

  it("folds a cell with no proposal in at its own contractual term, so Total matches the server's", () => {
    // The review finding this fixes. The server nulls the forecast for a cell where NOBODY has a
    // proposal, but those parties still carry volume at a real term and the server's whole-set
    // figure counts them at it (AB#20060's one population). Dropping them averaged over only the
    // boxes with proposals.
    //
    // 20 days on 100 of volume beside a null-forecast cell at its own contractual 60 on 300:
    // (20*100 + 60*300)/400 = 50. Dropping the second cell would have answered 20.
    const wrapper = mountTable(
      [
        cell({ nineBox: 1, buyerCount: 1, volume: 100, paymentTermsOpportunity: 20, contractualPaymentTerms: 30 }),
        cell({ nineBox: 9, buyerCount: 3, volume: 300, paymentTermsOpportunity: null, contractualPaymentTerms: 60 }),
      ],
      [1, 9],
    )

    expect(rowFor(wrapper, 'Payment Terms Opportunity')).toEqual(['50', '50', '-'])
  })

  it('contributes nothing for a cell with neither a proposal nor a contractual term to fall back to', () => {
    // The fallback is a real term or nothing: a cell with no contractual either has no term to
    // count at, so it stays out rather than entering at zero days.
    const wrapper = mountTable(
      [
        cell({ nineBox: 1, buyerCount: 1, volume: 100, paymentTermsOpportunity: 30 }),
        cell({ nineBox: 9, buyerCount: 4, volume: 400 }),
      ],
      [1, 9],
    )

    expect(rowFor(wrapper, 'Payment Terms Opportunity')).toEqual(['30', '30', '-'])
  })

  it('does not fall back for the two MEASURED rows - a null there is no data, not "no proposal"', () => {
    // Contractual and Avg. Days Paid are measured rather than forecast, so they have nothing to
    // fall back to and must not borrow each other's value.
    const wrapper = mountTable(
      [cell({ nineBox: 1, buyerCount: 1, volume: 100, contractualPaymentTerms: 30 })],
      [1],
    )

    expect(rowFor(wrapper, 'Contractual Payment Terms')).toEqual(['30', '30', '-'])
    expect(rowFor(wrapper, 'Avg. Days Paid')).toEqual(['-', '-', '-'])
  })

  it('shows a dash for a payment-terms row when the cells carry no volume to weight by', () => {
    // Dividing by a zero weight would render NaN. A term with nothing to weight it is absent, and
    // absent renders the same dash the money rows use.
    const wrapper = mountTable(
      [cell({ nineBox: 1, buyerCount: 2, volume: null, contractualPaymentTerms: 60 })],
      [1],
    )

    expect(rowFor(wrapper, 'Contractual Payment Terms')).toEqual(['-', '-', '-'])
  })
})
