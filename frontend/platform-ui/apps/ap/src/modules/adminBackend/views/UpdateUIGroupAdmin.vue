<template>
<div class="page-content-overflow2">
  <section class="page-content-top">
    <h3>Update UI Group</h3>
  </section>
  <section class="page-content">
    <div id="data-fullscreen">
      <h3 class="mb-5">{{ `${$t('adminBackend.uiGroupsAdmin.h1')} - test` }}</h3>
      <CalculumLoading v-if="loadingGroups" :modal="true"></CalculumLoading>
      <div class="row mb-5">
        <div class="col-xl-4 col-lg-6 col-md-6">
          <div class="col-12" style="max-width: 300px">
            <div class="h5 mb-3">{{ $t('adminBackend.updatUIGroupAdmin.mainLogo') }}</div>
            <div class="text-center bg-light pt-3"><img class="img image-style" v-if="showMainLogo !== null" :src="showMainLogo" alt="Logo" style="width:100px; height: auto;"/><img class="img-fluid image-style" v-else :src="images.emptyCompanyLogo" alt="Logo" style="width:100px; height: auto;"/>
              <input class="form-control required" id="main-logo-clearbit" type="file" accept=".jpg,.png" style="display: none" name="main-logo-clearbit" @change="mainLogo = $event.target.files[0]"/>
              <div class="my-1"><a class="btn btn-simple btn-icon link link--icon font-md mx-auto" @click="onClickModifyLogo('main-logo-clearbit')"><i class="fa-solid fa-arrows-rotate text-base mr-2"></i><span>{{ $t('home.homeCompanyInfo.logoUpdate') }}</span></a></div>
              <div class="label font-md">{{ $t('home.homeCompanyInfo.logoSize', { size: maxImageMb }) }}</div>
            </div>
          </div>
        </div>
        <div class="col-xl-8 col-lg-6 col-md-6">
          <div class="col-12" style="max-width: 300px">
            <div class="h5 mb-3">{{ $t('adminBackend.updatUIGroupAdmin.loginImage') }}</div>
            <div class="text-center bg-light pt-3"><img class="img image-style" v-if="showLoginLogo !== null" :src="showLoginLogo" alt="Logo" style="width:100px; height: auto;"/><img class="img-fluid image-style" v-else :src="images.emptyCompanyLogo" alt="Logo" style="width:100px; height: auto;"/>
              <input class="form-control required" id="login-logo-clearbit" type="file" accept=".jpg,.png" style="display: none" name="login-logo-clearbit" @change="loginLogo = $event.target.files[0]"/>
              <div class="my-1"><a class="btn btn-simple btn-icon link link--icon font-md mx-auto" @click="onClickModifyLogo('login-logo-clearbit')"><i class="fa-solid fa-arrows-rotate text-base mr-2"></i><span>{{ $t('home.homeCompanyInfo.logoUpdate') }}</span></a></div>
              <div class="label font-md">{{ $t('home.homeCompanyInfo.logoSize', { size: maxImageMb }) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="row mb-5">
        <div class="col-12">
          <div class="col-xl-5 col-lg-8 col-md-12">
            <div class="h5 mb-3">{{ $t('adminBackend.updatUIGroupAdmin.disclaimer') }}</div>
            <div class="p-2 bg-light">
              <textarea class="p-2 font-md mx-auto m-0 custom-textarea" v-model="disclaimerTXT"></textarea>
            </div>
          </div>
        </div>
      </div>
      <div class="row mb-5">
        <div class="col-12">
          <div class="col-xl-6 col-lg-9 col-md-12">
            <div class="h5 mb-3">{{ $t('adminBackend.updatUIGroupAdmin.colours') }}</div>
            <div class="d-flex flex-wrap" style="gap: 1rem">
              <div class="col-2 p-2 bg-light" v-for="color, index in colors" :key="index">
                <input class="color-input" type="color" v-model="color.color" style="cursor: pointer"/>
                <div class="label font-md" style="border-bottom: 1px solid #c4c4c4">{{color.color}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <div class="col-xl-5 col-lg-8 col-md-12">
            <div class="h5 mb-">{{ $t('adminBackend.updatUIGroupAdmin.url') }}</div>
            <div class="p-2 bg-light">
              <textarea class="p-2 font-md mx-auto m-0 custom-textarea" v-model="url"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { reactive, toRefs, computed } from 'vue'
import { images } from '@/resources/assets/assets'
import { CalculumLoading } from '@ada/design-system'
import { MAX_IMAGE_MB } from '@/utils/uploadLimits'

export default {
  name: 'UpdateUIGroupAdmin',
  components: {
    CalculumLoading
  },
  setup() {
    interface ComponentData {
      loadingGroups: boolean,
      mainLogo: any,
      loginLogo: any,
      colors: Array<any>,
      disclaimerTXT: string,
      url: string
    }

    const data = reactive<ComponentData>({
      loadingGroups: false,
      mainLogo: {},
      loginLogo: {},
      colors: [
        { color: '#ffffff' },
        { color: '#333333' },
        { color: '#ffffff' },
        { color: '#ffffff' }
      ],
      disclaimerTXT: '',
      url: ''
    })

    const showMainLogo = computed(() => {
      if (data.mainLogo !== null) {
        return URL.createObjectURL(data.mainLogo)
      } else {
        return null
      }
    })

    const showLoginLogo = computed(() => {
      if (data.loginLogo !== null) {
        return URL.createObjectURL(data.loginLogo)
      } else {
        return null
      }
    })

    const onClickModifyLogo = (elementId: string) => {
      const fileDOM: any | null = document.getElementById(elementId)
      if (fileDOM !== null) {
        fileDOM.click()
      }
    }

    return {
      ...toRefs(data),
      showMainLogo,
      showLoginLogo,
      images,
      onClickModifyLogo,
      maxImageMb: MAX_IMAGE_MB
    }
  }
}
</script>

<style lang="scss" scoped>
input[type="color"] {
  -webkit-appearance: none;
  appearance: none;
  border: none;
  width: 100%;
  height: 5rem;
  border-radius: 5px;
}
input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}
input[type="color"]::-webkit-color-swatch,
.custom-textarea {
  border: 1px solid #c4c4c4;
  border-radius: 5px;
}
textarea {
  width: 100%;
  height: 100%;
  box-shadow: 0px 0px 8px 0px rgba(34, 60, 80, 0.2);
  resize : none;
  overflow: hidden;
  position: relative;
  top: 3px;
}
</style>
