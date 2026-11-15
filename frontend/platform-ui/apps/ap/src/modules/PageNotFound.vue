<template>
  <div class="page-not-found w-100 h-100 mt-5">
    <div class="card">
      <div class="card-body text-center">
        <img
          :src="images.logoGif"
          alt="Calculum"
          style="width: 300px; height: auto;"
        >

        <h1>{{ $t('pageNotFound.errorNumber') }}</h1>

        <h2 class="text-capitalize">
          {{ $t('pageNotFound.pageNotFound') }}
        </h2>

        <p>{{ $t('pageNotFound.description') }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { images } from '@/resources/assets/assets'

export default {
  name: 'PageNotFound',
  setup() {
    return {
      images
    }
  }
}
</script>

<style scoped lang="scss">
.page-not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
</style>
