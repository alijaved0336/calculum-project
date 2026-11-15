import { describe, it, expect } from 'vitest'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import AdjustmentsOutcomeAction from '@/modules/components/grid/columns/AdjustmentsOutcomeAction.vue'

/**
 * The agreement between the view that writes `dataItem.outcomeLoading` and the cell that reads it.
 *
 * <p><b>This file exists because a review on AB#19911 reported that agreement as broken, and the
 * report was wrong — but nothing could have told us either way.</b> The component specs stub
 * `CalculumGrid`, so this cell never rendered in any test; the only other file naming it reads it
 * as text to scan i18n keys. The view's shape and the cell's expectation could have diverged in
 * either direction with every suite green, and the symptom would have been silent: no button ever
 * greyed out, and the duplicate-request guard the marker exists for quietly inert.</p>
 *
 * <p>So these cases mount the cell against the shape the view actually writes. They are about the
 * contract, not about the button's looks.</p>
 */

const STRATEGY = 'peerGroupAndBuyerStandardAdjustments'
const CREDIT_RATING = 'creditRatingAdjustments'

function mountCell(dataItem: Record<string, any>, behavior: string) {
  return mountWithProviders(AdjustmentsOutcomeAction, { props: { dataItem, behavior } })
}

function isLoading(dataItem: Record<string, any>, behavior: string): boolean {
  return (mountCell(dataItem, behavior).vm as any).isLoading
}

const ROW = { uuid: 'version-uuid-1' }

describe('AdjustmentsOutcomeAction in-flight contract', () => {
  it('greys out the column the row says is waiting', () => {
    expect(isLoading({ ...ROW, outcomeLoading: { [CREDIT_RATING]: true } }, CREDIT_RATING)).toBe(true)
  })

  /**
   * The case the whole per-column shape exists for: two columns on one row, one waiting. The
   * sibling must stay clickable.
   */
  it('leaves the sibling column alone while the other one waits', () => {
    expect(isLoading({ ...ROW, outcomeLoading: { [CREDIT_RATING]: true } }, STRATEGY)).toBe(false)
  })

  it('greys out both when both are waiting', () => {
    const row = { ...ROW, outcomeLoading: { [STRATEGY]: true, [CREDIT_RATING]: true } }

    expect(isLoading(row, STRATEGY)).toBe(true)
    expect(isLoading(row, CREDIT_RATING)).toBe(true)
  })

  it('is not waiting when the row carries no marker at all', () => {
    expect(isLoading({ ...ROW }, CREDIT_RATING)).toBe(false)
    expect(isLoading({ ...ROW, outcomeLoading: {} }, CREDIT_RATING)).toBe(false)
  })

  /**
   * **The regression this file was written for.** Before AB#19911 the row held the behaviour
   * string itself. A cell left reading that older shape, or a view left writing it, would make
   * `isLoading` false forever — the button never greys, and nothing else fails.
   */
  it('does not accept the superseded bare-string marker', () => {
    expect(isLoading({ ...ROW, outcomeLoading: CREDIT_RATING }, CREDIT_RATING)).toBe(false)
  })

  /** The click carries which column was clicked, which is how the view routes it. */
  it('emits the row and its own behaviour on click', async () => {
    const row = { ...ROW }
    const wrapper = mountCell(row, CREDIT_RATING)

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('click')?.[0]).toEqual([row, CREDIT_RATING])
  })

  /** A row with no uuid cannot be asked about at all — the uuid is the only shared identifier. */
  it('is disabled for a row this application has no uuid for', () => {
    const wrapper = mountCell({ uuid: '' }, CREDIT_RATING)

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
