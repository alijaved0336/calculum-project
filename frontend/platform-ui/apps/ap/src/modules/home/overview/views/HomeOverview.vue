<template>
<CalculumLayout :containerClass="'match-sections'" :containerId="'match-header-menu'">
  <template v-slot:slotTop>
    <div class="row">
      <div class="col-12 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center ml-2"><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none" :class="currentTab === 'OverviewCharts' || currentTab === 'ReceivablesMockup1' ? 'active' : ''" @click="changeTabOverview()">{{ $t('home.analyze.analyzeProgramOverview.overviewButton') }}</a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none" id="matchListTab" :class="currentTab === 'OverviewList' ? 'active' : ''" @click="changeTab('OverviewList')">{{ $t('home.analyze.analyzeProgramOverview.listButton') }}</a></div>
        <div class="d-flex align-items-center">
          <div class="header-title text-2xl font-semibold mr-5">{{ $t('home.components.menu.match') }}  </div>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row">
        <div class="col">
          <component
            v-if="currentTab !== 'OverviewList' || !isMatchInfoLoading"
            :is="currentTab"
            @resetEdit="resetEdit"
            :spend-file-version-active-id="spendFileVersionActiveId"
            :selected-program-id="String(selectedProgramId)"
            :program-data="program ?? {} as Program"
            :program-values="{ recalculationInProgress: (program as any)?.recalculationInProgress ?? false }"
            :key="currentTab + componentKey"
          />
          <GridSkeleton v-if="currentTab === 'OverviewList' && isMatchInfoLoading" />
        </div>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import { toRefs, reactive, onMounted, computed } from "vue";

import { NumberUtils } from "@/utils";
import { CalculumLayout } from '@ada/design-system'
import OverviewCharts from "@/modules/home/overview/components/OverviewCharts.vue";
import OverviewList from "@/modules/home/overview/components/OverviewList.vue";
import useSpendFile from "@/composables/useSpendFile";
import { useEntityCardStore } from '@/stores/entityCard';
import { useAnalyzeStore } from '@/stores/analyze';
import { Program } from '@/modules/home/analyze/types';
import ReceivablesMockup1 from '@/modules/home/views/ReceivablesMockup1.vue'
import { useOverviewStore } from '@/stores/overview';
import GridSkeleton from "@/modules/home/components/skeletons/GridSkeleton.vue";
import useModuleOverview from "@/modules/home/overview/composables/useModuleOverview";
import * as HomeRouting from "@/modules/home/HomeRouting";

export default {
  name: "HomeOverview",
  components: {
    OverviewCharts,
    OverviewList,
    CalculumLayout,
    ReceivablesMockup1,
    GridSkeleton,
  },
  setup() {

    const overviewStore = useOverviewStore();
    const isMatchInfoLoading = computed(() => overviewStore.getIsMatchInfoLoading);
    const { moduleOverviewIsAvailable } = useModuleOverview();

    const homeOverview = reactive({
      currentTab: initializeTab(),
      componentKey: NumberUtils.getRandomInt()
    });

    const {
      spendFileVersionActiveId
    } = useSpendFile();



    function initializeTab() {
      return "OverviewCharts";      
    }

    const entityCardStore = useEntityCardStore();
    const analyzeStore = useAnalyzeStore();

    const data = reactive({
      selectedProgramId: entityCardStore.selectedProgram,
      program: null as Program | null,
    });

    const retrieveProgramData = () => {
      const params = {
        programId: data.selectedProgramId,
        callbackSuccess: (callbackSuccessData: any) => {
          data.program = callbackSuccessData;
        }
      };
      analyzeStore.getProgram(params);
    };


    function resetEdit() {
      homeOverview.componentKey++;
    }

    function changeTabOverview() {
      homeOverview.currentTab = "OverviewCharts";      
      homeOverview.componentKey++;
      setBrowserTitlebyTab()
    }

    function changeTab(tab: any) {
      homeOverview.currentTab = tab;
      homeOverview.componentKey++;
      setBrowserTitlebyTab()
    }

    onMounted(() => {

      if (!moduleOverviewIsAvailable.value) {
        HomeRouting.openHome();
      }

      retrieveProgramData();
      setBrowserTitlebyTab()
    });


    function setBrowserTitlebyTab() {

      let title = 'Match - '

      switch(homeOverview.currentTab) {
        case 'ReceivablesMockup1':
        case 'OverviewCharts':
          title+= "Overview"
          break;

        case 'OverviewList':
          title+= "List"
          break;

          default:
          break;
      }

      document.title = title

    }


    return {
      ...toRefs(homeOverview),
      ...toRefs(data),
      resetEdit,
      changeTab,
      spendFileVersionActiveId,
      changeTabOverview,
      isMatchInfoLoading,
    };
  }
};
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_borders.scss";

/**for the new header in match top menu **/
.header-title {
  font-family: "Inter var", sans-serif;
}

.m-b2 {
  margin-bottom: 2rem;
}

</style>
