/**
 * Regression test for WI 19706 — the SCF (Provider) 9-box card rendered a blank ('-')
 * Potential Revenue for box #3 while the summary panel, for that same 2-supplier selection,
 * showed 21.0k.
 *
 * Cause: commit 16474eea33 ("fix values in 9box", 2025-02-28) changed the financing branch of
 * boxInfoFormatted to *display* potentialSCFRevenue but left the *guard* on cashFlow. Box #3's
 * two spends have no term-extension cash flow, so the falsy guard blanked the card regardless
 * of the 21,026 sitting in the field beside it. The bug only became reachable once the #19656
 * fix stopped collapsing every supplier into the Low column and actually populated box #3.
 *
 * The real component is mounted on purpose. A spec that re-stated the same ternary as a local
 * pure function — the shape tests/Component/NineBoxesProbabilityOfSuccess.spec.ts uses — would
 * have stayed green through this entire bug, because the defect is *which field the template
 * reads*, not what the expression computes once you feed it the right one.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// The assertions below are on the formatter's real output ('21.0k'), because agreeing with the
// summary panel to the character is what WI 19706 asks for. Keeping the real StringUtils means
// cutting the '@/utils' barrel, which transitively pulls vue-i18n, the design-system locales and
// two pinia stores — same approach as tests/Unit/Utils/StringUtils.formatBigNumbers.spec.ts.
vi.mock('@/utils/FormatData', () => ({
  changeToCurrency: (value: number) => value,
  getNumberWithDecimals: (value: unknown) => String(value),
}))

/**
 * The real formatter is loaded in beforeAll rather than inside the '@/utils' factory on purpose:
 * StringUtils imports isNullOrUndefined back out of the barrel, so awaiting it *from* the barrel's
 * own mock factory deadlocks the run (no output, no timeout — it just never resolves). By the time
 * beforeAll runs, the mock is registered and that same import resolves cleanly.
 */
type FormatBigNumbers = (typeof import('@/utils/StringUtils'))['default']['formatBigNumbers']

const real = vi.hoisted(() => ({ formatBigNumbers: null as null | FormatBigNumbers }))

vi.mock('@/utils', () => ({
  isNullOrUndefined: (value: unknown) => value === null || value === undefined,
  StringUtils: {
    formatBigNumbers: ((...args) => real.formatBigNumbers!(...args)) as FormatBigNumbers,
  },
}))

// Only the click handlers touch the store, and none of them run here.
vi.mock('@/stores/analyze', () => ({
  useAnalyzeStore: () => ({
    getNineBoxesSelectedBoxes: [],
    getNineBoxesSelectedBoxesFinancing: [],
    getNineBoxesSelectedBoxesFinancingSCF: [],
    getNineBoxesSelectedBoxesVcard: [],
    setNineBoxesSelectedBoxes: vi.fn(),
    setNineBoxesSelectedBoxesFinancing: vi.fn(),
    setNineBoxesSelectedBoxesFinancingSCF: vi.fn(),
    setNineBoxesSelectedBoxesVcard: vi.fn(),
  }),
}))

import NineBoxesBox from '@/modules/home/analyze/components/NineBoxesBox.vue'

/**
 * At selectedLevelType 'supplier' the card's value column renders, in order:
 * the headline metric (Potential Revenue for this chart), Spend Volume, then Suppliers.
 */
const HEADLINE = 0
const VOLUME = 1
const SUPPLIERS = 2

/** Box #3 verbatim from the endpoint response quoted in WI 19706: High Potential SCF Revenue / Low Value to Supplier. */
const BOX_3_NO_CASH_FLOW = {
  box: 3,
  spends: 2,
  suppliers: 2,
  buyers: 1,
  parents: 2,
  volume: 3667026.1388,
  cashFlow: 0,
  discounts: 0,
  expectedCashFlow: 0,
  potentialSCFRevenue: 21026,
  financingValueToSupplier: 440,
}

/** Box #1 from the same response — has both a cash flow and an SCF revenue, so it tells the two fields apart. */
const BOX_1_WITH_CASH_FLOW = {
  box: 1,
  spends: 4,
  suppliers: 3,
  buyers: 2,
  parents: 3,
  volume: 5286103.8849,
  cashFlow: 405190.17462,
  discounts: 0,
  expectedCashFlow: 376826.8624,
  potentialSCFRevenue: 46355,
  financingValueToSupplier: 1366,
}

