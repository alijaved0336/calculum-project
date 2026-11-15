import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchVersionDetail = vi.fn()
const fetchErrors = vi.fn()
const fetchNoMatches = vi.fn()

vi.mock('@/api', () => ({
  fetchVersionDetail: (...args: unknown[]) => fetchVersionDetail(...args),
  fetchErrors: (...args: unknown[]) => fetchErrors(...args),
  fetchNoMatches: (...args: unknown[]) => fetchNoMatches(...args),
}))

vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

const backOrOpenMatch = vi.fn()
vi.mock('@/modules/match/MatchRouting', () => ({
  match: 'Match',
  customerCard: 'CustomerCard',
  versionProgress: 'VersionProgress',
  versionErrors: 'VersionErrors',
  openMatch: vi.fn(),
  openCustomerCard: vi.fn(),
  openVersionProgress: vi.fn(),
  openVersionErrors: vi.fn(),
  backOrOpenMatch: (...args: unknown[]) => backOrOpenMatch(...args),
}))

// The real Kendo Grid needs a full DOM layout engine jsdom does not provide (same stub shape as
// ErrorGroupsSummary's and BuyerGrid's own specs), extended with a severity slot so the
// blocking/warning distinction (UC-VAL-03 basic flow step 4) is actually exercised.
vi.mock('@progress/kendo-vue-grid', () => ({
  Grid: {
    props: ['dataItems', 'columns'],
    emits: ['sortchange'],
    template: `
      <div class="grid-stub">
        <div v-for="(item, index) in dataItems" :key="index" class="grid-row">
          <template v-for="column in columns" :key="column.field">
            <slot v-if="column.cell" :name="column.cell" :props="{ dataItem: item }" />
            <span v-else>{{ item[column.field] }}</span>
          </template>
        </div>
      </div>
    `,
  },
}))

vi.mock('@ada/design-system', () => ({
  CalculumLayout: { template: '<div><slot name="slotTop" /><slot name="slotContent" /></div>' },
  CalculumLoadingAr: { template: '<div class="loading" />' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  CustomButton: {
    props: ['text', 'disabled'],
    emits: ['click'],
    template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ text }}</button>',
  },
  CustomBadge: { props: ['text', 'variant'], template: '<span class="badge" :class="variant">{{ text }}</span>' },
  CustomTabs: {
    props: ['items', 'modelValue'],
    emits: ['update:modelValue'],
    template: `
      <div class="tabs-row">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          :class="{ active: item.id === modelValue }"
          @click="$emit('update:modelValue', item.id)"
        >{{ item.label }}</button>
      </div>
    `,
  },
}))

import { HttpError } from '@/api/http'
import VersionErrorsView from '@/modules/match/views/VersionErrorsView.vue'
import type { VersionDetailResponse, ParseErrorRow, NoMatchRow } from '@/api'

const messages = {
  en: {
    arMatch: {
      progress: {
        back: 'Back',
        notFound: 'This version does not exist or is not visible to you.',
        loadError: 'The processing status could not be loaded.',
        retry: 'Retry',
      },
      errorsView: { title: 'Errors & No Matches' },
      summary: { errors: 'Errors', noMatch: 'No match' },
      tabs: { errors: 'Errors', noMatch: 'No Match' },
      errorGroups: 'Errors by group',
      empty: 'No rows.',
      emptyErrors: 'No errors.',
      emptyNoMatch: 'Every row was matched.',
      severity: { all: 'All', blocking: 'Blocking', warning: 'Warning' },
      table: {
        row: 'Row', sheet: 'Sheet', column: 'Column', code: 'Code', severity: 'Severity',
        rows: 'Rows', message: 'Message', rawName: 'Name in the file', reason: 'Reason',
      },
      noMatchReason: { 'buyer-name-missing': 'Buyer name missing' },
    },
  },
}

