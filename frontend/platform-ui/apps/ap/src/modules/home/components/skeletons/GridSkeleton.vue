<template>
<div class="w-100 widget">
  <div class="k-grid-table-wrap">
    <div class="k-grid-header">
      <table class="k-table k-grid-table k-table-md" role="presentation"><!-- NOSONAR -->
        <tbody>
          <tr class="skeleton-table-row" v-for="index in 12" :key="index">
            <td class="skeleton-table-col" v-for="index in 10" :key="index">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '35px' }"> </Skeleton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent } from 'vue'
import { Skeleton } from '@progress/kendo-vue-indicators';

export default defineComponent({
  name: 'GridSkeleton',
  components: {
    Skeleton
  }
})
</script>
