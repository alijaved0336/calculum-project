<template>
<CalculumLoading v-if="loadingPDF || loading" :modal="true"></CalculumLoading>
<CalculumModal v-if="showConfirmDeleteProgram" @close="showConfirmDeleteProgram = false" :size="'lg'" :showClose="true" :key="createdId" :title="$t('home.plan.programToPlan2.confirm')">
  <template v-slot:modalContent>
    <p>{{ $t('home.analyze.programsPanel.confirmMessage3') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" :disabled="loadingUninstall" @click="showConfirmDeleteProgram = false" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }}</span></button>
    <button class="btn btn-primary font-md" :disabled="loadingUninstall" @click="deleteProgram" style="z-index: 1; width: fit-content"><span class="spinner-border spinner-border-sm" v-if="loadingUninstall" role="status" aria-hidden="true"></span><span v-else>{{ $t('button.delete') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="showModalForDeactivatingProgram" @close="showModalForDeactivatingProgram = false" :size="'lg'" :showClose="true" :title="$t('home.analyze.alertDeactivateProgram')" :key="createdId">
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => showModalForDeactivatingProgram = false " style="z-index: 1; width: fit-content"> <span>{{ $t('global.no') }}</span></button>
    <button class="btn btn-primary font-md" @click="changeActiveStatus(!isActive)" style="z-index: 1; width: fit-content"> <span>{{ $t('home.overview.yes') }}        </span></button>
  </template>
</CalculumModal>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.plan.programToPlan2.confirm')" v-if="showConfirmDeleteProgramWithPlansModal" :key="createdId" @close="showConfirmDeleteProgramWithPlansModal = false">
  <template v-slot:modalContent>
    <p>{{ $t('home.analyze.programsPanel.confirmMessage1') }}</p>
    <div v-if="plans">
      <ul class="d-flex flex-wrap justify-content-center">
        <li class="mr-2" v-for="plan in plans" :key="plan['@id']"><a class="btn-action-analyze-program-card" @click="navigateSingleDimensionPlan(plan['@id'])">
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
    <button class="btn outline-secondary-btn font-md" @click="showConfirmDeleteProgramWithPlansModal = false" :disabled="loadingUninstall" type="button" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }}</span></button>
    <button class="btn btn-primary" @click="deleteProgram" :disabled="loadingUninstall" type="button" style="z-index: 1; width: fit-content"><span class="spinner-border spinner-border-sm" v-if="loadingUninstall" role="status" aria-hidden="true"></span><span v-else>{{ $t('button.delete') }}</span></button>
  </template>
</CalculumModal>
<div class="col-12 col-sm-12 col-md-6 col-lg-4 col-xl-3 pb-4">
  <div class="card-v2" :class="isActive ? 'active-card' : ''">
    <div class="d-flex flex-column" style="width: 100%;" v-if="!showMenu && !showPlans">
      <div class="d-flex align-items-center justify-content-center mb-16" v-if="!recalculationInProgress" style="width: 100%;">
        <div class="col-1">
          <iconBlueBadge class="icon-svg-18" v-if="isActive"></iconBlueBadge>
        </div>
        <div class="col-10 text-center">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-gray-700 text-font-600-24 cursor-pointer truncate-title" :title="title" style="width: 100%;" @click="goToProgramOverview" v-if="title.length > 10">{{ title }}</span><span class="text-gray-700 text-font-600-24 cursor-pointer text-center" v-else :title="title" style="width: 100%;" @click="goToProgramOverview">{{ title }}</span></Tooltip>
        </div>
        <div class="col-1 cursor-pointer" @click="clickFixRightMenu" v-if="!spendFileInrecalculation">          <span class="options">
            <CalculumKebab></CalculumKebab></span></div>
      </div>
      <div class="d-flex align-items-center justify-content-center mb-16" v-else style="width: 100%;">
        <div class="col-12 text-center">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-gray-700 text-font-600-24 cursor-pointer truncate-title" :title="title" style="width: 100%;" @click="goToProgramOverview" v-if="title.length > 10">{{ title }}</span><span class="text-gray-700 text-font-600-24 cursor-pointer text-center" v-else :title="title" style="width: 100%;" @click="goToProgramOverview">{{ title }}</span></Tooltip>
        </div>
      </div>
      <div class="d-flex align-items-center justify-content-center row-100 mb-2"><span class="text-gray-500 text-sm font-medium mr-1">{{ $t('home.analyze.createdBy') }}:</span>
        <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-gray-700 text-sm font-semibold name-author" :title="user" style="width: 100%;" @click="goToProgramOverview">{{ user }}</span></Tooltip>
      </div>
      <div class="d-flex align-items-center justify-content-center row-100" v-if="!recalculationInProgress"><span class="text-gray-500 text-sm font-medium mr-1">{{ $t('global.plan') }}:</span><span class="text-gray-700 text-sm font-medium cursor-pointer hover-primary-700" v-if="!plans.length" @click="goToPlan()">{{ $t('home.analyze.clickToAdd') }}</span><span class="text-gray-400 text-sm font-medium cursor-pointer text-center list-plans" v-else v-for="(plan, index) in plans.sort((a, b) => a.title.localeCompare(b.title))" :key="plan['@id']">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="plan-name" :title="plan.title" style="margin: 0;" v-if="index === 0 || index === 1" @click="navigateSingleDimensionPlan(plan['@id'])">{{ index === 0 && plans.length > 1 ? getPlanTitle(plan.title) + ', ' : " " + getPlanTitle(plan.title) }}</span></Tooltip></span><span class="plan-name text-sm font-medium" v-if="plans.length > 2" @click="showPlans = !showPlans">{{ calculatedRemainingPlans }} </span></div>
      <div class="d-flex row-100">
        <hr class="vector"/>
      </div>
      <div class="d-flex align-items-center row-100 flex-column" v-if="recalculationInProgress"><img :src="images.logoGif" style="width: 100px; height: auto;"/>
        <h2 class="text-gray-500 font-weight-600 text-sm text-center">{{ $t('home.analyze.groupsConfiguration.calculatingProgress') }}</h2>
        <div class="row d-flex align-items-center justify-content-center">
          <p class="text-gray-500 text-xs font-medium text-center">{{ $t('home.analyze.groupsConfiguration.msg4') }}</p>
        </div>
      </div>
      <div class="d-flex flex-column justify-content-center body-card" v-else>
        <div class="d-flex mb-20 cursor-pointer">
          <iconFile class="icon-svg-18 mr-1"></iconFile>
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"></Tooltip><span class="text-gray-500 text-sm font-medium ellipsis" :title="fullSpendFileName">{{ $t('label.version') }} {{ spendFileTitle }} </span>
        </div>
        <div class="d-flex flex-colum flex-wrap mb-1">
          <div class="col-5 row-100"><span class="text-gray-500 text-sm font-normal mr-1">{{ $t('home.analyze.target') }}  </span></div>
          <div class="col-7 text-right"><span class="program-type" v-if="programType != '' " :class="programType">{{$t('home.analyze.'+programType)}}</span></div>
        </div>
        <div class="d-flex flex-colum flex-wrap mb-1">
          <div class="col-5 row-100"><span class="text-gray-500 text-sm font-normal mr-1">{{ $t('global.date') }}</span></div>
          <div class="col-7 text-right"><span class="text-gray-700 text-sm font-semibold">{{ formatData.getMonthDayAndYear(date) }}  </span></div>
        </div>
        <div class="d-flex align-items-center row-100 mb-1" v-if="programType === 'cashFlow' && termHarmonization"><i class="fa-solid fa-check-circle mr-2"></i><span class="text-gray-500 text-sm font-normal">{{ $t('home.analyze.termHarmonization') }}</span></div>
      </div>
    </div>
    <div class="row d-flex btn_box row-100 mt-3" v-if="!showMenu && !showPlans">
      <div class="col-12 col-sm-12 col-md-12 col-lg-12 col-xl-6 mt-1">
        <button class="btn btn-primary font-md" @click="goToProgramOverview" :class="'show-'+programType+'-btn'" style="z-index: 1; width: 100%"><span>{{ $t('home.plan.planCard.show') }}</span></button>
      </div>
    </div>
    <div class="d-flex flex-column" style="width: 100%;" v-if="showMenu">
      <div class="d-flex mb-16" style="width: 100%">
        <div class="col-1"><span>&nbsp;</span></div>
        <div class="col-10"><span>&nbsp;</span></div>
        <div class="col-1 cursor-pointer"><span @click="showMenu = false">
            <CalculumClose class="svg-icon-18"></CalculumClose></span></div>
      </div>
      <div class="d-flex row-100 cursor-pointer options-menu-card">
        <div class="col-2 text-center row-100 cursor-pointer">
          <iconActiveBadge class="icon-svg-18" v-if="!isActive"></iconActiveBadge>
          <iconBlueBadge class="icon-svg-18" v-if="isActive"></iconBlueBadge>
        </div>
        <div class="col-10 text-left row-100 cursor-pointer"> <span class="text-black-0 text-xs font-normal cursor-pointer" v-if="!isActive" :title="$t('home.analyze.activateProgram')" @click="changeActiveStatus(!isActive)">{{ $t('home.analyze.activateProgram') }}</span><span class="text-black-0 text-xs font-normal cursor-pointer" v-if="isActive" :title="$t('home.analyze.deactivateProgram')" @click="showModalForDeactivateProgram">{{ $t('home.analyze.deactivateProgram') }}      </span></div>
      </div>
      <div class="d-flex row-100">
        <hr class="vector"/>
      </div>
      <div class="d-flex row-100 cursor-pointer options-menu-card" @click="goToProgramOverview()">
        <div class="col-2 text-center row-100 cursor-pointer">
          <CalculumShowIcon></CalculumShowIcon>
        </div>
        <div class="col-10 text-left row-100 cursor-pointer"><span class="text-black-0 text-xs font-normal cursor-pointer">{{  $t('global.show') }}</span></div>
      </div>
      <div class="d-flex row-100">
        <hr class="vector"/>
      </div>
    </div>
    <div class="d-flex flex-column" style="width: 100%;" v-if="showPlans && !recalculationInProgress">
      <div class="d-flex align-items-center justify-content-center" style="width: 100%;">
        <div class="col-1"></div>
        <div class="col-10"></div>
        <div class="col-1 cursor-pointer">
          <CalculumClose class="svg-icon-18 cursor-pointer" @click="clickFixRightMenu"></CalculumClose>
        </div>
      </div>
      <ul>
        <li v-for="plan, index in plans" :key="plan['@id']"><a class="btn-action-analyze-program-card" @click="navigateSingleDimensionPlan(plan['@id'])" v-if="index >= 2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" transform="matrix(1.4,0,0,1.4,0,0)" style="margin-right: 10px; margin-left: 4.5px">
              <g :id="`icon32_plan_${index}`" data-name="icon32/plan">
                <rect :id="`Rectangle_${index}`" width="26" height="27" rx="4" transform="translate(3 4)" fill="currentColor"></rect>
                <rect :id="`Rectangle-2_${index}`" data-name="Rectangle" width="15.766" height="3.21" rx="1.605" transform="translate(8 11)" fill="#fff"></rect>
                <rect :id="`Rectangle-3_${index}`" data-name="Rectangle" width="11.556" height="3.21" rx="1.605" transform="translate(8 19.42)" fill="#fff"></rect>
                <circle :id="`Oval_${index}`" cx="4" cy="4" r="4" transform="translate(12)" fill="currentColor"></circle>
              </g>
            </svg><span>{{ plan.title }}     </span></a></li>
      </ul>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, toRefs, onBeforeMount, PropType } from 'vue'
import { fontIcons, images } from '@/resources/assets/assets'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useI18n } from 'vue-i18n'
import { useAnalyzeStore } from '@/stores/analyze'
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import CalculumCloneIcon from '@/modules/components/CalculumCloneIcon.vue'
import CalculumClose from '@/modules/components/CalculumClose.vue'
import CalculumDeleteIcon from '@/modules/components/CalculumDeleteIcon.vue'
import CalculumEditIcon from '@/modules/components/icons/IconEdit.vue'
import CalculumKebab from '@/modules/components/CalculumKebab.vue'
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import CalculumShowIcon from '@/modules/components/icons/IconShow.vue'

