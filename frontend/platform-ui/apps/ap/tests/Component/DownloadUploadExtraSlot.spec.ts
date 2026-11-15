import { describe, it, expect, vi } from 'vitest'
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { mountWithProviders } from '../Helpers/mountWithProviders'

/**
 * `DownloadUpload` reaches `useUser` through the `@/composables` barrel, and that barrel pulls the
 * analyze views in behind it — `MetricsComponents.vue` then calls `NumberUtils.getRandomInt()` on a
 * module that never finished loading, and the suite dies at COLLECTION with a stack naming a
 * component this file has nothing to do with. Mocking the barrel stops it loading at all.
 *
 * Registered before the component is imported, which is why the import below is dynamic: a static
 * one is hoisted above the mock.
 */
vi.mock('@/composables', () => ({ useUser: () => ({ userIsSuperAdmin: computed(() => true) }) }))

const DownloadUpload = (
  await import('@/modules/components/grid/columns/DownloadUpload.vue')
).default

/**
 * The `extra` slot AR's two adjustments columns render their result action through.
 *
 * <p><b>Why a slot and not a fourth action inside the component.</b> `DownloadUpload` is shared with
 * the payables adjustments columns, and the result reaches an endpoint only Receivables serves. The
 * slot lets AR add the action without this component learning anything about AR — and lets the
 * payables columns stay exactly as they were, which is the half of the change nobody would notice
 * had broken until somebody opened the payables tab.</p>
 *
 * <p>So these cases are about the cell's shape under both conditions, not about either action's
 * behaviour: the result action has its own suite.</p>
 */

const AR_BEHAVIOR = 'peerGroupAndBuyerStandardAdjustments'
const PAYABLES_BEHAVIOR = 'peerGroupAndSupplierStandardAdjustments'

function mountCell(behavior: string, slots?: Record<string, string>) {
  return mountWithProviders(DownloadUpload, {
    props: { dataItem: { uuid: 'version-uuid-1' }, behavior },
    ...(slots ? { slots } : {})
  })
}

/** The cells of the one flex row the component renders. */
function cells(wrapper: ReturnType<typeof mountCell>) {
  return wrapper.findAll('.d-flex > div')
}

/**
 * A parent that can hand the same child instance a slot, then take it away.
 *
 * Vue patches an existing instance rather than remounting it when only the slots change, which is
 * the one condition under which a cached width class and a per-render `v-if` can disagree.
 */
const Host = defineComponent({
  setup() {
    return { show: ref(false) }
  },
  render() {
    const slots: Record<string, () => unknown> = {}

    if (this.show) {
      slots.extra = () => h('span', { class: 'result-action' }, 'RESULT ACTION')
    }

    return h(DownloadUpload, { dataItem: { uuid: 'version-uuid-1' }, behavior: AR_BEHAVIOR }, slots)
  }
})

describe('DownloadUpload extra slot', () => {
  it('renders nothing extra for a column that passes no slot', () => {
    const wrapper = mountCell(PAYABLES_BEHAVIOR)

    expect(wrapper.text()).not.toContain('RESULT ACTION')
  })

  /**
   * Pinned on the class rather than only on the count: `col` distributes by how many siblings there
   * are, so leaving it on the payables cell would have turned a non-superadmin's two-item row from
   * two thirds into two halves — a layout change in a column this work is not about.
   */
  it('keeps the payables cell on thirds', () => {
    const rendered = cells(mountCell(PAYABLES_BEHAVIOR))

    expect(rendered.length).toBeGreaterThan(0)
    rendered.forEach((cell) => expect(cell.classes()).toContain('col-4'))
  })

  it('renders the slot as one more cell when a column passes it', () => {
    const wrapper = mountCell(AR_BEHAVIOR, { extra: '<span class="result-action">RESULT ACTION</span>' })

    expect(wrapper.find('.result-action').exists()).toBe(true)
    expect(wrapper.text()).toContain('RESULT ACTION')
  })

  /**
   * <b>The width class and the fourth cell are read from the same thing, so they cannot disagree.</b>
   *
   * Review finding on PR 14830: as a `computed` over the setup context's `slots`, the class collected
   * no dependencies — that object is not reactive — so it was evaluated once and cached, while the
   * template's own `v-if="$slots.extra"` is re-read every render. An instance the grid reuses across
   * a slotted and an unslotted cell would then have rendered four items on thirds, or three on
   * quarters.
   */
  it('follows the slot when the same instance gains one', async () => {
    const wrapper = mountWithProviders(Host)

    expect(wrapper.find('.result-action').exists()).toBe(false)
    cells(wrapper).forEach((cell) => expect(cell.classes()).toContain('col-4'))

    ;(wrapper.vm as any).show = true
    await nextTick()

    expect(wrapper.find('.result-action').exists()).toBe(true)
    cells(wrapper).forEach((cell) => {
      expect(cell.classes()).toContain('col')
      expect(cell.classes()).not.toContain('col-4')
    })
  })

  /** Four items share the row evenly, which `col-4` cannot do. */
  it('shares the row evenly once the slot is filled', () => {
    const rendered = cells(mountCell(AR_BEHAVIOR, { extra: '<span>RESULT ACTION</span>' }))

    expect(rendered.length).toBeGreaterThan(0)
    rendered.forEach((cell) => {
      expect(cell.classes()).toContain('col')
      expect(cell.classes()).not.toContain('col-4')
    })
  })
})
