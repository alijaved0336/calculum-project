<!-- Opportunity / All Programs -->

<template>
<CalculumLayout :containerClass="'program-home'">
  <template v-slot:slotTop>
    <div class="row" v-if="!loading">
      <div class="col-12 d-flex justify-content-between">
        <div class="d-flex"><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none" id="allProgramsTab" @click="changeTypeOfPrograms('allPrograms')" :class="{ 'active': typeOfPrograms === 'allPrograms' }">{{ $t('home.analyze.programsPanel.allPrograms') }}</a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none" id="myProgramsTab" @click="changeTypeOfPrograms('myPrograms')" :class="{ 'active': typeOfPrograms === 'myPrograms' }">{{ $t('home.analyze.programsPanel.myPrograms') }}          </a></div>
        <div class="d-flex">
          <div class="header-title text-2xl font-semibold mr-5">{{ $t('home.analyze.title') }}</div>
        </div>
      </div>
      <div class="col-12 d-flex align-items-center mt-4" v-if="typeOfPrograms !== 'myPrograms'">
        <div class="d-flex align-items-center col-10 p-0">
          <div class="form-group">
            <label for="search-by-author">
              <input class="form-control" id="search-by-author" v-model="searchByAuthor" type="text" :placeholder="$t('home.analyze.programsPanel.filters.authorPlaceholder')" @keyup.enter="getData"/><span>{{ $t('home.analyze.programsPanel.filters.author') }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row relative analyze-card" v-if="loading || loadingStatus">
        <SkeletonCard v-for="i in 4" :key="i" :numberOfRowForTopSection="2"></SkeletonCard>
      </div>
      <div class="row relative analyze-card" v-else>
        <AnalyzeProgramCard v-for="program in setProgramsToDropdown" @loading-items="loadingItems" @refreshPrograms="refreshPrograms" :date="program.created" :external-financing="program.externalFinancingEnabled" :id="program['@id']" :isActive="program.isActive" :key="program['@id']" :plans="program.plans" :processingTotal="program.processingTotal" :program-id="removeIRI(program['@id'])" :program-type="program.programTarget" :recalculationInProgress="program.recalculationInProgress" :pendingRecalculation="program.pendingRecalculation" :spend-file-version-id="program.spendFileVersion['@id']" :spend-file="program.spendFileVersion.name" :term-harmonization="program.termHarmonizationEnabled" :title="program.name" :user="program.createdBy.firstName" :spendFileInrecalculation="spendFileInrecalculation">   </AnalyzeProgramCard>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
/**
 * Show all Programs
 */

import { computed, defineComponent, reactive, toRefs, ref, onMounted, onUnmounted, watch } from 'vue'
import { fontIcons, images } from '@/resources/assets/assets'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAnalyzeStore } from '@/stores/analyze'
import { useEntityCardStore } from '@/stores/entityCard'
import { useSubscribeStore } from '@/stores/subscribe'
import * as Routing from '@/services/router/Routing'
import AddIcon from '@/modules/components/icons/IconAdd.vue'
import AnalyzeProgramCard from '@/modules/home/analyze/components/AnalyzeProgramCard.vue'
import { CalculumLayout } from '@ada/design-system'
import { removeIRI } from '@/utils'
import SkeletonCard from '@/modules/home/components/skeletons/SkeletonCard.vue'
import useFirebase from "@/composables/firebase/useFirebase";
import { Program } from '../types'
import { useUser, useSpendFile, useModuleProgram } from "@/composables";
import * as HomeRouting from "@/modules/home/HomeRouting";

