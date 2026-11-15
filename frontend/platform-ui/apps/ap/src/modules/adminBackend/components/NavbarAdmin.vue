<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<header class="header header__app full-container">
  <div class="row">
    <div class="col-md-4 col-lg-4">
      <p>{{ $t('adminBackend.title') }}</p>
    </div>
    <div class="col-md-4 col-lg-5"></div>
    <div class="col-md-4 col-lg-3 text-right">
      <svg class="icon-svg__button-24" @click="onClickLogOut" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M10,13.5v3.7a1,1,0,0,0,.567.9,1.036,1.036,0,0,0,1.058-.121l6.5-5.2a1,1,0,0,0,0-1.561l-6.5-5.2A1,1,0,0,0,10,6.8v3.7H1.5a1.5,1.5,0,0,0,0,3Z"></path>
        <path d="M12,0A12.025,12.025,0,0,0,1.046,7.094a1,1,0,0,0,1.826.819,10,10,0,1,1,.02,8.223,1,1,0,1,0-1.82.828A12,12,0,1,0,12,0Z"></path>
      </svg>
    </div>
  </div>
</header>
</template>

<script lang="ts">
import { reactive, ref, toRefs } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import { CalculumLoading } from '@ada/design-system'
import { getFlowToLogout } from '@/utils/CookieSessionsFns'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import * as Routing from '@/services/router/Routing'

export default {
  name: 'NavbarAdmin',
  components: { CalculumLoading, CalculumModal },
  props:{
    normalLogout: { type: Boolean, required: false, default: true }
  },
  setup ( props: any ) {
    const loading = ref(false)
    interface DataInterface {
      downCount: number,
      showDownCountModal: boolean,
      intervalDownCount: any
    }

    const data = reactive<DataInterface>({
      downCount: 60,
      showDownCountModal: false,
      intervalDownCount: null
    })

    function onClickLogOut () {

      if (!props.normalLogout) {
        loading.value = true        
        Routing.openMain()
        return
      }

        if (loading.value){
          return false
        }else {
          loading.value = true
          getFlowToLogout()
        }
    }


    return {
      ...toRefs(data),
      fontIcons,
      onClickLogOut,
      loading
    }
  }
}
</script>