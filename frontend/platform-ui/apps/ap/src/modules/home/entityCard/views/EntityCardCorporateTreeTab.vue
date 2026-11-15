<template>
<div class="row mt-10" v-if="showTreeCardsAndTable">
  <div class="col-lg-12">
    <div class="card">
      <div class="card-body">
        <div class="row">
          <div class="col-12 d-flex align-items-center justify-content-between"><span class="col-2 row p-0" style="margin-bottom: 10px;">
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'">
                <div class="col-12 k-button-group align-items-right"><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none" @click="showTreeFamilyCard('chart')" :class="{'active': showTreeFamily}" :title="$t('home.entityCard.chart')">
                    <CardsIcon></CardsIcon></a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none" @click="showTreeFamilyCard('table')" :class="{'active': !showTreeFamily}" :title="$t('home.entityCard.table')">
                    <ListIcon></ListIcon></a></div>
              </Tooltip></span></div>
        </div>
        <TreeCards v-if="showTreeFamily" :company-id="companyId" :companyType="companyType" :disabledProgram="disabledProgram" :programIsRecalculating="programIsRecalculating" :programTarget="programTarget" :selectedProgramUri="selectedProgramUri" @redirectToSpendEvent="redirectToSpendFile"></TreeCards>
        <GridSkeleton v-if="!showTreeFamily && loadingFlags.spendsBySupplier"></GridSkeleton>
        <ListNegotiation v-if="!showTreeFamily && !loadingFlags.spendsBySupplier" :selectedProgramId="programUuid" :companyType="companyType" :entityUuid="companyId" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" :programInrecalculating="programIsRecalculating" :isSelectable="false" :selectedTabIndex="0" :allSpendsTab="false" :inRecalculation="false" :showStrategies="false" :patchGrid="false" :treeView="true"></ListNegotiation>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, toRefs, watch } from 'vue'
import { EntityCardOverview } from '../types'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import CardsIcon from '@/modules/components/icons/IconCardLayout.vue'
import GridSkeleton from '@/modules/home/components/skeletons/GridSkeleton.vue'
import ListIcon from '@/modules/components/icons/IconList.vue'
import ListNegotiation from "../components/ListNegotiation.vue";
import TreeCards from '@/modules/home/entityCard/components/TreeCards.vue'

export default defineComponent({
  name: 'EntityCardCorporateTreeTab',
  components: {
    CardsIcon,
    GridSkeleton,
    ListIcon,
    ListNegotiation,
    Tooltip,
    TreeCards,
  },
  props: {
    companyId: { type: String, required: true },
    companyType: { type: String, required: true },
    creditData: { type: Object, required: true },
    disabledProgram: { type: Boolean },
    domain: { type: String, required: false, default: '' },
    programData: { type: Object, required: true },
    programIsRecalculating: { type: Boolean, required: false, default: false },
    programUuid: { type: String, required: true },
    hasFinancing: { type: Boolean, required: false },
    hasHarmonization: { type: Boolean, required: false },

  },
  emits: ['redirectToSpendEvent'],
  setup(props, { emit }) {
    const entityCardOverviewTab = reactive<EntityCardOverview>({
      chartKey: new Date().getUTCMilliseconds(),
      selectedProgramUri: props.programUuid || '',
      showTreeFamily: true,
      showTreeCardsAndTable: false,
      programTarget: props.programData ? props.programData.programTarget : '',
      loadingFlags: {
        spendsBySupplier: false
      },
    })

    onMounted(() => {
      refreshSupplierData()
    })

    function redirectToSpendFile(selectedUUID: string, stayInSameOverview: boolean, spendAlias?: string) {
      emit('redirectToSpendEvent', selectedUUID, stayInSameOverview, spendAlias)
    }

    function showTreeFamilyCard(tabOpen: any) {
      entityCardOverviewTab.showTreeFamily = tabOpen === 'chart'
    }


    /**
     * Watchers
     */

    // Handlers and Watcher
    window.onresize = () => {
      entityCardOverviewTab.chartKey = new Date().getUTCMilliseconds()
    }


    watch(() => props.programUuid, (newProgramUuid, oldProgramUuid) => {
      refreshSupplierData()
    })

    function refreshSupplierData() {
      entityCardOverviewTab.showTreeCardsAndTable = true
      entityCardOverviewTab.programTarget = props.programData ? props.programData.programTarget : ''
      if (props.programUuid === null) {
        entityCardOverviewTab.selectedProgramUri = ''
      }
    }

    return {
      ...toRefs(entityCardOverviewTab),
      redirectToSpendFile,
      showTreeFamilyCard,
    }
  }
})
</script>
