<template>
  <!--
    The Opportunity section's List tab — AR's twin of AP's Analyze → Lists page: the three-level
    list (sale lines / buying entities / ultimate parents), moved here from the Overview tab by
    product decision (25 Aug). The chart-click narrowing rejoins it when the two tabs are wired
    together; until then the list stands on its own filters.
  -->
  <div class="row mt-3">
    <div class="col-12">
      <OverviewList />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import OverviewList from '../components/OverviewList.vue'

export default defineComponent({
  name: 'OpportunityList',
  components: {
    OverviewList,
  },
})
</script>
