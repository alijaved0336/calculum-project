<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<iconEllipsisVertical v-if="programRecalulating" :class="programRecalulating ? 'program-recalculating three-dots-icon' : 'three-dots-icon'"></iconEllipsisVertical><button type="button" id="plan-options-menu" v-else class="btn-unstyled" data-toggle="collapse" data-target="#options-menu" aria-expanded="false" aria-controls="options-menu">
  <iconEllipsisVertical :class="programRecalulating ? 'three-dots-icon program-recalculating' : 'three-dots-icon'"></iconEllipsisVertical></button>
<div class="fix-menu-plan collapse" id="options-menu">
  <ul>
    <li><a class="btn-action-analyze-program-card" @click="$emit('mark-card')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" :style="iconColorMarked">
          <path d="M7.5,0h-5A1.5,1.5,0,0,0,1,1.5v8a.5.5,0,0,0,.791.407L4.855,7.718a.249.249,0,0,1,.29,0L8.209,9.907A.5.5,0,0,0,9,9.5v-8A1.5,1.5,0,0,0,7.5,0Z"></path>
        </svg><span>{{ $t('button.marked') }}</span></a></li>
    <li><a class="btn-action-analyze-program-card" @click="updatePlan">
        <svg class="mt-2" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" transform="matrix(1.6,0,0,1.6,0,0)" style="margin-right: 5px; margin-left: 4.5px">
          <path d="M6.122,5.523,9.805,1.84a.666.666,0,0,0,0-.94L9.1.2a.664.664,0,0,0-.94,0L4.477,3.877a.5.5,0,0,0-.139.267L4.062,5.705a.2.2,0,0,0,.2.235.2.2,0,0,0,.034,0l1.561-.276A.5.5,0,0,0,6.122,5.523Z" stroke="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="0"></path>
          <path d="M6.829,6.23a1.5,1.5,0,0,1-.8.416l-1.563.276a1.433,1.433,0,0,1-.206.018,1.19,1.19,0,0,1-.849-.352,1.2,1.2,0,0,1-.334-1.057l.276-1.562a1.494,1.494,0,0,1,.417-.8L5.513,1.427A.25.25,0,0,0,5.336,1H1.5A1.5,1.5,0,0,0,0,2.5l.01,6a1.5,1.5,0,0,0,1.5,1.5H7.5A1.5,1.5,0,0,0,9,8.5V4.663a.25.25,0,0,0-.427-.177Z" stroke="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="0"></path>
        </svg><span>{{ $t('global.editPlan') }}</span></a></li>
    <li><a class="btn-action-analyze-program-card" id="delete-plan-option" @click="deletePlan">
        <svg class="mt-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" transform="matrix(1.6,0,0,1.6,0,0)" style="margin-right: 5px; margin-left: 4.5px">
          <path d="M10,2.942a.75.75,0,0,0-.75-.75H7.562a.25.25,0,0,1-.245-.2,2.381,2.381,0,0,0-4.675,0,.251.251,0,0,1-.245.2H.75a.75.75,0,0,0,0,1.5H1a.25.25,0,0,1,.25.25v4.5a1.5,1.5,0,0,0,1.5,1.5h4.5a1.5,1.5,0,0,0,1.5-1.5v-4.5A.25.25,0,0,1,9,3.692h.25A.75.75,0,0,0,10,2.942ZM4.979,1.312A1.108,1.108,0,0,1,5.9,1.8a.254.254,0,0,1,.015.259.25.25,0,0,1-.221.133H4.269A.25.25,0,0,1,4.063,1.8,1.1,1.1,0,0,1,4.979,1.312ZM4.125,7.688a.625.625,0,0,1-1.25,0v-2.5a.625.625,0,1,1,1.25,0Zm3,0a.625.625,0,0,1-1.25,0v-2.5a.625.625,0,1,1,1.25,0Z"></path>
        </svg><span>{{ $t('global.deletePlan') }}</span></a></li>
    <li><a class="btn-action-analyze-program-card" @click="Routing.home.analyze.openHomeAnalyzeProgramToPlan1()">
        <AddIcon class="cursor-pointer"></AddIcon><span class="cursor-pointer">{{ $t('global.newPlanOption') }}</span></a></li>
  </ul>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, computed } from 'vue'

import { fontIcons } from '@/resources/assets/assets'
import { usePlanStore } from '@/stores/plan'
import * as Routing from '@/services/router/Routing'
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import AddIcon from '@/modules/components/icons/IconAdd.vue'
import { useRouter} from "vue-router";

export default defineComponent({
  name: 'PlanOptions',
  components: {
    CalculumLoading, 
    CalculumModal, 
    iconEllipsisVertical,
    AddIcon
  },
  props: {
    planId: { type: String, required: true },
    planName: { type: String, required: true },
    isMarked: { type: Boolean, required: true },
    programRecalulating: { type: Boolean, required: false, default: false }
  },
  emits: ['mark-card','unsusbcribePlan','subscribePlan'],
  setup (props, { emit }) {
    const planStore = usePlanStore()
    const router = useRouter();
    interface PlanOptions {
      loading: boolean,
      showCloneModal: boolean,
      cloneName: string
    }

    const planOptions = reactive<PlanOptions>({
      loading: false,
      showCloneModal: false,
      cloneName: ''
    })

    const iconColorMarked = computed(() => {
      return props.isMarked ? '--iconColor: black' : '--iconColor: #D3D3D3'
    })

    function deletePlan () {

      emit('unsusbcribePlan')
      planOptions.loading = true
      const params = {
        planId: "/api/plans/"+props.planId,
        callbackSuccess: () => {
          planStore.setDefaultPlan(null)
          Routing.home.plan.openHomePlanAllPlans()
        },
        callbackError: () => {          
          planOptions.loading = false
          emit('subscribePlan')
        }
      }
      planStore.deletePlan(params)
    }

 
    function updatePlan () {
      router.push({
          name: Routing.home.analyze.homeAnalyzeProgramToPlan1,          
          query: {
            planId: props.planId
          }
      });

    }

    return {
      ...toRefs(planOptions),
      // clonePlan,
      deletePlan,
      updatePlan,
      iconColorMarked,
      fontIcons,
      Routing
    }
  }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

#options-menu {
  z-index: 97;
}
.btn-action-analyze-program-card {
  border: none;
  background: $color-white;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  transition: all ease 0.3s;
  cursor: pointer;

  span {
    color: $color-black;
    font-size: 16px;
  }

  svg {
    fill: var(--iconColor);
    margin-right: 10px;
    width: 16px !important;
    height: 16px !important;
  }

  &:hover {
    span {
      color: $color-red !important;
    }
    svg {
      fill: $color-red;
    }
  }

  .custom-icon-size{
    width: 25px !important;
    height: 25px !important;
  }
}
.three-dots-icon {
  text-decoration: none;
  max-height: 16px;
  fill: $color-gray-500;
  &.program-recalculating {
    fill: color-gray-200;
  }
}

a {
  border:none;
  text-decoration: none;
  &:hover {
    text-decoration: none;
    border:none
  }
}

</style>
