import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

const startGridExport = vi.fn()
const getGridExportStatus = vi.fn()
const cancelGridExport = vi.fn()
vi.mock('@/api/gridExport', () => ({
  startGridExport: (...args: unknown[]) => startGridExport(...args),
  getGridExportStatus: (...args: unknown[]) => getGridExportStatus(...args),
  cancelGridExport: (...args: unknown[]) => cancelGridExport(...args),
  downloadGridExport: vi.fn(),
}))
vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

import GridExportStatus from '@/components/GridExportStatus.vue'
import { HttpError } from '@/api/http'
import type { GridExportRequest } from '@/api/gridExport'
import { LARGE_EXPORT_THRESHOLD } from '@/composables/useArGridExport'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      home: {
        analyze: {
          list: {
            largeExportTitle: 'Large export',
          },
        },
      },
      arGridExport: {
        continue: 'Continue',
        cancel: 'Cancel',
        cancelExport: 'Cancel export',
        dismiss: 'Dismiss',
        completed: 'Downloaded.',
        largeExportWarning: 'You are about to export {count} rows.',
      },
    },
    es: {
      home: { analyze: { list: { largeExportTitle: 'Exportación grande' } } },
      arGridExport: { largeExportWarning: 'Vas a exportar {count} filas.' },
    },
  },
})

const REQUEST: GridExportRequest = {
  versionUuid: '1653c234-9318-4707-a6c3-33f4b427126c',
  where: null,
  order: null,
  customFilters: null,
  customSorts: null,
  currencyRate: 1,
  columns: [{ field: 'volume', title: 'Volume', hidden: false }],
  fileName: 'file',
}

const mounted: Array<{ unmount: () => void }> = []

function mountStatus() {
  const wrapper = mount(GridExportStatus, { global: { plugins: [i18n] } })
  mounted.push(wrapper)
  return wrapper
}

const buttonLabelled = (wrapper: ReturnType<typeof mountStatus>, text: string) =>
  wrapper.findAllComponents({ name: 'CustomButton' }).find((button) => button.props('text') === text)

