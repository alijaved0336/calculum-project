<template>
<TeaserView v-if="showTeaserView" teaser="nineBoxesFinancing"></TeaserView>
<div class="row d-flex flex-column mb-3" v-if="!showTeaserView && !programData.externalFinancingEnabled">
  <div class="col-12 col-sm-12 col-md-7 col-lg-7 col-xl-7">
    <div class="no-info-section">
      <div class="d-flex flex-column row-100">
        <div class="d-flex flex-column"><span class="text-gray-600 text-base font-semibold mb-2">{{ $t('global.noDataAvailable') }}</span><span class="text-gray-600 text-xs font-normal">{{ $t('global.noFinancing') }}                </span></div>
        <div class="row mt-4">
          <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="addFinancing"><span>{{ $t('button.addFinancing') }}</span></button>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="card" v-if="!showTeaserView && (programValues.recalculationInProgress || programValues.isBoxesRecalculating)">
  <div class="card-body">
    <div class="row">
      <div class="col-12">
        <h4 class="font-semibold ml-3">{{ $t('home.analyze.analyzeProgramOverview.nineBoxesButtonFinancing') }}</h4>
      </div>
      <div class="col-8">
        <div class="grid-nine-boxes">
          <div class="box" v-for="index in 9" :key="index">
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '150px' }"></Skeleton>
          </div>
        </div>
      </div>
      <div class="col-4">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '450px' }"></Skeleton>
      </div>
    </div>
  </div>
</div>
<div class="card" v-if="!showTeaserView && !programValues.recalculationInProgress && !programValues.isBoxesRecalculating && programData.externalFinancingEnabled">
  <div class="card-body">
    <div class="row">
      <div class="col-12 d-flex justify-content-between row-100">
        <h4 class="font-semibold ml-3">{{ $t('home.analyze.analyzeProgramOverview.nineBoxesButtonFinancing') }}</h4>
      </div>
      <div class="col-12 mt-4">
        <HomeAnalyzeProgramNineBoxes v-if="!showTeaserView && programData.externalFinancingEnabled" :selectedProgramId="selectedProgramId" :programData="programData" :forceReload="forceReload" :yAxisTitle="$t('global.valueToSupplier')" :xAxisTitle="$t('global.potentialScfRevenue')" :boxTitle="$t('global.potentialRevenue')" :typeOf9Boxes="'financing'" :inRecalculation="programInrecalculation" :nineBoxTitle="$t('home.analyze.analyzeProgramOverview.nineBoxesButtonFinancing')" @change-tab="$emit('change-tab', $event)"> </HomeAnalyzeProgramNineBoxes>
      </div>
    </div>
  </div>
</div>
</template>
<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
import HomeAnalyzeProgramNineBoxes from '@/modules/home/analyze/views/HomeAnalyzeProgramNineBoxes.vue'
import type { PropType } from 'vue';
import { Program } from '../types';
import useUser from "@/services/user/composables/useUser";
import TeaserView from "@/modules/components/teaser/TeaserView.vue";
import * as Routing from '@/services/router/Routing'
import { useRouter} from "vue-router";
import { Skeleton } from '@progress/kendo-vue-indicators';
import { ProgramSelectedAndStatus  } from '@/types';

export default defineComponent({
    name: 'NineBoxesFinancing',
    components: { HomeAnalyzeProgramNineBoxes, TeaserView, Skeleton },
    props: {
        showTeaserView: { type: Boolean, required: false },
        currentTab: {type: String, required: true},
        selectedProgramId: { type: String, required: true },
        programData: { type: Object as PropType<Program>, required: true },
        forceReload: { type: Boolean, required: false, default: false },
        inRecalculation: { type: Boolean, required: true, default: false },
        programValues: { type: Object as PropType<ProgramSelectedAndStatus>, required: true }
    },
    emits: ['change-tab'],
    setup( props ) {
        const { useFeature9BoxesFinancing  } = useUser();
        const router = useRouter();


    // *** Computed ***

    const showFeatureNineBoxesTeaser = computed(() => {
      return useFeature9BoxesFinancing.value === false
    })

    const programInrecalculation = ref(props.inRecalculation)

    watch(() => props.inRecalculation, () => {
        programInrecalculation.value = props.inRecalculation
        }, { deep: true })

    

    function addFinancing() {

        router.push({
            name: Routing.home.homeCompanySettings,
            query: {
                selectedTab: "financing",                
                section: "financingGroups"
            }
        });               


    }

    return {
            programInrecalculation,
            showFeatureNineBoxesTeaser,
            addFinancing
        }
    }
})
</script>

<style lang="scss" scoped>  

.card {
    padding: 0px !important;
}

</style>