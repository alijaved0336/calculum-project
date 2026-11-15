<template>
<NineBoxesModal v-if="showTableInfoModal" :totalBoxesInfoSummary="tableInfoModalObj" @close="() => showTableInfoModal = false "></NineBoxesModal>
<div class="mt-4" v-if="!allowsBoxes && !loading">
  <div class="row ml-0">
    <div class="col-lg-7 no-info-section">
      <h2 class="w-100 text-gray-600 text-base font-semibold mb-1">{{ $t('home.analyze.analyzeProgramOverview.titleLegacyProgram') }}</h2>
      <p class="w-100 mb-3 text-gray-600 text-xs font-normal">{{ $t('home.analyze.analyzeProgramOverview.bodyLegacyProgram') }}</p>
      <div class="row px-3 justify-content-between w-100">
        <button class="col-12 col-lg-5 mb-3 mb-lg-0 btn outline-secondary-btn" @click="$emit('change-tab','ProgramOverview')">{{ $t('home.analyze.analyzeProgramOverview.backToProgram') }}</button>
        <button class="col-12 col-lg-5 btn btn-primary" @click="cloneAction">{{ $t('home.analyze.analyzeProgramOptions.newCloneProgram') }}      </button>
      </div>
    </div>
  </div>
</div>
<div class="mt-1" v-else-if="!programInrecalculation">
  <div class="row ml-0 justify-content-between mb-2" v-if="!programInrecalculation">
    <AnalyzeLevelSelector :selectedLevel="selectedLevel" @selectedLevelChanged="selectedLevelChanged">        </AnalyzeLevelSelector>
    <div class="d-flex align-items-center">
      <div class="custom">
        <div class="open-options cursor-pointer" @click="onShowUserOptions" ref="button">
          <CalculumChevronDown class="chevrons"></CalculumChevronDown>
        </div>
        <Popup class="custom-pop-up" :anchor="'button'" :show="showUserOptions" :popup-class="'ninebox-popup-settings'">
          <div class="d-flex flex-column popup" id="user-options-popup"><span class="custom_cursor_pointer" @click="selectAllBoxes">{{$t('global.selectAll')}}</span><span class="custom_cursor_pointer" @click="defaultBoxes(true)">{{$t('global.resetSelection')}}       </span></div>
        </Popup>
      </div>
    </div>
  </div>
  <div class="row ml-0 justify-content-between mb-2">
    <div class="col-xl-8 pr-5">
      <NineBoxes class="row mr-4" :boxesInfo="boxesInfo" :key="box9key" :selectedLevel="selectedLevelComputed" :programInrecalculation="programInrecalculation" :allowsBoxes="allowsBoxes" :loading="loading" :loadingDataBoxes="loadingDataBoxes" :yAxisTitle="yAxisTitle" :xAxisTitle="xAxisTitle" :boxTitle="boxTitle" :typeOf9Boxes="typeOf9Boxes" @selectedBoxes="selectedBoxes"></NineBoxes>
    </div>
    <div class="col-xl-4">
      <div class="card" v-if="!allowsBoxes || programInrecalculation">
        <div class="card-body"><span>hello
            <div class="row">
              <template v-for="index in 9" :key="index">
                <div class="col-3 mb-2">
                  <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '20px' }"> </Skeleton>
                </div>
                <div class="col-3 mb-2">
                  <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '20px' }"> </Skeleton>
                </div>
                <div class="col-6 mb-2">
                  <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '20px' }"> </Skeleton>
                </div>
              </template>
            </div></span></div>
      </div>
      <div class="row" v-else>
        <AnalyzeProgramNineBoxesTable v-if="selectedSomeBoxes && typeOf9Boxes ==='cashFlow' && !loadingDataBoxes" :infoSummary="boxesInfo" :selectedLevel="selectedLevelComputed" :key="gridKey" @show-modal="showTableModal"></AnalyzeProgramNineBoxesTable>
        <AnalyzeProgramNineBoxesTableFinancing v-else-if="selectedSomeBoxes && typeOf9Boxes ==='financing' && !loadingDataBoxes" :infoSummary="boxesInfo" :selectedLevel="selectedLevelComputed" :key="gridKeyFinancing" @show-modal="showTableModal"></AnalyzeProgramNineBoxesTableFinancing>
        <AnalyzeProgramNineBoxesTableFinancingSCF v-else-if="selectedSomeBoxes && typeOf9Boxes ==='scf9Box' && !loadingDataBoxes" :infoSummary="boxesInfo" :selectedLevel="selectedLevelComputed" :key="gridKeySCF" @show-modal="showTableModal"></AnalyzeProgramNineBoxesTableFinancingSCF>
        <AnalyzeProgramNineBoxesTableVcard v-else-if="selectedSomeBoxes && typeOf9Boxes ==='vcard' && !loadingDataBoxes" :infoSummary="boxesInfo" :selectedLevel="selectedLevelComputed" :key="gridKeyVcard" @show-modal="showTableModal"></AnalyzeProgramNineBoxesTableVcard>
        <div class="nothing-selected-container d-flex justify-content-center flex-column nothing-selected-bottom-row text-center" v-else>
          <Skeleton class="skeletons-bg" v-if="loadingDataBoxes" :shape="'rectangle'" :style="{ width: '100%', height: '200px' }"></Skeleton><span class="p-4 text-xl text-gray-500" v-if="!loadingDataBoxes">{{$t('global.selectOneOrMore')}}</span>
          <emptyState9box v-if="!loadingDataBoxes"></emptyState9box>
        </div>
      </div>
    </div>
  </div>
  <div id="grid-section">
    <ListsNineBoxes :selectedProgramId="selectedProgramId" :levelOfGrid="selectedTabIndex" :selectedBoxesArray="selectedBoxesArray" :programInrecalculation="programInrecalculation" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" :typeOf9Boxes="typeOf9Boxes" v-if="!loadingDataBoxes"></ListsNineBoxes>
  </div>
