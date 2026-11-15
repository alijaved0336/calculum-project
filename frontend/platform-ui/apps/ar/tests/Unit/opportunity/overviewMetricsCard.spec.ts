import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchOpportunityOverviewChart = vi.fn()
const fetchOpportunityChartCatalog = vi.fn()

vi.mock('@/api', () => ({
  fetchOpportunityOverviewChart: (...args: unknown[]) => fetchOpportunityOverviewChart(...args),
  fetchOpportunityChartCatalog: (...args: unknown[]) => fetchOpportunityChartCatalog(...args),
}))

/**
 * A dimension entry shaped like the real endpoint's — every fixed column carries a `defaultType` of
 * its own, decided per (measure, dimension) pairing rather than by a client-side map. `translation`
 * is null for every fixed column (the server never names those) and real text only for the tenant's
 * own declared attributes.
 */
function dimensionOptions(overrides: Record<string, { defaultType?: string; selected?: boolean }> = {}) {
  // `selected` on the DEFAULT grouping, the way the server always sends it: every real group
  // carries the flag on a fixed entry, and never on one of the tenant's attributes. Marked here so
  // the fixture cannot make the card rely on POSITION for a default it is told outright.
  const fixed = [
    { name: 'supplier', defaultType: 'horizontal_bar', selected: true },
    { name: 'region', defaultType: 'horizontal_bar' },
    // The universal geo pairing: a country is always a bubble map, in every measure.
    { name: 'country', defaultType: 'world_map' },
    { name: 'industry', defaultType: 'horizontal_bar' },
    { name: 'waterfallBucket', defaultType: 'horizontal_bar' },
  ]
  return [
    // The tenant's own declared attributes come FIRST in every group the server sends, ahead of the
    // fixed columns — the entries a tenant goes looking for. They all share one `name` (the key the
    // request sends) and are told apart by the ordinal.
    {
      name: 'customAttribute', defaultType: 'horizontal_bar', chartTypes: [], selected: false,
      view: 'opportunity', translation: 'Segment', ordinal: 3, dataType: 'text',
    },
    {
      name: 'customAttribute', defaultType: 'horizontal_bar', chartTypes: [], selected: false,
      view: 'opportunity', translation: 'Region (client)', ordinal: 7, dataType: 'text',
    },
    ...fixed.map(({ name, defaultType, selected }) => ({
      name,
      defaultType: overrides[name]?.defaultType ?? defaultType,
      chartTypes: [],
      selected: overrides[name]?.selected ?? selected ?? false,
      view: 'opportunity',
      translation: null,
      ordinal: null,
      dataType: null,
    })),
  ]
}

/**
 * The menu the server serves — a flat array of measures, each carrying its OWN dimension menu (with
 * its own `selected` default and its own per-dimension `defaultType`). There is no hard-coded list to
 * mock any more and no shared shape map — that is the point of the catalog — so the card's dropdowns
 * and chart choice are entirely whatever this fixture says.
 */
const CATALOG = [
  {
    groupName: 'actualPaymentTerms', index: 1, numericType: 'weightedDays', type: 'category',
    selected: true, translation: null,
    // 'industry' is this measure's own pie pairing — distinct from Sale Concentration's
    // every-dimension-is-a-pie case below, to prove the pairing is read per dimension, not per measure.
    options: dimensionOptions({ supplier: { selected: true }, industry: { defaultType: 'pie' } }),
  },
  {
    groupName: 'volume', index: 2, numericType: 'money', type: 'category',
    selected: false, translation: null,
    options: dimensionOptions(),
  },
  // The one measure whose every dimension pairing is a pie: sale concentration is sale volume's own
  // number, and the renderer is the entire difference between them.
  {
    groupName: 'saleConcentration', index: 3, numericType: 'money', type: 'category',
    selected: false, translation: null,
    options: dimensionOptions({ supplier: { selected: true } }).map((option) => ({ ...option, defaultType: 'pie' })),
  },
  {
    groupName: 'buyers', index: 4, numericType: 'count', type: 'category',
    selected: false, translation: null,
    options: dimensionOptions(),
  },
]

