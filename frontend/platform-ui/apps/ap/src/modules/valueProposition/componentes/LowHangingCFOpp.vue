<template>
<div class="row mb-8"><span class="text-gray-700 text-xl cursor-pointer truncate-title font-semibold">{{ objectContent.title || 'Cash Flow Opportunity identified by Calculum' }}</span></div>
<div class="row d-flex-flex-column justify-content-between align-items-center mb-12">
  <div class="col-lg-6">
    <h2 class="main-value font-weight-bold mb-4">{{ objectContent.valueData }}   </h2>
  </div>
  <div class="col-lg-6">
    <div class="cashFlow-card-inside">
      <div class="d-flex flex-column justify-content-center align-items-center text-center">
        <h1 class="font-weight-bold card-text-content mb-0">{{ objectContent.total.value }}</h1>
        <p class="sub-header text-muted font-weight-bold text-md">{{ objectContent.total.name }} </p>
      </div>
    </div>
  </div>
</div>
<div class="row">
  <p class="sub-header text-muted font-weight-bold text-md">{{ objectContent.analysis.title || 'Analysis and Opportunity is based on:' }}    </p>
</div>
<div class="row">
  <div class="col-md-4 metric-item d-flex align-items-center mb-3 mb-md-0"><i class="metric-icon fas fa-2x mr-3" :class="'fa-chart-bar'"></i>
    <div>
      <h4 class="metric-value font-weight-bold mb-0">{{ objectContent.analysis.spendVolume.value }}</h4>
      <p class="metric-label text-muted mb-0">{{ objectContent.analysis.spendVolume.name }}</p>
    </div>
  </div>
  <div class="col-md-4 metric-item d-flex align-items-center mb-3 mb-md-0"><i class="metric-icon fas fa-2x mr-3" :class="'fa-building'"></i>
    <div>
      <h4 class="metric-value font-weight-bold mb-0">{{ objectContent.analysis.numberSuppliers.value }}</h4>
      <p class="metric-label text-muted mb-0">{{ objectContent.analysis.numberSuppliers.name }}</p>
    </div>
  </div>
  <div class="col-md-4 metric-item d-flex align-items-center mb-3 mb-md-0"><i class="metric-icon fas fa-2x mr-3" :class="'fa-city'"></i>
    <div>
      <h4 class="metric-value font-weight-bold mb-0">{{ objectContent.analysis.numberParents.value }}</h4>
      <p class="metric-label text-muted mb-0">{{ objectContent.analysis.numberParents.name }}</p>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'LowHangingCFOpp',
  props: {
    objectContent: {
      type: Object,
      required: true      
    },
  },
});
</script>

<style lang="scss" scoped>
@use "src/resources/assets/styles/variables/colors" as *;

.main-title {
  font-size: 0.9rem;
  color: #6c757d; // Bootstrap's text-muted color
}

.main-value {
  font-size: 2.5rem; // Large font size for the main value
  color: #2b23c3; // Purple color as in the image (approximate)
  line-height: 1.1;
}
.card-text-content {
    color: $color-primary-500;
    font-size: 2.5rem;
}

.sub-header {
  font-size: 0.85rem;
  color: #6c757d;
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
.cashFlow-card-inside{
  background-color: #f9efef;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-items: center;
}
.cashFlow-card-inside{
  background-color: #f9efef;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
}
</style>