</div>
</template>

<script lang="ts">
import { isEmpty } from '@/utils'
import { defineComponent, onMounted, onUnmounted, computed, toRefs, reactive, ComputedRef, watch } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import { HomeAnalyzeProgramNineBoxes} from '@/modules/home/analyze/types'
import { Popup } from '@progress/kendo-vue-popup';
import { useI18n } from 'vue-i18n'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useAnalyzeStore } from '@/stores/analyze'
import { useHomeStore } from '@/stores/home'
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import * as Validator from '@/utils/validators'
import AnalyzeLevelSelector from '@/modules/home/analyze/components/AnalyzeLevelSelector.vue'
import AnalyzeProgramNineBoxesTable from '@/modules/home/analyze/components/AnalyzeProgramNineBoxesTable.vue'
import AnalyzeProgramNineBoxesTableFinancing from '@/modules/home/analyze/components/AnalyzeProgramNineBoxesTableFinancing.vue'
import AnalyzeProgramNineBoxesTableFinancingSCF from '@/modules/home/analyze/components/AnalyzeProgramNineBoxesTableFinancingSCF.vue'
import AnalyzeProgramNineBoxesTableVcard from '@/modules/home/analyze/components/AnalyzeProgramNineBoxesTableVcard.vue'
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import iconArrow from '@/resources/assets/images/icons/iconArrow.vue'
import iconArrowDown from '@/resources/assets/images/icons/iconArrowDown.vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import ListsNineBoxes from './ListsNineboxes.vue'
import MarkActiveProgram from '@/modules/home/analyze/components/MarkActiveProgram.vue'
import NineBoxes from '../components/NineBoxes.vue'
import NineBoxesModal from '../components/NineBoxesModal.vue'
import type { FiltersApplied } from '@/types';
import { Skeleton } from '@progress/kendo-vue-indicators';
import { Card } from '@progress/kendo-vue-layout';
import useSpendFile from "@/composables/useSpendFile";
import type { PropType } from 'vue';
import { Program } from '../types';
import useUser from "@/services/user/composables/useUser";
import TeaserView from "@/modules/components/teaser/TeaserView.vue";
import emptyState9box from "@/resources/assets/images/9boxes/empty-state.vue";
import CalculumChevronDown from '@/modules/components/CalculumChevronDown.vue';
import { useAppStore } from '@/stores/app';

