/**
 * WI#18968 — the "9 Boxes Limits" section of Cash Flow setup.
 *
 * Mounts the real screen so the wiring is exercised end to end: onMounted reads the limits from
 * the spend file version (not from the session profile — that payload is fetched once per session,
 * so a recalculation never reached it), and each row maps `med` to the lower limit and `high` to
 * the upper one.
 *
 * WI#19582 — the section stopped being read-only. All four boxes get a row now, captured or not,
 * because a box with no limits still needs its Recalculate button; that is how it gets its first
 * pair. The two buttons and the manual modal are covered here too.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const {
  getSpendFileVersion,
  postNineBoxThresholds,
  getProgram,
  featureFlags,
  spendFileVersionActiveId,
  selectedProgram,
  defaultProgram,
  currencyAmount,
  toastSuccess,
  toastError,
  subscribeStoreStub,
  subscribeToPrograms,
  fnSetUnsubscribeProgram,
} = vi.hoisted(() => ({
  getSpendFileVersion: vi.fn(),
  postNineBoxThresholds: vi.fn(),
  getProgram: vi.fn(),
  // WI#19582: which 9-boxes the company can open. The table mirrors the Analyze selector, so these
  // are what decides the rows.
  featureFlags: {
    virtualCard: true,
    vCardGroups: true,
    nineBoxesFinancing: true,
    partner: true,
  },
  spendFileVersionActiveId: { value: '/api/spend_file_versions/abc-123' },
  selectedProgram: { value: 'program-uuid-1' as string | null },
  defaultProgram: { value: null as string | null },
  currencyAmount: { value: 1 },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  // Filled by the mock factory below with a reactive store, so the test can drive
  // `refreshPrograms` the way the Firestore snapshot does and the component's watcher fires.
  subscribeStoreStub: { store: null as any },
  subscribeToPrograms: vi.fn(),
  fnSetUnsubscribeProgram: vi.fn(),
}))

vi.mock('@/modules/home/api', () => ({ getSpendFileVersion, postNineBoxThresholds }))

vi.mock('@/modules/home/analyze/api', () => ({ getProgram }))

vi.mock('@/composables', () => ({
  useSpendFile: () => ({ spendFileVersionActiveId: ref(spendFileVersionActiveId.value) }),
  useCompany: () => ({
    companyActiveId: ref('company-1'),
    usevCardGroupsEnabled: computed(() => featureFlags.vCardGroups),
  }),
  useUser: () => ({
    useFeatureVirtualCard: computed(() => featureFlags.virtualCard),
    useFeature9BoxesFinancing: computed(() => featureFlags.nineBoxesFinancing),
    userPartnerRoleEnabled: computed(() => featureFlags.partner),
    // AB#86ak0mkx0: neither Super Admin nor Data, so the Buyer Leverage Limits card's onMounted
    // load is a no-op here - this spec is about 9-Box Limits only.
    userIsSuperAdmin: computed(() => false),
    userDataRoleEnabled: computed(() => false),
  }),
}))

// The screen calls these on mount for the other two sections; neither is under test here, and
// leaving them unresolved keeps the payment-cycle and ADP state at its declared defaults.
vi.mock('@/stores/home', () => ({
  useHomeStore: () => ({ postCompanySettings: vi.fn(), patchADPVisibility: vi.fn() }),
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    getHideAverageDaysPaid: false,
    getHasContractualPaymentTerms: true,
    setPaymentCycleDays: vi.fn(),
    setHideAverageDaysPaid: vi.fn(),
    getUser: { activeProgramDefaultId: defaultProgram.value },
  }),
}))

// WI#19582: the rate the table is painted with travels with the limits, and the reclassification
// runs on the program the user has open.
vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ getCurrencyAmount: currencyAmount.value }),
}))
vi.mock('@/stores/entityCard', () => ({
  useEntityCardStore: () => ({ getSelectedProgram: selectedProgram.value }),
}))

// WI#19582: the relabelling runs on one program, so the screen learns it finished from the program's
// own Firestore status, not from the spend-file flag.
vi.mock('@/stores/subscribe', async () => {
  const { reactive } = await import('vue')
  subscribeStoreStub.store = reactive({ refreshPrograms: '' })

  return { useSubscribeStore: () => subscribeStoreStub.store }
})
vi.mock('@/composables/firebase/useFirebase', () => ({
  default: () => ({ subscribeToPrograms, fnSetUnsubscribeProgram }),
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}))

vi.mock('@ada/design-system', () => ({ CalculumLoading: { template: '<div />' } }))

// The component imports the app router only to push on "discard"; the real one pulls the whole
// route tree, and `onBeforeRouteLeave` needs a router instance this mount does not have.
vi.mock('@/services/router', () => ({ default: { push: vi.fn() } }))
vi.mock('vue-router', () => ({ onBeforeRouteLeave: vi.fn() }))

// Currency conversion and locale formatting are not what this section adds; echoing the number
// back keeps the assertions on the mapping (med -> lower, high -> upper) rather than on a locale.
vi.mock('@/utils/FormatData', () => ({
  changeToCurrency: (n: number) => n,
  getNumberWithDecimals: (n: number) => String(n),
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

/**
 * WI#19582: what the screen reads is `nineBoxThresholdsActive` — the back end has already picked
 * which of each box's two pairs classifies, and says whether it was the user's (`source`) and
 * whether there is a calculated one behind it (`hasCalculated`).
 */
