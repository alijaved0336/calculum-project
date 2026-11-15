<template>
<div class="card shadow-none" :class="loading ? 'bg-blur' : ''">
  <div class="card-body d-flex flex-column justify-content-between">
    <div class="row">
      <div class="col">
        <h5 class="text-base text-capitalize font-bold">{{ title }}
          <CalculumTooltipIcon class="ml-2" :infoText="tooltipText" :advancedTooltipClass="true" :uniqueIdentifier="uniqueIdentifier" :keyPopOver="keyPopOver"></CalculumTooltipIcon>
        </h5>
      </div>
    </div>
    <div class="row my-auto mx-0 bg-gray-50 border-gray-100 rounded-xl p-1 custom-h-min">
      <div class="col-6 d-flex flex-column justify-content-center align-items-center rounded-lg bg-white border-gray-100">
        <div class="d-flex align-items-center gap-1 mb-3"><span class="text-center">{{ metricOne }}</span><i class="fa-solid fa-pencil text-sm cursor-pointer" v-if="showEditOptionMetricOne" :id="pencilIdMetricOne" @click.stop="$emit('openEditMetricOne')"></i></div><span class="text-3xl font-bold">{{ metricOneValue }}</span>
      </div>
      <div class="col-6 d-flex flex-column justify-content-center align-items-center">
        <div class="d-flex align-items-center gap-1 mb-3"><span class="text-center">{{ metricTwo }}</span><i class="fa-solid fa-pencil text-sm cursor-pointer" v-if="showEditOptionMetricTwo" :id="pencilIdMetricTwo" @click.stop="$emit('openEditMetricTwo')"></i></div><span class="text-3xl font-bold">
          {{ metricTwoValue && metricTwoValue !== 'N/A'
          ? metricTwoValue : $t('global.notAvailable') }}</span>
      </div>
    </div>
  </div>
</div>
</template>
  
<script lang='ts'>
import { defineComponent } from 'vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'

export default defineComponent({
  name: 'EntityCardMetrics',
  components: {
    CalculumTooltipIcon
  },
  // 
  // ** Props **
  // 
  // cardName: e.g. "companyCreditRating"
  // gradeLevelText: e.g. "Medium"
  // letterGrade: e.g. "BB+"
  // loading: e.g. false
  // title: e.g. "Credit Rating"
  // tooltipText: e.g. "Credit Rating Tooltip"
  // metricOne: e.g. "DSO - Parent (days)"
  // metricOneValue: e.g. "67"
  // metricTwo: e.g. "Revenue Growth"
  // metricTwoValue: e.g. "5.67 %"
  // 
  props: {
    loading: { type: Boolean, required: true },
    metricOne: { type: String, required: true },
    metricOneValue: { type: String, required: true },
    metricTwo: { type: String, required: true },
    metricTwoValue: { type: String, required: true },
    title: { type: String, required: true },
    tooltipText: { type: String, required: false, default: '' },
    uniqueIdentifier : { type: String, required: false, default: '' },
    keyPopOver: { type: String, required: false, default: '' },
    showEditOptionMetricOne: { type: Boolean, required: false, default: false },
    pencilIdMetricOne: { type: String, required: false, default: '' },
    showEditOptionMetricTwo: { type: Boolean, required: false, default: false },
    pencilIdMetricTwo: { type: String, required: false, default: '' },
  },
  emits: ['openEditMetricOne', 'openEditMetricTwo'],
})
</script>
<style lang="scss" scoped>
.custom-h-min {
  min-height: 130px;
}
</style>