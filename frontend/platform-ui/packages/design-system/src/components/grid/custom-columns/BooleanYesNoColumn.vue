<template>
  <td class="text-center">
    <div class="boolean-yes-no-cell">
      <span v-if="dataItem[field] === true">{{ $t(trueLabelKey) }}</span>
      <span v-else-if="dataItem[field] === false">{{ $t(falseLabelKey) }}</span>
      <span v-else>-</span>
    </div>
  </td>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "BooleanYesNoColumn",
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
    /** i18n keys of the true/false labels - Yes/No unless a column reads its flag as something else
     * (AB#20905: Regulation Type is `regulatoryTermsEnforced` read as Strict / Recommendation). */
    trueLabelKey: { type: String, default: "global.yes" },
    falseLabelKey: { type: String, default: "global.no" },
  },
});
</script>

<style scoped>
/* AB#20356: no wrapper at all before this - relied purely on the <td>'s own vertical-align:middle,
   which reads as inconsistent once the grid's row height shrank (same finding already fixed on
   TextColumn.vue/MoneyColumn.vue/NoDecimalsColumn.vue). */
.boolean-yes-no-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
