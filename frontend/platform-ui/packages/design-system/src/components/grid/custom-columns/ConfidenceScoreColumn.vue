<template>
  <td :class="sticky ? 'text-center font-bold k-grid-content-sticky' : 'text-center font-bold'" :style="'color:' + dataItem.confidenceScoreColor">
    <div class="confidence-score-cell">
      <span>
        {{ dataItem.confidenceScore  ?? '-' }}
      </span>
    </div>
  </td>
</template>

<script lang="ts">
export default {
  name: "ConfidenceScoreColumn",
  props: {
    dataItem: { type: Object, required: true },
    sticky: { type: Boolean, required: false, default: false }
  }
}
</script>
<style lang="scss" scoped>
// AB#20356: no wrapper at all before this - relied purely on the <td>'s own vertical-align:middle.
.confidence-score-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