const THRESHOLDS = {
  cashFlow: { med: 14945.97353, high: 81252.67004, source: 'calculated', hasCalculated: true },
  economicProfit: { med: 1345.13762, high: 7312.7403, source: 'calculated', hasCalculated: true },
}

/** The same cashFlow box, but with limits the Company Admin typed over the calculated ones. */
const THRESHOLDS_OVERRIDDEN = {
  ...THRESHOLDS,
  cashFlow: { med: 15000, high: 50000, source: 'manual', hasCalculated: true },
}

/** An override on a spend file that was never calculated: nothing to reset back to. */
const THRESHOLDS_OVERRIDDEN_NEVER_CALCULATED = {
  cashFlow: { med: 15000, high: 50000, source: 'manual', hasCalculated: false },
}

/** Renders both slots, so the manual modal's inputs and buttons are reachable from the test. */
const CalculumModalStub = {
  template: '<div class="modal-stub"><slot name="modalContent" /><slot name="modalButtons" /></div>',
}

/**
 * Every mount is torn down in afterEach. The subscribe store is one reactive object shared by the
 * whole file, so a component left mounted keeps its `refreshPrograms` watcher alive and reloads the
 * limits on the next test's signal.
 */
const mounted: any[] = []

async function mountSetup(
  responseData: any,
  { success = true, expand = true, spendFileInrecalculation = false } = {},
) {
  getSpendFileVersion.mockResolvedValue({ success, code: success ? 200 : 500, data: responseData })

  const CashFlow = (await import('@/modules/home/views/settings/CashFlow.vue')).default

  const wrapper = mount(CashFlow, {
    props: { showAlert: false, otherTab: '', spendFileInrecalculation },
    global: {
      plugins: [i18n],
      mocks: { $t: (key: string) => key },
      stubs: {
        CalculumModal: CalculumModalStub,
        CalculumTooltipIcon: { template: '<div />' },
      },
    },
  })

  mounted.push(wrapper)

  if (expand) await wrapper.find('#show-nine-box-limits').trigger('click')
  // onMounted fires two reads — the limits and the program's financing flag — and the rows need
  // both. Counting on $nextTick to have drained them made the row assertions race the second one.
  await flushPromises()

  return wrapper
}

/** Name + the two limits. The name cell also carries the Configured/Unset badge, covered on its own. */
function limitRows(wrapper: any) {
  return wrapper.findAll('.nine-box-limits-table tbody tr').map((row: any) => {
    const cells = row.findAll('td')

    return [cells[0].findAll('span')[0].text(), cells[1].text(), cells[2].text()]
  })
}

function badges(wrapper: any) {
  return wrapper.findAll('.nine-box-limits-badge').map((badge: any) => [
    badge.attributes('data-box-type'),
    badge.text(),
  ])
}

function actionButton(wrapper: any, boxType: string, action: 'recalculate' | 'manual' | 'reset') {
  return wrapper.find(`button[data-box-type="${boxType}"][data-action="${action}"]`)
}

afterEach(() => {
  while (mounted.length) mounted.pop()?.unmount()
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  selectedProgram.value = 'program-uuid-1'
  defaultProgram.value = null
  currencyAmount.value = 1
  if (subscribeStoreStub.store) subscribeStoreStub.store.refreshPrograms = ''
  postNineBoxThresholds.mockResolvedValue({ success: true, code: 202, data: {} })
  featureFlags.virtualCard = true
  featureFlags.vCardGroups = true
  featureFlags.nineBoxesFinancing = true
  featureFlags.partner = true
  getProgram.mockResolvedValue({ success: true, code: 200, data: { externalFinancingEnabled: true } })
})

