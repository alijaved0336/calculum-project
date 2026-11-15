<template>
<CalculumLayout :containerClass="'plan-home'">
  <template v-slot:slotTop>
    <div class="row">
      <Tooltip class="ellipsis" :open-delay="10" :anchor-element="'target'" :position="'bottom'"> </Tooltip>
      <div class="col-12 d-flex justify-content-between">
        <div class="d-flex">
          <div class="d-flex">
            <div class="new-plan disabled mr-4" v-if="!hasOneAtleastOneProgramNotRecalculatedAndNotPending">
              <Tooltip :open-delay="10" :anchor-element="'target'" :position="'bottom'">
                <div class="d-flex align-items-center" :title="$t('global.planOptions.notAvailable')">                                   <span class="ml-2" :title="$t('global.planOptions.notAvailable')">{{ $t('home.analyze.programsPanel.newPlan') }}</span></div>
              </Tooltip>
            </div>
            <div class="new-plan cursor-pointer mr-4" v-else @click="Routing.home.analyze.openHomeAnalyzeProgramToPlan1()">
              <div class="d-flex">
                <div class="circle-plus-icon-plan cursor-pointer"><i class="fa-solid fa-plus text-sm" aria-hidden="true"></i></div><span class="ml-2 cursor-pointer">{{ $t('home.analyze.programsPanel.newPlan') }}</span>
              </div>
            </div>
          </div>
          <div class="d-flex" v-if="sortedPlansToShow.length >= 1 && !loading"><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none" @click="setSelectedButton('PlanCardV2')" :class="{'active': buttonSelected === 'PlanCardV2'}" :title="$t('global.cardView')">
              <CardsIcon>           </CardsIcon></a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none" @click="setSelectedButton('SummaryListPlan')" :class="{'active': buttonSelected === 'SummaryListPlan'}" :title="$t('global.listView')">
              <ListIcon></ListIcon></a></div>
        </div>
        <div class="d-flex align-items-center">
          <div class="text-2xl font-semibold text-gray-700">{{ $t('home.plan.plan') }}</div><span class="d-flex open-popup plan-popup-settings-icon" ref="button" @click="() => showOptions = !showOptions">
            <iconEllipsisVertical class="three-dots-icon my-auto mt-1"></iconEllipsisVertical>
            <Popup :anchor="'button'" :show="showOptions" :popup-class="'plan-popup-settings'" :offset="offset">
              <button @click="changeMarkedPrograms" :class="showOnlyTheMarked ? 'btn-analyze-program-bookmark-is-marked' : 'btn-analyze-program-bookmark'">
                <svg class="custom-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
                  <path d="M7.5,0h-5A1.5,1.5,0,0,0,1,1.5v8a.5.5,0,0,0,.791.407L4.855,7.718a.249.249,0,0,1,.29,0L8.209,9.907A.5.5,0,0,0,9,9.5v-8A1.5,1.5,0,0,0,7.5,0Z"></path>
                </svg><span class="ml-1">{{ $t('home.analyze.programsPanel.filters.marked') }}   </span>
              </button>
            </Popup></span>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections mt-4">
      <div class="row" v-if="loading && buttonSelected === 'PlanCardV2'">
        <SkeletonCard v-for="i in 1" :key="i" :numberOfRowForTopSection="1"></SkeletonCard>
      </div>
      <div class="row" v-if="sortedPlansToShow.length <= 0 && !loading">
        <div class="col-6">
          <div class="no-info-section">
            <div class="d-flex flex-column">
              <div class="d-flex flex-column" v-if="allPrograms.length >= 1"><span class="text-gray-600 text-base font-semibold MB-2">{{ $t('home.plan.programToPlan2.noPlanCreated') }}           </span></div>
              <div class="d-flex flex-column" v-if="allPrograms.length <= 0"><span class="text-gray-600 text-base font-semibold MB-2">{{ $t('home.plan.programToPlan2.noPlanCreatedNoProgram') }}</span></div>
              <div class="d-flex flex-column" v-if="allPrograms.length > 0 && !hasOneAtleastOneProgramNotRecalculatedAndNotPending"><span class="text-gray-600 text-base font-semibold MB-2">{{ $t('home.plan.programToPlan2.plansUnavailable') }}      </span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <PlanCardV2 @refreshPlans="refreshPlans" v-for="plan in sortedPlansToShow" :key="plan['@id']" :plan-data="plan" :lastItem="plan === sortedPlansToShow[sortedPlansToShow.length - 1]" :uniqueIds="uniqueProgramIds" v-if="!loading && buttonSelected === 'PlanCardV2'"></PlanCardV2>
      </div>
      <SummaryListPlan v-if="!loading && buttonSelected === 'SummaryListPlan'"></SummaryListPlan>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import { Button } from '@progress/kendo-vue-buttons';
