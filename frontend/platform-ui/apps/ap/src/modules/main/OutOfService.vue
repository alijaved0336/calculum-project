<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<div class="container-fluid bg-outofservice">
  <div class="row custom-row">
    <div class="col-7 d-flex flex-column"><span class="mb-3 title">{{ $t('global.outOfService.title') }}</span><span class="mb-3 text">{{ $t('global.outOfService.body') }}</span><span class="mb-3 text">{{ $t('global.outOfService.indications') }}</span>
      <button class="btn outline-secondary-btn font-md" type="button" @click="refreshButton" style="width: 20%">
        <RefreshIcon class="mr-2"></RefreshIcon><span>{{ $t('global.outOfService.button') }}</span>
      </button>
    </div>
    <div class="col-5 d-flex gif-section"><img class="mt-4 gift-out" :src="images.outOfService" alt="Out Of Service"/></div>
  </div>
</div>
</template>

<script lang="ts">
import { images } from '@/resources/assets/assets'
import * as Routing from '@/services/router/Routing'
import { defineComponent, ref } from 'vue';
import { CalculumLoading } from '@ada/design-system'
import RefreshIcon from '@/modules/components/RefreshIcon.vue'
import { useUserStore } from '@/stores/user'

export default defineComponent({
  name: 'OutOfService',
  components: { CalculumLoading, RefreshIcon },
  setup() {

    const userStore = useUserStore()
    const loading = ref(false)

    function refreshButton(){
      loading.value = true
      const params = {          
        callbackSuccess: () => {
          Routing.home.openHome()
          loading.value = false
        },
        callbackError: () => {
          loading.value = false
        }
      }
      userStore.whoAmI(params)
    }

    return {
      images,
      refreshButton,
      loading
    }
  }

})
</script>

<style scoped>


  div#app {
    background: white;
  }

  /* .outline-secondary-btn{
    width: fit-content !important;
    column-gap: 0.5rem;
  } */
  .gift-out {
    margin-top: 7rem !important;
  }

  .title {
    color: #344054;
    font-size: 48px;
    font-style: normal;
    font-weight: 600;
    line-height: 60px;    
  }
  .text {
    color: #344054;
    font-size: 18px;
    font-style: normal;
    font-weight: 400;
    line-height: 28px;
  }
  .bg-outofservice {    
    width: 100%;
    height: 100vh;
    background-image: url('@/resources/assets/images/outOfServiceBG.svg') !important;
    background-repeat: no-repeat;
    background-size: 100% auto;
    background-position: center top;
    background-attachment: fixed;
    padding-top: 7%;
  }
  .custom-row {
    width: 80%;
    margin: 0px auto;
  }
  .gif-section {
    align-self: flex-end;
  }
 

</style>