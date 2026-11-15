<template>
  
  <CalculumLayout :container-class="'manage-module-sections'" :container-id="'manage-module-header'">
    <template #slotTop>
      <CalculumLoading v-if="loadingPrograms" :modal="true" />
      <!-- Header -->

      <div class="row mb-2 pr-2">
        <div class="col-12 d-flex justify-content-between">
          <div class="d-flex">
            <button id="manage-overview-tab" :class="{ active: currentTab === 'Overview' }"
              class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none"
              @click="changeTab('Overview')">
              {{ $t("global.overview") }}
            </button>

            <button id="manage-email-negotiations-tab" :class="{ active: currentTab === 'EmailNegotiations' }"
              class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none"
              @click="changeTab('EmailNegotiations')">
              {{ $t("global.emailNegotiations") }}
            </button>
          </div>

          <div class="ml-auto d-flex">
            <HomeProgramStatusDropdown v-if="!loadingPrograms" :key="keyTabsViews"
              :list-options="dropdownProgramValues.programsList" :selected-program-uri="programValues.selectedProgramId"
              :skeleton-is-showing="loadingPrograms" class="d-flex ml-auto" @select-program-dropdown="changeProgram" />
          </div>
        </div>
      </div>
      <!-- LOCKED badge if teaser -->

      <div v-if="currentTab === 'EmailNegotiations' && showEmailNegotiationsTeaser" class="row">
        <div class="col-12 d-flex justify-content-end">
          <Locked />
        </div>
      </div>

      <div v-if="currentTab === 'Overview' && showModuleManageTeaser" class="row">
        <div class="col-12 d-flex justify-content-end">
          <Locked />
        </div>
      </div>
      <!-- END OF LOCKED badge if teaser -->
    </template>

    <!-- END Header -->

    <template #slotContent>
      <div class="sub-main-sections">
        <KeepAlive>
          <component 
            :is="currentTab"   
            v-if="!loadingPrograms"            
            :key="currentTab" 
            :refresh-after-recalculating="keyRenderComponent"
            :current-tab-tracker="currentTabTracker"
            :show-skeleton="false" />
        </KeepAlive>
      </div>
    </template>
  </CalculumLayout>
</template>

<script lang="ts">
import { computed, defineComponent, ref, Ref, watch, reactive, onMounted, toRefs } from "vue";
import { ManageTab, ProgramSelectedAndStatus, ProgramDropdownValues } from "@/types";
import { StringUtils, NumberUtils } from "@/utils";
import { useEmailNegotiations } from "@/composables";
import { CalculumLayout, CalculumLoading } from '@ada/design-system'
import EmailNegotiations from "./EmailNegotiations.vue";
import HomeProgramStatusDropdown from "@/modules/home/components/HomeProgramStatusDropdown.vue";
import Locked from "@/modules/components/teaser/Locked.vue";
import Overview from "./Overview.vue";
import useUser from "@/services/user/composables/useUser";
import { useAnalyzeStore } from '@/stores/analyze'
import { useEntityCardStore } from '@/stores/entityCard'
import { useSubscribeStore } from '@/stores/subscribe'
import { Program } from "@/modules/home/analyze/types";
import { useI18n } from 'vue-i18n'
import useProgramList from "@/composables/useProgramList";
import useSpendFile from "@/composables/useSpendFile";
import { useToast } from 'vue-toastification';
import useApolloClient from "@/services/graphql/useApolloClient";
import useEntity from '@/modules/home/entityCard/composables/useEntity'