export default defineComponent({
  name: "HomeAnalyzeProgramNineBoxes",
  components: {
    AnalyzeLevelSelector,
    AnalyzeProgramNineBoxesTable,
    AnalyzeProgramNineBoxesTableFinancing,
    AnalyzeProgramNineBoxesTableFinancingSCF,
    AnalyzeProgramNineBoxesTableVcard,    
    CalculumGrid,    
    CalculumModal,
    Card,
    iconArrow,
    iconArrowDown,
    iconEllipsisVertical,
    ListsNineBoxes,
    MarkActiveProgram,
    NineBoxes,
    NineBoxesModal,
    Popup,
    Skeleton,
    TeaserView,    
    emptyState9box,
    CalculumChevronDown
  },
  props: {
    boxTitle: { type: String, required: true },
    forceReload: { type: Boolean, required: false, default: false },
    inRecalculation: { type: Boolean, required: true, default: false },
    programData: { type: Object as PropType<Program>, required: true },
    selectedProgramId: { type: String, required: true },    
    typeOf9Boxes: { type: String, required: true },
    xAxisTitle: { type: String, required: true },
    yAxisTitle: { type: String, required: true },    
    nineBoxTitle: { type: String, required: true }
  },
  emits: ['change-tab'],
  setup(props,  { emit } ) {
    const globalFiltersStore = useGlobalFiltersStore()
    const analyzeStore = useAnalyzeStore()
    const homeStore = useHomeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const { useFeature9BoxesFinancing  } = useUser();
    const appStore = useAppStore();

    
    // *** Computed ***
    const selectedLevelComputed = computed(() => {
      return data.selectedLevel
    })

    const {
      spendFileVersionActiveId
    } = useSpendFile()

    const currencyRate = computed(() => appStore.getCurrencyAmount);

    const data = reactive<HomeAnalyzeProgramNineBoxes>({
      allowsBoxes: true,
      box9key: new Date().getUTCMilliseconds(),
      boxesInfo: [],
      cloneName: '',
      createProgranBoolean: false,
      formErrorMessage: '',
      formHasError: false,
      gridKey: new Date().getUTCMilliseconds(),
      hasFinancing: false,
      hasHarmonization: false,
      isBoxesRecalculating: false,
      loading: true,
      loadingDataBoxes: true,
      loadingSelectAll: false,
      selectedBoxesArray: [],
      selectedLevel: setLevelLabel(),
      selectedTabIndex: setLevelValue(),  // 0 = spends, 1 = suppliers, 2 = parents
      setDefault: false,
      showNewCloneNameModal: false,
      showTableInfoModal: false,
      showUserOptions: false,
      tableInfoModalObj: {},
      tabs: [],
      programInrecalculation: true,      
      gridKeyFinancing: new Date().getUTCMilliseconds(),
      gridKeyVcard: new Date().getUTCMilliseconds(),
      gridKeySCF: new Date().getUTCMilliseconds()
    })

    function setLevelValue() {
      return homeStore.getEntityLevelTabSelected ?? 1
    }


    function setLevelLabel() {
              const getLevel = homeStore.getEntityLevelTabSelected
      switch(getLevel) {
        case 0:
          return 'spend'
        case 1:
          return 'supplier'
        case 2:
          return 'parent'
        default:
          return 'supplier'
      }
    }


    /**
     * Get program data
     */
     function getProgram() {            
      data.allowsBoxes = props.programData.allowsBoxes
      data.programInrecalculation = props.inRecalculation   
      data.hasFinancing = props.programData.externalFinancingEnabled
      data.hasHarmonization =  props.programData.termHarmonizationEnabled
      data.loading = false
      if (props.programData.allowsBoxes) {
        nineBoxesDataAPIReadAll()
      }
    }

    watch(() => props.inRecalculation, () => {
      data.programInrecalculation = props.inRecalculation
    }, { deep: true })
    

    const selectedSomeBoxes = computed(() => {
      return Object.keys(data.selectedBoxesArray).length > 0
    })

    const messageError = computed(() => {
      let result = ''

      if (!Validator.isValidString(data.cloneName)) {
        result += 'The Clone Program Name is required'
      }

      return result
    })

    /**
     * Show user options
     */
    function onShowUserOptions() {
      data.showUserOptions = !data.showUserOptions
    }

    /**
     * Open or close the menu popup
     * 
     * @param e {any}
     */
    function menuPopup(e: any) {
      if (e.target.closest('.k-button') || e.target.closest('.ninebox-popup-settings')) {
        return;
      }
      if (e.target.closest('.custom') === null) {
        data.showUserOptions = false;
      }
    }

    /**
     * Show the modal with the table info
     * 
     * @param totalBoxesInfoSummaryObj {any}
     */
    function showTableModal(totalBoxesInfoSummaryObj: any) {
      data.tableInfoModalObj = totalBoxesInfoSummaryObj
      data.showTableInfoModal = true
    }

    // ? - Move to template
    function cloneAction() {
      data.showNewCloneNameModal = true
    }

   
    /**
     * Clear form errors
     */
    function clearErrors() {
      data.formHasError = false
    }

    /**
     * Check if the input has an error
     * 
     * @param modelValue {any}
     */
    function checkInputError(modelValue: any) {
      if (((typeof modelValue === 'number' && modelValue < 0) || (typeof modelValue === 'string' && !modelValue)) ||
        data.formHasError) {
        data.formErrorMessage = messageError.value

        if (data.formErrorMessage.length === 0) {
          clearErrors()
        }
      }
    }

    /**
     * Form validator
     */
    function formValidator() {
      if (data === null) {
        return
      }

      data.formErrorMessage = messageError.value
      if (data.formErrorMessage) {
        data.formHasError = true
        return
      }

      data.createProgranBoolean = false
      generateCloneProgram()
    }

    function generateCloneProgram() {
      const params = {
        programId: props.selectedProgramId,
        cloneProgramName: data.cloneName,
        callbackSuccess: () => {
          data.cloneName = ''
          data.createProgranBoolean = true
          data.formHasError = false
        },
        callbackError: (callbackErrorData: any) => {
          data.formHasError = true
          data.createProgranBoolean = false
          if (callbackErrorData.code === 400) {
            data.formErrorMessage = callbackErrorData.data.error
          }

          if (import.meta.env.DEV) console.log("** Error (generateCloneProgram): ", callbackErrorData)
        }
      }

      analyzeStore.postGenerateCloneProgram(params)
    }
    // *** Global Filters Applied ***

    const globalFiltersApplied: ComputedRef<FiltersApplied> = computed(() => globalFiltersStore.getFiltersApplied)

    // *** END Global Filters Applied ***

    // *** Nine Boxes ***

    const boxesInfoCache = new Map<string, any[]>()

    /**
     * Get selected boxes
     */
    function selectedBoxes() {

      data.selectedBoxesArray = []
      let selectedBoxes: Array<any> = []
        switch (props.typeOf9Boxes) {
          case 'cashFlow':
            selectedBoxes = analyzeStore.getNineBoxesSelectedBoxes            
            break;  
          case 'financing': 
            selectedBoxes = analyzeStore.getNineBoxesSelectedBoxesFinancing 
            break;  
          case 'scf9Box': 
            selectedBoxes = analyzeStore.getNineBoxesSelectedBoxesFinancingSCF 
            break;  
          case 'vcard': 
            selectedBoxes = analyzeStore.getNineBoxesSelectedBoxesVcard 
            break;  
        }
      
      // if no boxes selected, unselect all
      if (isEmpty(selectedBoxes)) {
        data.boxesInfo.forEach(function (config: any) {
          config.selected = false
        })
      }
      // There are boxes selected
      else {
        data.boxesInfo.forEach(function (config: any) {
          if (selectedBoxes.includes(config.box)) {
            config.selected = true
          } else {
            config.selected = false
          }
        })
      }

      
      switch (props.typeOf9Boxes) {
        case 'cashFlow':
          data.gridKey++
          data.selectedBoxesArray = analyzeStore.getNineBoxesSelectedBoxes
          break;
        case 'financing':
          data.gridKeyFinancing++
          data.selectedBoxesArray = analyzeStore.getNineBoxesSelectedBoxesFinancing
          break;
        case 'scf9Box':
          data.gridKeySCF++
          data.selectedBoxesArray = analyzeStore.getNineBoxesSelectedBoxesFinancingSCF
          break;
        case 'vcard':
          data.gridKeyVcard++          
          data.selectedBoxesArray = analyzeStore.getNineBoxesSelectedBoxesVcard
          break;
      }


      data.loadingDataBoxes = false
    }

    /**
     * Select all boxes
     */
    function selectAllBoxes() {


      switch (props.typeOf9Boxes) {
        case 'cashFlow':
          analyzeStore.setNineBoxesSelectedBoxes([])
          break;
        case 'financing':
          analyzeStore.setNineBoxesSelectedBoxesFinancing([])
          break;  
        case 'scf9Box':
          analyzeStore.setNineBoxesSelectedBoxesFinancingSCF([])
          break;
        case 'vcard':
          analyzeStore.setNineBoxesSelectedBoxesVcard([])
          break;
      }

    

      // Enable loading
      data.loadingSelectAll = true

      data.showUserOptions = false
      closeOptions()
      data.selectedBoxesArray = []
      data.boxesInfo.forEach(function (config: any) {
        if (config.box !== 0 && config.volume > 0) {
          config.selected = true
          data.selectedBoxesArray.push(config.box)
        }
      })

      switch (props.typeOf9Boxes) {
        case 'cashFlow':
          analyzeStore.setNineBoxesSelectedBoxes(data.selectedBoxesArray)
          break;  
        case 'financing':
          analyzeStore.setNineBoxesSelectedBoxesFinancing(data.selectedBoxesArray)
          break;
        case 'scf9Box':
          analyzeStore.setNineBoxesSelectedBoxesFinancingSCF(data.selectedBoxesArray)
          break;
        case 'vcard':
          analyzeStore.setNineBoxesSelectedBoxesVcard(data.selectedBoxesArray)
          break;
      }
          

      data.loadingSelectAll = false
      data.gridKey++
      data.gridKeyFinancing++
      data.gridKeySCF++
      data.gridKeyVcard++
      data.box9key++
    }

    /**
     * Get boxes data from the API, using a per-level cache to avoid redundant calls.
     * Cache is cleared when the component unmounts.
     */
    function nineBoxesDataAPIReadAll() {
      const cacheKey = data.selectedLevel

      if (boxesInfoCache.has(cacheKey)) {
        data.boxesInfo = boxesInfoCache.get(cacheKey)!
        if (props.forceReload) {
          selectedBoxes()
        } else {
          defaultBoxes(false)
        }
        data.loadingDataBoxes = false
        return
      }

      // Enable loading
      data.loadingDataBoxes = true

      const params = {
        filters: {
          programId: props.selectedProgramId,
          disabled: false,
          globalFilter: formatData.convertFiltersToREST(globalFiltersApplied.value) || '',
          spendFileVersionId: spendFileVersionActiveId.value,
          currencyRate: currencyRate.value
        },
        level: data.selectedLevel,
        type9boxes: props.typeOf9Boxes,
        callbackSuccess: (callbackSuccessData: any) => {
          const boxesData = callbackSuccessData || []
          boxesInfoCache.set(cacheKey, boxesData)
          data.boxesInfo = boxesData
          //* if change somethin from entiuty modal and take the selected boxes from vuex */
          if (props.forceReload) {
            selectedBoxes()
          }

          if (!props.forceReload) {
            defaultBoxes(false)
          }

          // Disable loading
          data.loadingDataBoxes = false

        },
        callbackError: (callbackErrorData: any) => {
          data.loadingDataBoxes = false

          if (import.meta.env.DEV) console.log("** Error (nineBoxesDataAPIReadAll): ", callbackErrorData)
        }
      }

      analyzeStore.nineBoxesDataAPIReadAll(params)

    }

   
    /**
     * Selected level changed, and get nine boxes data
     */
    function selectedLevelChanged(newSelectedLevel: string) {
      // Do nothing if the level is the same
      if (data.selectedLevel === newSelectedLevel) {
        return
      }
      data.selectedLevel = newSelectedLevel
      /**
       * Set the selected tab index based on the selected level.
       */
      switch (data.selectedLevel) {
        case 'spend':
          data.selectedTabIndex = 0
          homeStore.setEntityLevelTabSelected(0)
          data.tabs = [{
            title: translate.t('global.spends'),
            contentClassName: 'classContentHide',
          }]
          break;

        case 'supplier':
          data.selectedTabIndex = 1
          homeStore.setEntityLevelTabSelected(1)
          data.tabs = [{
            title: translate.t('global.suppliers'),
            contentClassName: 'classContentHide',
          }]
          break;

        case 'parent':
          data.selectedTabIndex = 2
          homeStore.setEntityLevelTabSelected(2)
          data.tabs = [{
            title: translate.t('global.parents'),
            contentClassName: 'classContentHide',
          }]
          break;

        default:
          data.selectedTabIndex = 0
          break;
      }

      /**
       * Given the selected level, get the appropriate data from the API.
       * For example, if the selected level is "spends", then get the columns and data.
       * Lastly, parse the data and set it to the listSpends property in data.
       */

      nineBoxesDataAPIReadAll()
    }

    
    /**
     * Close options menu (three dots)
     */
    function closeOptions() {
      const dots = document.getElementById('closeoptions9box')
      if (dots) {
        dots.click()
      }
    }

    /**
     * Get default boxes
     * 
     * @param closeActions {boolean}
     */
    function defaultBoxes(closeActions: boolean) {
      data.loadingSelectAll = true

      data.showUserOptions = false

      if (closeActions) {
        closeOptions()
      }

      data.selectedBoxesArray = []

      switch (props.typeOf9Boxes) {
        case 'cashFlow':
          analyzeStore.setNineBoxesSelectedBoxes([])
          break;  
        case 'financing':
          analyzeStore.setNineBoxesSelectedBoxesFinancing([])  
          break;
        case 'scf9Box':
          analyzeStore.setNineBoxesSelectedBoxesFinancingSCF([])
          break;
        case 'vcard':
          analyzeStore.setNineBoxesSelectedBoxesVcard([])
          break;
      }

      const info = data.boxesInfo || []
      const parsedData: Array<any> = []
      info.forEach(function (config: any) {
        const newConfig = Object.assign({}, config)
        if (config.box !== 0) {
          newConfig.selected = false

          if (config.volume > 0 && !data.setDefault) {
            newConfig.selected = true
            data.setDefault = true
            data.selectedBoxesArray = [config.box]
            switch (props.typeOf9Boxes) {
              case 'cashFlow':
                analyzeStore.setNineBoxesSelectedBoxes([config.box])
                break;
              case 'financing':
                analyzeStore.setNineBoxesSelectedBoxesFinancing([config.box])  
                break;
              case 'scf9Box':
                analyzeStore.setNineBoxesSelectedBoxesFinancingSCF([config.box])
                break;
              case 'vcard':
                analyzeStore.setNineBoxesSelectedBoxesVcard([config.box])
                break;
            }
          }
        }
        parsedData.push(newConfig)
      })

      data.loadingSelectAll = false
      data.setDefault = false
      data.boxesInfo = parsedData
      data.gridKey++
      data.gridKeyFinancing++
      data.gridKeySCF++
      data.box9key++
      data.gridKeyVcard++          
      data.loadingDataBoxes = false
    }

    function getInitProgramAPI() {
        data.allowsBoxes = true        
        data.programInrecalculation = true
        data.loading = true
        data.loadingDataBoxes = true
        getProgram()
    }

    onMounted(() => {
      data.tabs = [{
        title: translate.t('global.suppliers'),
        contentClassName: 'classContentHide',
      }]

      
      getInitProgramAPI()

      // Click outside to close the menu
      document.body.addEventListener('click', menuPopup)
    })

    onUnmounted(() => {
      // Clean up
      document.body.removeEventListener('click', menuPopup)
      boxesInfoCache.clear()
    })

    return {
      ...toRefs(data),      
      checkInputError,
      clearErrors,
      cloneAction,
      defaultBoxes,
      fontIcons,
      formatData,
      formValidator,
      generateCloneProgram,
      getProgram,
      menuPopup,
      onShowUserOptions,
      Routing,
      selectAllBoxes,
      selectedBoxes,
      selectedLevelChanged,
      selectedLevelComputed,
      selectedSomeBoxes,
      showTableModal,
      spendFileVersionActiveId,
    }
  },
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_borders.scss";

#custom-position-icon {
  left: 27px;
  top: 15px;
  position: relative;
}

.custom-fit-btn {
  min-width: 100px !important;
}

.all-programs-btn {
  min-width: 170px !important;
}

.header-title {
  font-family: "Inter var", sans-serif;
}

.m-b2 {
  margin-bottom: 2rem;
}

/* end of new header in program */

#grid-section {
  margin-top: 1rem;
}

