<template>
<CalculumLayout :containerClass="'opportunity-sections'" :containerId="'opportunity-header-menu'">
  <template v-slot:slotTop>
    <div class="row">
      <div class="col-12 d-flex align-items-center">
        <!-- MatchHome's arrangement: the section's tabs live in the layout's top slot. -->
        <CustomTabs
          v-model="currentTab"
          appearance="segmented"
          :contained="true"
          :items="tabs"
        />
      </div>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row">
        <div class="col">
          <KeepAlive>
            <component :is="currentTab" />
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
import { CalculumLayout, CustomTabs } from '@ada/design-system'
import type { TabItem } from '@ada/design-system'
import Overview from './OpportunityOverview.vue'
import OpportunityList from './OpportunityList.vue'
import NineBoxOverview from './NineBoxOverview.vue'
import Waterfall from './Waterfall.vue'

export default defineComponent({
  name: 'OpportunityHome',
  components: {
    CalculumLayout,
    CustomTabs,
    Overview,
    OpportunityList,
    NineBoxOverview,
    Waterfall,
  },
  setup() {
    const { t } = useI18n({ useScope: 'global' })

    // Tab ids are the child components' registered names, which is what `component :is` resolves —
    // the same contract MatchHome keeps.
    const currentTab = ref('Overview')

    // Same order as AP's own HomeOpportunity.vue tab strip (Overview, Nine Boxes/Buyer
    // Prioritization, Waterfall, then List last) - AR previously had List right after Overview.
    const tabs = computed<TabItem[]>(() => [
      { id: 'Overview', label: t('arOpportunity.tabs.overview') },
      { id: 'NineBoxOverview', label: t('arOpportunity.tabs.nineBox') },
      { id: 'Waterfall', label: t('arOpportunity.tabs.waterfall') },
      { id: 'OpportunityList', label: t('arOpportunity.tabs.list') },
    ])

    return {
      currentTab,
      tabs,
    }
  },
})
</script>
