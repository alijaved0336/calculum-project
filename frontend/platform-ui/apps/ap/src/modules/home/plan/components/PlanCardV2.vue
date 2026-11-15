<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<PlanPhase v-if="showNewPhase" @getPlanData="$emit('refreshPlans')" @cancelFromHomePlan="showNewPhase = false" :planId="planData['@id']" :newPhase="true" :number="1" :upgradeable="true" :min-date="planData.startDate" :max-date="planData.endDate" :plan-data="{}" :single-dimension="planData.dimension === 'dimension_type_single'" :recomend-start-date="recomendStartDate" :phasesCount="planData.planPhases.length" :targetProgram="planData.targetProgram" :levelHarmonization="planData.levelHarmonization" :period="0"></PlanPhase>
<div class="col-12 col-sm-12 col-md-6 col-lg-4 col-xl-3 mb-4">
  <div class="card-v2 d-flex flex-column justify-content-between">
    <div class="d-flex flex-column" style="width: 100%;" v-if="!showMenu">
      <div class="d-flex justify-content-center mb-16" style="width: 100%;">
        <div class="col-1"><span>&nbsp;</span></div>
        <div class="col-10">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"></Tooltip><span class="text-gray-700 text-2xl font-medium cursor-pointer truncate-title" :title="planData.title" style="width: 100%;" @click="goToOverview()">{{ planData.title }}</span>
        </div>
        <div class="col-1 cursor-pointer" v-if="!planDataObject.programInrecalculation" @click="showMenu = true">         <span @click="showMenu = true" v-if="!planDataObject.programInrecalculation">
            <CalculumKebab>           </CalculumKebab></span></div>
      </div>
      <div class="d-flex justify-content-center row-100"><span class="text-gray-500 text-sm font-medium mr-1">{{$t('home.plan.createdBy')}}:</span>
        <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"></Tooltip><span class="text-gray-700 text-sm font-medium name-author" :title="planData.createdBy.firstName + ' ' + planData.createdBy.lastName">{{ planData.createdBy.firstName }} {{ planData.createdBy.lastName }}</span>
      </div>
      <div class="d-flex row-100">
        <hr class="vector"/>
      </div>
      <div class="d-flex flex-column justify-content-center body-card">
        <div class="d-flex mb-20 cursor-pointer"><span class="icon-svg icon-analyze-black mr-2"></span>
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"></Tooltip><span class="text-gray-600 text-sm font-normal name-author cursor-pointer" :title="planData.program.name" @click="goToProgramOverview(planData.program)">{{ planData.program.name }}</span>
        </div>
        <div class="d-flex flex-colum flex-wrap mb-1">
          <div class="col-5 row-100"><span class="text-gray-500 text-sm font-normal">{{ $t('home.plan.programToPlan1.period') }}</span></div>
          <div class="col-7 text-right"><span class="text-gray-700 text-sm font-semibold">{{ planData.period }}</span></div>
        </div>
        <div class="d-flex flex-colum flex-wrap mb-1">
          <div class="col-5 row-100"> <span class="text-gray-500 text-sm font-normal">{{ $t('home.plan.programToPlan1.starDate') }}</span></div>
          <div class="col-7 text-right"><span class="text-gray-700 text-sm font-semibold">{{ formatData.getMonthDayAndYear(planData.startDate) }}</span></div>
        </div>
        <div class="d-flex flex-colum flex-wrap mb-1">
          <div class="col-5 row-100"><span class="text-gray-500 text-sm font-normal">{{ $t('home.plan.programToPlan1.endDate') }}</span></div>
          <div class="col-7 text-right"><span class="text-gray-700 text-sm font-semibold">{{ formatData.getMonthDayAndYear(planData.endDate) }}</span></div>
        </div>
        <div class="d-flex flex-colum flex-wrap mb-20">
          <div class="col-5 row-100"><span class="text-gray-500 text-sm font-normal" style="text-transform: capitalize;">{{ $t('home.plan.programToPlan2.phases') }} </span></div>
          <div class="col-7 text-right"><span class="text-gray-700 text-sm font-semibold">{{  planData.planPhases.length  }}</span></div>
        </div>
      </div>
    </div>
    <div class="row d-flex btn_box row-100 mt-3" v-if="!showMenu">
      <div class="col-12 col-sm-12 col-md-12 col-lg-12 col-xl-6 mt-1">
        <button class="btn font-md outline-secondary-btn edit-cashFlow-btn" :disabled="planDataObject.programInrecalculation" @click="updatePlan(planData['@id'])" style="z-index: 1; width: 100%"><span>{{ $t('global.edit') }}</span></button>
      </div>
      <div class="col-12 col-sm-12 col-md-12 col-lg-12 col-xl-6 mt-1">
        <button class="btn btn-primary font-md show-cashFlow-btn" @click="goToOverview()" style="z-index: 1; width: 100%"><span>{{ $t('home.plan.planCard.show') }}</span></button>
      </div>
    </div>
    <div class="d-flex flex-column card-menu" style="width: 100%;" v-if="showMenu">
      <div class="d-flex mb-16" style="width: 100%;">
        <div class="col-1"><span>&nbsp;</span></div>
        <div class="col-10"><span>&nbsp;</span></div>
        <div class="col-1 cursor-pointer" @click="showMenu = false"><span class="cursor-pointer" @click="showMenu = false">
            <CalculumClose>           </CalculumClose></span></div>
      </div>
      <div class="d-flex row-100 options-menu-card" v-if="planDataObject.programInrecalculation">
        <div class="col-2 text-center row-100">
          <CalculumEditIcon></CalculumEditIcon>
        </div>
        <div class="col-10 text-left row-100"><span class="text-black-0 text-xs font-normal">{{ $t('global.edit') }}</span></div>
      </div>
      <div class="d-flex row-100 cursor-pointer options-menu-card" @click="updatePlan(planData['@id'])" v-if="!planDataObject.programInrecalculation">
        <div class="col-2 text-center row-100 cursor-pointer">
          <CalculumEditIcon class="cursor-pointer"></CalculumEditIcon>
        </div>
        <div class="col-10 text-left row-100 cursor-pointer"><span class="text-black-0 text-xs font-normal cursor-pointer">{{ $t('global.edit') }}</span></div>
      </div>
      <div class="d-flex row-100">
        <hr class="vector"/>
      </div>
      <div class="d-flex row-100 cursor-pointer options-menu-card" @click="goToOverview()">
        <div class="col-2 text-center row-100 cursor-pointer">
          <CalculumShowIcon class="cursor-pointer"></CalculumShowIcon>
        </div>
        <div class="col-10 text-left row-100 cursor-pointer"><span class="text-black-0 text-xs font-normal cursor-pointer">{{ $t('home.plan.planCard.show') }}</span></div>
      </div>
      <div class="d-flex row-100">
        <hr class="vector"/>
      </div>
      <div class="d-flex row-100 cursor-pointer options-menu-card" @click="markCard">
        <div class="col-2 text-center row-100 cursor-pointer">
          <CalculumBookmarkIcon class="cursor-pointer"></CalculumBookmarkIcon>
        </div>
        <div class="col-10 text-left row-100 cursor-pointer"><span class="text-black-0 text-xs font-normal cursor-pointer">{{ $t('button.marked') }}</span></div>
      </div>
      <div class="d-flex row-100">
        <hr class="vector"/>
      </div>
      <div class="d-flex row-100 cursor-pointer options-menu-card" @click="showDeleteOptions = true">
        <div class="col-2 text-center row-100 cursor-pointer">
          <CalculumDeleteIcon class="cursor-pointer"></CalculumDeleteIcon>
        </div>
        <div class="col-10 text-left row-100 cursor-pointer"><span class="text-black-0 text-xs font-normal cursor-pointer">{{ $t('button.delete') }}</span></div>
      </div>
      <div class="d-flex flex-column row-100 mt-2 options-menu-card" v-if="showDeleteOptions">
        <p class="text-center">{{ $t('label.deleteConfirmation') }}</p>
        <div class="d-flex justify-content-around align-items-center mb-2"><a class="btn-action-analyze-program-card" @click="showDeleteOptions = false"><span>{{ $t('button.cancel') }}</span></a><a class="btn-action-analyze-program-card" @click="deletePlan()"><span>{{ $t('global.yes') }}</span></a></div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, onMounted, onUnmounted, watch } from 'vue'
