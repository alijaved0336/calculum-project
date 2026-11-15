<template>
<div class="d-flex flex-column container-sections alerts-section" v-if="typeAlert !== 0">
  <div class="container-top-sections">
    <div class="alert alert-primary-custom alert-dismissible fade show" role="alert" v-if="typeAlert === 1"><img class="icon-svg" :src="fontIcons.informationCircleBlue"/><span>{{ $t('home.components.navbar.alerts.noCurrentSpendFile') }}</span>
      <button class="close" type="button" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>
    </div>
    <div class="alert alert-warning-custom fade show" role="alert" v-if="typeAlert === 2"><img class="icon-svg" :src="fontIcons.alertIcon"/><span>{{ $t('home.components.navbar.alerts.selectOtherCompany') }}</span></div>
    <div class="alert alert-warning-custom fade show" role="alert" v-if="typeAlert === 3"><img class="icon-svg" :src="fontIcons.alertIcon"/><span>{{ $t('home.components.navbar.alerts.nothingToSelect') }}      </span></div>
    <div class="alert alert-warning-custom fade show" role="alert" v-if="typeAlert === 4"><img class="icon-svg" :src="fontIcons.alertIcon"/><span>{{ $t('home.components.navbar.alerts.forbidden') }}      </span></div>
    <div class="alert alert-warning-custom fade show" role="alert" v-if="typeAlert === 5"><img class="icon-svg" :src="fontIcons.alertIcon"/><span>{{ $t('home.components.navbar.alerts.pilot') }}      </span></div>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import * as Routing from '@/services/router/Routing'

export default defineComponent({
  name: 'HomeAlerts',
  props: {
    typeAlert: { type: Number, required: true },    
  },
  emits: ['hideAlert'],
  setup (props, { emit }) {
    
    function goToSupport(){
      Routing.home.openHomeHelpSupport()
    }    
    return {
      fontIcons,
      goToSupport
    }
  }
})

</script>

<style lang="scss" scoped>
  @import "src/resources/assets/styles/variables/colors";

 

  .icon-svg{
    width: 16px;    
    margin-top: -0.8rem;
  }

  .chevron-svg {
    width: 0.5rem;      
  }

  .link-support {
    font-style: normal;
    font-weight: 500;
    font-size: 12px;
    line-height: 18px;
    color: $color-warning-500;
    margin-left: 2rem;
  }

</style>