describe('GridExportStatus', () => {
  beforeEach(() => {
    startGridExport.mockReset()
    getGridExportStatus.mockReset()
    cancelGridExport.mockReset().mockResolvedValue(true)
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('renders nothing while idle', () => {
    const wrapper = mountStatus()

    expect(wrapper.find('.grid-export-status').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'CustomDialog' }).props('visible')).toBe(false)
  })

  it('confirms above the threshold, shows the row count, and only Continue starts the export', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    const wrapper = mountStatus()

    await wrapper.vm.start('OpportunitySaleLines', REQUEST, LARGE_EXPORT_THRESHOLD + 5)
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
    const dialog = wrapper.findComponent({ name: 'CustomDialog' })
    expect(dialog.props('visible')).toBe(true)
    expect(dialog.props('title')).toBe('Large export')
    // LARGE_EXPORT_THRESHOLD + 5 = 10005, grouped for the active locale.
    expect(LARGE_EXPORT_THRESHOLD + 5).toBe(10005)
    expect(document.body.textContent).toContain('You are about to export 10,005 rows.')

    await buttonLabelled(wrapper, 'Continue')!.trigger('click')
    await flushPromises()

    expect(startGridExport).toHaveBeenCalledWith('OpportunitySaleLines', REQUEST)
    expect(wrapper.findComponent({ name: 'CustomDialog' }).props('visible')).toBe(false)
  })

  it('groups the row count for the active locale', async () => {
    i18n.global.locale.value = 'es'
    try {
      const wrapper = mountStatus()
      await wrapper.vm.start('Match', REQUEST, 1234567)
      await flushPromises()

      expect(document.body.textContent).toContain('Vas a exportar 1.234.567 filas.')
    } finally {
      i18n.global.locale.value = 'en'
    }
  })

  it('Cancel on the confirmation starts nothing', async () => {
    const wrapper = mountStatus()
    await wrapper.vm.start('Match', REQUEST, LARGE_EXPORT_THRESHOLD + 1)
    await flushPromises()

    await buttonLabelled(wrapper, 'Cancel')!.trigger('click')
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'CustomDialog' }).props('visible')).toBe(false)
  })

  it('shows progress with a Cancel button while a job runs, and cancels it on the server', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-9' })
    const wrapper = mountStatus()

    await wrapper.vm.start('Match', REQUEST, 100)
    await flushPromises()

    expect(wrapper.find('.grid-export-status--running').exists()).toBe(true)
    await buttonLabelled(wrapper, 'Cancel export')!.trigger('click')
    await flushPromises()

    expect(cancelGridExport).toHaveBeenCalledWith('job-9')
    expect(wrapper.find('.grid-export-status--cancelled').exists()).toBe(true)
  })

  it('shows the in-progress message for a 409 and lets it be dismissed', async () => {
    startGridExport.mockRejectedValue(new HttpError(409, 'api/grid-exports/opportunitysalelines', '{}'))
    const wrapper = mountStatus()

    await wrapper.vm.start('Match', REQUEST, 100)
    await flushPromises()

    const status = wrapper.find('.grid-export-status--failed')
    expect(status.exists()).toBe(true)
    expect(status.text()).toContain('already have an export in progress')

    await buttonLabelled(wrapper, 'Dismiss')!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.grid-export-status').exists()).toBe(false)
  })

  it('shows the success message once a small export has downloaded', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    startGridExport.mockResolvedValue({ kind: 'file', file: { blob: new Blob(['x']), fileName: 'a.xlsx' } })
    const wrapper = mountStatus()

    await wrapper.vm.start('Match', REQUEST, 10)
    await flushPromises()

    expect(wrapper.find('.grid-export-status--completed').text()).toContain('Downloaded.')
    vi.restoreAllMocks()
  })

  describe('notice', () => {
    it('shows an informational message that can be dismissed, without starting a request', async () => {
      const wrapper = mountStatus()

      wrapper.vm.notice('arGridExport.stillLoading')
      await flushPromises()

      const status = wrapper.find('.grid-export-status--notice')
      expect(status.text()).toContain('The list is still loading. Try Export again in a moment.')
      expect(wrapper.find('.grid-export-status--failed').exists()).toBe(false)
      expect(startGridExport).not.toHaveBeenCalled()

      await buttonLabelled(wrapper, 'Dismiss')!.trigger('click')
      await flushPromises()
      expect(wrapper.find('.grid-export-status').exists()).toBe(false)
    })

    it('never replaces the progress of a running export', async () => {
      startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-9' })
      const wrapper = mountStatus()
      await wrapper.vm.start('Match', REQUEST, 100)
      await flushPromises()

      wrapper.vm.notice('arGridExport.stillLoading')
      await flushPromises()

      expect(wrapper.find('.grid-export-status--running').exists()).toBe(true)
      expect(wrapper.find('.grid-export-status--notice').exists()).toBe(false)
    })

    it('clears the notice once the grid it refers to has finished loading', async () => {
      const wrapper = mount(GridExportStatus, { props: { loading: true }, global: { plugins: [i18n] } })
      mounted.push(wrapper)

      wrapper.vm.notice('arGridExport.stillLoading')
      await flushPromises()
      expect(wrapper.find('.grid-export-status--notice').exists()).toBe(true)

      await wrapper.setProps({ loading: false })
      await flushPromises()

      expect(wrapper.find('.grid-export-status').exists()).toBe(false)
    })

    it('keeps the notice while the grid is still loading', async () => {
      const wrapper = mount(GridExportStatus, { props: { loading: true }, global: { plugins: [i18n] } })
      mounted.push(wrapper)

      wrapper.vm.notice('arGridExport.stillLoading')
      await flushPromises()
      await wrapper.setProps({ loading: true })
      await flushPromises()

      expect(wrapper.find('.grid-export-status--notice').exists()).toBe(true)
    })

    it('does not clear a running export when the grid finishes loading', async () => {
      startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-9' })
      const wrapper = mount(GridExportStatus, { props: { loading: true }, global: { plugins: [i18n] } })
      mounted.push(wrapper)
      await wrapper.vm.start('Match', REQUEST, 100)
      await flushPromises()

      await wrapper.setProps({ loading: false })
      await flushPromises()

      expect(wrapper.find('.grid-export-status--running').exists()).toBe(true)
    })

    it('does not clear a failed export when the grid finishes loading', async () => {
      startGridExport.mockRejectedValue(new HttpError(409, 'api/grid-exports/match', '{}'))
      const wrapper = mount(GridExportStatus, { props: { loading: true }, global: { plugins: [i18n] } })
      mounted.push(wrapper)
      await wrapper.vm.start('Match', REQUEST, 100)
      await flushPromises()

      await wrapper.setProps({ loading: false })
      await flushPromises()

      expect(wrapper.find('.grid-export-status--failed').exists()).toBe(true)
    })
  })
})