function detail(overrides: Partial<VersionDetailResponse['version']> = {}): VersionDetailResponse {
  return {
    version: {
      id: 73,
      uuid: 'v-73',
      version: 1,
      status: 'ready',
      statusDescription: null,
      periodStartDate: null,
      periodEndDate: null,
      readRowCount: 100,
      importedLineCount: 90,
      noMatchRowCount: 4,
      errorCount: 6,
      parsedAt: null,
      saleFileId: 5,
      skippedRowCount: 0,
      numberOfBuyingEntities: 0,
      numberOfParents: 0,
      numberOfSuppliers: 0,
      numberOfCustomers: 0,
      ...overrides,
    },
    totalVolume: 0,
    errorGroups: [
      { sheet: 'Sales Data', columnRef: 'K', errorCode: 'invalid-number', severity: 'blocking', storedRows: 6 },
    ],
  }
}

function errorRow(overrides: Partial<ParseErrorRow> = {}): ParseErrorRow {
  return {
    sheet: 'Sales Data', rowNumber: 12, columnRef: 'K', errorCode: 'invalid-number',
    severity: 'blocking', message: 'Value is not a number', ...overrides,
  }
}

function noMatchRow(overrides: Partial<NoMatchRow> = {}): NoMatchRow {
  return { sourceRowNumber: 8, rawName: 'Acme LLC', reason: 'buyer-name-missing', ...overrides }
}

function mountView(versionId = '73') {
  // globalInjection: true - ErrorsTab/NoMatchTab render their severity/reason badges via the
  // template's own `$t` rather than the composable's destructured `t`.
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', globalInjection: true, messages })
  return mount(VersionErrorsView, { props: { versionId }, global: { plugins: [i18n] } })
}