@media screen and (max-width: 1440px) {
  #grid-section {
    margin-top: 1rem;
  }
}

.gray-bg {
  background: #F9FAFC;
}

.nothing-selected-top-row {
  height: 60px;
  padding: 10px;
}

.nothing-selected-container {
  display: flex;
  flex-grow: 1;
  border-radius: 8px;
  border: 1px solid $color-gray-200;
  background: #FFF;
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.05);
}

.nothing-selected-title {
  color: #667085;
  font-size: 1rem;
}

.nothing-selected-bottom-row {
  height: 500px;
  padding: 50px;
  align-items: center;
}

#options-9box {
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.05);

  span {
    cursor: pointer;
    font-family: inherit;
    transition: all 0.3s;

    &:hover {
      color: $color-primary-500;
    }
  }
}

.fix-menu {
  position: absolute;
  top: 20px;
  right: 30px;
}

.collapsed9box {
  transform: rotate(180deg);
}

.icon-svg-16 {
  width: 16px;
  height: 16px;

  &:hover {
    color: $color-primary-500;
  }
}


// Three dots icon 
.three-dots-icon {
  max-height: 16px;
}


.popup {
  gap: 1em;
  padding: 16px;

  span {
    color: #000;

    &:hover {
      color: $color-primary-500;
      text-decoration: none !important;
      border: none;
    }
  }

}

.custom-pop-up {
  min-width: 200px;
  transition: all 0.3s ease;
  border-radius: 0.5rem;
  margin-top: 32px;
  padding: 16px;

}

// popup , for select, reset boxes selected
#user-options-popup {
  font-weight: 400;
  font-size: 1rem;
  text-decoration: none;

  span {
    color: #000;

    &:hover {
      color: $color-primary-500;
    }
  }
}

.rotate-arrow {
  transform: rotate(180deg)
}


</style>