// Whichever test runs first pays for the dynamic import of the screen, and under the full suite that
// alone can outlast the 10s default.
describe('Cash Flow setup — 9 Boxes Limits', { timeout: 30000 }, () => {
  it('reads the limits from the spend file version, not the session profile', async () => {
    await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    expect(getSpendFileVersion).toHaveBeenCalledWith('/api/spend_file_versions/abc-123')
  })

  it('shows med as the lower limit and high as the upper one, with a dash on the uncaptured boxes', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    // scf and vCard are absent from the payload, but they still get a row so they can be recalculated.
    expect(limitRows(wrapper)).toEqual([
      [
        'home.homeCompanySettings.nineBoxLimits.boxes.cashFlow',
        '14945.97353',
        '81252.67004',
      ],
      [
        'home.homeCompanySettings.nineBoxLimits.boxes.scf',
        'home.homeCompanySettings.nineBoxLimits.notSet',
        'home.homeCompanySettings.nineBoxLimits.notSet',
      ],
      [
        'home.homeCompanySettings.nineBoxLimits.boxes.economicProfit',
        '1345.13762',
        '7312.7403',
      ],
      [
        'home.homeCompanySettings.nineBoxLimits.boxes.vCard',
        'home.homeCompanySettings.nineBoxLimits.notSet',
        'home.homeCompanySettings.nineBoxLimits.notSet',
      ],
    ])
  })

  /** The dash on its own reads as missing data; the badge is what says it is a state, not a gap. */
  it('badges each box as Configured or Unset', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    expect(badges(wrapper)).toEqual([
      ['cashFlow', 'home.homeCompanySettings.nineBoxLimits.configured'],
      ['scf', 'home.homeCompanySettings.nineBoxLimits.unset'],
      ['economicProfit', 'home.homeCompanySettings.nineBoxLimits.configured'],
      ['vCard', 'home.homeCompanySettings.nineBoxLimits.unset'],
    ])

    expect(wrapper.find('.nine-box-limits-badge[data-box-type="cashFlow"]').classes())
      .toContain('is-configured')
    expect(wrapper.find('.nine-box-limits-badge[data-box-type="scf"]').classes())
      .toContain('is-unset')
  })

  /**
   * WI#19582: the rows follow the 9-box selector in Analyze, not the stored limits. A company that
   * used to have VCard keeps its captured pair in the payload, and the row must still stay out
   * while the feature is off — the limits of a box nobody can open are not theirs to edit.
   */
  it('hides the VCard row when the company does not have the feature on', async () => {
    featureFlags.virtualCard = false

    const wrapper = await mountSetup({
      nineBoxThresholdsActive: { ...THRESHOLDS, vCard: { med: 10, high: 20, source: 'calculated', hasCalculated: true } },
    })

    expect(badges(wrapper).map(([boxType]: string[]) => boxType))
      .toEqual(['cashFlow', 'scf', 'economicProfit'])
  })

  it('hides it just the same when the feature is on but the card groups are off', async () => {
    featureFlags.vCardGroups = false

    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    expect(badges(wrapper).map(([boxType]: string[]) => boxType))
      .toEqual(['cashFlow', 'scf', 'economicProfit'])
  })

  /** Financing is a property of the program, so this one is answered by GET /analyze/programs. */
  it('drops both SCF rows when the program has no external financing', async () => {
    getProgram.mockResolvedValue({ success: true, code: 200, data: { externalFinancingEnabled: false } })

    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    expect(getProgram).toHaveBeenCalledWith('program-uuid-1')
    expect(badges(wrapper).map(([boxType]: string[]) => boxType)).toEqual(['cashFlow', 'vCard'])
  })

  /** "SCF Provider" — `scf` in storage — is the partner's box; the plain SCF one stays. */
  it('keeps only the plain SCF row for a non-partner user', async () => {
    featureFlags.partner = false

    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    expect(badges(wrapper).map(([boxType]: string[]) => boxType))
      .toEqual(['cashFlow', 'economicProfit', 'vCard'])
  })

  it('leaves Term Extension alone — every company has that one', async () => {
    featureFlags.virtualCard = false
    featureFlags.nineBoxesFinancing = false

    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    expect(badges(wrapper).map(([boxType]: string[]) => boxType)).toEqual(['cashFlow'])
  })

  it('still shows the empty message for a version that was never recalculated', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: null })

    expect(wrapper.text()).toContain('home.homeCompanySettings.nineBoxLimits.empty')
    // The rows are there anyway: Recalculate is the way out of this state.
    expect(limitRows(wrapper)).toHaveLength(4)
  })

  it('starts collapsed', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS }, { expand: false })

    expect(wrapper.find('.nine-box-limits-table').exists()).toBe(false)
  })

  // ── WI#19582: whose limits are showing ────────────────────────────────────

  /**
   * The two buttons are exclusive: while an override is in force there is nothing to recalculate
   * towards, and while there is none there is nothing to reset. Offering both would let the user
   * wipe their own limits with the button that looks like a refresh.
   */
  it('offers Recalculate on a platform limit and Reset to default on an overridden one', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS_OVERRIDDEN })

    expect(actionButton(wrapper, 'cashFlow', 'recalculate').exists()).toBe(false)
    expect(actionButton(wrapper, 'cashFlow', 'reset').exists()).toBe(true)
    // economicProfit is still on the platform's own pair, so it keeps Recalculate.
    expect(actionButton(wrapper, 'economicProfit', 'recalculate').exists()).toBe(true)
    expect(actionButton(wrapper, 'economicProfit', 'reset').exists()).toBe(false)
  })

  /**
   * An override typed on a spend file that was never calculated has nowhere to go back to, so the
   * button that promises a default must not be there.
   */
  it('hides Reset to default when no calculated limit was ever stored', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS_OVERRIDDEN_NEVER_CALCULATED })

    expect(actionButton(wrapper, 'cashFlow', 'reset').exists()).toBe(false)
    expect(actionButton(wrapper, 'cashFlow', 'recalculate').exists()).toBe(false)
  })

  it('marks each limit as typed by hand or worked out by the platform', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS_OVERRIDDEN })

    const marks = wrapper.findAll('.nine-box-limits-source').map((mark: any) => [
      mark.attributes('data-box-type'),
      mark.attributes('data-source'),
    ])

    expect(marks).toEqual([['cashFlow', 'manual'], ['economicProfit', 'calculated']])
  })

  it('sends reset for the box whose Reset to default was pressed', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS_OVERRIDDEN })

    await actionButton(wrapper, 'cashFlow', 'reset').trigger('click')

    expect(postNineBoxThresholds).toHaveBeenCalledWith('/api/spend_file_versions/abc-123',
      expect.objectContaining({ boxType: 'cashFlow', mode: 'reset' }))
  })

  // ── WI#19582: recalculate ─────────────────────────────────────────────────

  it('recalculates only the box whose button was pressed', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    await actionButton(wrapper, 'scf', 'recalculate').trigger('click')

    expect(postNineBoxThresholds).toHaveBeenCalledTimes(1)
    expect(postNineBoxThresholds).toHaveBeenCalledWith('/api/spend_file_versions/abc-123', {
      programUuid: 'program-uuid-1',
      boxType: 'scf',
      mode: 'recalculate',
      med: undefined,
      high: undefined,
      currencyRate: 1,
    })
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('disables both buttons while the spend file is recalculating', async () => {
    const wrapper = await mountSetup(
      { nineBoxThresholdsActive: THRESHOLDS },
      { spendFileInrecalculation: true },
    )

    expect(actionButton(wrapper, 'cashFlow', 'recalculate').attributes('disabled')).toBeDefined()
    expect(actionButton(wrapper, 'cashFlow', 'manual').attributes('disabled')).toBeDefined()
  })

  /** Setup is reachable without opening a program, and the profile default covers that case. */
  it('falls back to the profile default program when none is selected', async () => {
    selectedProgram.value = null
    defaultProgram.value = 'default-program-uuid'
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    await actionButton(wrapper, 'cashFlow', 'recalculate').trigger('click')

    expect(postNineBoxThresholds).toHaveBeenCalledWith(
      '/api/spend_file_versions/abc-123',
      expect.objectContaining({ programUuid: 'default-program-uuid' }),
    )
  })

  /** With neither there is nothing to reclassify, so the call must not leave the browser. */
  it('disables the buttons when there is no program at all', async () => {
    selectedProgram.value = null
    defaultProgram.value = null
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    expect(actionButton(wrapper, 'cashFlow', 'recalculate').attributes('disabled')).toBeDefined()
    expect(postNineBoxThresholds).not.toHaveBeenCalled()
  })

  // ── WI#19582: manual limits ───────────────────────────────────────────────

  it('prefills the modal with the box values the user is looking at', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    await actionButton(wrapper, 'cashFlow', 'manual').trigger('click')

    expect((wrapper.find('#nine-box-lower-limit').element as HTMLInputElement).value)
      .toBe('14945.97353')
    expect((wrapper.find('#nine-box-upper-limit').element as HTMLInputElement).value)
      .toBe('81252.67004')
  })

  it('sends the typed limits with the rate the table was painted with', async () => {
    currencyAmount.value = 0.92
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    await actionButton(wrapper, 'cashFlow', 'manual').trigger('click')
    await wrapper.find('#nine-box-lower-limit').setValue('15000')
    await wrapper.find('#nine-box-upper-limit').setValue('25000')
    await wrapper.find('.modal-stub .btn-primary').trigger('click')

    expect(postNineBoxThresholds).toHaveBeenCalledWith('/api/spend_file_versions/abc-123', {
      programUuid: 'program-uuid-1',
      boxType: 'cashFlow',
      mode: 'manual',
      med: 15000,
      high: 25000,
      currencyRate: 0.92,
    })
  })

  it('refuses an upper limit below the lower one without calling the API', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    await actionButton(wrapper, 'cashFlow', 'manual').trigger('click')
    await wrapper.find('#nine-box-lower-limit').setValue('25000')
    await wrapper.find('#nine-box-upper-limit').setValue('15000')

    expect(wrapper.text()).toContain('home.homeCompanySettings.nineBoxLimits.modal.mustBeGreater')
    expect(wrapper.find('.modal-stub .btn-primary').attributes('disabled')).toBeDefined()

    await wrapper.find('.modal-stub .btn-primary').trigger('click')
    expect(postNineBoxThresholds).not.toHaveBeenCalled()
  })

  it('refuses a negative limit', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    await actionButton(wrapper, 'cashFlow', 'manual').trigger('click')
    await wrapper.find('#nine-box-lower-limit').setValue('-1')
    await wrapper.find('#nine-box-upper-limit').setValue('15000')

    expect(wrapper.text()).toContain('home.homeCompanySettings.nineBoxLimits.modal.mustBePositive')
    expect(postNineBoxThresholds).not.toHaveBeenCalled()
  })

  it('keeps the modal open and says so when the request is rejected', async () => {
    postNineBoxThresholds.mockResolvedValue({
      success: false,
      code: 422,
      data: { detail: 'high must be greater than med.' },
    })
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    await actionButton(wrapper, 'cashFlow', 'manual').trigger('click')
    await wrapper.find('#nine-box-lower-limit').setValue('15000')
    await wrapper.find('#nine-box-upper-limit').setValue('25000')
    await wrapper.find('.modal-stub .btn-primary').trigger('click')
    await wrapper.vm.$nextTick()

    expect(toastError).toHaveBeenCalledWith('high must be greater than med.')
    expect(wrapper.find('#nine-box-lower-limit').exists()).toBe(true)
  })

  /**
   * The endpoint answers 202, so the fresh limits only exist once the queue is through. A whole
   * spend file recalculation finishing is one of the two ways the screen hears about it.
   */
  it('re-reads the limits when the spend file recalculation finishes', async () => {
    const wrapper = await mountSetup(
      { nineBoxThresholdsActive: THRESHOLDS },
      { spendFileInrecalculation: true },
    )
    expect(getSpendFileVersion).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ spendFileInrecalculation: false })
    await wrapper.vm.$nextTick()

    expect(getSpendFileVersion).toHaveBeenCalledTimes(2)
  })

  /**
   * The other way, and the one these buttons actually trigger: relabelling runs on ONE program and
   * never touches the spend file status, so the spend-file flag above stays put. Without this the
   * screen kept showing the old limits until a manual reload.
   */
  it('re-reads the limits when the program finishes relabelling', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })
    expect(getSpendFileVersion).toHaveBeenCalledTimes(1)

    await actionButton(wrapper, 'cashFlow', 'recalculate').trigger('click')
    expect(getSpendFileVersion).toHaveBeenCalledTimes(1)

    subscribeStoreStub.store.refreshPrograms = 'estimating'
    await wrapper.vm.$nextTick()
    expect(getSpendFileVersion).toHaveBeenCalledTimes(1)

    subscribeStoreStub.store.refreshPrograms = 'ready'
    await wrapper.vm.$nextTick()
    expect(getSpendFileVersion).toHaveBeenCalledTimes(2)
  })

  it('subscribes to the program it will relabel, and lets go on unmount', async () => {
    const wrapper = await mountSetup({ nineBoxThresholdsActive: THRESHOLDS })

    expect(subscribeToPrograms).toHaveBeenCalledWith(['program-uuid-1'])

    wrapper.unmount()
    expect(fnSetUnsubscribeProgram).toHaveBeenCalled()
  })
})