describe('VersionErrorsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    fetchVersionDetail.mockReset()
    fetchErrors.mockReset()
    fetchNoMatches.mockReset()
    backOrOpenMatch.mockReset()
  })

  it('shows a loading state while the version detail is in flight', async () => {
    fetchVersionDetail.mockImplementation(() => new Promise(() => {}))
    const view = mountView()
    await flushPromises()

    expect(view.find('.loading').exists()).toBe(true)
  })

  it('treats a malformed route segment as not-found without asking the API', async () => {
    const view = mountView('abc')
    await flushPromises()

    expect(view.text()).toContain('This version does not exist or is not visible to you.')
    expect(fetchVersionDetail).not.toHaveBeenCalled()
  })

  it('shows the not-found state on a 404', async () => {
    fetchVersionDetail.mockRejectedValue(new HttpError(404, '/sale-file-versions/73', ''))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('This version does not exist or is not visible to you.')
  })

  it('shows a load error with a retry action on any other failure', async () => {
    fetchVersionDetail.mockRejectedValueOnce(new HttpError(500, '/sale-file-versions/73', ''))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('The processing status could not be loaded.')

    fetchVersionDetail.mockResolvedValueOnce(detail())
    fetchErrors.mockResolvedValue([])
    fetchNoMatches.mockResolvedValue([])
    await view.findAll('button').find((b) => b.text() === 'Retry')?.trigger('click')
    await flushPromises()

    expect(view.text()).toContain('Errors by group')
  })

  it('shows the error groups with their counts and the rows behind them, with the file\'s own row number (UC-VAL-03 basic flow)', async () => {
    fetchVersionDetail.mockResolvedValue(detail())
    fetchErrors.mockResolvedValue([errorRow()])
    fetchNoMatches.mockResolvedValue([])
    const view = mountView()
    await flushPromises()

    // Step 2: the group with its stored count.
    expect(view.text()).toContain('Sales Data')
    expect(view.text()).toContain('invalid-number')
    expect(view.text()).toContain('6')

    // Step 3: the row behind it, identified by the file's own row number.
    expect(fetchErrors).toHaveBeenCalledWith(73, undefined)
    expect(view.text()).toContain('12')
    expect(view.text()).toContain('Value is not a number')
  })

  it('distinguishes a blocking error from a warning (UC-VAL-03 basic flow step 4)', async () => {
    fetchVersionDetail.mockResolvedValue(detail())
    fetchErrors.mockResolvedValue([
      errorRow({ rowNumber: 12, severity: 'blocking' }),
      errorRow({ rowNumber: 13, columnRef: 'M', errorCode: 'out-of-range', severity: 'warning' }),
    ])
    fetchNoMatches.mockResolvedValue([])
    const view = mountView()
    await flushPromises()

    const badges = view.findAll('.badge').map((b) => ({ text: b.text(), variant: b.classes() }))
    expect(badges.some((b) => b.text === 'Blocking' && b.variant.includes('danger'))).toBe(true)
    expect(badges.some((b) => b.text === 'Warning' && b.variant.includes('warning'))).toBe(true)
  })

  it('shows no-match rows in their own tab, labelled differently from parse errors (UC-VAL-03 A1)', async () => {
    fetchVersionDetail.mockResolvedValue(detail())
    fetchErrors.mockResolvedValue([])
    fetchNoMatches.mockResolvedValue([noMatchRow()])
    const view = mountView()
    await flushPromises()

    expect(fetchNoMatches).not.toHaveBeenCalled()

    const noMatchTab = view.findAll('.tabs-row button').find((b) => b.text() === 'No Match')
    await noMatchTab?.trigger('click')
    await flushPromises()

    expect(fetchNoMatches).toHaveBeenCalledWith(73)
    expect(view.text()).toContain('Acme LLC')
    expect(view.text()).toContain('Buyer name missing')
    // The Errors grid (and its group summary) is gone once the tab has switched away from it.
    expect(view.text()).not.toContain('Errors by group')
  })

  it('goes back to the version via the shared back helper', async () => {
    fetchVersionDetail.mockResolvedValue(detail())
    fetchErrors.mockResolvedValue([])
    fetchNoMatches.mockResolvedValue([])
    const view = mountView()
    await flushPromises()

    await view.find('button.btn-outline-secondary').trigger('click')

    expect(backOrOpenMatch).toHaveBeenCalledWith('73')
  })

  it('reloads when the route moves to a different version, refetching the errors tab rather than leaving it on the previous version\'s rows', async () => {
    // ErrorsTab/NoMatchTab fetch once on their own onMounted, with no watch of their own on
    // versionId - CompaniesTab.vue's own comment documents exactly this failure mode for a
    // sibling tab once it was actually wired into a template that outlives a version change.
    // What has to carry the reload here is `detail` being nulled synchronously at the top of
    // `load()`, which takes the `v-else-if` block (and everything inside it) out of the DOM and
    // remounts it fresh once the new version's detail lands - a real remount, not a prop update
    // on a persisted instance.
    fetchVersionDetail.mockResolvedValueOnce(detail())
    fetchErrors.mockResolvedValue([])
    fetchNoMatches.mockResolvedValue([])
    const view = mountView()
    await flushPromises()
    expect(fetchVersionDetail).toHaveBeenCalledTimes(1)
    expect(fetchErrors).toHaveBeenCalledWith(73, undefined)

    fetchVersionDetail.mockResolvedValueOnce(detail())
    await view.setProps({ versionId: '99' })
    await flushPromises()

    expect(fetchVersionDetail).toHaveBeenCalledTimes(2)
    expect(fetchVersionDetail).toHaveBeenLastCalledWith(99, 1)
    expect(fetchErrors).toHaveBeenCalledWith(99, undefined)
  })

  it('discards a slower response once a newer navigation has already landed (stale-load guard)', async () => {
    let resolveFirst: (value: VersionDetailResponse) => void = () => {}
    fetchVersionDetail.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    fetchErrors.mockResolvedValue([])
    fetchNoMatches.mockResolvedValue([])
    const view = mountView()
    await flushPromises()

    fetchVersionDetail.mockResolvedValueOnce(detail({ errorCount: 4040 }))
    await view.setProps({ versionId: '99' })
    await flushPromises()
    expect(view.text()).toContain('4040')

    resolveFirst(detail({ errorCount: 1919 }))
    await flushPromises()

    expect(view.text()).toContain('4040')
    expect(view.text()).not.toContain('1919')
  })
})
