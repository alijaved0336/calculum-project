<template>
<div class="global-filter-session-banner">
  <div class="banner-content"><span class="banner-icon">⚠</span><span class="banner-text">{{ $t('globalFilters.sessionBanner.message', { filters: filterLabels.join(' · ') }) }}</span>
    <button class="banner-keep-btn" type="button" @click="$emit('keep')">{{ $t('globalFilters.sessionBanner.keepFilter') }}</button>
    <button class="banner-clear-btn" type="button" @click="$emit('clear')">{{ $t('globalFilters.sessionBanner.clearFilter') }}</button>
  </div>
  <button class="banner-close-btn" type="button" @click="$emit('keep')" :aria-label="$t('global.close')">×</button>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { getActiveGlobalFilterLabels } from '@/utils/globalFiltersUtils'
import { StringUtils } from '@/utils'

/**
 * Session-restore banner for a global filter that survived the last session
 * (US-17561 AC-01..AC-04).
 *
 * The store persists `filtersApplied` under `ada-globalFilters`, so a filter set
 * before closing the platform is still active on the next login without the user
 * being told. This banner surfaces it and offers the two documented exits.
 *
 * Visibility is owned by the parent (HomeNavbar) because "once per login" is
 * session state, not filter state; dismissing via × keeps the filter, matching
 * AC-02 where Keep Filter simply dismisses.
 */
export default defineComponent({
  name: 'GlobalFilterSessionBanner',
  emits: ['keep', 'clear'],
  setup() {
    const globalFiltersStore = useGlobalFiltersStore()

    // Field titles follow the filters-applied badges (MainLayoutFilters).
    const filterLabels = computed(() =>
      getActiveGlobalFilterLabels(globalFiltersStore.getFiltersApplied, (field) =>
        StringUtils.transformFromCamelCaseToReadable(field),
      ),
    )

    return { filterLabels }
  },
})
</script>

<style lang="scss" scoped>
.global-filter-session-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: #fff8e1;
  border-bottom: 1px solid #f5c842;
  width: 100%;

  .banner-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .banner-icon {
    color: #f0a800;
    font-size: 16px;
  }

  .banner-keep-btn,
  .banner-clear-btn {
    background: none;
    border: none;
    color: #0066cc;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    font-size: inherit;

    &:hover {
      color: #004499;
    }
  }

  .banner-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    color: #666;
    padding: 0 4px;
    line-height: 1;

    &:hover {
      color: #333;
    }
  }
}
</style>
