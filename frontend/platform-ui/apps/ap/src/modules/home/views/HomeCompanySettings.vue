<template>
<CalculumLayout :containerClass="!spendFileInrecalculation ? 'home-setup' : 'home-setup-with-alert'" :containerId="spendFileInrecalculation ? 'home-setup-container' : ''" :showFooter="false">
  <template v-slot:slotTop>
    <div class="row">
      <div class="col-12 d-flex justify-content-between">
        <div class="d-flex"><a class="btn btn-clean font-md text-capitalize custom-padding-btn" v-for="(tab, index) in visibleTabs" :key="tab.tabKey" :id="tab.id" :class="tabClass(tab, index)" @click="changeTab(tab.tabKey)">{{ $t(tab.labelKey) }}</a></div>
        <div class="d-flex">
          <div class="header-title text-2xl font-semibold mr-2">{{ $t('home.components.menu.setup') }}</div>
        </div>
      </div>
      <div class="col-xl-8 col-12 mt-3" v-if="spendFileInrecalculation">
        <div class="alert alert-warning-custom fade show" role="alert">       <span>{{ 'During updates and recalculations, changes in the setup will be disabled. Please wait until updates are finished.' }}</span></div>
      </div>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <component :is="currentTab" :key="key + currentTab" :showAlert="showModal" :otherTab="tabtoChange" :sectionDefault="section" :spendFileInrecalculation="spendFileInrecalculation" @sendChanges="withChanges" @cancel-n-continue="cancelNContinue" @discard-n-continue="discardNContinue" @save-n-continue="discardNContinue">   </component>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, computed, provide, onMounted, watch } from 'vue'

// Types
import { HomeCompanySettings } from '../types'
import BuyerStandard from "./settings/BuyerStandard.vue";
import CashFlow from "./settings/CashFlow.vue";
import { CalculumLayout } from '@ada/design-system'
import Financing from "./settings/Financing.vue";
import Strategies from "./settings/Strategies.vue";
import CardGroups from "./settings/CardGroups/CardGroups.vue";
import NewsSetup from "./settings/NewsSetup.vue";
import ResultAnalysis from "./settings/ResultAnalysis.vue";
import NegotiationAgentSetup from "./settings/NegotiationAgentSetup.vue";
import { useUser, useModuleCompanySettings } from "@/composables";
import { useSubscribeStore } from '@/stores/subscribe'
import { useI18n } from "vue-i18n";
import * as HomeRouting from "@/modules/home/HomeRouting";

