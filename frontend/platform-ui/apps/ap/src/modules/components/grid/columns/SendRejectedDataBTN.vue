<template>
  <button @click="sendRejectedData" class="btn btn-primary font-md" :size="'small'" :fill-mode="null" :rounded="null" :shape="null">{{ $t('home.overview.sendRejectedData') }}</button>
</template>

<script lang="ts">
export default {
  props: {
    rejectedData: { type: Array, required: true }
  },
  setup () {
    function sendRejectedData () {
      //? -: Need to connectk end

    }
    return {
      sendRejectedData
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
