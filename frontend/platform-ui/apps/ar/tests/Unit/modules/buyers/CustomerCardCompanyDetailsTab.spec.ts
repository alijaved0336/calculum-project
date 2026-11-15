import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import type { BuyerCompanyDetailsResponse } from '@/api'

const fetchBuyerCompanyDetails = vi.fn()
vi.mock('@/api', () => ({
  fetchBuyerCompanyDetails: (...args: unknown[]) => fetchBuyerCompanyDetails(...args),
}))

// Stubbed, not real: `vue3-google-map`'s underlying Loader also depends on
// import.meta.env.VITE_GOOGLE_MAP_KEY, which is fixed at module-evaluation time and out of a
// single test's control - a stub keeps the map-rendering assertions below deterministic regardless
// of whatever VITE_GOOGLE_MAP_KEY (if any) happens to be set wherever this suite runs.
vi.mock('@ada/design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ada/design-system')>()
  return {
    ...actual,
    LocationMap: { props: ['apiKey', 'latitude', 'longitude'], template: '<div class="location-map-stub" />' },
  }
})

import CustomerCardCompanyDetailsTab from '@/modules/buyers/components/customerCard/CustomerCardCompanyDetailsTab.vue'
import { useContextStore } from '@/stores/context'

const VERSION_UUID = '1653c234-9318-4707-a6c3-33f4b427126c'

function details(overrides: Partial<BuyerCompanyDetailsResponse> = {}): BuyerCompanyDetailsResponse {
  return {
    id: 1518,
    uuid: '01a034b7-3356-7e5a-89d1-295d587d6346',
    role: 'Counterparty',
    resolution: 'Enriched',
    lifecycle: 'Actual',
    companyName: 'Hitachi Rail Sts Sweden Ab',
    description: 'Largest producer and supplier in Scandinavia.',
    externalId: '0210773810',
    typeOfIdNumber: 'Tax ID',
    idNumber: 'SE556386343901',
    bvdIdNumber: 'SE5563863439',
    catalogCompanyId: null,
    legalForm: 'Private',
    foundedYear: 1990,
    employeesCount: 59,
    phoneNumber: '+46 86219500',
    address: 'Solna Strandvag 96',
    city: 'Solna',
    zipCode: '171 54',
    latitude: null,
    longitude: null,
    url: 'www.ansaldo-sts.com',
    countryCode: 'SWE',
    countryName: 'Sweden',
    countryFlagUrl: null,
    regionName: 'Northern Europe',
    supplierCountryCode: 'FRA',
    supplierCountryName: 'France',
    supplierRegionName: 'Western Europe',
    supplierEntities: null,
    relationshipSinceYear: null,
    supplierContinent: 'Europe',
    industryCode: '2382',
    industryName: 'Building Equipment Contractors',
    commodity: 'Contractor',
    sector: '23',
    creditScore: 55,
    creditScoreReferenceId: 46,
    creditRating: 'BBB-',
    ratingDescription: null,
    brandValueReferenceId: null,
    brandLevel: null,
    brandPaymentTermsFactor: null,
    buyerLeverage: 0.0000209,
    supplierLeverage: 0.0145622,
    companySizeId: 6,
    estimatedCompanySize: true,
    salesTeam: 'Victoria B',
    averageDaysToApproveInvoice: 5,
    dateOfLastTermNegotiation: '2015-08-19T00:00:00',
    negotiationStatus: null,
    negotiationStatusCode: null,
    negotiationStatusUpdatedAt: null,
    originalName: 'Hitachi Rail Sts Sweden Ab',
    isMinorityOwned: false,
    isVeteranOwned: false,
    isWomanOwned: false,
    parentId: 1439,
    parentName: 'HITACHI LTD',
    parentUuid: '01a034b7-3296-7f4c-8006-f8767022297b',
    currencyCode: 'EUR',
    confidenceScore: 60.0,
    smeClassificationStatus: 'Complete',
    isSme: false,
    smeSource: 'sweden',
    customAttributes: [
      { ordinal: 1, title: 'Place', dataType: 'text', aggregation: 'list', value: 'Red', supplied: true },
      { ordinal: 2, title: 'Revenue', dataType: 'text', aggregation: 'list', value: '27', supplied: true },
      { ordinal: 3, title: 'Market Issues', dataType: 'text', aggregation: 'list', value: null, supplied: false },
    ],
    ...overrides,
  }
}