vi.mock('@ada/design-system', () => ({
  CalculumFullScreen: {
    name: 'CalculumFullScreen',
    props: ['title'],
    emits: ['close-full-screen'],
    template:
      '<div class="full-screen" :data-title="title"><slot name="fullScreenContent" />'
      + '<button class="full-screen-close" @click="$emit(\'close-full-screen\')" /></div>',
  },
  CalculumLoadingAr: { template: '<div class="loading" />' },
  ContentBox: { template: '<div><slot name="header-title" /><slot /></div>' },
  ContentBoxBody: { template: '<div><slot /></div>' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  // `items`, not `options` — the real component's prop name, which is exactly what this spec has
  // to pin: passing the wrong prop leaves the dropdown rendering its "Select..." placeholder over
  // a working chart, which is how the defect shipped the first time.
  SearchableDropdown: {
    name: 'SearchableDropdown',
    props: ['items', 'modelValue', 'label'],
    emits: ['update:modelValue'],
    template:
      '<div class="dropdown" :data-label="label" :data-value="modelValue"'
      + ' :data-options="items.map((o) => o.value).join()" :data-labels="items.map((o) => o.label).join()" />',
  },
  HorizontalBarChart: {
    name: 'HorizontalBarChart',
    props: ['categories', 'series', 'height', 'categoryAxisTitle', 'valueAxisTitle'],
    emits: ['bar-click'],
    template: '<div class="chart" :data-categories="categories.join()" :data-height="height"'
      + ' :data-axis-title="categoryAxisTitle" :data-value-axis-title="valueAxisTitle" />',
  },
  PieChart: {
    name: 'PieChart',
    props: ['items', 'height'],
    emits: ['slice-click'],
    template:
      '<div class="pie" :data-height="height"'
      + ' :data-categories="items.map((i) => i.category).join()" />',
  },
  GeoChart: {
    name: 'GeoChart',
    props: ['data', 'valueLabel', 'height', 'fullBleedBreakpoints'],
    emits: ['on-event-click'],
    template: '<div class="geo-chart" :data-codes="data.map((r) => r.code).join()"'
      + ' :data-keys="data.map((r) => r.key).join()" :data-value-label="valueLabel"'
      + ' :data-full-bleed="fullBleedBreakpoints" />',
  },
}))

import OverviewMetricsCard from '@/modules/opportunity/components/OverviewMetricsCard.vue'
import { resetOverviewChartCatalogCache } from '@/modules/opportunity/composables/useOverviewChartCatalog'
import { useContextStore } from '@/stores/context'
import { useOverviewChartSelectionStore } from '@/stores/overviewChartSelection'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      global: {
        selectValue: 'Select Value', selectMetric: 'Select Metric', notAvailable: '—',
        showMore: 'Show More', showLess: 'Show Less',
      },
      arOpportunity: {
        measure: {
          actualPaymentTerms: 'Avg. Days Paid',
          volume: 'Sale Volume',
          saleConcentration: 'Sale Concentration',
          buyers: 'Number of Buyers',
        },
        dimension: {
          region: 'Region', supplier: 'Supplier Entity',
          waterfallBucket: 'Harmonization',
        },
        chartMetric: {
          supplier: 'Per Supplier Entities', region: 'Per Region',
          waterfallBucket: 'Per Harmonization',
          country: 'Per Country', industry: 'Per Industry',
        },
        charts: { topN: 'Top {count}' },
        empty: { loadError: 'Could not load' },
      },
    },
  },
})

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

function mountCard(props: Record<string, unknown> = {}) {
  return mount(OverviewMetricsCard, { props, global: { plugins: [i18n] } })
}

