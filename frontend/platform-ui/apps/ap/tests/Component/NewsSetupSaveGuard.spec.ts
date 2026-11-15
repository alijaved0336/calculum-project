/**
 * Mounts News Setup to prove the guard end to end: the counter reads the built query
 * and Save stays disabled while it is over 200. This also pins a declaration-order
 * assumption — generalNewsCharCount reads generalNewsQuery, which is declared later in
 * setup(), and only stays valid because computed getters are lazy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia, defineStore } from 'pinia'
import { createI18n } from 'vue-i18n'

const LUNDBECK_KEYWORDS =
  'Lundbeck, pharmaceutical, drug development, clinical trials, ' +
  'pharmaceutical manufacturing, pharmaceutical supply chain, drug supply, FDA'

const DEFAULT_TERMS = [
  'Cash Flow',
  'Supply Chain',
  'Supply Chain Finance',
  'SCF',
  'Financing',
  'Procurement',
]

// The composable feeds the screen its stored configuration; each test seeds this.
const storedConfig = ref<any>(null)

// useI18n() needs a real instance installed on the app; the keys themselves are
// irrelevant here, so every lookup echoes its key back.
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('@ada/design-system', () => ({
  CalculumLoading: { template: '<div />' },
}))

vi.mock('@/modules/components/checkbox/KendoCheckbox.vue', () => ({
  default: { template: '<input type="checkbox" />' },
}))

vi.mock('@/composables', () => ({
  useSpendFile: () => ({
    getNewsConfig: storedConfig,
    updateNewsConfig: vi.fn(),
  }),
}))

// The real store pulls the whole home API tree; the screen only reaches it when the
// composable has nothing cached, which never happens here.
vi.mock('@/stores/home', () => ({
  useHomeStore: defineStore('home', {
    state: () => ({}),
    actions: {
      async getNewsConfig() { /* not reached: the composable is seeded */ },
      async saveNewsConfig() { /* not exercised here */ },
    },
  }),
}))

async function mountSetup(keywords: string) {
  const NewsSetup = (await import('@/modules/home/views/settings/NewsSetup.vue')).default

  storedConfig.value = {
    generalNews: {
      keywords,
      selectedTerms: [...DEFAULT_TERMS],
      additionalTerms: '',
    },
    supplierNews: {
      selectedEntities: ['Supplier Name', 'Parent Name'],
      selectedTerms: ['Cash Flow'],
      additionalTerms: '',
    },
    newsSearchYearsBack: 3,
  }

  return mount(NewsSetup, {
    props: { spendFileInrecalculation: false },
    global: {
      plugins: [i18n],
      mocks: { $t: (key: string) => key },
    },
  })
}

describe('News Setup save guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('counts the built query, not the raw config text', async () => {
    const wrapper = await mountSetup(LUNDBECK_KEYWORDS)
    const counter = wrapper.findAll('.character-counter')[0].text()

    // The raw config text is 200 characters; the query it builds is 271.
    expect(counter).toContain('271')
    expect(counter).not.toContain('200 /')
  })

  it('marks the over-limit counter as danger and shows the warning', async () => {
    const wrapper = await mountSetup(LUNDBECK_KEYWORDS)
    const counter = wrapper.findAll('.character-counter')[0]

    expect(counter.classes()).toContain('text-danger')
    expect(counter.find('.alert-warning').exists()).toBe(true)
  })

  it('disables Save while the query is over the limit', async () => {
    const wrapper = await mountSetup(LUNDBECK_KEYWORDS)
    const save = wrapper.findAll('button').find(b => b.text().includes('news.save'))

    expect(save).toBeDefined()
    expect(save?.attributes('disabled')).toBeDefined()
  })

  it('stays under the limit for a configuration that fits', async () => {
    const wrapper = await mountSetup('Pharma')
    const counter = wrapper.findAll('.character-counter')[0]

    expect(counter.text()).toContain('113')
    expect(counter.classes()).not.toContain('text-danger')
  })
})
