<template>
    <td>
        <div class="d-flex justify-content-center">
          <input
            type="checkbox"
            class="k-checkbox k-checkbox-md k-rounded-md"
            :checked="dataItem.results.reject"
            @click="$emit('selectRejectRow', dataItem)"
          />
        </div>
    </td>
</template>

<script lang="ts">

export default {
  props: {
    dataItem: { type: Object, required: true }
  },
  emits: ['selectRejectRow']
}
</script>

<style lang="scss" scoped>

</style>
