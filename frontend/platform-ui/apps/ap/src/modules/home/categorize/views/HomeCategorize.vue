<template>
<CalculumLayout :containerClass="'analyze-sections'" :containerId="'analyze-header-menu'">
  <template v-slot:slotTop>
    <div class="row">
      <div class="col-12 d-flex justify-content-between">
        <div class="d-flex"><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none" @click="changeTab('CategorizeOverview')" :class="{'active': currentTab === 'CategorizeOverview'}">{{ $t('home.categorize.other.other') }}</a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none" @click="changeTab('HomeCategorizeList')" :class="{'active': currentTab === 'HomeCategorizeList'}">{{ $t('home.categorize.list.list') }}</a></div>
        <div class="d-flex">
          <div class="header-title text-2xl font-semibold mr-4">{{ $t('home.categorize.title') }}</div>
          <p class="btn-extension" v-if="currentTab !== 'CategorizeOverview'">
            <button class="btn btn-simple btn-icon link link--icon" id="btn-fullscreen" data-toggle="modal" data-target="#containerTable" @click="fullScreen = !fullScreen"><i class="fa-solid fa-up-right-and-down-left-from-center text-sm font-main"></i></button>
          </p>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <KeepAlive>
        <component :is="currentTab" v-model:fullScreen="fullScreen"></component>
      </KeepAlive>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import { toRefs, reactive, onMounted  } from 'vue'
import CategorizeOverview from '@/modules/home/categorize/views/CategorizeOverview.vue'
import HomeCategorizeList from '@/modules/home/categorize/views/HomeCategorizeList.vue'
import { CalculumLayout } from '@ada/design-system'
import { useI18n } from 'vue-i18n'
import { useModuleCategorize } from '@/composables'
import * as HomeRouting from "@/modules/home/HomeRouting";

export default {
  name: 'HomeCategorize',
  components: {
    CategorizeOverview,    
    HomeCategorizeList,
    CalculumLayout
  },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const { moduleCategorizeIsAvailable } = useModuleCategorize()    

    const data = reactive({
      currentTab: 'CategorizeOverview',
      fullScreen: false
    })

     onMounted(() => {
      if (!moduleCategorizeIsAvailable.value) {
        HomeRouting.openHome();
      }
      setBrowserTitlebyTab()
    })

    setBrowserTitlebyTab()

    function changeTab(tab: any) {
      data.currentTab = tab      
      const options = document.querySelectorAll('.page-content')
      for (const element of options) {
        // ? - Replace this class
        element.classList.remove('back-white')
      }

      setBrowserTitlebyTab()
      
    }

     function setBrowserTitlebyTab() {


      let title = translate.t('home.components.menu.analyze')

      switch(data.currentTab) {

        case 'CategorizeOverview':
          title+= " - " + translate.t('home.categorize.other.other')
          break;

        case 'HomeCategorizeList':
          title+= " - " + translate.t('home.categorize.list.list')
          break;
        
        default:
          break;
      }
      document.title = title
    }



    return {
      ...toRefs(data),
      changeTab
    }
  }
}
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_borders.scss";

//for the new header in analyze top menu
.header-title {
  font-family: "Inter var", sans-serif;
}

.m-b2 {
  margin-bottom: 2rem;
}

.table-container>div {
  padding: .8rem;
}

.home-categorize-select {
  select {
    color: black;
  }

  span {
    color: black;
    opacity: 1;
  }
}

.categorize-charts-container {
  min-height: 450px;
  position: relative;
}

.sidebar-show {
  width: 100%;
}

.postion-right {
  position: absolute;
  right: 40px;
}

.text-uppercase {
  font-weight: 600 !important;
  color: #475467;
}
</style>