import { Plan } from '@/modules/home/types'
import { removeIRI } from '@/utils'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useSubscribeStore } from '@/stores/subscribe'
import { usePlanStore } from '@/stores/plan'
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import CalculumBookmarkIcon from '@/modules/components/CalculumBookmarkIcon.vue'
import CalculumCloneIcon from '@/modules/components/CalculumCloneIcon.vue'
import CalculumClose from '@/modules/components/CalculumClose.vue'
import CalculumDeleteIcon from '@/modules/components/CalculumDeleteIcon.vue'
import CalculumEditIcon from '@/modules/components/icons/IconEdit.vue'
import CalculumKebab from '@/modules/components/CalculumKebab.vue'
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import CalculumShowIcon from '@/modules/components/icons/IconShow.vue'
import CalculumTypeProgram from '@/modules/components/CalculumTypeProgram.vue'
import PlanPhase from '@/modules/home/plan/components/PlanPhase.vue'
import useFirebase from "@/composables/firebase/useFirebase";
import { useRouter} from "vue-router";

export default defineComponent({
  name: 'PlanCardV2',
  components: { CalculumTypeProgram, Tooltip, CalculumClose, CalculumKebab, CalculumEditIcon, CalculumShowIcon, CalculumBookmarkIcon, CalculumCloneIcon, CalculumDeleteIcon, CalculumModal, CalculumLoading, PlanPhase },
  props: {    
    lastItem: {type: Boolean, required: false, default: false},
    planData: { type: Object, required: true },
    uniqueIds: {type: Array, required: true},

  },
  emits: ['refreshPlans'],
  setup( props, { emit } ){
    const subscribeStore = useSubscribeStore()
    const planStore = usePlanStore()
    const router = useRouter();
    interface PlanCardInterface {
      cloneName: string,
      loading: boolean,
      planDataObject: Plan,
      planMarked: boolean,
      recomendStartDate: string,
      showDeleteOptions: boolean,
      showMenu: boolean,
      showNewPhase: boolean,
    }

    const planCard = reactive<PlanCardInterface>({
      cloneName: '',
      loading: false,
      planDataObject: props.planData,
      planMarked: false,
      recomendStartDate: '',
      showDeleteOptions: false,
      showMenu: false,
      showNewPhase: false,
    })

    function goToOverview() {

      router.push({
          name: Routing.home.plan.homeHomePlanV2,          
          query: {
            planId: removeIRI(props.planData['@id'])
          }
      });

      
    }

    function markCard() {
      planCard.loading = true
      let marked
      if (planCard.planMarked === true) {
        marked = false
      } else {
        marked = true
      }
      const params = {
        planId: props.planData['@id'],
        marked: marked,
        callbackSuccess: (plan: any) => {
          planCard.planMarked = plan.marked
          planCard.loading = false
        },
        callbackError: () => {
          
        }
      }
      planStore.patchPlan(params)
    }

    function updatePlan(planId: string) {

      router.push({
          name: Routing.home.analyze.homeAnalyzeProgramToPlan1,          
          query: {
            planId: removeIRI(planId)
          }
      });
      
    }

    function deletePlan() {
      planCard.loading = true
      const params = {
        planId: props.planData['@id'],
        callbackSuccess: () => {
          planStore.setDefaultPlan(null)
          planCard.loading = false
          emit('refreshPlans')
        },
        callbackError: () => {
          
        }
      }
      planStore.deletePlan(params)
    }

      function goToProgramOverview(programData: any) { 
        
        router.push({
          name: Routing.home.analyze.homeAnalyzeProgramOverview,       
          query: {
            selectedProgramId: removeIRI(programData['@id']),
            programTarget: programData.programTarget
          }
      });


        
      }

    onMounted(() => {
      /*****  
      ** add 2 new properties to each plan obj
      ** programInrecalculation and pendingRecalculation
      ****/
      planCard.planDataObject.programInrecalculation = props.planData.program.recalculationInProgress  
      planCard.planDataObject.pendingRecalculation = props.planData.program.pendingRecalculation      
      
    })

    
    watch(
      () => subscribeStore.refreshPrograms,
      (newValue) => {
        switch (newValue) {          
          case 'calculationPending':
            planCard.planDataObject.programInrecalculation = false;  
            planCard.planDataObject.pendingRecalculation = true;
            break;
          case 'recalculating':         
            planCard.planDataObject.programInrecalculation = true;  
            planCard.planDataObject.pendingRecalculation = false;
            break;
          case 'ready':            
            planCard.planDataObject.programInrecalculation = true;
            planCard.planDataObject.pendingRecalculation = false;
            //emit to call api again for all plans
            emit('refreshPlans')
            break;
          default:
            break;        
        }        
      }
    );

    return {
      ...toRefs(planCard),
      deletePlan,
      formatData,
      goToProgramOverview,
      goToOverview,
      markCard,
      removeIRI,      
      updatePlan,
    }
  }

})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
.buttonLeft {
  width: 50%;
  padding-left: 5px;
  padding-right: 5px;

  @media (min-width: 1200px) and (max-width: 1313px) {
    width: 100%;    
    padding-left: 5px;
    padding-right: 5px;
  }

  @media (max-width: 1199px) {
    width: 50%;
    padding-left: 5px;
    padding-right: 5px;
  }
}