const messages = {
  en: {
    arCustomerCard: {
      notFound: 'This buyer could not be found for this sale file version.',
      loadError: 'Could not load the customer card. Try again.',
      notAvailable: '—',
      yesNo: { true: 'Yes', false: 'No' },
      companyDetails: {
        sections: {
          description: 'Description',
          relationship: 'Relationship',
          location: 'Location',
          identification: 'Identification',
          customFieldsValues: 'Custom fields values',
        },
        fields: {
          country: 'Country',
          industry: 'Industry',
          commodity: 'Commodity(ies)',
          ultimateParent: 'Ultimate parent',
          ownership: 'Ownership',
          url: 'URL',
          buyingEntities: 'Buying Entities',
          buyingCountries: 'Buying Country(ies)',
          procurementTeam: 'Procurement Team(s)',
          relationshipSince: 'Relationship Since',
          dateOfLastTermNegotiation: 'Date of Last Term Negotiation',
          address: 'Address',
          phoneNumber: 'Phone Number',
          taxId: 'Tax ID',
          spendFileInternalId: 'Spend File Internal ID',
        },
        tooltips: {
          country: 'The country where the buyer is headquartered.',
          industry: 'The NAICS industry description of which the buyer operates within.',
          commodity: 'The commodities that the buyer purchases from the supplier as provided in the spend data.',
          ultimateParent: 'The ultimate parent company that owns or controls the buyer.',
          ownership: 'The ownership structure of the company (e.g., Public, Private, Government).',
          url: 'The official website domain of the company.',
        },
        noCustomAttributes: 'This buyer has no custom attributes.',
      },
    },
    // SmeDetailBox reads these off the SAME shared design-system locale bundle AP's own
    // SmeDetailBox reads (see that component's own doc for why) - a small slice of the real
    // `home.entityCard.companyDetails.sources.sweden` entry, enough to exercise its rendering.
    home: {
      entityCard: {
        companyDetails: {
          general: {
            smeCardTitle: 'Small and Medium-Sized Enterprise (SME)',
            notSmeCardTitle: 'Not a Small and Medium-Sized Enterprise (NOT-SME)',
            source: 'Source',
          },
          sources: {
            sweden: {
              name: 'Sweden',
              cardDescription: 'This classification case is for Sweden.',
              cardLimits: [
                { label: 'Revenue ', value: '< EUR 50.0m' },
                { label: 'Assets ', value: '< EUR 43.0m' },
                { label: 'Employees ', value: '< 250' },
              ],
              card: '<div>This classification case is for Sweden.</div>',
            },
          },
        },
      },
    },
  },
}

async function mountTab(overrides: Partial<BuyerCompanyDetailsResponse> = {}, props = { versionId: '73', buyerId: '1518' }) {
  // The tab fetches via context.saleFileVersionUuid, not the (unused) versionId prop - see
  // useBuyerCompanyDetails's own doc - so a version has to be active for the happy-path tests
  // below to actually reach fetchBuyerCompanyDetails rather than short-circuiting to not-found.
  useContextStore().setVersion(73, VERSION_UUID)
  fetchBuyerCompanyDetails.mockResolvedValue(details(overrides))
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  const view = mount(CustomerCardCompanyDetailsTab, {
    props,
    global: { plugins: [i18n] },
  })
  await flushPromises()
  return view
}

describe('CustomerCardCompanyDetailsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchBuyerCompanyDetails.mockReset()
  })

  it('fetches the company-details endpoint scoped to the active version uuid and the given buyer id', async () => {
    await mountTab()

    expect(fetchBuyerCompanyDetails).toHaveBeenCalledWith(VERSION_UUID, 1518)
  })

  it('shows the not-found state without calling the API when no version is selected', async () => {
    setActivePinia(createPinia()) // fresh store, no version set
    const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
    const view = mount(CustomerCardCompanyDetailsTab, {
      props: { versionId: '73', buyerId: '1518' },
      global: { plugins: [i18n] },
    })
    await flushPromises()

    expect(fetchBuyerCompanyDetails).not.toHaveBeenCalled()
    expect(view.text()).toContain('This buyer could not be found for this sale file version.')
  })

  it('shows the not-found state for a malformed buyer id, without ever calling the API', async () => {
    const view = await mountTab({}, { versionId: '73', buyerId: 'abc' })

    expect(fetchBuyerCompanyDetails).not.toHaveBeenCalled()
    expect(view.text()).toContain('This buyer could not be found for this sale file version.')
  })

  it('renders the summary strip (country, industry, commodity, ultimate parent, ownership, url)', async () => {
    const view = await mountTab()

    expect(view.text()).toContain('Sweden')
    expect(view.text()).toContain('Building Equipment Contractors')
    expect(view.text()).toContain('Contractor')
    expect(view.text()).toContain('HITACHI LTD')
    expect(view.text()).toContain('Private')
    expect(view.text()).toContain('www.ansaldo-sts.com')
  })

  it('links the url with an https scheme prefixed onto the bare domain the API sends', async () => {
    const view = await mountTab()

    const link = view.find('a[href="https://www.ansaldo-sts.com"]')
    expect(link.exists()).toBe(true)
  })

  it('renders the description', async () => {
    const view = await mountTab()

    expect(view.text()).toContain('Largest producer and supplier in Scandinavia.')
  })

  it('combines address, city, zip and country into one Location line, omitting parts the API left null', async () => {
    const view = await mountTab({ address: 'Solna Strandvag 96', city: 'Solna', zipCode: '171 54', countryName: 'Sweden', countryCode: null })

    expect(view.text()).toContain('Solna Strandvag 96, Solna, 171 54, Sweden')
  })

  it('does not render the map while the backend has not geocoded this buyer (latitude/longitude both null)', async () => {
    const view = await mountTab({ latitude: null, longitude: null })

    expect(view.find('.location-map-stub').exists()).toBe(false)
  })

  it('does not render the map with only one of latitude/longitude present - a single coordinate cannot place a marker', async () => {
    const view = await mountTab({ latitude: 59.36, longitude: null })

    expect(view.find('.location-map-stub').exists()).toBe(false)
  })

  it('renders supplied custom attribute values, skipping any that are not supplied', async () => {
    const view = await mountTab()

    expect(view.text()).toContain('Place')
    expect(view.text()).toContain('Red')
    expect(view.text()).toContain('Revenue')
    expect(view.text()).toContain('27')
    // "Market Issues" (supplied: false, per the fixture) is filtered out entirely rather than
    // shown with a placeholder value.
    expect(view.text()).not.toContain('Market Issues')
  })

  it('shows the empty-custom-attributes message when every attribute is unsupplied, not just when the list itself is empty', async () => {
    const view = await mountTab({
      customAttributes: [
        { ordinal: 1, title: 'Place', dataType: 'text', aggregation: 'list', value: null, supplied: false },
      ],
    })

    expect(view.text()).toContain('This buyer has no custom attributes.')
  })

  it('shows the empty-custom-attributes message when the buyer has none', async () => {
    const view = await mountTab({ customAttributes: [] })

    expect(view.text()).toContain('This buyer has no custom attributes.')
  })

  it('renders "-" for Relationship\'s buying entities/country/relationship-since when the API leaves them null', async () => {
    const view = await mountTab({ supplierEntities: null, supplierRegionName: null, relationshipSinceYear: null })

    const fieldValue = (label: string) =>
      view.findAll('.text-muted').find((el) => el.text() === label)?.element.nextElementSibling?.textContent

    expect(fieldValue('Buying Entities')).toBe('-')
    expect(fieldValue('Buying Country(ies)')).toBe('-')
    expect(fieldValue('Relationship Since')).toBe('-')
  })

  it('renders the real values for Relationship\'s buying entities/country/relationship-since when the API provides them', async () => {
    const view = await mountTab({
      supplierEntities: 'GIP Buyer 1 - United States',
      supplierRegionName: 'United States',
      relationshipSinceYear: '1905',
    })

    const fieldValue = (label: string) =>
      view.findAll('.text-muted').find((el) => el.text() === label)?.element.nextElementSibling?.textContent

    expect(fieldValue('Buying Entities')).toBe('GIP Buyer 1 - United States')
    expect(fieldValue('Buying Country(ies)')).toBe('United States')
    expect(fieldValue('Relationship Since')).toBe('1905')
  })

  it('renders the real sales team as the Procurement Team(s) value', async () => {
    const view = await mountTab({ salesTeam: 'Victoria B' })

    const row = view.findAll('.text-muted').find((label) => label.text() === 'Procurement Team(s)')
    expect(row?.element.nextElementSibling?.textContent).toBe('Victoria B')
  })

  it('renders the real date of last term negotiation on the Relationship card, since the API does carry it', async () => {
    const view = await mountTab({ dateOfLastTermNegotiation: '2015-08-19T00:00:00' })

    const row = view.findAll('.text-muted').find((label) => label.text() === 'Date of Last Term Negotiation')
    expect(row?.element.nextElementSibling?.textContent).toBe('2015-08-19')
  })

  it('renders SmeDetailBox\'s classification-case name and revenue/assets/employees limits for the buyer\'s own smeSource', async () => {
    const view = await mountTab({ smeSource: 'sweden' })

    expect(view.text()).toContain('Sweden')
    expect(view.text()).toContain('Revenue')
    expect(view.text()).toContain('< EUR 50.0m')
    expect(view.text()).toContain('Assets')
    expect(view.text()).toContain('< EUR 43.0m')
    expect(view.text()).toContain('Employees')
    expect(view.text()).toContain('< 250')
  })

  it('renders the Identification card from idNumber/externalId as Tax ID / Spend File Internal ID', async () => {
    const view = await mountTab({ idNumber: 'SE556386343901', externalId: '0210773810' })

    const fieldValue = (label: string) =>
      view.findAll('.text-muted').find((el) => el.text() === label)?.element.nextElementSibling?.textContent

    expect(fieldValue('Tax ID')).toBe('SE556386343901')
    expect(fieldValue('Spend File Internal ID')).toBe('0210773810')
  })

  it('titles the SME card "Not a Small and Medium-Sized Enterprise" when the buyer is not an SME', async () => {
    const view = await mountTab({ isSme: false })

    expect(view.text()).toContain('Not a Small and Medium-Sized Enterprise (NOT-SME)')
  })

  it('titles the SME card "Small and Medium-Sized Enterprise" when the buyer is one', async () => {
    const view = await mountTab({ isSme: true })

    expect(view.text()).toContain('Small and Medium-Sized Enterprise (SME)')
    expect(view.text()).not.toContain('Not a Small and Medium-Sized Enterprise')
  })

  it('reloads when the buyer id prop changes', async () => {
    const view = await mountTab()
    fetchBuyerCompanyDetails.mockResolvedValue(details({ id: 999 }))

    await view.setProps({ buyerId: '999' })
    await flushPromises()

    expect(fetchBuyerCompanyDetails).toHaveBeenCalledWith(VERSION_UUID, 999)
  })
})
