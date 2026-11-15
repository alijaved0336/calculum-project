<template>
<span class="text-gray-700 text-xl cursor-pointer truncate-title font-semibold mb-5">{{ objectContent.title || 'Cash Flow Opportunity identified' }}</span>
<h1 class="main-value font-weight-bold mb-3">{{ objectContent.valueData }}    </h1>
<p class="sub-header text-muted mb-1">{{ objectContent.analysis.title || 'Analysis and Opportunity is based on:' }}    </p>
<div class="row metrics-container">
  <div class="col-md-4 metric-item d-flex align-items-center mb-3 mb-md-0">
    <BarChartIcon class="icon-metric-vp-less mr-2"></BarChartIcon>
    <div>
      <h4 class="metric-value font-weight-bold mb-0">{{ objectContent.analysis.spendVolume.value }}</h4>
      <p class="metric-label text-muted mb-0">{{ objectContent.analysis.spendVolume.name }}</p>
    </div>
  </div>
  <div class="col-md-4 metric-item d-flex align-items-center mb-3 mb-md-0">
    <SingleBuildingIcon class="icon-metric-vp mr-2"></SingleBuildingIcon>
    <div>
      <h4 class="metric-value font-weight-bold mb-0">{{ objectContent.analysis.numberSuppliers.value }}</h4>
      <p class="metric-label text-muted mb-0">{{ objectContent.analysis.numberSuppliers.name }}</p>
    </div>
  </div>
  <div class="col-md-4 metric-item d-flex align-items-center mb-3 mb-md-0">
    <MultipleBuildingIcon class="icon-metric-vp mr-2"></MultipleBuildingIcon>
    <div>
      <h4 class="metric-value font-weight-bold mb-0">{{ objectContent.analysis.numberParents.value }}</h4>
      <p class="metric-label text-muted mb-0">{{ objectContent.analysis.numberParents.name }}</p>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MultipleBuildingIcon from '@/modules/components/icons/MultipleBuildingIcon.vue'
import SingleBuildingIcon from '@/modules/components/icons/SingleBuildingIcon.vue'
import BarChartIcon from '@/modules/components/icons/BarChartIcon.vue'



export default defineComponent({
  name: 'CashFlowOpportunity',
  components: {
    SingleBuildingIcon,
    MultipleBuildingIcon,
    BarChartIcon
  },
  props: {
    objectContent: {
      type: Object,
      required: true      
    },
  },
});
</script>

<style scoped lang="scss">

.icon-metric-vp-less {
  width: 25px;
  height: 25px;
}

.icon-metric-vp {
  width: 30px;
  height: 30px;
}


.main-title {
  font-size: 0.9rem;
  color: #6c757d; // Bootstrap's text-muted color
}

.main-value {
  font-size: 2.5rem; // Large font size for the main value
  color: #8A2BE2; // Purple color as in the image (approximate)
  line-height: 1.5;
}

.sub-header {
  font-size: 0.85rem;
  color: #6c757d;
}

.metrics-container {
  margin-top: 1.5rem;
}

.metric-item {
  .metric-icon {
    color: #495057; // Darker gray for icons
    width: 30px; // Ensure icons align well
    text-align: center;
  }
  .metric-value {
    font-size: 1.5rem;
    color: #343a40; // Bootstrap's default dark text color
  }
  .metric-label {
    font-size: 0.8rem;
    color: #6c757d;
  }
}
</style>