.buttonRight {
  width: 50%;
  padding-left: 5px;
  padding-right: 5px;

  @media (min-width: 1200px) and (max-width: 1313px) {
    width: 100%;
    padding-left: 5px;
    padding-right: 5px;
    padding-top: 5px;
  }

  @media (max-width: 1199) {
    width: 50%;
    padding-left: 5px;
    padding-right: 5px;
  }
}


@keyframes fadeInDown {

  0%   {opacity: 0;}
  25%  {opacity: 0.25;}
  50%  {opacity: 0.50;}
  75%  {opacity: 0.75;}
  100% {opacity: 1;}
  }
  .name-author {
    max-width: 60%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    @media (min-width: 1200px) and (max-width: 1313px) {      
      max-width: 50%;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
}

.card-v2 {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;  
  width: 100%;
  min-height: 410px;
  max-height: 410px;
  background: #FFFFFF;
  border: 1px solid #EAECF0;
  box-shadow: 0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06);
  border-radius: 8px;
  padding: 24px;

  @media (min-width: 1200px) and (max-width: 1313px) {
    min-height: 460px;
    max-height: 460px;
    padding: 16px;
  }
}
.body-card {
  padding: 0px 24px;
  width: 100%;
}
.vector {
  width: 100%;
  height: 0px;
  border: 1px solid #EAECF0;
  flex: none;
  order: 1;
  align-self: stretch;
  flex-grow: 0;
}

span.icon-svg.icon-analyze-black {
  width: 16px;
  height: 20px;
}

.truncate-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 80%;
  display: block;
  text-align: center;
}

.card-menu {
  animation-name: fadeInDown;
  animation-duration:0.3s;
}

@media (max-width: 1864px) {
  span.tag-name {
    padding: 5px 1px;
    width: max-content;
    display: block;
  }
  .body-card {
    padding: 0px;
  }
}

@media (max-width: 1274px) {
  span.tag-name {
    padding: 5px 0px;
    font-weight: 300;
    width: max-content;
    display: block;
  }
  .body-card {
    padding: 0px;
  }
}

@media (max-width: 1200px) {
  span.tag-name {
    padding: 5px 0px;
    font-weight: 300;
    width: max-content;
    display: block;
  }
  .body-card {
    padding: 0px;
  }
}

.options-menu-card {
  &:hover {
    color: $color-red;

    span {
      color: $color-red; 
    }
  }
}

</style>