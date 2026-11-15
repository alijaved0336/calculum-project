<template>
<div class="d-flex align-items-center gap-2 flex-wrap">
  <div class="customer-card-header-logo">
    <img
      v-if="showLogoImage"
      class="customer-card-header-logo__image"
      :src="card.logoUrl ?? undefined"
      :alt="card.name ?? undefined"
      loading="lazy"
      @error="onLogoError"
    />
    <span v-else class="customer-card-header-logo__fallback" aria-hidden="true">{{ firstLetter }}</span>
  </div>
  <div class="d-flex flex-column">
    <div class="d-flex align-items-center gap-2">
      <span class="mb-0 text-2xl font-medium text-gray-700">{{ card.name ?? t('arCustomerCard.notAvailable') }}</span>
      <span class="badge text-bg-light">
        {{ t(`arMatch.roles.${roleLabelKey(card.role)}`, card.role) }}
      </span>
    </div>
    <div class="d-flex align-items-center">
      <span class="mb-0 text-xs font-normal text-gray-500 me-2">{{ card.originalName }}</span>
      <img
        v-if="showCountryFlag"
        class="ar-country-flag"
        :src="card.countryFlagUrl ?? undefined"
        :alt="card.country ?? undefined"
        :title="card.country ?? undefined"
        loading="lazy"
        @error="onCountryFlagError"
      />
      <span v-if="card.country" class="mb-0 ms-2 text-xs font-bold text-gray-700">{{ card.country }}</span>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * Fed by the caller's own roster row when there is one, otherwise by `CustomerCardView`'s Company
 * Details fallback (UC-UI-26 FR3). Not any tab's own `fetchCustomerCard` call - each tab used to
 * render its own copy of this off its own fetch, which meant the header waited on whichever tab
 * happened to be active. Rendered once, in `CustomerCardView.vue` itself, directly above the tab bar.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CustomerCardHeaderIdentity } from '@/stores/customerCardModal'
import { roleLabelKey } from '@/modules/match/utils/partyRole'

const props = defineProps<{ card: CustomerCardHeaderIdentity }>()
const { t } = useI18n({ useScope: 'global' })

/** Same logo/first-letter-fallback pattern `EntityLogoColumn.vue` (design-system grid column) uses:
 * a logo that 404s falls back to the initial rather than showing a broken-image icon, and resets
 * back to "try again" the moment a fresher `logoUrl` comes in (a different buyer's header,
 * most likely - see the countryFlagUrl watcher below for why that matters here). */
const brokenLogo = ref(false)
watch(
  () => props.card.logoUrl,
  () => {
    brokenLogo.value = false
  },
)
const showLogoImage = computed(() => Boolean(props.card.logoUrl) && !brokenLogo.value)
function onLogoError(): void {
  brokenLogo.value = true
}
const firstLetter = computed(() => props.card.name?.charAt(0).toUpperCase() ?? '-')

/** Same showFlag/onFlagError pattern `@ada/design-system`'s own `SupplierCard` uses for its flag
 * image (`supplier-card/Index.vue`) - a flag that 404s hides itself rather than showing a
 * broken-image icon, and resets back to "try again" the moment a fresher `countryFlagUrl` comes in
 * (a different buyer's header, most likely - this component is a singleton mounted once above the
 * tab bar, reused across whichever buyer's Customer Card is currently open). */
const brokenCountryFlag = ref(false)
watch(
  () => props.card.countryFlagUrl,
  () => {
    brokenCountryFlag.value = false
  },
)
const showCountryFlag = computed(() => Boolean(props.card.countryFlagUrl) && !brokenCountryFlag.value)
function onCountryFlagError(): void {
  brokenCountryFlag.value = true
}
</script>

<style scoped>
/* Same shape/fallback look as @ada/design-system's own SupplierCard logo (supplier-card/Index.vue's
   .supplier-card__logo / __logo-image / __logo-fallback) - a bordered, rounded-square avatar rather
   than a circle, sized up for a header rather than a card. */
.customer-card-header-logo {
  display: flex;
  flex: 0 0 auto;
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  border: 1px solid var(--border-color-default);
  border-radius: var(--border-radius-2);
  background: var(--bg-surface);
  box-sizing: border-box;
}

.customer-card-header-logo__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.customer-card-header-logo__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--bg-surface-subtle-1);
  color: var(--color-text-1);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
}

.text-2xl {
  line-height: unset;
}

</style>
