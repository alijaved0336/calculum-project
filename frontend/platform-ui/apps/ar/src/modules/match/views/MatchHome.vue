<template>
<CalculumLayout :containerClass="'match-sections'" :containerId="'match-header-menu'">
  <template v-slot:slotTop>
    <div class="row">
      <div class="col-12 d-flex align-items-center justify-content-between">
        <CustomTabs
          v-model="currentTab"
          appearance="segmented"
          :contained="true"
          :items="tabs"
        />

        <div v-if="currentTab === 'MatchView' && !isMatchEmpty" class="sort-by-dropdown">
          <SearchableDropdown
            v-model="sortBy"
            :items="sortByOptions"
            :placeholder="t('arMatch.sortBy.placeholder')"
            :show-clear-option="false"
            :show-search="false"
          />
        </div>
      </div>
    </div>
  </template>

  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row">
        <div class="col">
          <KeepAlive>
            <component :is="currentTab" :sort-by="sortBy" @empty-change="isMatchEmpty = $event" />
          </KeepAlive>
        </div>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalculumLayout, CustomTabs, SearchableDropdown } from '@ada/design-system'
import type { TabItem } from '@ada/design-system'
import MatchView from './MatchView.vue'
import ListMatch from '../components/ListMatch.vue'

export default defineComponent({
  name: 'MatchHome',
  components: {
    CalculumLayout,
    CustomTabs,
    SearchableDropdown,
    MatchView,
    ListMatch,
  },
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    const currentTab = ref('MatchView')

    const tabs = computed<TabItem[]>(() => [
      { id: 'MatchView', label: t('home.analyze.analyzeProgramOverview.overviewButton') },
      { id: 'ListMatch', label: t('home.analyze.analyzeProgramOverview.listButton') },
    ])

    const sortBy = ref('saleVolume')
    const sortByOptions = computed(() => [
      { value: 'numberOfCustomers', label: t('arMatch.sortBy.numberOfCustomers') },
      { value: 'numberOfInvoiceLines', label: t('arMatch.sortBy.numberOfSaleLines') },
      { value: 'saleVolume', label: t('arMatch.sortBy.saleVolume') },
    ])

    // MatchView starts with no data loaded yet, so the dropdown stays hidden until it
    // emits a real answer - avoids a flash of the metric selector before there's anything to sort.
    const isMatchEmpty = ref(true)

    return {
      t,
      currentTab,
      tabs,
      sortBy,
      sortByOptions,
      isMatchEmpty,
    }
  },
})
</script>

<style scoped>
.sort-by-dropdown {
  width: 20%;
}
</style>