describe('OverviewMetricsCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    // The catalog is cached at module scope on purpose (one menu per page load, shared by both
    // cards), so it outlives a component and has to be cleared or the first test's menu would be
    // every later test's menu.
    resetOverviewChartCatalogCache()
    fetchOpportunityChartCatalog.mockReset()
    fetchOpportunityChartCatalog.mockResolvedValue(CATALOG)

    fetchOpportunityOverviewChart.mockReset()
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: [
        { name: 'Pagero Inc', value: 13_400_000 },
        { name: 'Store-Pagero Inc', value: 2_100_000 },
      ],
    })
    useContextStore().setVersion(7, VERSION)
  })

  /**
   * UC-UI-23: `labelFor`/`axisLabelFor`/`pieLabelFor` are the value-label callbacks the bar/pie
   * charts call per point - exposed on the component instance (defineComponent's setup return),
   * so they are exercised directly here rather than through a chart stub that does not invoke
   * them. All three are gated on `isMoney` (the catalog's own `numericType`), never a hardcoded
   * list, so a `count`/`weightedDays` measure must never receive the symbol.
   */
  describe('money-figure labels carry the selected currency symbol, non-money labels never do', () => {
    it('labelFor prefixes a money measure (volume) with the symbol, a count measure (buyers) not at all', async () => {
      const moneyCard = mountCard({ defaultMeasure: 'volume', defaultDimension: 'region' })
      await flushPromises()
      expect((moneyCard.vm as unknown as { labelFor(e: { value: unknown }): string }).labelFor({ value: 16_340_000 })).toBe('$16.3m')

      const countCard = mountCard({ defaultMeasure: 'buyers', defaultDimension: 'region' })
      await flushPromises()
      expect((countCard.vm as unknown as { labelFor(e: { value: unknown }): string }).labelFor({ value: 42 })).toBe('42')
    })

    it('pieLabelFor prefixes the value half with the symbol, leaving the percentage untouched', async () => {
      const wrapper = mountCard({ defaultMeasure: 'saleConcentration', defaultDimension: 'supplier' })
      await flushPromises()

      const pieLabelFor = (wrapper.vm as unknown as {
        pieLabelFor(e: { value: number; percentage: number }): string
      }).pieLabelFor
      expect(pieLabelFor({ value: 13_400_000, percentage: 0.865 })).toBe('$13.4m (87%)')
    })

    it("axisLabelFor abbreviates and prefixes money measures' ticks (volume, cashFlowOpportunity), but not actualPaymentTerms' (days)", async () => {
      const volumeCard = mountCard({ defaultMeasure: 'volume', defaultDimension: 'region' })
      await flushPromises()
      expect((volumeCard.vm as unknown as { axisLabelFor(e: { value: unknown }): string }).axisLabelFor({ value: 5_000 })).toBe('$5.0k')

      const daysCard = mountCard({ defaultMeasure: 'actualPaymentTerms', defaultDimension: 'supplier' })
      await flushPromises()
      expect((daysCard.vm as unknown as { axisLabelFor(e: { value: unknown }): string }).axisLabelFor({ value: 5_000 })).toBe('5,000')
    })

    it('places the symbol after the minus sign for a negative money value, never "$-16.3m"', async () => {
      const moneyCard = mountCard({ defaultMeasure: 'volume', defaultDimension: 'region' })
      await flushPromises()
      expect((moneyCard.vm as unknown as { labelFor(e: { value: unknown }): string }).labelFor({ value: -16_340_000 })).toBe('-$16.3m')
    })
  })

  it('fills both dropdowns from the served catalog, not from a list of its own', async () => {
    const wrapper = mountCard()
    await flushPromises()

    const dropdowns = wrapper.findAll('.dropdown')
    expect(dropdowns).toHaveLength(2)

    // Exactly what the server sent, in the order it sent it: the card no longer has a say in which
    // measures or dimensions exist, which is what stops the menu offering a key the endpoint refuses.
    expect(dropdowns[0].attributes('data-label')).toBe('Select Value')
    expect(dropdowns[0].attributes('data-options'))
      .toBe('actualPaymentTerms,volume,saleConcentration,buyers')

    expect(dropdowns[1].attributes('data-label')).toBe('Select Metric')

    // The active measure's OWN dimension menu — actualPaymentTerms's, since it is the catalog's
    // default. The tenant's attributes come FIRST, each identified by its ordinal because they all
    // share the same dimension key — a bare name could not tell two of them apart.
    expect(dropdowns[1].attributes('data-options'))
      .toBe('customAttribute:3,customAttribute:7,supplier,region,country,industry,waterfallBucket')

    // And their labels are the tenant's own titles, verbatim: a title is data, not a key this app
    // could translate.
    expect(dropdowns[1].attributes('data-labels'))
      .toBe('Segment,Region (client),Per Supplier Entities,Per Region,Per Country,Per Industry,Per Harmonization')
  })

  it('sends the ordinal when the user picks one of the tenant\'s attributes', async () => {
    const wrapper = mountCard()
    await flushPromises()

    await wrapper.findAllComponents({ name: 'SearchableDropdown' })[1].vm
      .$emit('update:modelValue', 'customAttribute:7')
    await flushPromises()

    // The dimension key and the ordinal travel together — a `customAttribute` with no ordinal is a
    // 400, and so is an ordinal left over beside a fixed column.
    expect(fetchOpportunityOverviewChart)
      .toHaveBeenLastCalledWith(VERSION, 'actualPaymentTerms', 'customAttribute', 1, false, 7)

    // The dropdown keeps showing the entry the user chose, not the bare key both attributes share.
    expect(wrapper.findAll('.dropdown')[1].attributes('data-value')).toBe('customAttribute:7')
  })

  it('refetches when the user switches between two attributes, where only the ordinal changes', async () => {
    const wrapper = mountCard()
    await flushPromises()
    const dimensionDropdown = wrapper.findAllComponents({ name: 'SearchableDropdown' })[1]

    await dimensionDropdown.vm.$emit('update:modelValue', 'customAttribute:3')
    await flushPromises()
    await dimensionDropdown.vm.$emit('update:modelValue', 'customAttribute:7')
    await flushPromises()

    // Three: the initial load, then one per attribute. Watching the dimension alone would have
    // stopped at two and left the second attribute showing the first one's bars.
    expect(fetchOpportunityOverviewChart).toHaveBeenCalledTimes(3)
    expect(fetchOpportunityOverviewChart)
      .toHaveBeenLastCalledWith(VERSION, 'actualPaymentTerms', 'customAttribute', 1, false, 7)
  })

  it('labels a clicked bar with the attribute\'s own title', async () => {
    const wrapper = mountCard()
    await flushPromises()

    await wrapper.findAllComponents({ name: 'SearchableDropdown' })[1].vm
      .$emit('update:modelValue', 'customAttribute:7')
    await flushPromises()

    await wrapper.findComponent({ name: 'HorizontalBarChart' }).vm
      .$emit('bar-click', { category: 'Pagero Inc', index: 0 })

    // The tenant's title, not an i18n key for a dimension this app has never heard of.
    expect(wrapper.emitted('item-selected')![0][0]).toMatchObject({
      dimension: 'customAttribute',
      value: 'Pagero Inc',
      label: 'Region (client): Pagero Inc',
    })
  })

  it('opens on the catalog\'s own 1st measure when the card names none and remembers nothing', async () => {
    const wrapper = mountCard()
    await flushPromises()

    // cardIndex defaults to 0 - the catalog's own FIRST served measure (actualPaymentTerms in this
    // fixture), not a second default spelled out in the card - and it is the pair the chart request
    // actually carries. That measure's own default dimension (its `selected` entry) is supplier.
    expect(wrapper.findAll('.dropdown')[0].attributes('data-value')).toBe('actualPaymentTerms')
    expect(wrapper.findAll('.dropdown')[1].attributes('data-value')).toBe('supplier')
    expect(fetchOpportunityOverviewChart).toHaveBeenCalledWith(VERSION, 'actualPaymentTerms', 'supplier', 1, false, undefined)
  })

  it('opens on the catalog\'s own 2nd measure for cardIndex 1, so two cards differ without either naming one', async () => {
    const wrapper = mountCard({ cardIndex: 1 })
    await flushPromises()

    // Position in the served list, not a name: this fixture's second entry is `volume`.
    expect(wrapper.findAll('.dropdown')[0].attributes('data-value')).toBe('volume')
    expect(fetchOpportunityOverviewChart).toHaveBeenCalledWith(VERSION, 'volume', 'supplier', 1, false, undefined)
  })

  it('lets a card override the default, which is how the screen shows two different charts', async () => {
    mountCard({ defaultMeasure: 'volume', defaultDimension: 'region' })
    await flushPromises()

    expect(fetchOpportunityOverviewChart).toHaveBeenCalledWith(VERSION, 'volume', 'region', 1, false, undefined)
    // Once, not twice: the catalog's default must not fire a second request over the card's choice.
    expect(fetchOpportunityOverviewChart).toHaveBeenCalledTimes(1)
  })

  it('remembers a user\'s pick across a remount of the same card, ahead of the catalog\'s own default', async () => {
    const first = mountCard()
    await flushPromises()

    await first.findAllComponents({ name: 'SearchableDropdown' })[0].vm.$emit('update:modelValue', 'volume')
    await flushPromises()
    first.unmount()

    // A fresh instance of the SAME card (cardIndex 0, no defaultMeasure prop) - as if the user had
    // switched to the List tab and back, unmounting and remounting this card.
    const second = mountCard()
    await flushPromises()

    expect(second.findAll('.dropdown')[0].attributes('data-value')).toBe('volume')
    expect(fetchOpportunityOverviewChart).toHaveBeenLastCalledWith(VERSION, 'volume', 'supplier', 1, false, undefined)
  })

  it('keeps two cards\' remembered picks independent, keyed by cardIndex', async () => {
    const primary = mountCard({ cardIndex: 0 })
    await flushPromises()
    await primary.findAllComponents({ name: 'SearchableDropdown' })[0].vm.$emit('update:modelValue', 'volume')
    await flushPromises()

    // A second card, never touched - it still opens on ITS OWN default (the catalog's 2nd measure),
    // unaffected by the first card's own remembered pick.
    const secondary = mountCard({ cardIndex: 1 })
    await flushPromises()

    expect(secondary.findAll('.dropdown')[0].attributes('data-value')).toBe('volume')
    // Same value here only because this fixture's 2nd measure happens to be volume too - the real
    // proof is the request each card actually made for its own dimension pick below.
    await secondary.findAllComponents({ name: 'SearchableDropdown' })[1].vm.$emit('update:modelValue', 'region')
    await flushPromises()

    const stray = mountCard({ cardIndex: 0 })
    await flushPromises()
    // Card 0 still remembers `volume`/`supplier` from its own earlier pick, not card 1's `region`.
    expect(stray.findAll('.dropdown')[1].attributes('data-value')).toBe('supplier')
  })

  it('replaces a remembered grouping the served menu no longer offers, instead of asking for it', async () => {
    // A pick the user made while the menu still carried it. The menu is the SERVER'S and it changes:
    // product trims the list of groupings, a tenant stops filling an attribute. The default-adoption
    // watchers only fill a selection that is still null, so without a guard this stale key would sail
    // past them into the request - and the endpoint's allow-list IS that menu, so the card would
    // answer 400 forever on a chart that used to work. Nothing else can catch it either: the store is
    // per browser, so the stale key exists only on the machine of whoever picked it.
    useOverviewChartSelectionStore()
      .setSelection('0', { measure: 'volume', dimension: 'currency' })

    const wrapper = mountCard()
    await flushPromises()

    // The measure is still served, so it survives; only the grouping falls back to the menu's own.
    expect(wrapper.findAll('.dropdown')[0].attributes('data-value')).toBe('volume')
    expect(wrapper.findAll('.dropdown')[1].attributes('data-value')).toBe('supplier')

    expect(fetchOpportunityOverviewChart)
      .toHaveBeenLastCalledWith(VERSION, 'volume', 'supplier', 1, false, undefined)
    expect(fetchOpportunityOverviewChart)
      .not.toHaveBeenCalledWith(VERSION, 'volume', 'currency', 1, false, undefined)
  })

  it('replaces a remembered measure the served menu no longer offers, keeping a grouping it still has', async () => {
    useOverviewChartSelectionStore()
      .setSelection('0', { measure: 'smeCount', dimension: 'region' })

    const wrapper = mountCard()
    await flushPromises()

    // cardIndex 0 falls back to the catalog's own FIRST measure, as an untouched card does...
    expect(wrapper.findAll('.dropdown')[0].attributes('data-value')).toBe('actualPaymentTerms')
    // ...but the grouping is validated against whichever measure the card lands on, and that one
    // offers 'region' too, so the user's own pick is kept rather than reset with the measure.
    expect(wrapper.findAll('.dropdown')[1].attributes('data-value')).toBe('region')

    expect(fetchOpportunityOverviewChart)
      .toHaveBeenLastCalledWith(VERSION, 'actualPaymentTerms', 'region', 1, false, undefined)
  })

  it('replaces a remembered tenant attribute whose ordinal the menu no longer carries', async () => {
    // Every one of a tenant's attributes travels under the same `customAttribute` key, so only the
    // ordinal tells two of them apart: a remembered attribute that stopped being filled leaves a key
    // the menu still lists, under an ordinal it no longer does.
    useOverviewChartSelectionStore()
      .setSelection('0', { measure: 'volume', dimension: 'customAttribute', dimensionOrdinal: 11 })

    const wrapper = mountCard()
    await flushPromises()

    expect(fetchOpportunityOverviewChart)
      .toHaveBeenLastCalledWith(VERSION, 'volume', 'supplier', 1, false, undefined)
    expect(fetchOpportunityOverviewChart).not.toHaveBeenCalledWith(
      VERSION, 'volume', 'customAttribute', 1, false, 11)
  })

  it('does not remember the catalog\'s own automatic default - only a pick the user actually made', async () => {
    const wrapper = mountCard()
    await flushPromises()

    // Nothing written for the catalog's own default adoption - only onMeasureChange/onDimensionChange
    // write to the store, and neither fired here. A card nobody ever touched would otherwise "remember"
    // a default it never chose, and a later catalog change would never reach it on the next visit.
    expect(useOverviewChartSelectionStore().getSelection('0')).toBeNull()

    await wrapper.findAllComponents({ name: 'SearchableDropdown' })[0].vm.$emit('update:modelValue', 'volume')
    await flushPromises()

    expect(useOverviewChartSelectionStore().getSelection('0')).toMatchObject({ measure: 'volume', dimension: 'supplier' })
  })

  it('draws the pie every dimension of Sale Concentration asks for, and a bar for everything else', async () => {
    const wrapper = mountCard({ defaultMeasure: 'saleConcentration' })
    await flushPromises()

    // The renderer follows the SERVED pairing, never a measure name spelled out in the card: sale
    // concentration is sale volume's own number and the pie is the entire difference between them.
    expect(wrapper.find('.pie').exists()).toBe(true)
    expect(wrapper.find('.chart').exists()).toBe(false)
    expect(wrapper.find('.pie').attributes('data-categories')).toBe('Pagero Inc,Store-Pagero Inc')

    // Taller than the bar chart's 320px, which was sized for six bars: a pie has to fit its labels
    // OUTSIDE the circle plus a legend of full company names, and at 320px the top label is clipped
    // off the canvas.
    expect(wrapper.find('.pie').attributes('data-height')).toBe('420px')

    // A slice click narrows exactly as a bar click does — same index, same raw value.
    await wrapper.findComponent({ name: 'PieChart' }).vm.$emit('slice-click', { category: 'Pagero Inc', index: 0 })
    expect(wrapper.emitted('item-selected')![0][0]).toMatchObject({ value: 'Pagero Inc' })

    // And switching to a measure whose own pairing for the same dimension is a bar switches the
    // component back.
    await wrapper.findAllComponents({ name: 'SearchableDropdown' })[0].vm.$emit('update:modelValue', 'volume')
    await flushPromises()
    expect(wrapper.find('.chart').exists()).toBe(true)
    expect(wrapper.find('.pie').exists()).toBe(false)
  })

  it('shows a served key it has no translation for rather than the broken i18n path', async () => {
    fetchOpportunityChartCatalog.mockResolvedValue([
      ...CATALOG,
      {
        groupName: 'forecastVolume', index: 5, numericType: 'money', type: 'category',
        selected: false, translation: null, options: dimensionOptions(),
      },
    ])
    const wrapper = mountCard()
    await flushPromises()

    // A server newer than this bundle can offer a measure whose key was never translated here. The
    // legible failure is the key itself on the dropdown; the unacceptable one is
    // "arOpportunity.measure.forecastVolume".
    const labels = wrapper.findAll('.dropdown')[0].attributes('data-labels')
    expect(labels).toContain('forecastVolume')
    expect(labels).not.toContain('arOpportunity.measure')
  })

  it('asks for the catalog once per version, however many cards mount', async () => {
    mountCard()
    mountCard()
    await flushPromises()

    // Both cards share the cached in-flight promise, and it is asked for WITH the version — the menu
    // now carries the tenant's own attributes, which are per version.
    expect(fetchOpportunityChartCatalog).toHaveBeenCalledTimes(1)
    expect(fetchOpportunityChartCatalog).toHaveBeenCalledWith(VERSION)
    expect(fetchOpportunityOverviewChart).toHaveBeenCalledTimes(2)
  })

  it('does not serve one version\'s attributes to another version', async () => {
    const other = '2653c234-9318-4707-a6c3-33f4b427126c'
    const otherCatalog = [
      {
        groupName: 'actualPaymentTerms', index: 1, numericType: 'weightedDays', type: 'category',
        selected: true, translation: null,
        options: [{
          name: 'customAttribute', defaultType: 'horizontal_bar', chartTypes: [], selected: true,
          view: 'opportunity', translation: 'Other tenant field', ordinal: 1, dataType: 'text',
        }],
      },
    ]
    fetchOpportunityChartCatalog.mockImplementation((uuid: string) =>
      Promise.resolve(uuid === VERSION ? CATALOG : otherCatalog))

    mountCard()
    await flushPromises()

    useContextStore().setVersion(8, other)
    const second = mountCard()
    await flushPromises()

    // The cache is keyed by version, so the second card gets the second version's menu. A single
    // shared promise — which is what this cache used to be, on the premise that the menu was
    // version-independent — would have shown the first version's attributes here.
    expect(fetchOpportunityChartCatalog).toHaveBeenCalledTimes(2)
    expect(second.findAll('.dropdown')[1].attributes('data-labels')).toBe('Other tenant field')
  })

  it('emits the raw clicked value, and clears when the same bar is clicked again', async () => {
    const wrapper = mountCard()
    await flushPromises()

    await wrapper.findComponent({ name: 'HorizontalBarChart' }).vm.$emit('bar-click', { category: 'Pagero Inc', index: 0 })

    const selected = wrapper.emitted('item-selected')
    expect(selected).toHaveLength(1)
    expect(selected![0][0]).toEqual({
      dimension: 'supplier',
      value: 'Pagero Inc',
      label: 'Supplier Entity: Pagero Inc',
    })

    // With the selection handed back down, the same click is a toggle-off.
    await wrapper.setProps({ selection: selected![0][0] as never })
    await wrapper.findComponent({ name: 'HorizontalBarChart' }).vm.$emit('bar-click', { category: 'Pagero Inc', index: 0 })
    expect(wrapper.emitted('selection-cleared')).toHaveLength(1)
    expect(wrapper.emitted('item-selected')).toHaveLength(1)
  })

  it('paints only the bar that is filtering the list, in the Waterfall\'s Peer Group Standard color (AB#20654)', async () => {
    const wrapper = mountCard()
    await flushPromises()
    const chart = wrapper.findComponent({ name: 'HorizontalBarChart' })
    const barData = () => (chart.props('series') as { data: unknown[] }[])[0].data

    expect(barData().every((point) => typeof point === 'number')).toBe(true)

    await chart.vm.$emit('bar-click', { category: 'Pagero Inc', index: 0 })
    await wrapper.setProps({ selection: wrapper.emitted('item-selected')![0][0] as never })

    const [selected, ...rest] = barData()
    expect(selected).toEqual({ value: expect.any(Number), color: '#0040C1' })
    expect(rest.every((point) => typeof point === 'number')).toBe(true)

    await wrapper.setProps({ selection: null })
    expect(barData().every((point) => typeof point === 'number')).toBe(true)
  })

  it('hands the grid the raw group value, and names the bucket whose dimension is unknown', async () => {
    // The endpoint keeps the unknown bucket under a null NAME rather than dropping it, so the chart
    // has to label it something a reader can act on and the chip has to carry the null itself.
    //
    // This used to be written against the SME grouping, whose `"true"`/`"false"`/null encoding the
    // card translated on the way out and converted back on the way in. That grouping is no longer in
    // the menu, so what is left is the general case: the name travels exactly as it came.
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: [
        { name: 'EMEA', value: 100 },
        { name: null, value: 40 },
      ],
    })
    const wrapper = mountCard({ defaultDimension: 'region' })
    await flushPromises()

    await wrapper.findComponent({ name: 'HorizontalBarChart' }).vm.$emit('bar-click', { category: 'EMEA', index: 0 })
    await wrapper.findComponent({ name: 'HorizontalBarChart' }).vm.$emit('bar-click', { category: 'N/A', index: 1 })

    const events = wrapper.emitted('item-selected')!
    expect(events[0][0]).toMatchObject({ dimension: 'region', value: 'EMEA' })
    expect(events[1][0]).toMatchObject({ dimension: 'region', value: null })
  })

  it('shows no "Show more" action for six groups or fewer', async () => {
    const wrapper = mountCard()
    await flushPromises()

    // beforeEach's fixture has only two points.
    expect(wrapper.find('.metrics-card__show-more').exists()).toBe(false)
  })

  it('caps the chart at 6 bars until "Show more" reveals the rest, then grows the chart', async () => {
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: Array.from({ length: 8 }, (_, i) => ({ name: `Group ${i}`, value: i + 1 })),
    })
    const wrapper = mountCard()
    await flushPromises()

    const chart = wrapper.findComponent({ name: 'HorizontalBarChart' })
    expect(chart.attributes('data-categories')?.split(',')).toHaveLength(6)
    expect(chart.attributes('data-height')).toBe('320px')

    const toggle = wrapper.find('.metrics-card__show-more')
    expect(toggle.exists()).toBe(true)
    expect(toggle.text()).toBe('Show More')

    await toggle.trigger('click')

    expect(chart.attributes('data-categories')?.split(',')).toHaveLength(8)
    // Expanded: no fixed height, so HorizontalBarChart falls back to its own row-based auto-size.
    expect(chart.attributes('data-height')).toBeUndefined()
    expect(wrapper.find('.metrics-card__show-more').text()).toBe('Show Less')

    await wrapper.find('.metrics-card__show-more').trigger('click')
    expect(chart.attributes('data-categories')?.split(',')).toHaveLength(6)
  })

  it('collapses back to the first page when the measure or dimension changes', async () => {
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: Array.from({ length: 8 }, (_, i) => ({ name: `Group ${i}`, value: i + 1 })),
    })
    const wrapper = mountCard()
    await flushPromises()

    await wrapper.find('.metrics-card__show-more').trigger('click')
    expect(wrapper.findComponent({ name: 'HorizontalBarChart' }).attributes('data-categories')?.split(','))
      .toHaveLength(8)

    // A measure the card is not already showing — the catalog opens on actualPaymentTerms, and
    // re-selecting the current value is no change at all, so it would collapse nothing.
    // The refetch's loading state unmounts and remounts HorizontalBarChart, so it must be
    // re-queried afterwards rather than reusing the wrapper captured above.
    await wrapper.findAllComponents({ name: 'SearchableDropdown' })[0].vm.$emit('update:modelValue', 'volume')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'HorizontalBarChart' }).attributes('data-categories')?.split(','))
      .toHaveLength(6)
    expect(wrapper.find('.metrics-card__show-more').text()).toBe('Show More')
  })

  it('renders a PieChart, with the same points, for a dimension whose own pairing is a pie', async () => {
    const wrapper = mountCard({ defaultDimension: 'industry' })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'HorizontalBarChart' }).exists()).toBe(false)
    const pie = wrapper.findComponent({ name: 'PieChart' })
    expect(pie.exists()).toBe(true)
    expect(pie.attributes('data-categories')?.split(',')).toEqual(['Pagero Inc', 'Store-Pagero Inc'])
  })

  it('reuses the bar-click narrowing logic for a pie slice click', async () => {
    const wrapper = mountCard({ defaultDimension: 'industry' })
    await flushPromises()

    await wrapper.findComponent({ name: 'PieChart' }).vm.$emit('slice-click', { category: 'Pagero Inc', index: 0 })

    const selected = wrapper.emitted('item-selected')
    expect(selected).toHaveLength(1)
    expect(selected![0][0]).toMatchObject({ dimension: 'industry', value: 'Pagero Inc' })
  })

  it('shows "Show More" for a pie with more than 6 slices', async () => {
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: Array.from({ length: 8 }, (_, i) => ({ name: `Group ${i}`, value: i + 1 })),
    })
    const wrapper = mountCard({ defaultDimension: 'industry' })
    await flushPromises()
    expect(wrapper.find('.metrics-card__show-more').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'PieChart' }).attributes('data-categories')?.split(',')).toHaveLength(6)
  })

  it('renders a GeoChart, points resolved to alpha-2 codes, for the country dimension', async () => {
    // Real "country" dimension shape (fetchOpportunityOverviewChart): bare ISO3 codes.
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: [{ name: 'CHE', value: 90 }, { name: 'IND', value: 90 }],
    })
    const wrapper = mountCard({ defaultDimension: 'country' })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'HorizontalBarChart' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'PieChart' }).exists()).toBe(false)
    const map = wrapper.findComponent({ name: 'GeoChart' })
    expect(map.exists()).toBe(true)
    // What GeoChart actually draws by (alpha-2)...
    expect(map.attributes('data-codes')?.split(',')).toEqual(['CH', 'IN'])
    // ...and what a click on it narrows the list below by (the original alpha-3).
    expect(map.attributes('data-keys')?.split(',')).toEqual(['CHE', 'IND'])
    // No sub-list to page through on a map - every point plots at once.
    expect(wrapper.find('.metrics-card__show-more').exists()).toBe(false)
  })

  it('shows the fullscreen toggle only for the map, not for a bar or pie chart', async () => {
    const bar = mountCard()
    await flushPromises()
    expect(bar.find('.chart-fullscreen-toggle').exists()).toBe(false)

    const pie = mountCard({ defaultDimension: 'industry' })
    await flushPromises()
    expect(pie.find('.chart-fullscreen-toggle').exists()).toBe(false)

    const map = mountCard({ defaultDimension: 'country' })
    await flushPromises()
    expect(map.find('.chart-fullscreen-toggle').exists()).toBe(true)
  })

  it('expands the map into CalculumFullScreen when the toggle is clicked, and collapses it back on close', async () => {
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: [{ name: 'CHE', value: 90 }, { name: 'IND', value: 90 }],
    })
    const wrapper = mountCard({ defaultDimension: 'country' })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'CalculumFullScreen' }).exists()).toBe(false)

    await wrapper.find('.chart-fullscreen-toggle').trigger('click')

    const fullScreen = wrapper.findComponent({ name: 'CalculumFullScreen' })
    expect(fullScreen.exists()).toBe(true)
    // Named after the map's own dimension - the same title the Y axis names a bar chart's grouping
    // with, so the full-screen view still reads as "this same chart, just bigger".
    expect(fullScreen.attributes('data-title')).toBe('country')
    // The same points as the card-sized map, resolved the same way.
    expect(fullScreen.findComponent({ name: 'GeoChart' }).attributes('data-keys')?.split(','))
      .toEqual(['CHE', 'IND'])

    await fullScreen.find('.full-screen-close').trigger('click')
    expect(wrapper.findComponent({ name: 'CalculumFullScreen' }).exists()).toBe(false)
  })

  it('drops a country code with no known alpha-2 mapping instead of sending a guessed one', async () => {
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: [{ name: 'CHE', value: 90 }, { name: 'ZZZ', value: 10 }],
    })
    const wrapper = mountCard({ defaultDimension: 'country' })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'GeoChart' }).attributes('data-keys')?.split(',')).toEqual(['CHE'])
  })

  it('reuses the narrowing logic for a map click, resolved by the row\'s own alpha-3 key', async () => {
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: [{ name: 'CHE', value: 90 }, { name: 'IND', value: 90 }],
    })
    const wrapper = mountCard({ defaultDimension: 'country' })
    await flushPromises()

    await wrapper.findComponent({ name: 'GeoChart' }).vm.$emit('on-event-click', 'IND')

    const selected = wrapper.emitted('item-selected')
    expect(selected).toHaveLength(1)
    expect(selected![0][0]).toMatchObject({ dimension: 'country', value: 'IND' })
  })

  it('clears the selection when the map click emits null (its own click-again-to-deselect toggle)', async () => {
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: [{ name: 'CHE', value: 90 }, { name: 'IND', value: 90 }],
    })
    const wrapper = mountCard({
      defaultDimension: 'country',
      selection: { dimension: 'country', value: 'IND', label: 'Country: IND' },
    })
    await flushPromises()

    await wrapper.findComponent({ name: 'GeoChart' }).vm.$emit('on-event-click', null)

    expect(wrapper.emitted('selection-cleared')).toHaveLength(1)
  })

  it('names the Y axis after the selected dimension', async () => {
    const wrapper = mountCard()
    await flushPromises()

    // The catalog's default dimension is supplier, whose axis reads its own dimension key ("Region"
    // style), not the dropdown's "Per Supplier Entities".
    expect(wrapper.findComponent({ name: 'HorizontalBarChart' }).attributes('data-axis-title'))
      .toBe('Supplier Entity')

    await wrapper.findAllComponents({ name: 'SearchableDropdown' })[1].vm.$emit('update:modelValue', 'region')
    await flushPromises()
    expect(wrapper.findComponent({ name: 'HorizontalBarChart' }).attributes('data-axis-title')).toBe('Region')
  })

  it('names the Y axis after a custom attribute\'s own tenant title', async () => {
    const wrapper = mountCard()
    await flushPromises()

    await wrapper.findAllComponents({ name: 'SearchableDropdown' })[1].vm
      .$emit('update:modelValue', 'customAttribute:7')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'HorizontalBarChart' }).attributes('data-axis-title'))
      .toBe('Region (client)')
  })

  it('appends the truncation note to the axis title rather than replacing it', async () => {
    fetchOpportunityOverviewChart.mockResolvedValue({
      points: Array.from({ length: 125 }, (_, i) => ({ name: `Group ${i}`, value: i + 1 })),
    })
    const wrapper = mountCard()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'HorizontalBarChart' }).attributes('data-axis-title'))
      .toBe('Supplier Entity (Top 100)')
  })

  it('validates a defaultDimension prop against a remembered measure that does not offer it, before ever requesting the pair', async () => {
    // Thread 129661's concern: `defaultDimension` seeds `dimension` directly, bypassing
    // `remembered`, while `measure` still falls back to the remembered store value when no
    // `defaultMeasure` prop is given - so the two can be seeded from different sources and land on
    // a pairing the measure's own menu never offered. The stale-pick guard (the same one that
    // replaces a remembered grouping the menu no longer offers) has to catch this pairing too,
    // and catch it BEFORE the chart ever requests it - not just eventually correct it after a 400.
    fetchOpportunityChartCatalog.mockResolvedValue([
      {
        groupName: 'buyers', index: 1, numericType: 'count', type: 'category', selected: true, translation: null,
        options: [
          { name: 'supplier', defaultType: 'horizontal_bar', chartTypes: [], selected: true, view: 'opportunity', translation: null, ordinal: null, dataType: null },
        ],
      },
      {
        groupName: 'volume', index: 2, numericType: 'money', type: 'category', selected: false, translation: null,
        options: [
          { name: 'supplier', defaultType: 'horizontal_bar', chartTypes: [], selected: true, view: 'opportunity', translation: null, ordinal: null, dataType: null },
          { name: 'industry', defaultType: 'horizontal_bar', chartTypes: [], selected: false, view: 'opportunity', translation: null, ordinal: null, dataType: null },
        ],
      },
    ])
    useOverviewChartSelectionStore().setSelection('0', { measure: 'buyers', dimension: 'supplier' })

    const wrapper = mountCard({ defaultDimension: 'industry' })
    await flushPromises()

    // Corrected to buyers' own offered dimension, never requested with the invalid pairing.
    expect(fetchOpportunityOverviewChart).toHaveBeenCalledTimes(1)
    expect(fetchOpportunityOverviewChart)
      .toHaveBeenCalledWith(VERSION, 'buyers', 'supplier', 1, false, undefined)
    expect(wrapper.findAll('.dropdown')[1].attributes('data-value')).toBe('supplier')
  })

  it('names the X axis after the selected measure, the same label its own dropdown entry shows', async () => {
    const wrapper = mountCard()
    await flushPromises()

    // The catalog's default measure is actualPaymentTerms.
    expect(wrapper.findComponent({ name: 'HorizontalBarChart' }).attributes('data-value-axis-title'))
      .toBe('Avg. Days Paid')

    await wrapper.findAllComponents({ name: 'SearchableDropdown' })[0].vm.$emit('update:modelValue', 'volume')
    await flushPromises()
    expect(wrapper.findComponent({ name: 'HorizontalBarChart' }).attributes('data-value-axis-title'))
      .toBe('Sale Volume')
  })

})
