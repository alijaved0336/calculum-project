<template>
  <router-view />
  <BackgroundMultiProcess />
</template>

<script lang="ts">
import '@/resources/assets/styles/_libs.scss'
import '@/resources/assets/styles/_app.scss'
import BackgroundMultiProcess from '@/modules/components/BackgroundMultiProcess.vue'

export default {
  name: 'App',
  components: {
    BackgroundMultiProcess,
  }
}
</script>
