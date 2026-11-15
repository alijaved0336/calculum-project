import { describe, it, expect } from 'vitest'
import { mountWithProviders } from '../Helpers/mountWithProviders'

// The Receivables grid's Recalculate cell (AB#20095).
//
// The status gate below is not new — it shipped with the cell — but until AB#20095 the button it
// gates re-parsed the file instead of recalculating, so the gate described something the backend
// did not do. Now that the action really is AR's recalculation, these three statuses ARE the
// statuses AR admits (EfSaleFileCalculationStore.AllowedForRecalculation, minus the
// recalculateClaimed re-claim), and a test pins them: widening this set here without widening it in
// AR produces a button that offers an action the platform answers 409 to.
//
// `processed` is deliberately absent, on both sides: a never-calculated version has to take its
// FIRST calculation through the finalize hand-off, and a recalculate claim would race it.

// The @/utils barrel reaches the router and every view, so it is resolved with a plain object
// rather than an `await import` inside the factory, which hangs.
vi.mock('@/utils', () => ({
  StringUtils: {
    isNullUndefinedOrEmpty: (value: unknown) => value === null || value === undefined || value === ''
  },
  isNullOrUndefined: (value: unknown) => value === null || value === undefined
}))

import { vi } from 'vitest'
import RecalculateButtonColumn from '@/modules/components/grid/columns/RecalculateButtonColumn.vue'

function mountCell(dataItem: Record<string, unknown>) {
  return mountWithProviders(RecalculateButtonColumn, {
    props: { dataItem, text: 'button.recalculate' }
  })
}

describe('Receivables grid - Recalculate cell', () => {
  it.each(['ready', 'errorCalculating', 'errorReCalculating'])(
    'offers the action for a %s version',
    (status) => {
      const button = mountCell({ uuid: 'v1', status }).find('button')

      expect(button.attributes('disabled')).toBeUndefined()
    }
  )

  it.each(['processed', 'uploaded', 'processing', 'calculating', 'reCalculating', 'recalculateClaimed', 'paused', 'error'])(
    'refuses the action for a %s version',
    (status) => {
      const button = mountCell({ uuid: 'v1', status }).find('button')

      expect(button.attributes('disabled')).toBeDefined()
    }
  )

  it('refuses a row with no status at all rather than throwing', () => {
    expect(mountCell({ uuid: 'v1' }).find('button').attributes('disabled')).toBeDefined()
  })

  it('emits the recalculate action with its row', async () => {
    const wrapper = mountCell({ uuid: 'v1', status: 'ready' })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('click')?.[0]?.[0]).toEqual({
      action: 'recalculate',
      dataItem: { uuid: 'v1', status: 'ready' }
    })
  })

  // The disabled state is the one worth explaining, and a native title on a DISABLED button is not
  // shown by Chrome at all — so the explanation sits on a wrapper, the same way AR's own dashboard
  // solved it.
  it('explains on hover why a version cannot be recalculated', () => {
    const disabled = mountCell({ uuid: 'v1', status: 'processed' })
    const enabled = mountCell({ uuid: 'v1', status: 'ready' })

    expect(disabled.find('[title]').attributes('title')).toBe(
      'adminBackend.adminUploadData.receivablesRecalculate.unavailable'
    )
    expect(enabled.find('[title]').attributes('title')).toBe(
      'adminBackend.adminUploadData.receivablesRecalculate.hint'
    )
  })

  // Between the click and the grid's refresh the row still reads `ready`, so without this the
  // button invites a second click that AR would answer 409 to.
  it('reports the request in flight and refuses a second click meanwhile', () => {
    const wrapper = mountCell({ uuid: 'v1', status: 'ready', recalculating: true })
    const button = wrapper.find('button')

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('adminBackend.adminUploadData.receivablesRecalculate.inFlight')
  })

  // The view runs one request at a time, so a click on ANOTHER row while one is in flight is
  // dropped. An enabled button that does nothing is worse than a disabled one that says why —
  // which is how AR's own dashboard handles it, with a `busy` that disables every row's action.
  // The view flags every row busy, recalculable or not. For a row that will never be recalculable
  // the busy line would promise a wait that leads nowhere, so the version-level reason has to win.
  it('keeps the version-level reason for a row that a wait would not help', () => {
    const wrapper = mountCell({ uuid: 'v3', status: 'processed', busy: true })

    expect(wrapper.find('[title]').attributes('title')).toBe(
      'adminBackend.adminUploadData.receivablesRecalculate.unavailable'
    )
  })

  it('disables a row whose own request is not the one in flight, and says why', () => {
    const wrapper = mountCell({ uuid: 'v2', status: 'ready', busy: true })
    const button = wrapper.find('button')

    expect(button.attributes('disabled')).toBeDefined()
    // Its own label, not the in-flight one: this row is not the one recalculating.
    expect(button.text()).toBe('button.recalculate')
    expect(wrapper.find('[title]').attributes('title')).toBe(
      'adminBackend.adminUploadData.receivablesRecalculate.busy'
    )
  })
})
