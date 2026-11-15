<template>
<div :style="style" data-testid="loading-component">
  <div v-if="!modal && !fullScreen && !block && !description"><img v-if="fullLogo" :src="fullLogoGif" style="width: 200px; height: auto;"/><img v-else :src="logoGif" style="width: 200px"/></div>
  <div class="loading-modal-overlay" v-if="description">
    <div class="loading-modal-card"><img :src="fullLogo ? fullLogoGif : loadingGIF"/>
      <p>{{ description }}</p>
    </div>
  </div>
  <div class="loading-modal" v-if="modal && !description"><img v-if="fullLogo" :src="fullLogoGif"/><img v-else :src="loadingGIF"/>
    <p v-if="withDescription">{{ $t('global.loading') }}</p>
  </div>
  <div class="loading-full-screen" v-if="fullScreen && !description"><img v-if="fullLogo" :src="fullLogoGif"/><img v-else :src="logoGif"/>
    <p v-if="withDescription">{{ $t('global.loading') }}</p>
  </div>
  <div class="loading-block" v-if="block && !description"><img :src="loadingGIF"/></div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import logoGif from '../assets/logoInfiniteAr.gif'
import fullLogoGif from '../assets/fullLogoInfiniteAr.gif'
import loadingGIF from '../assets/loadingGIFAr.gif'

export default defineComponent({
  name: 'CalculumLoadingAr',
  props: {
    modal:           { type: Boolean, required: false, default: false },
    fullScreen:      { type: Boolean, required: false, default: false },
    withDescription: { type: Boolean, required: false, default: false },
    description:     { type: String,  required: false, default: '' },
    fullLogo:        { type: Boolean, required: false, default: false },
    block:           { type: Boolean, required: false, default: false },
    style:           { type: String,  default: '' }
  },
  setup() {
    return { logoGif, fullLogoGif, loadingGIF }
  }
})
</script>

<style scoped lang="scss">
.loading-modal {
  transition: all ease 0.3s;
  position: fixed;
  top: calc(50% - 100px);
  left: calc(50% - 100px);
  z-index: 100;
  width: 200px;
  height: 200px;

  img {
    width: 100%;
    height: 100%;
  }
}

.loading-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.75);

  .loading-modal-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: #fff;
    padding: 24px 28px;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);

    img {
      width: 120px;
      height: auto;
    }

    p {
      margin: 0;
      max-width: 280px;
      text-align: center;
      color: #2C3645;
      font-size: 14px;
      line-height: 1.45;
    }
  }
}

.loading-block {
  position: absolute;
  width: 150px;
  height: 150px;
  z-index: 97;
  top: calc(50% - 75px);
  left: calc(50% - 75px);

  img {
    width: 100%;
    height: 100%;
    z-index: 2;
    transition: all ease 0.3s;
  }
}

.loading-full-screen {
  transition: all ease 0.3s;
  background: #fff;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 97;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

  img {
    width: 50%;
    height: auto;
  }

  p {
    color: #2C3645;
  }
}
</style>