import { Popup } from '@progress/kendo-vue-popup';
import { reactive, toRefs, computed, onMounted, onUnmounted } from 'vue'
import { removeIRI } from '@/utils'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useI18n } from 'vue-i18n'
import { useAnalyzeStore } from '@/stores/analyze'
import { usePlanStore } from '@/stores/plan'
import * as clickOutsideRelated from '@/utils/clickOutsideRelated'
import * as Routing from '@/services/router/Routing'
import AddIcon from '@/modules/components/icons/IconAdd.vue'
import { CalculumLayout } from '@ada/design-system'

import CardsIcon from '@/modules/components/icons/IconCardLayout.vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import ListIcon from '@/modules/components/icons/IconList.vue'
import PlanCardV2 from '../components/PlanCardV2.vue'
import PlanOptions from '@/modules/home/plan/components/PlanOptions.vue'
import SummaryListPlan from '../components/SummaryListPlan.vue'
import SkeletonCard from '@/modules/home/components/skeletons/SkeletonCard.vue'
import { useSpendFile, useModulePlan } from "@/composables";
import { useRouter} from "vue-router";
import * as HomeRouting from "@/modules/home/HomeRouting";


export default {
  name: 'HomePlanAllPlans',
  components: {
    PlanCardV2,
    AddIcon,
    CalculumLayout,
    SummaryListPlan,
    PlanOptions,
    CardsIcon,
    Button,
    Popup,
    ListIcon,
    iconEllipsisVertical,
    Tooltip,
    SkeletonCard
  },
  setup() {
    const analyzeStore = useAnalyzeStore()
    const planStore = usePlanStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const router = useRouter();

    document.title = translate.t('home.plan.plan') + ' - Home'
    const { modulePlanIsAvailable } = useModulePlan()

    const {
      spendFileVersionActiveId
    } = useSpendFile()

    interface HomePlanAllPlans {
      allPlans: Array<any>,
      allPrograms: Array<any>,
      buttonSelected: string,
      loading: boolean,
      loadingSpendFilesVersions: boolean,
      offset: any,
      programsIds: Array<any>
      searchByAuthor: string,
      showOnlyTheMarked: boolean,
      showOptions: boolean,
    }

    const homePlanAllPlans = reactive<HomePlanAllPlans>({
      allPlans: [],
      allPrograms: [],
      buttonSelected: planStore.getDefaultTabHome,
      loading: false,
      loadingSpendFilesVersions: false,
      offset: { left: 150, top: 50 },
      programsIds: [],
      searchByAuthor: '',
      showOnlyTheMarked: false,
      showOptions: false,
    })


    function goToUniquePlan(planUuid: string) {

      router.push({
          name: Routing.home.plan.homeHomePlanV2,        
          query: {
            planId: removeIRI(planUuid)
          }
      });
    }

    /**
     * this will get all programs, if all programs are recaclulating
     * disable the NEW PLAN button
     */
    getAllPrograms()

    onMounted(() => {
      if (!modulePlanIsAvailable.value) {
        HomeRouting.openHome();
      }
      document.body.addEventListener('click', handleClick)
      getAllPlans()
    })

    /**
     * onUnmounted
     */
    onUnmounted(() => {
      document.body.removeEventListener('click', handleClick)
    })

    function handleClick(e: any) {
      const clickedInside = clickOutsideRelated.menuPopup(e, '.plan-popup-settings-icon', '.plan-popup-settings');

      if (clickedInside !== undefined) {
        if (clickedInside) {
          // Do something when clicked inside
          homePlanAllPlans.showOptions = true;
        } else {
          // Do something when clicked outside
          homePlanAllPlans.showOptions = false;
        }
      }
    }

    const sortedPlansToShow = computed(() => {
      return homePlanAllPlans.allPlans.sort((a, b) => b.created.localeCompare(a.created))
    })

    function changeMarkedPrograms() {
      homePlanAllPlans.showOptions = !homePlanAllPlans.showOptions
      homePlanAllPlans.showOnlyTheMarked = !homePlanAllPlans.showOnlyTheMarked
      getAllPlans()
    }

    function getAllPlans() {
      homePlanAllPlans.loading = true

      const globalParams = {
        spendFileVersion: spendFileVersionActiveId.value,
        callbackError: () => {
          homePlanAllPlans.loading = false
        }
      }

      homePlanAllPlans.allPlans = []

      const params1 = {
        marked: homePlanAllPlans.showOnlyTheMarked,
        callbackSuccess: (callbackSuccessData: any) => {

          
          homePlanAllPlans.allPlans = [...homePlanAllPlans.allPlans, ...callbackSuccessData]
          homePlanAllPlans.programsIds =  homePlanAllPlans.allPlans
          homePlanAllPlans.loading = false
          
          //- If theres only one plan go to it
          if (callbackSuccessData.length === 1) {
            goToUniquePlan(callbackSuccessData[0]['@id'])
            return
          }

          //-Validate if exists a previous selected plan and validate if belongs to the current spendfile version
          const defaultPlan = planStore.getDefaultPlan ?? null

          if (defaultPlan) {

            const plan = callbackSuccessData.find((x: any) => x['@id'] === '/api/plans/' + defaultPlan)
            if (plan) {
              goToUniquePlan(defaultPlan) 
              return
            }
          }

          //- If theres no previous selected plan and exists more than one plan show home plan
        }
      }

      planStore.getAllPlans({ ...globalParams, ...params1 })
    }    

    function refreshPlans() {
      getAllPlans()
    }

    function setSelectedButton(tab: any) {
      homePlanAllPlans.buttonSelected = tab
      planStore.setDefaultTabHome(tab)
    }

    /**
     * Get unique program ids from the api
     * so we can subsribe the program's id for updates
     */
    const uniqueProgramIds = computed(() => {
    const programIds = homePlanAllPlans.programsIds.map((item:any) => removeIRI(item.program['@id']));
    const uniqueIds = [...new Set(programIds)];
    return uniqueIds;
  })

  
    
    function getAllPrograms() {
      const params = {
        scope: 'all',
        marked: homePlanAllPlans.showOnlyTheMarked,
        firstName: homePlanAllPlans.searchByAuthor,
        lastName: homePlanAllPlans.searchByAuthor,
        spendFileVersion: spendFileVersionActiveId.value,
        callbackSuccess: (response: any) => {
          homePlanAllPlans.allPrograms = response          
        },
        callbackError: () => {          
        }
      }
      
      analyzeStore.fetchAllPrograms(params)
    }
   

    const allProgramsNotRecalculatedAndNotPending = computed(() => {
      return homePlanAllPlans.allPrograms.filter((program: any) => program.recalculationInProgress === false && program.pendingRecalculation === false)
    })

    const hasOneAtleastOneProgramNotRecalculatedAndNotPending = computed(() => {
      return allProgramsNotRecalculatedAndNotPending.value.length > 0
    })

   

    return {
      ...toRefs(homePlanAllPlans),
      allProgramsNotRecalculatedAndNotPending,
      changeMarkedPrograms,
      clickOutsideRelated,
      getAllPlans,
      getAllPrograms,
      hasOneAtleastOneProgramNotRecalculatedAndNotPending,
      refreshPlans,
      Routing,
      setSelectedButton,
      sortedPlansToShow,
      uniqueProgramIds,
    }
  }
}
</script>

