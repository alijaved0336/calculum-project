<template>
<CustomerCardTabSkeleton v-if="loading" :rows="skeletonRows" />

<NoDataAvailable
  v-else-if="notFound"
  :title="t('arCustomerCard.notFound')"
/>

<NoDataAvailable
  v-else-if="loadError"
  :title="t('arCustomerCard.loadError')"
/>

<div v-else-if="details" class="row g-3">
  <div v-for="item in summaryFields" :key="item.label" class="col-6 col-md-4 col-xl-2 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <ContentBoxBody>
        <div class="text-muted  small mb-1 d-flex align-items-center gap-1">
          {{ item.label }}
          <TooltipButton :text="item.tooltip" />
        </div>
        <div class="fw-semibold">
          <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
            <!-- text-truncate has to sit on THIS element, not a `Tooltip`-wrapping ancestor: Tooltip's
                 own render always adds its own wrapping <div> around this slot when it has one, and
                 an ellipsis class one block up from the actual text-holding element does nothing -
                 each block establishes its own text-wrapping context. d-inline-block + mw-100 give it
                 something to actually overflow against, since Tooltip's wrapper is a plain block div
                 with no width of its own. -->
            <a v-if="item.href" :href="item.href" target="_blank" rel="noopener noreferrer" class="d-inline-block text-truncate mw-100" :title="item.value">{{ item.value }}</a>
            <span v-else class="d-inline-block text-truncate mw-100" :title="item.value">{{ item.value }}</span>
          </Tooltip>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <ContentBoxBody>
        <div class="text-muted  small mb-1">{{ t('arCustomerCard.companyDetails.sections.description') }}</div>
        <div>{{ description }}</div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-4 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base">{{ t('arCustomerCard.companyDetails.sections.relationship') }}</span>
      </template>
      <ContentBoxBody>
        <div class="row g-3">
          <div v-for="field in relationshipFields" :key="field.label" class="col-6">
            <div class="text-muted  small mb-1">{{ field.label }}</div>
            <div class="fw-semibold">
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <span :title="field.value">{{ field.value }}</span>
              </Tooltip>
            </div>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-4 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base">{{ smeTitleValue }}</span>
      </template>
      <ContentBoxBody>
        <SmeDetailBox :is-sme="details.isSme" :sme-source="details.smeSource" />
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-4 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base">{{ t('arCustomerCard.companyDetails.sections.location') }}</span>
      </template>
      <ContentBoxBody>
        <!-- Renders only once BOTH latitude and longitude come back non-null (mapCoordinates) - the
             backend does not geocode this buyer's address yet, so today this simply never renders.

             Also gated on GOOGLE_MAP_API_KEY, not a default empty string passed through:
             vue3-google-map's underlying @googlemaps/js-api-loader Loader is a strict page-wide
             singleton that throws ("Loader must not be called again with different options") the
             moment it is ever constructed twice with different options - including once with an
             empty apiKey (no VITE_GOOGLE_MAP_KEY configured) and once with a real one. Never
             mounting LocationMap at all without a real key means that first, key-less construction
             simply never happens, so it can never poison the singleton for every other
             LocationMap on the page afterwards. -->
        <LocationMap
          v-if="GOOGLE_MAP_API_KEY && mapCoordinates"
          class="mb-3"
          :api-key="GOOGLE_MAP_API_KEY"
          :latitude="mapCoordinates.latitude"
          :longitude="mapCoordinates.longitude"
        />
        <div class="row g-3">
          <div v-for="field in locationFields" :key="field.label" class="col-6">
            <div class="text-muted  small mb-1">{{ field.label }}</div>
            <div class="fw-semibold">
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <span :title="field.value">{{ field.value }}</span>
              </Tooltip>
            </div>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-4 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base">{{ t('arCustomerCard.companyDetails.sections.identification') }}</span>
      </template>
      <ContentBoxBody>
        <div class="row g-3">
          <div v-for="field in identificationFields" :key="field.label" class="col-6">
            <div class="text-muted  small mb-1">{{ field.label }}</div>
            <div class="fw-semibold">
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <span :title="field.value">{{ field.value }}</span>
              </Tooltip>
            </div>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-8 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base">{{ t('arCustomerCard.companyDetails.sections.customFieldsValues') }}</span>
      </template>
      <ContentBoxBody>
        <NoDataAvailable
          v-if="customAttributeRows.length === 0"
          :title="t('arCustomerCard.companyDetails.noCustomAttributes')"
        />
        <div v-else class="row g-3">
          <div v-for="row in customAttributeRows" :key="row.key" class="col-3">
            <div class="text-muted  small mb-1">{{ row.label }}</div>
            <div class="fw-semibold">
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <span :title="row.value">{{ row.value }}</span>
              </Tooltip>
            </div>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * CustomerCardView's Company Details tab: one buyer's `BuyerCompanyDetailsResponse` (identity,
 * industry/commodity/ownership summary strip, description, relationship/SME/location and its own
 * identification numbers and custom attributes). Fetched through `useBuyerCompanyDetails` (see
 * that composable's own doc for why it watches the context store's version uuid rather than this
 * tab's own `versionId` prop) - `versionId` stays declared here only so this tab keeps the same
 * `{ versionId, buyerId }` prop shape `CustomerCardView`'s `<component :is>` binds to every tab.
 *
 * Scoped to exactly the fields the reference design shows (2026-09-08): several fields it shows
 * have no `BuyerCompanyDetailsResponse` source yet (Relationship's buying entities/country,
 * procurement team and relationship since; the SME card's revenue/assets/employees thresholds) -
 * those render `BACKEND_MISSING`, a literal, untranslated marker rather than a row this tab
 * quietly drops, so the title stays on screen as a placeholder for the backend work still needed.
 * `role`/`resolution`/`lifecycle`/`bvdIdNumber`/`catalogCompanyId`/`regionName` and the whole
 * company-profile/ratings pair this tab used to render are real, already-available fields with no
 * home in that design - dropped from the UI, not from `BuyerCompanyDetailsResponse` itself.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ContentBox, ContentBoxBody, LocationMap, NoDataAvailable, StringUtils, Tooltip, TooltipButton } from '@ada/design-system'
import type { SaleLineCustomAttributeValue } from '@/api'
import { formatDate } from '@/modules/match/utils/format'
import { useBuyerCompanyDetails } from '../../composables/useBuyerCompanyDetails'
import CustomerCardTabSkeleton, { type CustomerCardSkeletonCard } from './CustomerCardTabSkeleton.vue'
import SmeDetailBox from './SmeDetailBox.vue'

// versionId is unused here - see this component's own doc for why the fetch is scoped by the
// context store's version uuid instead, and why the prop stays declared regardless.
const props = defineProps<{ versionId: string; buyerId: string }>()
const { t } = useI18n({ useScope: 'global' })

const { loading, notFound, loadError, details } = useBuyerCompanyDetails(() => props.buyerId)

/** Mirrors this tab's own grid below (summary strip, description, the three cards row, then
 * identification/custom-fields) so the skeleton reserves the same shape the real content lands
 * into - see `CustomerCardTabSkeleton`'s own doc for why each tab declares its own `rows`. */
const skeletonRows: CustomerCardSkeletonCard[][] = [
  [{ col: 'col-6 col-md-4 col-xl-2', lines: 1, title: false }, { col: 'col-6 col-md-4 col-xl-2', lines: 1, title: false }, { col: 'col-6 col-md-4 col-xl-2', lines: 1, title: false }, { col: 'col-6 col-md-4 col-xl-2', lines: 1, title: false }, { col: 'col-6 col-md-4 col-xl-2', lines: 1, title: false }, { col: 'col-6 col-md-4 col-xl-2', lines: 1, title: false }],
  [{ col: 'col-12', lines: 2, title: false }],
  [{ col: 'col-12 col-xl-4', lines: 4 }, { col: 'col-12 col-xl-4', lines: 4 }, { col: 'col-12 col-xl-4', lines: 4 }],
  [{ col: 'col-12 col-xl-4', lines: 2 }, { col: 'col-12 col-xl-8', lines: 3 }],
]

// LocationMap (design-system) reads no environment of its own - the app that owns the key has to
// supply it.
const GOOGLE_MAP_API_KEY = import.meta.env.VITE_GOOGLE_MAP_KEY ?? ''

/** A field the reference design shows with no `BuyerCompanyDetailsResponse` source yet - a
 * developer-facing placeholder, deliberately left untranslated (see this component's own doc). */
const BACKEND_MISSING = 'backend missing'

const orNotAvailable = (value: string | null | undefined): string =>
  value ?? t('arCustomerCard.notAvailable')

/** A bare domain (no scheme) is what the API sends (e.g. `www.ansaldo-sts.com`) - prefixed here so
 * the summary strip's link actually navigates instead of resolving relative to this app's own URL. */
const withScheme = (url: string): string => (/^https?:\/\//.test(url) ? url : `https://${url}`)

/**
 * The SME card's own header - moved here from `SmeDetailBox` so it renders as this card's
 * `ContentBox` title rather than inside the card body. Reads the SAME shared
 * `home.entityCard.companyDetails.general.*` keys AP's own `EntityCardCompanyDetails.vue`
 * `smeTitleValue` computed reads (see `SmeDetailBox`'s own doc for why reusing AP's namespace
 * beats duplicating it under `arCustomerCard.*`).
 */
const smeTitleValue = computed(() =>
  details.value?.isSme
    ? t('home.entityCard.companyDetails.general.smeCardTitle')
    : t('home.entityCard.companyDetails.general.notSmeCardTitle'),
)

const summaryFields = computed(() => {
  if (!details.value) {
    return []
  }
  const c = details.value
  return [
    { label: t('arCustomerCard.companyDetails.fields.country'), value: orNotAvailable(c.countryName ?? c.countryCode), href: null, tooltip: t('arCustomerCard.companyDetails.tooltips.country') },
    { label: t('arCustomerCard.companyDetails.fields.industry'), value: orNotAvailable(c.industryName ?? c.industryCode), href: null, tooltip: t('arCustomerCard.companyDetails.tooltips.industry') },
    { label: t('arCustomerCard.companyDetails.fields.commodity'), value: orNotAvailable(c.commodity), href: null, tooltip: t('arCustomerCard.companyDetails.tooltips.commodity') },
    { label: t('arCustomerCard.companyDetails.fields.ultimateParent'), value: orNotAvailable(c.parentName), href: null, tooltip: t('arCustomerCard.companyDetails.tooltips.ultimateParent') },
    { label: t('arCustomerCard.companyDetails.fields.ownership'), value: orNotAvailable(c.legalForm), href: null, tooltip: t('arCustomerCard.companyDetails.tooltips.ownership') },
    { label: t('arCustomerCard.companyDetails.fields.url'), value: orNotAvailable(c.url), href: c.url ? withScheme(c.url) : null, tooltip: t('arCustomerCard.companyDetails.tooltips.url') },
  ]
})

const description = computed(() => orNotAvailable(details.value?.description))

const relationshipFields = computed(() => {
  if (!details.value) {
    return []
  }
  const c = details.value
  return [
    { label: t('arCustomerCard.companyDetails.fields.buyingEntities'), value: StringUtils.isNullUndefinedOrEmpty(c.supplierEntities) ? '-' : c.supplierEntities },
    { label: t('arCustomerCard.companyDetails.fields.buyingCountries'), value: StringUtils.isNullUndefinedOrEmpty(c.supplierRegionName) ? '-' : c.supplierRegionName },
    { label: t('arCustomerCard.companyDetails.fields.procurementTeam'), value: orNotAvailable(c.salesTeam) },
    { label: t('arCustomerCard.companyDetails.fields.relationshipSince'), value: StringUtils.isNullUndefinedOrEmpty(c.relationshipSinceYear) ? '-' : c.relationshipSinceYear },
    { label: t('arCustomerCard.companyDetails.fields.dateOfLastTermNegotiation'), value: formatDate(c.dateOfLastTermNegotiation) },
  ]
})

/** Street, city, zip and country joined into one line (AP's own `fullAddressDisplay` on
 * `EntityCardCompanyDetails.vue` is the precedent) - a part missing from the response is simply
 * omitted rather than rendered as "—" mid-string. */
const fullAddress = computed(() => {
  if (!details.value) {
    return t('arCustomerCard.notAvailable')
  }
  const c = details.value
  const parts = [c.address, c.city, c.zipCode, c.countryName ?? c.countryCode].filter(
    (part): part is string => Boolean(part),
  )
  return parts.length > 0 ? parts.join(', ') : t('arCustomerCard.notAvailable')
})

const locationFields = computed(() => {
  if (!details.value) {
    return []
  }
  const c = details.value
  return [
    { label: t('arCustomerCard.companyDetails.fields.address'), value: fullAddress.value },
    { label: t('arCustomerCard.companyDetails.fields.phoneNumber'), value: orNotAvailable(c.phoneNumber) },
  ]
})

/** Both, or neither - a single known coordinate cannot place a marker. Null until the backend
 * geocodes this buyer's address (see `BuyerCompanyDetailsResponse.latitude`/`longitude`'s own
 * doc). */
const mapCoordinates = computed(() => {
  const lat = details.value?.latitude
  const lng = details.value?.longitude
  if (lat == null || lng == null) {
    return null
  }
  return { latitude: lat, longitude: lng }
})

const identificationFields = computed(() => {
  if (!details.value) {
    return []
  }
  const c = details.value
  return [
    { label: t('arCustomerCard.companyDetails.fields.taxId'), value: orNotAvailable(c.idNumber) },
    { label: t('arCustomerCard.companyDetails.fields.spendFileInternalId'), value: orNotAvailable(c.externalId) },
  ]
})

interface CompanyDetailsFieldRow {
  key: string
  label: string
  value: string
}

/**
 * Only the buyer's own supplied attributes (`supplied: true`) render here - an unsupplied one has
 * no value for this buyer at all, so listing it alongside the real ones would read as data rather
 * than as the declared-but-empty schema slot it actually is. In `customAttributes`' own
 * declaration order (UC-MOD-08) otherwise, same as `SaleLineDetailView`'s
 * `deriveCustomAttributeRows` - not re-sorted here either.
 */
const customAttributeRows = computed<CompanyDetailsFieldRow[]>(() => {
  if (!details.value) {
    return []
  }
  return details.value.customAttributes
    .filter((attribute) => attribute.supplied)
    .map((attribute) => ({
      key: String(attribute.ordinal),
      label: attribute.title,
      value: formatCustomAttributeValue(attribute),
    }))
})

function formatCustomAttributeValue(attribute: SaleLineCustomAttributeValue): string {
  if (attribute.value === null || attribute.value === undefined) {
    return t('arCustomerCard.notAvailable')
  }
  if (typeof attribute.value === 'object') {
    return JSON.stringify(attribute.value)
  }
  return String(attribute.value)
}
</script>
