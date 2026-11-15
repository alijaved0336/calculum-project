<template>
    <td class="text-capitalize text-center font-weight-bold" :class="dataItem.excluded === 'yes' ? 'green' : 'red'">
      <span>
          {{ dataItem.excluded === 'yes' ? $t('home.overview.yes') : $t('global.no') }}
      </span>
    </td>
</template>

<script lang="ts">

export default {
  props: {
    dataItem: { type: Object, required: true }
  }
}
</script>

<style lang="scss" scoped>
.red {
  color: #f52128;
}

.green {
  color: #38ac74;
}
</style>