export default defineComponent({
  name: "ManageView",
  components: {
    CalculumLayout,
    EmailNegotiations,
    HomeProgramStatusDropdown,
    Locked,
    Overview,
    CalculumLoading
  },
  setup() {
    // *** Tabs ***

    const analyzeStore = useAnalyzeStore()
    const entityCardStore = useEntityCardStore()
    const subscribeStore = useSubscribeStore()
    const { entitySelectedTrackingNumber } = useEntity()

    const { setSelectedProgramValues, setProgramsToDropdown } = useProgramList()
    const toast = useToast()

    const { spendFileVersionActiveId } = useSpendFile()

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    const currentTab: Ref<ManageTab> = ref("Overview");
    
    const { useModuleManage, useFeatureEmailNegotiations } = useUser();

    const showModuleManageTeaser = computed(() => {
      return useModuleManage.value === false
    })

    const showEmailNegotiationsTeaser = computed(() => {
      return useFeatureEmailNegotiations.value === false
    })

    const showTeaser = computed(() => {
      return currentTab.value === 'Overview' && showModuleManageTeaser.value || currentTab.value === 'EmailNegotiations' && showEmailNegotiationsTeaser.value
    })

    const validateTeaser = !showModuleManageTeaser.value || !showEmailNegotiationsTeaser.value ? true : false
    // *** Programs ***

    const currentTabTracker = ref(NumberUtils.getRandomInt());
    const keyRenderComponent = ref(NumberUtils.getRandomInt());

    // *** END Programs ***

    interface Data {
      loadingPrograms: boolean;
      loadingSelectedProgram: boolean;
      loadingAllPrograms: boolean;
      programValues: ProgramSelectedAndStatus;
      dropdownProgramValues: ProgramDropdownValues;
      currentTab: string;
      showWaterFallTab: boolean;
      program: Program | null;
      keyOptionsProgram: number;
      keyDropdown: number;
      keyTabsViews: number;
      spendsActive: number;
      showModaltoEdit: boolean;
      forceReload: boolean;
    }

    const data = reactive<Data>({
      loadingPrograms: true,
      loadingSelectedProgram: true,
      loadingAllPrograms: true,
      programValues: {
        recalculationInProgress: false,
        pendingRecalculation: false,
        selectedProgramId: null,
        isBoxesRecalculating: null
      },
      dropdownProgramValues: {
        programsList: null,
      },
      currentTab: "ProgramOverview",
      showWaterFallTab: false,
      program: null,
      keyOptionsProgram: NumberUtils.getRandomInt(),
      keyDropdown: NumberUtils.getRandomInt(),
      keyTabsViews: NumberUtils.getRandomInt(),
      spendsActive: 0,
      showModaltoEdit: false,
      forceReload: false,
    });

    const { apolloClientResetStore, isResetting } = useApolloClient();

    onMounted(() => {
      if (validateTeaser) {
        getAllPrograms()
      }else{
        data.loadingPrograms = false;
      }
      setBrowserTitlebyTab()
    });

    async function getAllPrograms() {
      try {
        data.loadingPrograms = true;
        const params = {
          scope: 'all',
          marked: null,
          firstName: null,
          lastName: null,
          recalculationInProgress: false,
          spendFileVersion: spendFileVersionActiveId.value,
          callbackSuccess: (response: any) => {
            data.programValues = setSelectedProgramValues(response);
            data.dropdownProgramValues = setProgramsToDropdown(response);
            data.loadingPrograms = false;  
            data.keyTabsViews++;
            keyRenderComponent.value = NumberUtils.getRandomInt();
          },
          callbackError: (error: any) => {
            if (import.meta.env.DEV) console.error('Error loading programs:', error);
            toast.error(translate.t('global.errorLoadingManage'));
          }
        };
        await analyzeStore.fetchAllPrograms(params);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error in getAllPrograms:', error);
        toast.error(translate.t('global.errorLoadingManage'));
      } finally {
        data.loadingPrograms = false;
      }
    }

    function changeTab(tab: ManageTab) {
      currentTab.value = tab;
      setBrowserTitlebyTab()
    }

     watch(currentTab, () => {
      currentTabTracker.value = NumberUtils.getRandomInt();
    });


     function setBrowserTitlebyTab() {


      let title = 'Manage - '

      switch(currentTab.value) {

        case 'Overview':
          title+=translate.t('global.overview')
          break;

        case 'EmailNegotiations':
          title+=translate.t('global.emailNegotiations')
          break;
        
          default:
          break;

      }

      document.title = title

    }

    watch(entitySelectedTrackingNumber, async () => {
      await apolloClientResetStore();
    });

    watch(
      () => subscribeStore.refreshPrograms,
      async (newValue) => {        
        
        try {
          if (newValue === 'ready'){
            await apolloClientResetStore();
            keyRenderComponent.value = NumberUtils.getRandomInt();
          }
        } catch (error) {
          if (import.meta.env.DEV) console.error('Error handling program refresh:', error);
          toast.error(translate.t('error.refreshProgramsFailed'));
        }
      }
    );


    // *** END Tabs ***
 

    async function changeProgram(programID: any) {      
      try {
        const programInList = data.dropdownProgramValues.programsList.find(
          (x: any) => StringUtils.removeIRI(x['@id']) === StringUtils.removeIRI(programID)
        );

        if (!programInList) {
          return;
        }

        data.programValues.selectedProgramId = StringUtils.removeIRI(programID);
        entityCardStore.setSelectedProgram(data.programValues.selectedProgramId);        

        await apolloClientResetStore();
        if (!isResetting.value) {
          await getAllPrograms();
          data.keyTabsViews++;
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error changing program:', error);
        toast.error(translate.t('error.changeProgramFailed'));
      }
    }



    // *** Email Negotiations ***
    const {
      featureIsAvailable: emailNegotiationsIsAvailable
    } = useEmailNegotiations();

    // *** END Email Negotiations ***

    return {
      ...toRefs(data),
      changeTab,
      currentTab,
      currentTabTracker,
      emailNegotiationsIsAvailable,
      keyRenderComponent,
      showEmailNegotiationsTeaser,
      showModuleManageTeaser,
      showTeaser,
      StringUtils,      
      changeProgram,
      isResetting,
    };
  }
});
</script>