import CalculumTypeProgram from '@/modules/components/CalculumTypeProgram.vue'
import iconActiveBadge from '@/resources/assets/images/icons/iconActiveBadge.vue'
import iconBlueBadge from '@/resources/assets/images/icons/iconBlueBadge.vue'
import iconClose from '@/resources/assets/images/icons/iconClose.vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import iconExportPdf from '@/resources/assets/images/icons/iconExportPdf.vue'
import iconFile from '@/resources/assets/images/icons/iconFile.vue'
import MarkActiveProgram from '@/modules/home/analyze/components/MarkActiveProgram.vue'
import { useToast } from 'vue-toastification'
import { removeIRI } from '@/utils'
import useFirebase from "@/composables/firebase/useFirebase";
import { useRouter } from 'vue-router';
import { useUser } from '@/composables';

export default defineComponent({
  name: 'AnalyzeProgramCard',
  components: {
    CalculumCloneIcon,
    CalculumClose,
    CalculumDeleteIcon,
    CalculumEditIcon,
    CalculumKebab,
    CalculumLoading,
    CalculumModal,    
    CalculumShowIcon,
    CalculumTypeProgram,
    iconActiveBadge,
    iconBlueBadge,
    iconClose,
    iconEllipsisVertical,
    iconExportPdf,
    iconFile,
    MarkActiveProgram
  },
  props: {
    date: { type: String, required: true },
    externalFinancing: { type: Boolean, required: true },
    id: { type: String, required: true },
    isActive: { type: Boolean, required: true },
    plans: { type: Array as PropType<Array<any>>, required: true },
    processingTotal: { type: Boolean, required: true },
    programId: { type: String, required: true },
    programType: { type: String, required: true },
    recalculationInProgress: { type: Boolean, required: true },
    pendingRecalculation: { type: Boolean, required: true },
    spendFile: { type: String, required: true },
    spendFileVersionId: { type: String, required: true },
    termHarmonization: { type: Boolean, required: true },
    title: { type: String, required: true },
    user: { type: String, required: true },
    disableEdit: { type: Boolean, required: false, default: false },
    spendFileInrecalculation: { type: Boolean, required: true },
  },
  emits: ['refreshPrograms', 'loading-items'],
  setup(props, { emit }) {
    const analyzeStore = useAnalyzeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const { fnSetUnsubscribeProgram } = useFirebase();
    const router = useRouter();
    const toast = useToast()


    const {      
      userIsSuperAdmin,
      userIsAdmin,
      restrictEditProgram
    } = useUser();

    const isAdminUser = computed(() => {

      if (restrictEditProgram()) { 
        return false
      }

      return userIsSuperAdmin.value || userIsAdmin.value
    })

    interface AnalyzeProgramCardInterface {
      checkbox: {
        termHarmonization: boolean,
        externalFinancing: boolean,
        discount: boolean
      },
      cloneModalKey: number,
      forProgramView: boolean
      fullSpendFileName: string,
      loading: boolean,
      loadingPDF: boolean
      loadingUninstall: boolean,
      programMarked: boolean,
      sharedUsers: Array<any>,
      showConfirmDeleteProgram: boolean,
      showConfirmDeleteProgramWithPlansModal: boolean,
      showConfirmEditProgramWithPlansModal: boolean,
      showDeleteOptions: boolean,
      showMenu: boolean,
      showModalForDeactivatingProgram: boolean
      showModaltoEdit: boolean,      
      showPlans: boolean,
      spendsActive: number
    }

    const analyzeProgramCard = reactive<AnalyzeProgramCardInterface>({
      checkbox: {
        termHarmonization: false,
        externalFinancing: false,
        discount: false
      },
      cloneModalKey: new Date().getUTCMilliseconds(),
      forProgramView: true,
      fullSpendFileName: '',
      loading: false,
      loadingPDF: false,
      loadingUninstall: false,
      programMarked: false,
      sharedUsers: [],
      showConfirmDeleteProgram: false,
      showConfirmDeleteProgramWithPlansModal: false,
      showConfirmEditProgramWithPlansModal: false,
      showDeleteOptions: false,
      showMenu: false,
      showModalForDeactivatingProgram: false,
      showModaltoEdit: false,      
      showPlans: false,
      spendsActive: 0
    })

    const createdId = computed(() => {
      let newId = props.id.replace('/api/analyze/programs/', '')
      newId = newId.replaceAll('-', '')
      return newId
    })

    const iconColorMarked = computed(() => {
      return analyzeProgramCard.programMarked === true ? '--iconColor: black' : '--iconColor: #D3D3D3'
    })

    const spendFileTitle = computed(() => {
      let spendTitle = props.spendFile.split('.xlsx')[0]
      analyzeProgramCard.fullSpendFileName = spendTitle
      return spendTitle      
    })

    function showModalForDeactivateProgram() {
      analyzeProgramCard.showModalForDeactivatingProgram = true
    }

    function getPlanTitle(title: string) {
      if (title.length < 6) {
        return title; // Return the full string if length is less than 10
      } else {
        return title.substring(0, 6) + '...'; // Return the first 10 characters with '...'
      }
    }

    const calculatedRemainingPlans = computed(() => {
      return "(+" + (props.plans.length - 2) + ")"
      //return props.plans.length
    })

    function deleteProgram() {
      analyzeProgramCard.loadingUninstall = true
      const params = {
        programId: props.programId,
        callbackSuccess: () => {
          fnSetUnsubscribeProgram()
          analyzeProgramCard.loadingUninstall = false
          emit('refreshPrograms')
        },
        callbackError: () => {
          analyzeProgramCard.loadingUninstall = false
          
        }
      }
      analyzeStore.deleteProgram(params)
    }


    

    function navigateSingleDimensionPlan(plan: any) {

      router.push({
          name: Routing.home.plan.homeHomePlanV2,         
          query: {
            planId: removeIRI(plan)
          }
        }); 
    }



    function goToPlan() {
      router.push({
        name: Routing.home.analyze.homeAnalyzeProgramToPlan1,          
        query: {
          planId: removeIRI(props.programId),
        }
      });


    }

    function goToProgramOverview() {
        router.push({
          name: Routing.home.analyze.homeAnalyzeProgramOverview,          
          query: {
            selectedProgramId: removeIRI(props.programId),
            programTarget: props.programType
          }
        });
     
    }

    function getProgram() {
      const params = {
        programId: props.programId,
        callbackSuccess: (response: any) => {
          analyzeProgramCard.programMarked = response.marked
          analyzeProgramCard.checkbox.termHarmonization = response.termHarmonizationEnabled
          analyzeProgramCard.checkbox.externalFinancing = response.externalFinancingEnabled
          analyzeProgramCard.checkbox.discount = response.cashDiscountEnabled          
        },
        callbackError: () => {
         
        }
      }
      analyzeStore.getProgram(params)
    }

    function markCard() {
      analyzeProgramCard.loading = true
      let marked
      if (analyzeProgramCard.programMarked === true) {
        marked = false
      } else {
        marked = true
      }
      const params = {
        programId: props.programId,
        marked,
        callbackSuccess: (program: any) => {
          analyzeProgramCard.programMarked = program.marked
          analyzeProgramCard.loading = false
        },
        callbackError: () => {
          
        }
      }
      analyzeStore.patchProgram(params)
    }

    function getSharedUsersText(sharedUser: any, index: number): string {
      if (index <= 5 && analyzeProgramCard.sharedUsers.length - 1 === index) {
        return `${sharedUser.firstName} ${sharedUser.lastName[0]}.`
      } else if (index === 6) {
        return `+${analyzeProgramCard.sharedUsers.length - index}...`
      } else if (index > 6) return ''
      return `${sharedUser.firstName} ${sharedUser.lastName[0]},`
    }

    function getPlanText(plan: any, index: number) {
      if (index <= 1) {
        return `${plan.title}`
      } else if (index === 2) {
        return `(+${props.plans.length - 2})`
      }
    }

    function clickFixRightMenu() {
      if (analyzeProgramCard.showPlans) {
       analyzeProgramCard.showPlans = !analyzeProgramCard.showPlans
       return
      }
      analyzeProgramCard.showMenu = !analyzeProgramCard.showMenu
    }

    const options = computed(() => {
      return [
        { name: 'Term Harmonization', value: analyzeProgramCard.checkbox.termHarmonization },
        { name: 'External Financing', value: analyzeProgramCard.checkbox.externalFinancing },
        { name: 'Discount', value: analyzeProgramCard.checkbox.discount }
      ]
    })

    function changeActiveStatus(status: any) {
      emit('loading-items')
      const changed = {
        key: 'activeProgram',
        value: status
      }
      const params = {
        program: props.programId,
        changed: changed,
        uuids: [],
        callbackSuccess: (callbackSuccessData: any) => {
          analyzeProgramCard.showModalForDeactivatingProgram = false
          if (status) {
            toast.success(translate.t('home.analyze.alertActiveNow'))
          } else {
            toast.success(translate.t('home.analyze.alertInactiveNow'))
          }
          emit('loading-items')
          emit('refreshPrograms')
          
        },
        callbackError: (callbackErrorData: any) => {
          analyzeProgramCard.showModalForDeactivatingProgram = false
          emit('loading-items')
          if (callbackErrorData.data.subject === 'spendAlreadyInActiveProgram') {
            analyzeProgramCard.spendsActive = callbackErrorData.data.records.length
            analyzeProgramCard.showModaltoEdit = true
          } else {
            toast.error(translate.t('home.analyze.' + callbackErrorData.data.subject))
          }
        }
      }
      analyzeStore.postProgramSpendConfigurationbyGroups(params)
    }

    onBeforeMount(() => {
      //getProgram()
    })

    return {
      ...toRefs(analyzeProgramCard),
      calculatedRemainingPlans,
      changeActiveStatus,
      clickFixRightMenu,
      createdId,
      deleteProgram,
      fontIcons,
      formatData,
      getPlanText,
      getPlanTitle,
      getProgram,
      getSharedUsersText,
      goToProgramOverview,
      iconColorMarked,
      images,
      markCard,
      navigateSingleDimensionPlan,
      options,      
      showModalForDeactivateProgram,
      spendFileTitle,
      Tooltip,
      removeIRI,
      goToPlan,
      isAdminUser
    }
  }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";
@import "src/resources/assets/styles/variables/typography";

@media screen and (max-width: 770px) {
  .btns{
    display: flex;
    flex-direction: column;
  }
}

// ? - Use animate.css
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.plan-name:hover {
  cursor: pointer;
  color: $color-primary-700;
}

.ellipsis {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.analyze-program-card-options {
  animation-name: fadeIn;
  animation-duration: 0.3s;
  position: absolute;
  background: $body-bg;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border-radius: $border__radius;
  padding: $margin * 2;

  ul {
    li {
      margin-bottom: $margin;
    }
  }
}

.btn-action-analyze-program-card {
  border: none;
  background: $color-white;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  cursor: pointer;

  span {
    color: $color-black;
    font-size: 16px;
  }

  svg {
    fill: $color-black;
    margin-right: 10px;
    width: 16px !important;
    height: 16px !important;
  }

  &:hover {
    color: $color-red;

    span {
      color: $color-red !important;
    }

    svg {
      fill: $color-red;
    }
  }
}

//if program has plans
.list-plans {
  text-align: center;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;

}

//programType styles

.program-type {
  width: 100%;
  border-radius: 20px;
  padding: 5px 15px;
  font-weight: 500 !important;
  font-size: 14px;
  white-space: nowrap;
}

.cashFlow {
  background: $color-green-200;
  color: $color-green-800;

  &:hover {
    background-color: $color-green-200 !important;
    color: $color-green-800 !important;
  }
}

.harmonization {
  background: $color-orange-100;
  color: $color-orange-700;

  &:hover {
    background: $color-orange-200 !important;
    color: $color-orange-700 !important;
  }
}

// end of programType styles 

.card-menu {
  animation-name: fadeInDown;
  animation-duration: 0.3s;
}

.buttonLeft {
  width: 50%;
  padding-left: 5px;
  padding-right: 5px;

  @media (min-width: 1200px) and (max-width: 1313px) {
    width: 100%;
    margin-top: -40px;
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

.plans-list {
  max-height: 100%;
  overflow-y: scroll;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px #fff;
    box-shadow: inset 0 0 6px #fff;
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
  }

  a.btn-action-analyze-program-card:hover {
    svg {
      color: rgba($color-red, 1);
    }
  }

  svg {
    color: rgba($color-black, 1);
  }
}

p.text-color-red span {
  color: $color-gray-500;
}

h2.text-color-red {
  font-size: 1rem;
  text-align: center;
}

p.text-color-red-custom {
  color: #FF2C4F;
  font-size: .8rem;
  padding: 0px 15px !important;
  text-align: center;
}

.card--program .card__body .fa {
  color: $color-gray-400;
}

// new style

.body-card {
  padding: 0px 24px;
  width: 100%;
}

.card-v2 {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
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

.truncate-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 80%;
  display: block;
  text-align: center;
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

.options-menu-card {
  &:hover {
    color: $color-red;

    span {
      color: $color-red;
    }
  }
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

// end of new style
</style>
