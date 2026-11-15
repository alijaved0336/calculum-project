<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<CalculumModal v-if="showConfirmDeleteProgramWithPlansModal" @close="showConfirmDeleteProgramWithPlansModal = false" :size="'lg'" :showClose="true" :title="$t('home.plan.programToPlan2.confirm')">
  <template v-slot:modalContent>
    <p>{{ $t('home.analyze.programsPanel.confirmMessage1') }}</p>
    <div v-if="plans">
      <ul class="d-flex flex-wrap justify-content-center">
        <li class="mr-2" v-for="plan, index in plans" :key="plan['@id']"><a class="btn-action-analyze-program-card" @click="navigateSingleDimensionPlan(plan)">
            <svg viewBox="0 0 32 32" transform="matrix(1.4,0,0,1.4,0,0)" style="margin-right: 10px; margin-left: 4.5px">
              <g id="icon32_plan" data-name="icon32/plan">
                <rect id="Rectangle" width="26" height="27" rx="4" transform="translate(3 4)" fill="currentColor"></rect>
                <rect id="Rectangle-2" data-name="Rectangle" width="15.766" height="3.21" rx="1.605" transform="translate(8 11)" fill="#fff"></rect>
                <rect id="Rectangle-3" data-name="Rectangle" width="11.556" height="3.21" rx="1.605" transform="translate(8 19.42)" fill="#fff"></rect>
                <circle id="Oval" cx="4" cy="4" r="4" transform="translate(12)" fill="currentColor"></circle>
              </g>
            </svg><span class="d-flex flex-nowrap" style="font-size: 1.25rem">{{ plan.title }}</span></a></li>
      </ul>
    </div>
    <p>{{ $t('home.analyze.programsPanel.confirmMessage2') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" type="button" :disabled="loadingUninstall" @click="showConfirmDeleteProgramWithPlansModal = false" style="z-index: 1; width: fit-content">{{ $t('button.cancel') }}</button>
    <button class="btn btn-primary" :disabled="loadingUninstall" type="button" @click="deleteProgram" style="z-index: 1; width: fit-content"><span class="spinner-border spinner-border-sm" v-if="loadingUninstall" role="status" aria-hidden="true"></span><span v-else>{{ $t('button.delete') }}</span></button>
  </template>
</CalculumModal><!-- FOR PROGRAM DETAILS-->
<CalculumModal v-if="toggleProgramDetails" @close="toggleProgramDetails = false" :size="'sm'" :showClose="true" :title="$t('global.programDetails')">
  <template v-slot:modalContent>
    <div class="d-flex flex-column" v-if="programDetails">
      <div class="row">
        <div class="col-5"><span>{{ $t('global.programDetailsHeaders.programName') }}</span></div>
        <div class="col-5">
          <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'"><span class="d-block font-semibold text-gray-700 text-lg custom-ellipsis" :title="programDetails?.name">{{  programDetails?.name ?? '' }}</span></Tooltip>
        </div>
      </div>
      <div class="row">
        <div class="col-5"><span class="mr-3">{{ $t('global.programDetailsHeaders.creator') }}</span></div>
        <div class="col-5"> <span class="d-block font-semibold text-gray-700 text-lg custom-ellipsis">{{ programDetails?.createdBy.firstName ?? '' }}</span></div>
      </div>
      <div class="row">
        <div class="col-5"><span class="mr-3">{{ $t('global.programDetailsHeaders.modified') }}</span></div>
        <div class="col-5"><span class="d-block font-semibold text-gray-700 text-lg custom-ellipsis">{{  programDetails.lastChange ? formatData.getMonthDayAndYear(programDetails?.updated) : 'N/A' }}</span></div>
      </div>
      <div class="row">
        <div class="col-5"><span class="mr-3">{{ $t('global.programDetailsHeaders.created') }}</span></div>
        <div class="col-5"><span class="d-block font-semibold text-gray-700 text-lg custom-ellipsis">{{  programDetails?.created ? formatData.getMonthDayAndYear(programDetails?.created) : 'N/A' }}</span></div>
      </div>
    </div>
  </template>
</CalculumModal>
<CalculumModal v-if="showConfirmDeleteProgram" @close="showConfirmDeleteProgram = false" :size="'lg'" :showClose="true" :title="$t('home.plan.programToPlan2.confirm')">
  <template v-slot:modalContent>
    <p>{{ $t('home.analyze.programsPanel.confirmMessage3') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" type="button" :disabled="loadingUninstall" @click="showConfirmDeleteProgram = false" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }}</span></button>
    <button class="btn btn-primary" :disabled="loadingUninstall" type="button" @click="deleteProgram" style="z-index: 1; width: fit-content"><span class="spinner-border spinner-border-sm" v-if="loadingUninstall" role="status" aria-hidden="true"></span><span v-else>{{ $t('button.delete') }}</span></button>
  </template>
</CalculumModal><button type="button" class="ml-auto btn btn-simple btn-simple--icon link link--icon collapsed" id="closeoptions" aria-controls="options-menu" aria-expanded="false" data-target="#options-menu" data-testid="kebab-menu" data-toggle="collapse" @click="showOptions = !showOptions">
  <iconEllipsisVertical class="three-dots-icon my-auto"></iconEllipsisVertical>
  <div class="badge badge-menu-icon" v-if="isBadgeShowing"></div></button>
<Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
  <div class="fix-menu collapse" id="options-menu" v-if="showOptions" style="z-index: 1041">
    <ul class="drowdown-menu-container">
      <li class="btn-action-analyze-program-card" v-if="userIsSuperAdmin">
        <button class="btn btn-simple btn-with-icon link link--icon" @click="recalculateProgram">
          <IconSyncColorable class="info_icon"></IconSyncColorable><span :title="$t('home.analyze.programRecalculateTooltip')">{{ $t('button.recalculate') }}</span>
          <div class="badge badge-menu-option" v-if="isBadgeShowing"></div>
        </button>
      </li>
      <li class="btn-action-analyze-program-card" v-if="userIsSuperAdmin">
        <button class="btn btn-simple btn-with-icon link link--icon" @click="summarizeValues">
          <IconSyncColorable class="info_icon"></IconSyncColorable><span>{{ $t('button.summarizeValues') }}</span>
        </button>
      </li>
      <hr class="mb-2 mt-2"/>
      <li v-if="!blockProgramOptions">
        <MarkActiveProgram class="m-0" :status="isActive" :showLabel="true" v-if="!loading" @change-status="changeActiveStatus"></MarkActiveProgram>
      </li>
      <li class="btn-action-analyze-program-card" v-if="false" :class="blockProgramOptions ? 'remove-hover-effects' : ''">
        <button class="btn btn-simple btn-with-icon link link--icon" @click="setDeleteOptions" :disabled="blockProgramOptions">
          <iconDeleteSvg class="info_icon"></iconDeleteSvg><span>{{ $t('button.delete') }}</span>
        </button>
      </li>
      <hr class="mb-2 mt-2"/>
      <li>
        <button class="btn btn-simple btn-with-icon link link--icon" @click="toggleProgramDetails = !toggleProgramDetails">
          <iconInformation class="info_icon"></iconInformation><span class="ml-2">{{ $t('global.programDetails') }}</span>
        </button>
      </li>
    </ul>
  </div>
</Tooltip>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, computed, PropType, onMounted, onUnmounted } from 'vue'

import { fontIcons } from '@/resources/assets/assets'
import { removeIRI } from '@/utils';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useAnalyzeStore } from '@/stores/analyze'
import { useEntityCardStore } from '@/stores/entityCard'
import * as clickOutsideRelated from '@/utils/clickOutsideRelated'
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import iconInformation from '@/resources/assets/images/icons/iconInformation.vue'
import iconCloneSvg from '@/resources/assets/images/icons/iconCloneSvg.vue'
import iconEditSvg from '@/resources/assets/images/icons/iconEditSvg.vue'
import iconDeleteSvg from '@/resources/assets/images/icons/iconDeleteSvg.vue'

import MarkActiveProgram from '@/modules/home/analyze/components/MarkActiveProgram.vue'
import useFirebase from "@/composables/firebase/useFirebase";

// Icons
import AddIcon from '@/modules/components/icons/IconAdd.vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import IconSyncColorable from "@/resources/assets/images/icons/IconSyncColorable.vue";
import { Program } from '../types';
import { useUser } from '@/composables';
import { useRouter} from "vue-router";

export default defineComponent({
  name: 'AnalyzeProgramOptions',
  components: {
    AddIcon,
    CalculumLoading,
    CalculumModal,    
    iconCloneSvg,
    iconEditSvg,
    iconDeleteSvg,
    iconEllipsisVertical,
    iconInformation,
    IconSyncColorable,
    MarkActiveProgram,
    Tooltip,
  },
  props: {
    blockProgramOptions: { type: Boolean, required: false, default: false},
    isActive: { type: Boolean, required: true },
    isBadgeShowing: { type: Boolean, default: false },
    plans: { type: Array as PropType<Array<any>>, required: false, default: () => [] },
    programDetails: { type: Object as PropType<Program>, required: false, default: null },
    programName: { type: String, required: true },
    programTarget: { type: String, required: true },
    selectedProgramId: { type: String, required: true },
    selectedProgramUuid: { type: String, required: false, default: null },
    spendFileVersion: { type: String, required: true },
  },
  emits: ['change-status', 'editPlan', 'close-menu-options'],
  setup(props, { emit }) {
    const analyzeStore = useAnalyzeStore()
    const entityCardStore = useEntityCardStore()
    const {
      userIsSuperAdmin,
      userIsAdmin,
      isPilotAccount
    } = useUser();
    const router = useRouter();

     const isAdminUser = computed(() => {
      //- Super admin
      if (userIsSuperAdmin.value) {
        return true
      }

      //- Pilot account
      if (isPilotAccount()) { 
        return false
      }

      //- Admin
      return userIsSuperAdmin.value || userIsAdmin.value
    })

    
    interface AnalyzeProgramOptions {
      cloneName: string,
      formHasError: boolean,
      loading: boolean,
      loadingUninstall: boolean,
      showConfirmDeleteProgram: boolean
      showConfirmDeleteProgramWithPlansModal: boolean      
      showOptions: boolean,
      toggleProgramDetails: boolean
    }

    const analyzeProgramOptions = reactive<AnalyzeProgramOptions>({
      cloneName: '',
      formHasError: false,
      loading: false,
      loadingUninstall: false,
      showConfirmDeleteProgram: false,
      showConfirmDeleteProgramWithPlansModal: false,      
      showOptions: false,
      toggleProgramDetails: false
    })

    const { fnSetUnsubscribeProgram } = useFirebase();

    function navigateSingleDimensionPlan(plan: any) {
      router.push({
            name: Routing.home.plan.homeHomePlanV2,     
            query: {
              planId: removeIRI(plan)
            }
        });              
    }

    function deleteProgram() {
      analyzeProgramOptions.loadingUninstall = true
      const params = {
        programId: props.selectedProgramId,
        callbackSuccess: () => {
          entityCardStore.setSelectedProgram(null)
          fnSetUnsubscribeProgram()
          Routing.home.analyze.openHomeAnalyzeProgramsPanel()
          analyzeProgramOptions.loadingUninstall = false
        },
        callbackError: () => {
          entityCardStore.setSelectedProgram(null)
          analyzeProgramOptions.loadingUninstall = false

        }
      }
      analyzeStore.deleteProgram(params)
    }

    function recalculateProgram() {
      emit('close-menu-options')
      const params = {
        programId: props.selectedProgramId,
        callbackSuccess: (callbackSuccessData: any) => {
          analyzeProgramOptions.loading = false          
        },
        callbackError: (callbackErrorData: any) => {
          analyzeProgramOptions.loading = false
          if (import.meta.env.DEV) console.log('ERROR Generate Clone Program:', callbackErrorData.data.error)
        }
      }
      analyzeStore.postRecalculate(params)
    }

    function summarizeValues() {
      emit('close-menu-options')
      if (!props.spendFileVersion) return
      const params = {
        spendFileVersionUuid: props.spendFileVersion,
        callbackSuccess: (callbackSuccessData: any) => {
          analyzeProgramOptions.loading = false
        },
        callbackError: (callbackErrorData: any) => {
          analyzeProgramOptions.loading = false
          if (import.meta.env.DEV) console.log('ERROR Summarize Values:', callbackErrorData)
        }
      }
      analyzeStore.postSummarizeValues(params)
    }

    function setDeleteOptions() {
      formatData.closeMenuOptions()
      if (props.plans && props.plans.length) {
        analyzeProgramOptions.showConfirmDeleteProgramWithPlansModal = true
      } else {
        analyzeProgramOptions.showConfirmDeleteProgram = true
      }
    }

    function changeActiveStatus(status: any) {
      emit('close-menu-options')
      emit('change-status', status)
    }

    // *** onMounted ***
    onMounted(() => {
      document.body.addEventListener('click', handleClick)
    })

    // *** onUnmounted ***
    onUnmounted(() => {
      document.body.removeEventListener('click', handleClick)
    })

    function handleClick(e: any) {
      const clickedInside = clickOutsideRelated.menuPopup(e, '.three-dots-icon', '#options-menu');

      if (clickedInside !== undefined) {
        if (clickedInside) {
          analyzeProgramOptions.showOptions = true
        } else {
          analyzeProgramOptions.showOptions = false
        }
      }
    }

    
    return {
      ...toRefs(analyzeProgramOptions),
      changeActiveStatus,
      clickOutsideRelated,      
      deleteProgram,      
      fontIcons,
      formatData,
      isAdminUser,
      navigateSingleDimensionPlan,
      recalculateProgram,
      summarizeValues,
      setDeleteOptions,
      userIsSuperAdmin
    }
  }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

#closeoptions {
  fill: #344054 !important;

  svg {
    path {
      fill: #344054 !important;
    }
  }
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
}

// Three dots icon 
.three-dots-icon {
  max-height: 16px;
  fill: $color-gray-500
}

span.tag-name {
  width: 40%;
  margin: 0px auto;
  border-radius: 20px;
  padding: 5px 10px;
  margin-right: 50px;
}

span.tag-name.cashFlow {
  background: $color-green;
  color: $color-white;

  &:hover {
    color: $color-white !important;
  }
}

span.tag-name.harmonization {
  background: $color-yellow;
  color: $color-white;

  &:hover {
    color: $color-white !important;
  }
}

.col-4.mt-4.tag-align {
  text-align: right;
}

.badge {
  background-color: $color-primary-600;
  border-radius: 50%;
  font-size: 0.5rem;
  height: 8px;
  position: relative;
  width: 8px;

  &-menu-icon {
    display: block;
    top: -25px;
    left: 16px;
  }

  &-menu-option {
    display: inline;
    margin-left: auto;
  }
}

li.remove-hover-effects:hover{  
  cursor: not-allowed;
  .btn-with-icon {
    cursor: not-allowed;
    span {
      color: #000000 !important;
    }
  }
}

.custom-ellipsis {
  max-width: 180px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.info_icon {
  width: 15px;
  height: 15px;
}
</style>