/**
 * Box #2 as the backend actually ships an empty box: zero-filled, and spelling the key
 * 'potentialScfRevenue' (its $emptyBox literal disagrees with the query's 'potentialSCFRevenue'
 * alias), so the card genuinely receives no potentialSCFRevenue at all.
 */
const BOX_2_EMPTY = {
  box: 2,
  spends: 0,
  suppliers: 0,
  buyers: 0,
  parents: 0,
  volume: 0,
  cashFlow: 0,
  discounts: 0,
  potentialScfRevenue: 0,
}

/**
 * The same empty box once the back end spells the key correctly (AB#19707 fixes the $emptyBox
 * literal). The key is then present with value 0 rather than absent, which is a different input
 * to the card even though the box is just as empty - so it needs its own case. Both the ternary
 * guard and formatDataForNineBoxes treat 0 as falsy, so the rendered result must stay '-'.
 */
const BOX_2_EMPTY_KEY_FIXED = {
  ...BOX_2_EMPTY,
  potentialScfRevenue: undefined,
  potentialSCFRevenue: 0,
}

function mountBox(
  boxInfo: Record<string, unknown>,
  typeOf9Boxes = 'financing',
  selectedLevelType = 'supplier',
) {
  return mount(NineBoxesBox, {
    props: {
      boxNumber: String(boxInfo.box ?? 3),
      boxGroup: 'box-group-color-primary-700',
      boxInfo,
      boxTitle: 'Potential Revenue',
      typeOf9Boxes,
      selectedLevelType,
    },
  })
}

function values(wrapper: VueWrapper): string[] {
  return wrapper.findAll('.nine-box-card__row-value').map((node) => node.text())
}

describe('NineBoxesBox — SCF (Provider) Potential Revenue', () => {
  beforeAll(async () => {
    real.formatBigNumbers = (await import('@/utils/StringUtils')).default.formatBigNumbers
  })

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows Potential Revenue on a box whose suppliers have no term-extension cash flow (WI 19706)', () => {
    const cells = values(mountBox(BOX_3_NO_CASH_FLOW))

    // 21.0k is exactly what the summary panel reports for this same 2-supplier selection.
    expect(cells[HEADLINE]).toBe('21.0k')
    expect(cells[HEADLINE]).not.toBe('-')
  })

  it('renders the rest of that box unchanged', () => {
    const cells = values(mountBox(BOX_3_NO_CASH_FLOW))

    expect(cells[VOLUME]).toBe('3.7m')
    expect(cells[SUPPLIERS]).toBe('2')
  })

  it('keeps showing Potential Revenue, not cash flow, when the box has both', () => {
    const cells = values(mountBox(BOX_1_WITH_CASH_FLOW))

    expect(cells[HEADLINE]).toBe('46.4k')
    // 405.2k would mean the guard swap started leaking the cash-flow value through.
    expect(cells[HEADLINE]).not.toBe('405.2k')
  })

  it('still shows a dash for an empty box', () => {
    expect(values(mountBox(BOX_2_EMPTY))[HEADLINE]).toBe('-')
  })

  /**
   * Guards the cross-repo contract AB#19707 changes: correcting the back end's $emptyBox key
   * casing makes potentialSCFRevenue present-and-zero instead of absent. Zero is falsy, so the
   * card must keep rendering '-' and must not start printing '0'.
   */
  it('still shows a dash when an empty box sends potentialSCFRevenue as 0', () => {
    expect(values(mountBox(BOX_2_EMPTY_KEY_FIXED))[HEADLINE]).toBe('-')
    expect(values(mountBox(BOX_2_EMPTY_KEY_FIXED))[HEADLINE]).not.toBe('0')
  })

  it('leaves the Term Extension chart reading cash flow', () => {
    expect(values(mountBox(BOX_1_WITH_CASH_FLOW, 'cashFlow'))[HEADLINE]).toBe('405.2k')
  })

  it('leaves the SCF (Buyer Impact) chart reading cash flow', () => {
    expect(values(mountBox(BOX_1_WITH_CASH_FLOW, 'scf9Box'))[HEADLINE]).toBe('405.2k')
  })
})