export default defineComponent({
  name: "HomeCompanySettings",
  components: {
    Strategies,
    BuyerStandard,
    CalculumLayout,
    Financing,
    CashFlow,
    CardGroups,
    NewsSetup,
    ResultAnalysis,
    NegotiationAgentSetup
  },
  props: {
    selectedTab: { type: String, required: false, default: 'Strategies' },
    section: { type: String, required: false, default: '' },
  },
  setup( props: any ) {

    const subscribeStore = useSubscribeStore();
    const { useFeatureVirtualCard, userIsAdmin, userIsSuperAdmin, useFeature9BoxesFinancing, useFeatureEntityCardNewsletter, useFeatureKeepHistoricalData } = useUser()
    const { moduleCompanySettingsIsAvailable } = useModuleCompanySettings()

    const { t: translate } = useI18n({ warnHtmlMessage: false, useScope: 'global' });    

    const data = reactive<HomeCompanySettings>({
      currentTab: 'Strategies',
      withChanges: false,
      showModal: false,
      tabtoChange: '',
      isAdmin: userIsAdmin.value || userIsSuperAdmin.value,
      spendFileInrecalculation: false,
      key: new Date().getTime()
    })

    onMounted(() => {

      if (!moduleCompanySettingsIsAvailable.value) {
        HomeRouting.openHome();
      }

      if (props.selectedTab === 'financing') {
        data.currentTab = 'Financing'    
      } else if (props.selectedTab === 'news') {
        data.currentTab = 'NewsSetup'
      }
      data.spendFileInrecalculation = !subscribeStore.getAllowActionsInModules
      setBrowserTitlebyTab()
    })

    function setBrowserTitlebyTab() {

      let title =  translate('home.components.menu.setup')

      switch(data.currentTab) {

        case 'Strategies':
          title+= " - " + translate('home.homeCompanySettings.paymentTerms')
          break;

        case 'BuyerStandard':
          title+= " - " + translate('home.homeCompanySettings.buyerStandardGroup')
          break;
        
        case 'Financing':
          title+= " - " + translate('home.homeCompanySettings.financingTabTitle')
          break;

        case 'CashFlow':
          title+= " - " + translate('home.homeCompanySettings.cashFlowTabTitle')
          break;

        case 'CardGroups':
          title+= " - " + translate('home.homeCompanySettings.cardGroups.cardGroupsTitleTab')
          break;

        case 'NewsSetup':
          title+= " - " + translate('home.homeCompanySettings.news.tabTitle')
          break;

        case 'ResultAnalysis':
          title+= " - " + translate('home.homeCompanySettings.resultAnalysis.title')
          break;

        case 'NegotiationAgentSetup':
          title+= " - " + translate('home.homeCompanySettings.negotiationAgentSetup.title')
          break;

        default:
          break;
      }


      document.title = title

    }

    watch(
      () => subscribeStore.getAllowActionsInModules,
      (newValue) => {
        data.spendFileInrecalculation = !newValue
        data.key++
      }
    )


    const showVPTab = computed(() => {
      if (userIsSuperAdmin.value) {
        return true
      } else {
        return false
      }
    })

    const tabConfigs = [
      { id: 'setup-strategies', tabKey: 'Strategies', labelKey: 'home.homeCompanySettings.paymentTerms', visible: true },
      { id: 'setup-buyer-standard', tabKey: 'BuyerStandard', labelKey: 'home.homeCompanySettings.buyerStandardGroup', visible: true },
      { id: 'setup-financing', tabKey: 'Financing', labelKey: 'home.homeCompanySettings.financingTabTitle', visible: () => useFeature9BoxesFinancing.value },
      { id: 'setup-cash-flow', tabKey: 'CashFlow', labelKey: 'home.homeCompanySettings.cashFlowTabTitle', visible: true },
      { id: 'setup-vcard', tabKey: 'CardGroups', labelKey: 'home.homeCompanySettings.cardGroups.cardGroupsTitleTab', visible: () => useFeatureVirtualCard.value && data.isAdmin },
      { id: 'setup-news', tabKey: 'NewsSetup', labelKey: 'home.homeCompanySettings.news.tabTitle', visible: () => useFeatureEntityCardNewsletter.value && data.isAdmin },
      { id: 'setup-result-analysis', tabKey: 'ResultAnalysis', labelKey: 'home.homeCompanySettings.resultAnalysis.title', visible: () => useFeatureKeepHistoricalData.value && data.isAdmin },
      { id: 'setup-negotiation-agent', tabKey: 'NegotiationAgentSetup', labelKey: 'home.homeCompanySettings.negotiationAgentSetup.title', visible: () => userIsSuperAdmin.value },
    ]

    const visibleTabs = computed(() =>
      tabConfigs.filter((tab) => (typeof tab.visible === 'function' ? tab.visible() : tab.visible))
    )

    function tabClass(tab: { tabKey: string }, index: number) {
      return [
        data.currentTab === tab.tabKey ? 'active' : 'btn-clean',
        index > 0 ? 'rounded-tbl-none' : '',
        index < visibleTabs.value.length - 1 ? 'rounded-tbr-none' : '',
      ].filter(Boolean)
    }

    provide('sendChangesToParent', withChanges)
    function withChanges(status: boolean) {
      data.withChanges = status
      if (data.tabtoChange && !status) {
        data.showModal = false
        data.currentTab = data.tabtoChange
        data.tabtoChange = ''
      }
    }

    function changeTab(tab: any) {

      if (data.withChanges) {
        data.showModal = true
        data.tabtoChange = tab
      } else {
        data.showModal = false
        data.currentTab = tab
      }
      setBrowserTitlebyTab()
    }

    function cancelNContinue() {
      data.showModal = false
      data.tabtoChange = ''
    }

    function discardNContinue() {      
      data.withChanges = false
      data.showModal = false
      data.currentTab = data.tabtoChange
      data.tabtoChange = ''
    }


    return {
      ...toRefs(data),
      withChanges,
      changeTab,
      cancelNContinue,
      discardNContinue,     
      useFeatureVirtualCard,
      showVPTab,
      useFeature9BoxesFinancing,
      useFeatureEntityCardNewsletter,
      useFeatureKeepHistoricalData,
      visibleTabs,
      tabClass,
    }
  },
})
</script>