export default defineComponent({
  name: 'HomeAnalyzeProgramsPanel',
  components: {
    AddIcon,
    AnalyzeProgramCard,
    CalculumLayout,
    SkeletonCard
  },
  setup() {
    const analyzeStore = useAnalyzeStore()
    const entityCardStore = useEntityCardStore()
    const subscribeStore = useSubscribeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const router = useRouter();
    const { moduleProgramIsAvailable } = useModuleProgram()

    const {
      userIri, userIsSuperAdmin, userIsAdmin
    } = useUser();

    const showCreatebutton = computed(() => {
      return (userIsSuperAdmin.value || userIsAdmin.value) && setProgramsToDropdown.value.length === 0
    })

    const {
      spendFileVersionActiveId
    } = useSpendFile()

    document.title = translate.t('home.analyze.title')
    const intervalProgram = ref()
    const { fnSetUnsubscribeProgram } = useFirebase();

    // AbortController para cancelar llamadas a la API
    const abortController = ref<AbortController | null>(null)


    interface HomeAnalyzeProgramsPanel {
      loading: boolean,
      typeOfPrograms: string,
      myPrograms: Program[],
      allPrograms: Program[],
      setAllPrograms: Array<any>,
      loadingSpendFilesVersions: boolean,
      searchByAuthor: string,
      showOnlyTheMarked: boolean,
      loadingStatus: boolean,
      uuidPrograms: Array<any> | null,
      spendFileInrecalculation: boolean
    }

    const homeAnalyzeProgramsPanel = reactive<HomeAnalyzeProgramsPanel>({
      loading: false,
      typeOfPrograms: 'allPrograms',
      myPrograms: [],
      allPrograms: [],
      setAllPrograms: [],
      loadingSpendFilesVersions: false,
      searchByAuthor: '',
      showOnlyTheMarked: false,
      loadingStatus: false,
      uuidPrograms: null,
      spendFileInrecalculation: !subscribeStore.getAllowActionsInModules
    })



    watch(
      () => subscribeStore.getAllowActionsInModules,
      (newValue) => {        
        homeAnalyzeProgramsPanel.spendFileInrecalculation = !newValue
      }
    )

    // Flag to track if component is mounted
    const isComponentMounted = ref(true)

    function changeTypeOfPrograms(newType: string) {
      if (newType === homeAnalyzeProgramsPanel.typeOfPrograms) {
        return
      }

      homeAnalyzeProgramsPanel.typeOfPrograms = newType
      homeAnalyzeProgramsPanel.showOnlyTheMarked = false
      homeAnalyzeProgramsPanel.searchByAuthor = ''
      if (newType === 'myPrograms') {
        getMyPrograms()
      } else if (newType === 'allPrograms') {
        getAllPrograms()
      }
    }

    function getAllPrograms() {
      // Cancelar cualquier llamada anterior
      if (abortController.value) {
        abortController.value.abort()
      }
      
      // Crear nuevo AbortController
      abortController.value = new AbortController()
      
      homeAnalyzeProgramsPanel.loading = true
      const params = {
        scope: 'all',
        marked: homeAnalyzeProgramsPanel.showOnlyTheMarked,
        firstName: homeAnalyzeProgramsPanel.searchByAuthor,
        lastName: homeAnalyzeProgramsPanel.searchByAuthor,
        spendFileVersion: spendFileVersionActiveId.value,
        signal: abortController.value.signal,
        callbackSuccess: (callbackSuccessData: Program[]) => {
          // Check if component is still mounted before executing callbacks
          if (!isComponentMounted.value) {
            return;
          }

          // Disable Loading
          homeAnalyzeProgramsPanel.loading = false

          if (entityCardStore.getSelectedProgram) {
            const programInList = callbackSuccessData.find((x: any) => x['@id'] === "/api/analyze/programs/" + entityCardStore.getSelectedProgram)

            //Validate if the current stored program id is in the list of programs per spend file
            if (programInList) {
              goToProgramOverview(programInList)
              return
            } else {
              entityCardStore.setSelectedProgram(null)
              Routing.home.openHomeDashBoard()
            }
          }

          // If there's only one program, go to program overview
          if (callbackSuccessData.length === 1) {
            const program = callbackSuccessData[0]
            goToProgramOverview(program)
            return
          }
          //Is no exists stored program id and exists more than 1 program in the current spend file
          //- Unsubscribe from Firebase programs 
          fnSetUnsubscribeProgram()
          homeAnalyzeProgramsPanel.setAllPrograms = callbackSuccessData
          homeAnalyzeProgramsPanel.allPrograms = callbackSuccessData
        },
        callbackError: () => {
          // Check if component is still mounted before executing error callback
          if (!isComponentMounted.value) {
            return;
          }

          // Disable Loading
          homeAnalyzeProgramsPanel.loading = false
        }
      }
      analyzeStore.fetchAllPrograms(params)
    }

    function getProgramByauthor() {
      if (homeAnalyzeProgramsPanel.searchByAuthor !== '') {
        homeAnalyzeProgramsPanel.allPrograms = homeAnalyzeProgramsPanel.setAllPrograms.filter((item: any) =>
          item.createdBy.firstName.toLowerCase().includes(homeAnalyzeProgramsPanel.searchByAuthor.toLowerCase()) ||
          item.createdBy.lastName.toLowerCase().includes(homeAnalyzeProgramsPanel.searchByAuthor.toLowerCase())
        )
      } else {
        homeAnalyzeProgramsPanel.allPrograms = homeAnalyzeProgramsPanel.setAllPrograms
      }
    }

    function getData() {
      getProgramByauthor()
    }

    function getMyPrograms() {
      const filteredData = homeAnalyzeProgramsPanel.allPrograms.filter(
        item => item.createdBy["@id"] === userIri.value
      )

      homeAnalyzeProgramsPanel.myPrograms = filteredData
    }

    function refreshPrograms() {
      // Cancelar cualquier llamada anterior
      if (abortController.value) {
        abortController.value.abort()
      }
      
      //To get always all the programs
      homeAnalyzeProgramsPanel.typeOfPrograms = 'allPrograms'

      getAllPrograms()

      getMyPrograms()
    }

    /**
     * Go to program overview
     * 
     * @param program 
     */
    function goToProgramOverview(program: any) {
      // Only execute if the current URL contains /home/analyze
      // This prevents forced navigation when user has already moved to another section
      if (!router.currentRoute.value.path.includes('/home/analyze')) {
        return;
      }

      router.push({
        name: Routing.home.analyze.homeAnalyzeProgramOverview,
        query: {
          selectedProgramId: removeIRI(program['@id']),
          programTarget: program.programTarget
        }
      });
    }

    watch(
      () => subscribeStore.refreshPrograms,
      (newValue) => {
        // Cancelar cualquier llamada anterior
        if (abortController.value) {
          abortController.value.abort()
        }
        
        homeAnalyzeProgramsPanel.loading = true
        getAllPrograms()
      }
    )

    onUnmounted(() => {
      // Mark component as unmounted to prevent callbacks from executing
      isComponentMounted.value = false;

      // Cancelar cualquier llamada pendiente a la API
      if (abortController.value) {
        abortController.value.abort()
        abortController.value = null
      }

      // Clear any pending intervals
      if (intervalProgram.value) {
        clearInterval(intervalProgram.value);
      }

      // Clear loading states
      homeAnalyzeProgramsPanel.loading = false;
      homeAnalyzeProgramsPanel.loadingStatus = false;
    })

    onMounted(() => {
      
       if (!moduleProgramIsAvailable.value) {
        HomeRouting.openHome();
      }

      //to avoid show skeleton for cards in home
      isComponentMounted.value = true;      
      // Inicializar AbortController
      abortController.value = new AbortController()            
      getAllPrograms()
      homeAnalyzeProgramsPanel.loading = true
    })



    /*** Computed */
    const programsToShow = computed(() => {
      return (homeAnalyzeProgramsPanel.typeOfPrograms === 'myPrograms') ? homeAnalyzeProgramsPanel.myPrograms : homeAnalyzeProgramsPanel.allPrograms
    })

    const setProgramsToDropdown = computed(() => {
      return [...programsToShow.value].sort((a, b) => b.created.localeCompare(a.created))
    })
    /*** END Computed */

    function loadingItems() {
      homeAnalyzeProgramsPanel.loadingStatus = !homeAnalyzeProgramsPanel.loadingStatus
    }

    /**
     * Cancelar todas las llamadas pendientes a la API
     */
    function cancelPendingRequests() {
      if (abortController.value) {
        abortController.value.abort()
        abortController.value = null
      }
    }

    onBeforeRouteLeave((to, from) => {
      // Mark component as unmounted when leaving the route
      isComponentMounted.value = false;

      // Cancelar cualquier llamada pendiente a la API
      if (abortController.value) {
        abortController.value.abort()
        abortController.value = null
      }

      // Clear any pending intervals
      if (intervalProgram.value) {
        clearInterval(intervalProgram.value);
      }

      return true
    })
    return {
      ...toRefs(homeAnalyzeProgramsPanel),
      changeTypeOfPrograms,
      fontIcons,
      getData,
      images,
      loadingItems,
      programsToShow,
      refreshPrograms,
      removeIRI,
      Routing,
      setProgramsToDropdown,
      showCreatebutton,
      cancelPendingRequests
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_borders.scss";


.new-program {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  color: #667085;
  font-weight: 600;
  font-size: 14px;
  padding: 6px 20px;
  width: -moz-fit-content;
  width: 160px;
  height: 48px;
  background: #f2f4f7;
  box-shadow: 0 1px 2px rgba(16, 24, 40, .05);

  .button-for-addprogram {
    width: 20px;
    height: 20px;
    margin-right: 5px;
    fill: $color-gray-500;
  }

  &:hover {
    color: $color-black;

    .button-for-addplan {
      fill: $color-black;
    }
  }

  &:focus {
    background: #FFFFFF;
    border: 1px solid #D0D5DD;
    box-shadow: 0px 0px 0px 4px #667085;
    border-radius: 8px;

    .button-for-addprogram {
      color: $color-black;
      fill: $color-black;
    }
  }
}

.add-new-program:hover {
  span {
    color: white !important;
  }
}

.form-group {
  margin-bottom: 0 !important;
}
</style>
