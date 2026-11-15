<!--
  ButtonColumn variant: the Receivables grid's Delete (AB#20871).
 -->
<template>
<td>
  <div class="col-12 text-center" :title="$t('adminBackend.adminUploadData.receivablesDelete.hint')">
    <button class="btn-text text-gray-900" @click="$emit('click', { action: 'delete', dataItem })">{{ $t('global.delete') }}</button>
  </div>
</td>
</template>

<script lang='ts'>
import { defineComponent } from 'vue'

/**
 * Offered in every status, a parse or a calculation in flight included: AR lets the delete win over
 * the run, so a version stuck in a running status can still be removed.
 */
export default defineComponent({
  name: 'DeleteSaleFileVersionColumn',
  props: {
    dataItem: { type: Object, required: true }
  },
  emits: ['click']
})
</script>
<style lang="scss" scoped>
button:hover {
  text-underline-position: under;
  text-decoration: underline;
}
</style>
