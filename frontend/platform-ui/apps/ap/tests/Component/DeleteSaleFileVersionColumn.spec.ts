import { describe, it, expect } from 'vitest'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import DeleteSaleFileVersionColumn from '@/modules/components/grid/columns/DeleteSaleFileVersionColumn.vue'

// The Receivables grid's Delete cell (AB#20871).
//
// Offered in every status: AR lets the delete win over a parse or a calculation in flight, so a
// version stuck in a running status can still be removed.

function mountCell(dataItem: Record<string, unknown>) {
  return mountWithProviders(DeleteSaleFileVersionColumn, { props: { dataItem } })
}

describe('Receivables grid - Delete cell', () => {
  it.each([
    'uploaded', 'processing', 'processed', 'ready', 'error',
    'calculateClaimed', 'calculating', 'errorCalculating',
    'recalculateClaimed', 'reCalculating', 'errorReCalculating',
    'paused', 'deleteClaimed'
  ])(
    'offers the delete for a %s version',
    (status) => {
      const button = mountCell({ uuid: 'v1', status }).find('button')

      expect(button.attributes('disabled')).toBeUndefined()
    }
  )

  it('offers the delete for a row with no status at all', () => {
    expect(mountCell({ uuid: 'v1' }).find('button').attributes('disabled')).toBeUndefined()
  })

  it('emits the delete action with its row', async () => {
    const dataItem = { uuid: 'v1', status: 'calculating' }
    const wrapper = mountCell(dataItem)

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('click')).toEqual([[{ action: 'delete', dataItem }]])
  })

  it('warns that the delete cannot be undone', () => {
    const wrapper = mountCell({ uuid: 'v1', status: 'processing' })

    expect(wrapper.find('div').attributes('title')).toBe(
      'adminBackend.adminUploadData.receivablesDelete.hint'
    )
  })
})