<style lang="scss">
@import "src/resources/assets/styles/variables/_colors.scss";

.custom-pop-up {
  width: 200px !important;
}

/** Styles for child component, don't scoped  */
.new-plan {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  color: #667085;
  font-weight: 600;
  font-size: 14px;
  padding: 6px 20px;
  width: fit-content;
  height: 48px;
  background: #F2F4F7;
  box-shadow: 0px 1px 2px rgba(16, 24, 40, 0.05);

  &-rest-phase {
    border: unset !important;
    box-shadow: unset !important;
  }

  &.disabled {
    box-shadow: none;
    background-color: $color-gray-100;
    border: 1px solid $color-gray-200;
    cursor: default;
    span, svg{
      color: $color-gray-300;
      &:hover {
        color: $color-gray-300;
      }
    }
  }

  span {
    .program-recalculating{
      color: $color-gray-200;
      cursor: none;
      &:hover {
        color: $color-gray-200;
      }
    }
  }

  .program-recalculating{
    color: $color-gray-200;
    &:focus {
      color: $color-gray-200;
    }
  }

  .button-for-addplan {
    width: 20px;
    height: 20px;
    margin-right: 5px;
    fill: $color-gray-500;
    &.disabled{
      fill: $color-gray-300;
    }
  }

  &:hover {
    //color: $color-black;

    .button-for-addplan {
      fill: $color-black;
      &.disabled{
        fill: $color-gray-300;
      }
    }
  }

  &:focus {
    background: #FFFFFF;
    border: 1px solid #D0D5DD;
    box-shadow: 0px 0px 0px 4px #667085;
    border-radius: 8px;

    .button-for-addplan {
      color: $color-black;
      fill: $color-black;
    }
  }
}


.align-items-center {
  align-items: center;
}

.three-dots-icon {
  max-height: 16px;
}

.open-popup {
  cursor: pointer;

  path {
    color: $color-gray-500;
  }

  &:hover {
    path {
      color: $color-primary-500;
    }
  }
}
</style>
