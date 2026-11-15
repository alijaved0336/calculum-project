<template>
<CalculumLayout :containerClass="'entity-home'" @load-more-entities="getMore" :key="calculumlayoutkey">
  <template v-slot:slotTop>
    <div class="row">
      <div class="col-12 d-flex justify-content-between">
        <div class="d-flex align-items-center">
          <a class="btn btn-clean font-md text-capitalize custom-padding-btn d-flex align-items-center justify-content-center" id="entity-cards-tab" :class="{ 'active': mainTab === 'suppliers', 'btn-clean': mainTab !== 'suppliers', 'rounded-tbr-none': usePotentialSupplierFeature }" @click="changeMainTab('suppliers')">{{ supplierTab }}</a>

          <a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none d-flex align-items-center justify-content-center" id="entity-lists-tab" v-if="usePotentialSupplierFeature" :class="mainTab === 'potential' ? 'active' : 'btn-clean'" @click="changeMainTab('potential')">{{ potentialSupplierTab }}</a></div>

        <div class="d-flex align-items-center gap-2">
          <div class="d-flex" v-if="mainTab === 'suppliers'">
            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'"><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none d-flex align-items-center justify-content-center gap-2" id="entity-view-cards-tab" :class="currentTab === 'cards' ? 'active' : 'btn-clean'" @click="changeTab('cards')" :title="$t('global.cardsTitle')">
                <IconGrid class="icon-svg" :title="$t('global.cardsTitle')">   </IconGrid></a></Tooltip>
            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'"><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none d-flex align-items-center justify-content-center gap-2" id="entity-lists-tab" :class="currentTab === 'lists' ? 'active' : 'btn-clean'" @click="changeTab('lists')" :title="$t('global.listsTitle')">
                <IconList class="icon-svg" :title="$t('global.listsTitle')"></IconList></a></Tooltip>
          </div>

          <div class="d-flex" v-if="mainTab === 'potential' && usePotentialSupplierFeature">
            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'"><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none d-flex align-items-center justify-content-center gap-2" id="entity-cards-tab-potential" :class="currentTab === 'cards' ? 'active' : 'btn-clean'" @click="changeTab('cards')" :title="$t('global.cardsTitle')">
                <IconGrid class="icon-svg" :title="$t('global.cardsTitle')"></IconGrid></a></Tooltip>
            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'"><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none d-flex align-items-center justify-content-center gap-2" id="entity-requests-tab-potential" :class="currentTab === 'requests' ? 'active' : 'btn-clean'" @click="changeTab('requests')" :title="$t('global.requestsTitle')">
                <RequestsIcon :title="$t('global.requestsTitle')"></RequestsIcon></a></Tooltip>
          </div>
        </div>
      </div>
    </div>
    <div class="row" v-if="companyIsPilot && mainTab === 'suppliers'">
      <div class="col-12 d-flex justify-content-end">
        <div class="d-flex flex-column" v-if="!loadingCards">
          <div class="d-flex align-items-center icon-arrow-for-entity-type-dropdown cursor-pointer" @click="isEntityDropDownForDefaultAndPotentialShowing = !isEntityDropDownForDefaultAndPotentialShowing">
            <div class="header-title text-2xl font-semibold mr-5 cursor-pointer">{{ entityCardTitleTypeComputed }}            </div>
            <iconArrow class="icon-svg" :class="{ 'rotate-180': !isEntityDropDownForDefaultAndPotentialShowing }"></iconArrow>
          </div>
          <div class="d-flex flex-column entity-container-dropdown" v-if="isEntityDropDownForDefaultAndPotentialShowing"> <span @click="changeEntityCardType('supplier')">{{ $t('global.defaultEntities') }}            </span><span v-if="companyIsPilot" @click="changeEntityCardType('pilot')">{{ $t('global.pilotSuppliers') }}</span></div>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections cards-container">
      <div class="row">
        <div class="col-12 d-flex justify-content-between">
          <div class="d-flex align-items-center">
            <CalculumDropdown v-show="currentTab==='cards'" @changeDropdownState="changeChartOptionsState" :title="$t('global.filters.sortedBy')" :state="clickedOnSortByTableArrow" :upperCase="false">
              <template v-slot:dropdown-content>
                <ul class="options_table" v-if="currentTab==='cards'" ref="optionsTableRef" @click="sortedBySelectedOption($event)">
                  <li v-for="filterOption in filterOptions">{{ filterOption }}</li>
                </ul>
              </template>
            </CalculumDropdown>
            <iconCareUpAndDownVue class="icon-svg" v-show="currentTab==='cards'"></iconCareUpAndDownVue>
            <div class="d-flex align-items-center mr-1 cursor-pointer" v-show="currentTab==='cards'">
              <div class="ml-1" v-show="currentTab==='cards'">
                <div class="d-flex align-items-center justify-content-between sortedby_container" @click="toggleSortByArrow();" :class="{ sorted_contained_active: sortyByTableDisplaying }"><span class="current-sorted-option font-weight-bolder cursor-pointer">{{ currentSortedOption }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CalculumLoading v-if="loadingRemainingItems && suppliers.length === 0" :modal="true"></CalculumLoading>
      <div class="d-flex" v-if="mainTab === 'suppliers' && currentTab === 'lists'">
        <HomeAnalyzeProgramList :selectedProgramId="String(selectedProgramId)" :program-data="program ?? {} as Program" :editMode="false" :inRecalculation="(program as any)?.recalculationInProgress ?? false">     </HomeAnalyzeProgramList>
      </div>
      <div class="d-flex" v-if="mainTab === 'potential' && currentTab === 'requests'">
        <KeepAlive>
          <PotentialRequestController></PotentialRequestController>
        </KeepAlive>
      </div>
      <div class="analyze-card" v-show="currentTab==='cards'">
        <div class="row">
          <div class="col-12 mb-3" v-if="!notRecently && recentSuppliers.length > 0 && searchEntitySuppliers.length === 0 && appliedFilterOptions.length === 0 && entityCardType !== 'potential' && StringUtils.isNullUndefinedOrEmpty(searchQuery)"><span>{{ $t('home.entityCard.recentSearches') }}</span></div>
          <div class="col-12 mb-3" v-if="searchEntitySuppliers.length > 0"><span class="mr-4">{{ $t('home.entityCard.yourSearch') }}</span></div>
        </div>

        <div v-if="entityCardType !== 'potential' && StringUtils.isNullUndefinedOrEmpty(searchQuery)" class="row recent-cards">
          <EntityCardRecentSearchCompany v-for="supplier in recentSuppliers" @openEntityModal="openEntityModal" @removedRecentCard="removeRecent" :pilot="supplier.isPilot" :buyers="supplier.buyers" :companyType="supplier.companyType" :country="supplier.countryName" :domain="supplier.domain" :id="supplier.uuid" :logoUrl="supplier.logoUrl" :name="supplier.name" :negotiationStatus="supplier.negotiationStatus" :negotiationStatusCodes="supplier.negotiationStatusCodes" :originalSupplierName="supplier?.originalSupplierName" :parentName="supplier.parentName" :spendsAmount="supplier.spendsAmount" :spendVolume="supplier.volume" :isSME="supplier.isSME" :smeSource="supplier.smeSource" :supplier="supplier" :showCloseAction="true" :receivedName="supplier.receivedSupplierName ?? ''" :is-approved-and-ready-to-publish="supplier.isApprovedAndReadyToPublish ?? null" industry="-" region="-" :showRemoveRecentCard="true"></EntityCardRecentSearchCompany>
          
        </div>
        <div class="d-flex mb-1 w-100">
          <div class="d-flex flex-column align-items-center justify-content-start w-100 no_search" v-if="!loadingRemainingItems && notRecently && ((suppliers.length === 0) || (searchEntitySuppliers.length === 0))"><img class="no_search_icon mr-1" :src="fontIcons.noSearch"/><span>{{ $t('global.filters.emptySearchResult') }}</span></div><span class="mb-2" v-if="suppliers.length > 0">{{ $t('home.entityCard.allCards') }}</span>
        </div>
        <div class="row recent-cards">
          <EntityCardRecentSearchCompany v-for="supplier in suppliers" @openEntityModal="openEntityModal" :buyers="supplier.buyers" :companyType="supplier.companyType" :country="supplier.countryName ?? '-'" :domain="supplier.domain" :logoUrl="supplier.logoUrl" :name="supplier.name" :pilot="supplier.isPilot" :negotiationStatus="supplier.negotiationStatus" :negotiationStatusCodes="supplier.negotiationStatusCodes" :originalSupplierName="supplier.originalSupplierName" :parentName="supplier.parentName" :spendsAmount="supplier.spendsAmount" :spendVolume="supplier.volume" :isSME="supplier.isSME" :smeSource="supplier.smeSource" :supplier="supplier" :receivedName="supplier.receivedSupplierName ?? ''" :is-approved-and-ready-to-publish="supplier.isApprovedAndReadyToPublish ?? null" industry="-" region="-"></EntityCardRecentSearchCompany>
        </div>
      </div>
      <div class="row d-flex" v-if="loadingRemainingItems && suppliers.length > 0">
        <div class="col-12 d-flex justify-content-center align-items-center"><span class="spinner-border spinner-border-sm">   </span></div>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  provide,
  reactive,
  ref,
  toRefs,
  watch
} from 'vue'

// Types
import type { FiltersAPIParam, EntityType, EntityCard } from '@/types';
import { fontIcons } from '@/resources/assets/assets'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import * as clickOutsideRelated from '@/utils/clickOutsideRelated'
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import CalculumDropdown from '@/modules/components/CalculumDropdown.vue'
import { CalculumLayout, CalculumLoading } from '@ada/design-system'
import EntityCardRecentSearchCompany from '@/modules/home/entityCard/components/EntityCardRecentSearchCompany.vue'
import iconArrow from '@/resources/assets/images/icons/iconArrow.vue'
import iconCareUpAndDownVue from '@/resources/assets/images/icons/iconCaretUpAndDown.vue'
import IconGrid from '@/resources/assets/images/icons/IconGrid.vue'
import IconList from '@/resources/assets/images/icons/IconList.vue'
import RequestsIcon from '@/resources/assets/images/icons/Requests.vue'
import useProgram from '@/modules/home/analyze/composables/useProgram'
import useNegotiationStatus from '@/modules/negotiationStatus/composables/useNegotiationStatus';
import useSpendFile from "@/composables/useSpendFile";
import { useEntityCardStore } from '@/stores/entityCard'
import { StringUtils } from '@/utils';
import { useUser, useModuleEntityCard } from '@/composables';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import HomeAnalyzeProgramList from '@/modules/home/analyze/views/HomeAnalyzeProgramList.vue'
import { useAnalyzeStore } from '@/stores/analyze';
import { Program } from '../../analyze/types';
import PotentialRequestController from '../components/PotentialRequestController.vue'
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useSubscribeStore } from '@/stores/subscribe'
import * as HomeRouting from "@/modules/home/HomeRouting";

export default defineComponent({
  name: 'EntityCard',
  components: {
    CalculumDropdown,
    CalculumLayout,
    CalculumLoading,
    EntityCardRecentSearchCompany,
    iconArrow,
    iconCareUpAndDownVue,
    IconGrid,
    IconList,
    HomeAnalyzeProgramList,
    PotentialRequestController,
    RequestsIcon,
    Tooltip
  },
  props: {
    searchQuerys: { type: String, required: false, default: '' },
    selectedTab: { type: String, required: false, default: '' },
    section: { type: String, required: false, default: '' },
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const subscribeStore = useSubscribeStore()
    const { moduleEntityCardIsAvailable } = useModuleEntityCard()

    const globalFiltersStore = useGlobalFiltersStore()
    const entityCardStore = useEntityCardStore()
    const analyzeStore = useAnalyzeStore()
    /** Firebase utils */
    let currencyRate: number = useAppStore().getCurrencyAmount;

    let setGlobalFilter = formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied)


    const router = useRouter();
    const {
      spendFileVersionActiveId,
      spendFileVersionActiveIri
    } = useSpendFile()

    const { userIri, user, isPilotAccount, usePotentialSupplierFeature } = useUser();

    const { programSelectedId, programsFormatted } = useProgram();

    // Access programsFormatted to trigger the side-effect that loads programs.
    // Without this, useProgram()'s watch never fires on EntityCard because
    // programsFormatted is lazy (computed) and nothing else accesses it here.
    // The side-effect increments programsTrackingNumber → triggers the watch
    // → loads programs → syncs to analyzeStore.allPrograms → useConsistentFetch
    // in Lists.vue sees programs and fires data fetches.
    void programsFormatted.value;

    const isSuperAdmin = computed(() => {
      return user ? (user?.value?.isSuperAdmin ?? false) : false
    })

    // Create a reactive ref for targetEntityType
    const targetEntityTypeRef = ref<EntityType>('supplier')

    let filters: FiltersAPIParam = {
      globalFilter: setGlobalFilter,
      currencyRate,
      targetSpendFileVersionUuid: spendFileVersionActiveId.value,
      targetEntityType: targetEntityTypeRef.value,
      targetProgramUuid: programSelectedId.value
    }

    // Provide targetEntityType to child components
    provide('targetEntityType', targetEntityTypeRef)

    function setGlobalFiltersFn() {
      targetEntityTypeRef.value = 'supplier'
      filters = {
        globalFilter: setGlobalFilter,
        currencyRate,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        targetEntityType: targetEntityTypeRef.value,
        targetProgramUuid: programSelectedId.value
      }

      checkSearch()
    }

    function handleClick(e: any) {
      const clickedInside = clickOutsideRelated.menuPopup(e, '.icon-arrow-for-entity-type-dropdown', '.entity-container-dropdown');

      if (clickedInside !== undefined && !clickedInside) {
        entityCard.isEntityDropDownForDefaultAndPotentialShowing = false;
      }
    }

    const optionsTableRef = ref()

    const clickedOnSortByTableArrow = ref(false)

    const sortedByRecentlyIsSelected = ref(false)

    const currentSortedOrderBy = isPilotAccount() ? ref('') : ref('recently')

    const currentOrderDirection = ref('ASC')

    const entityCard = reactive<EntityCard.EntityCardEntitiesCards>({
      appliedFilterOptions: [],
      filterOptions: [],
      loadingRecentSuppliers: true,
      searchQuery: null,
      currentSortedOption: '',
      searchEntitySuppliers: [],
      recentSuppliers: [],
      suppliers: [],
      sortyByTableDisplaying: false,
      notRecently: false,
      remainingItems: true,
      from: 0,
      loadingRemainingItems: false,
      sortedSelected: '',
      calculumlayoutkey: new Date().getUTCMilliseconds(),
      selectedEntityObj: {
        companyId: '',
        domain: undefined,
        spendVolume: null,
        country: undefined,
        companyTypeForTheme: undefined,
        negotiationStatus: null
      },
      isEntityModalShowing: false,
      isEntityDropDownForDefaultAndPotentialShowing: false,
      entityCardType: isPilotAccount() ? 'pilot' : 'supplier',
      loadingCards: true
    })
    const data=reactive({
      mainTab: 'suppliers',
      currentTab: 'cards',
      tabtoChange: '',
      selectedProgramId: entityCardStore.selectedProgram,
      program: null,
    })

    // Keep data.selectedProgramId in sync with the program selected by useProgram().
    // Without this, data.selectedProgramId is a one-time copy (line 337) and never
    // updates when useProgram() picks a new program after loading — leaving the
    // Lists tab with a stale/null programId so useConsistentFetch never fires.
    watch(programSelectedId, (newId) => {
      data.selectedProgramId = newId ?? null;
    });

    // Flag to track if program data has been loaded for current context
    const programDataLoadedForCurrentTab = ref(false)

    const retrieveProgramData=()=>{
      const params = {
        programId: data.selectedProgramId,
        callbackSuccess: (callbackSuccessData: any) => {
          data.program = callbackSuccessData
        }
      }
      analyzeStore.getProgram(params)
    }

    /**
     * Load program data if needed (only for 'lists' tab and after entity cards load)
     */
    const loadProgramDataIfNeeded = () => {
      if (data.currentTab === 'lists' && !programDataLoadedForCurrentTab.value) {
        // Wait for entity card loading to complete
        // Use let + optional call to avoid temporal dead zone:
        // { immediate: true } fires the callback synchronously inside watch(),
        // before the assignment completes, so const unwatch would be undefined.
        let unwatch: (() => void) | undefined
        unwatch = watch(
          () => entityCard.loadingRemainingItems,
          (isLoading) => {
            if (!isLoading) {
              retrieveProgramData()
              programDataLoadedForCurrentTab.value = true
              unwatch?.() // Stop watching
            }
          },
          { immediate: true }
        )
      }
    }

    const scrollToTop = function () {
      window.scrollTo({ top: 0 })
    }

    function changeEntityCardType(entityType: EntityType) {

      entityCard.isEntityDropDownForDefaultAndPotentialShowing = false

      // If it's the same type, do nothing
      if (entityCard.entityCardType === entityType) { return; }

      cleanSuppliers()
      entityCard.searchQuery = null
      entityCard.remainingItems = true
      entityCard.entityCardType = entityType

      if (entityCard.entityCardType !== 'potential') {
        getRecentEntityCards()
      }

      // Reset program data flag when changing entity type
      programDataLoadedForCurrentTab.value = false

      // Call API
      getAllEntityCards(true)

      // Load program data if on 'lists' tab, otherwise keep existing behavior
      if (data.currentTab === 'lists') {
        loadProgramDataIfNeeded()
      } else {
        retrieveProgramData()
      }
    }

    function goToOverview(supplier: any) {
      if (user && user.value?.isSuperAdmin) {
        router.push({
          name: Routing.home.entityCard.entityCardOverview,
          query: {
            companyId: supplier.uuid,
            domain: supplier.domain,
            spendVolume: supplier.spendVolume,
            country: supplier.countryName,
          }
        })

      }
      if ((isPilotAccount() && supplier.isPilot) || !isPilotAccount()) {
        router.push({
          name: Routing.home.entityCard.entityCardOverview,
          query: {
            companyId: supplier.uuid,
            domain: supplier.domain,
            spendVolume: supplier.spendVolume,
            country: supplier.countryName,
          }
        })

      }
    }

    function openEntityModal(supplier: any) {
      if (user.value?.isSuperAdmin || !isPilotAccount() || (isPilotAccount() && supplier.isPilot)) {
        entityCard.selectedEntityObj = {
          companyId: supplier.uuid || '',
          domain: supplier.domain,
          spendVolume: supplier.volume,
          country: supplier.countryName,
          companyTypeForTheme: supplier.companyType,
          negotiationStatus: supplier.negotiationStatusCodes || null
        } as EntityCard.SelectedEntityObj

        entityCardStore.setEntityType(entityCard.selectedEntityObj.companyTypeForTheme || null)

        entityCardStore.setSelectedEntity(entityCard.selectedEntityObj)

        entityCardStore.setIsModalEntityShowing(true)

        // Add entity to recent list if not already present
        if (entityCard.entityCardType !== 'potential') {
          addEntityToRecentList(supplier)
        }
      }
    }

    /**
      * Adds an entity to the recent list if it's not already present
      * @param supplier - The supplier entity to add
      */
    function addEntityToRecentList(supplier: any) {
      // Check if entity is already in recent list
      const isAlreadyInRecent = entityCard.recentSuppliers.some(
        (recent: any) => recent.uuid === supplier.uuid
      )

      if (!isAlreadyInRecent) {
        // Create entity object with proper format
        const entityToAdd = {
          ...supplier,
          // Ensure negotiation status codes are properly formatted
          negotiationStatusCodes: supplier.negotiationStatusCodes || supplier.negotiationStatus || ''
        }

        // Add to beginning of recent list (most recent first)
        entityCard.recentSuppliers.unshift(entityToAdd)

        // Keep only the first 20 items to maintain performance
        if (entityCard.recentSuppliers.length > 20) {
          entityCard.recentSuppliers = entityCard.recentSuppliers.slice(0, 20)
        }
      }
    }


    function cleanSuppliers() {
      if (entityCard.searchQuery === null) {
        entityCard.notRecently = false
        entityCard.remainingItems = true
        entityCard.from = 0
        scrollToTop()
        entityCard.suppliers = []
      }
    }

    // *** API Calls ***

    let entityCardsAbortController: AbortController | null = null

    const { negotiationStatusGetStatusesTranslated } = useNegotiationStatus()

    /**
      * Retrieves the recent entity cards and updates the entityCard state accordingly.
      *
      * @return {void}
      */
    function getRecentEntityCards(): void {
      // Enable loading
      entityCard.loadingRecentSuppliers = true

      targetEntityTypeRef.value = entityCard.entityCardType
      filters.targetEntityType = entityCard.entityCardType

      const params = {
        filters,
        orderBy: currentSortedOrderBy.value,
        orderDirection: currentOrderDirection.value,
        callbackSuccess: (callbackSuccessData: EntityCard.EntityCardAPIResponse[]) => {
          // Assign unconditionally so an empty response clears the strip instead of
          // leaving stale cards from a previous sort/filter (WI#18712).
          entityCard.recentSuppliers = callbackSuccessData
            // Get list of negotiation statuses
            .map(i => {
              return {
                ...i,
                // from "analyzed,planned" to "Analyzed, Planned"
                negotiationStatusCodes: negotiationStatusGetStatusesTranslated(i.negotiationStatusCodes)
              }
            })

          // Disable loading
          entityCard.loadingRecentSuppliers = false
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV) {
            console.error("** Error in get recent suppliers", callbackErrorData)
          }

          // Disable loading
          entityCard.loadingRecentSuppliers = false
        }
      }

      if (!StringUtils.isNullUndefinedOrEmpty(userIri.value) &&
        !StringUtils.isNullUndefinedOrEmpty(spendFileVersionActiveIri.value)) {
        entityCardStore.getRecentEntityCards(params)
      }
    }

    /**
      * Get all entity cards and handle loading more.
      *
      * @param {boolean} loadingMore - indicates if more items are being loaded
      * @return {void}
      */
    function getAllEntityCards(loadingMore: boolean) {
      targetEntityTypeRef.value = entityCard.entityCardType
      filters.targetEntityType = entityCard.entityCardType

      // If there are not remaining items, do nothing
      if (!entityCard.remainingItems) { return; }

      // Cancel any in-flight request before starting a new one
      entityCardsAbortController?.abort()
      entityCardsAbortController = new AbortController()

      // Enable loading
      entityCard.loadingRemainingItems = true

      const params = {
        search: entityCard.searchQuery,
        from: entityCard.from,
        userId: userIri.value,
        orderBy: currentSortedOrderBy.value === 'recently' ? 'name' : currentSortedOrderBy.value,
        orderDirection: currentOrderDirection.value,
        spendFileVersionId: spendFileVersionActiveIri.value,
        filters,
        signal: entityCardsAbortController.signal,
        callbackSuccess: (callbackSuccessData: EntityCard.EntityCardAPIResponse[]) => {
          entityCard.remainingItems = callbackSuccessData.length >= 20

            // Parsing
            const callbackSuccessDataParsed = callbackSuccessData
            // Get list of negotiation statuses
            .map(i => {
              return {
                ...i,
                // from "analyzed,planned" to "Analyzed, Planned"
                negotiationStatusCodes: negotiationStatusGetStatusesTranslated(i.negotiationStatusCodes)
              }
            })

          entityCard.searchEntitySuppliers = []

          if (loadingMore) {
            entityCard.suppliers = [...entityCard.suppliers, ...callbackSuccessDataParsed]

            if (entityCard.suppliers.length === 0) {
              entityCard.notRecently = true
            }
            //
            else {
              entityCard.notRecently = false
            }
          }
          //
          else {
            entityCard.suppliers = callbackSuccessDataParsed

            if (entityCard.suppliers.length === 0) {
              entityCard.notRecently = true
            }
            //
            else {
              entityCard.notRecently = false
            }
          }

          // Disable loading
          entityCard.loadingRemainingItems = false

          entityCard.loadingCards = false
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV) { console.error("** Error in getAllEntityCards:", callbackErrorData) }

          // Disable loading
          entityCard.loadingRemainingItems = false
        }
      }

      if (!StringUtils.isNullUndefinedOrEmpty(userIri.value) &&
        !StringUtils.isNullUndefinedOrEmpty(spendFileVersionActiveIri.value)) {
        entityCardStore.postElasticSearchSuppliers(params)
      }
      // I set this because for a promise this needs return something
      return loadingMore
    }

    /**
      * Function to perform a new search for suppliers.
      *
      * @return {void}
      */
    function newSearchSuppliers(): void {
      // Disable loading
      entityCard.loadingRemainingItems = false

      if (!entityCard.loadingRemainingItems) {
        scrollToTop()

        entityCard.remainingItems = true

        entityCard.from = 0

        entityCard.loadingRemainingItems = true

        entityCard.searchEntitySuppliers = []

        entityCard.suppliers = []

        const params = {
          search: entityCard.searchQuery,
          from: entityCard.from,
          orderBy: currentSortedOrderBy.value,
          orderDirection: currentOrderDirection.value,
          filters,
          callbackSuccess: (callbackSuccessData: EntityCard.EntityCardAPIResponse[]) => {
            entityCard.remainingItems = callbackSuccessData.length >= 20

            if (callbackSuccessData.length > 0) {
              entityCard.notRecently = false

              // Parsing
              const callbackSuccessDataParsed = callbackSuccessData
                // Get list of negotiation statuses
                .map(i => {
                  return {
                    ...i,
                    // from "analyzed,planned" to "Analyzed, Planned"
                    negotiationStatusCodes: negotiationStatusGetStatusesTranslated(i.negotiationStatusCodes)
                  }
                })

              entityCard.suppliers = [...entityCard.suppliers, ...callbackSuccessDataParsed]
            }
            //
            else {
              entityCard.notRecently = true
            }
            entityCard.loadingRemainingItems = false
          },
          callbackError: (callbackErrorData: any) => {
            if (import.meta.env.DEV) console.error('** Error in get suppliers', callbackErrorData)

            // Disable loading
            entityCard.loadingRemainingItems = false
          }
        }

        entityCardStore.postElasticSearchSuppliers(params)
      }
    }

    // *** END Search Suppliers ***

    // *** END API Calls ***

    function getMore() {
      if (!entityCard.loadingRemainingItems) {
        entityCard.from = entityCard.from + 20
        getAllEntityCards(true)
      }
    }

    const currentSearchQuery = computed(() => {
      return entityCardStore.getQuerySearch;
    });

    const currentGlobalFilters = computed(() => {
      return globalFiltersStore.getFiltersApplied;
    });

    watch(currentSearchQuery, (newValue) => {
      entityCard.calculumlayoutkey++;
      entityCard.from = 0;
      scrollToTop();
      entityCard.searchQuery = newValue;

      if (newValue) {
        entityCard.notRecently = true;
        newSearchSuppliers();
      } else {
        cleanSuppliers();
        entityCard.searchQuery = null;
        entityCard.remainingItems = true;
        Promise.all([
          getAllEntityCards(true),
          entityCard.entityCardType !== 'potential' ? getRecentEntityCards() : Promise.resolve()
        ]);
      }
    }, { flush: 'post' });

    watch(currentGlobalFilters, (newValue) => {
      /**
       * RACE CONDITION GUARD — watch(currentGlobalFilters)
       *
       * cleanupBeforeCompanyChange() resets filtersApplied to [] before the company
       * API calls complete. This triggers this watcher while selectedProgramId and
       * activeSpendFileVersion may still belong to different companies.
       *
       * Calling setGlobalFiltersFn() during this window fires API calls with mismatched
       * context → HTTP 500.
       *
       * See: docs/context/race-condition-company-change.md
       */
      if (globalFiltersStore.getDisableWatchers) {
        return;
      }
      setGlobalFilter = formatData.convertFiltersToREST(newValue);
      entityCard.recentSuppliers = [];
      entityCard.from = 0;
      cleanSuppliers();
      setGlobalFiltersFn();
    }, { flush: 'post' });

    function checkSearch() {
      if (props.searchQuerys !== '') {
        entityCard.searchQuery = props.searchQuerys
        newSearchSuppliers()
      } else {
        if (entityCard.entityCardType !== 'potential') {
          getRecentEntityCards()
        }
        getAllEntityCards(false)
      }
    }

    function removeRecent(uuid: string) {
      entityCard.recentSuppliers = entityCard.recentSuppliers.filter((recent) => recent.uuid !== uuid)
    }

    /**
      * The user can select the option to sort the suppliers by.
      * If the selected option is the same as the previous one, the API call is skipped.
      * otherwise, the API call is made.
      */
    function sortedBySelectedOption(event: any) {
      toggleSortByArrow();
      entityCard.from = 0
      scrollToTop()

      // Check if the selected option is the same as the previous one
      if (entityCard.currentSortedOption === event.target.innerText) {
        if (import.meta.env.DEV) console.log(`** Option "${event.target.innerText}" already selected. Skipping API call.`);
        return;
      }

      // Update the current sorted option
      entityCard.currentSortedOption = event.target.innerText;
      entityCard.sortyByTableDisplaying = !entityCard.sortyByTableDisplaying;
      clickedOnSortByTableArrow.value = !clickedOnSortByTableArrow.value;

      if (event.target.tagName === 'LI') {
        if (event.target.innerText === translate.t('global.filters.nameAsc')) {

          currentSortedOrderBy.value = 'name'
          currentOrderDirection.value = 'ASC'

          // entityCard.recentSuppliers = []
          entityCard.remainingItems = true
          if (entityCard.searchQuery) {
            newSearchSuppliers()
          } else {
            getRecentEntityCards()
            getAllEntityCards(false)
          }
        } else if (event.target.innerText === translate.t('global.filters.nameDesc')) {
          currentSortedOrderBy.value = 'name'
          currentOrderDirection.value = 'DESC'

          // entityCard.recentSuppliers = []
          entityCard.remainingItems = true
          if (entityCard.searchQuery) {
            newSearchSuppliers()
          } else {
            getRecentEntityCards()
            getAllEntityCards(false)

          }
        } else if (event.target.innerText === translate.t('global.filters.volumeLowestToHighest')) {

          currentSortedOrderBy.value = 'volume'
          currentOrderDirection.value = 'ASC'

          // entityCard.recentSuppliers = []
          entityCard.remainingItems = true
          if (entityCard.searchQuery) {
            newSearchSuppliers()
          } else {
            getRecentEntityCards()
            getAllEntityCards(false)
          }
        } else if (event.target.innerText === translate.t('global.filters.volumeHighestLowestTo')) {

          currentSortedOrderBy.value = 'volume'
          currentOrderDirection.value = 'DESC'

          // entityCard.recentSuppliers = []
          entityCard.remainingItems = true
          if (entityCard.searchQuery) {
            newSearchSuppliers()
          } else {
            getRecentEntityCards()
            getAllEntityCards(false)
          }
        } else if (event.target.innerText === translate.t('global.filters.recentlyViewed')) {
          currentSortedOrderBy.value = 'recently'
          currentOrderDirection.value = 'ASC'

          if (entityCard.entityCardType !== 'potential') {
            getRecentEntityCards()
          }

          if (entityCard.searchQuery) {
            newSearchSuppliers()
          } else {
            getRecentEntityCards()
            getAllEntityCards(false)
          }
        }
        entityCard.currentSortedOption = event.target.innerText
        entityCard.sortyByTableDisplaying = !entityCard.sortyByTableDisplaying
        clickedOnSortByTableArrow.value = !clickedOnSortByTableArrow.value

        entityCardStore.setOrderBy(currentSortedOrderBy.value)
        entityCardStore.setOrderDirection(currentOrderDirection.value)
        entityCardStore.setOptionName(entityCard.currentSortedOption)
      }
    }

    function changeChartOptionsState() {
      clickedOnSortByTableArrow.value = !clickedOnSortByTableArrow.value
    }

    function toggleSortByArrow() {
      clickedOnSortByTableArrow.value = !clickedOnSortByTableArrow.value
    }

    function toggleSortByTable() {
      entityCard.sortyByTableDisplaying = !entityCard.sortyByTableDisplaying
      const el = document.querySelector('.options_table')
      el?.classList.toggle('active')
    }

    function showValues(filter: any) {
      let values = '';

      let hasSelected = false;

      if (filter.availableValues.length > 0) {
        values += translate.t(`global.filters.${filter.title.toLowerCase()}`) + ': '
        filter.availableValues.forEach((element: any) => {
          if (element.selected) {
            hasSelected = true
            values += element.value + ', '
          }
        })
        if (hasSelected) {
          values = values.slice(0, -2)
        }
      }
      return values
    }

    // *** onMounted ***

    onMounted(() => {
       if (!moduleEntityCardIsAvailable.value ) {
        HomeRouting.openHome();
      }

      currentSortedOrderBy.value = isPilotAccount() ? '' : entityCardStore.getOrderBy ? entityCardStore.getOrderBy : 'recently'
      currentOrderDirection.value = entityCardStore.getOrderDirection ? entityCardStore.getOrderDirection : 'ASC'
      setGlobalFiltersFn()
      entityCard.currentSortedOption = isPilotAccount() ? '' : entityCardStore.getOptionName ? entityCardStore.getOptionName : translate.t('global.filters.recentlyViewed')
      entityCard.filterOptions.push(translate.t('global.filters.nameAsc'))
      entityCard.filterOptions.push(translate.t('global.filters.nameDesc'))
      entityCard.filterOptions.push(translate.t('global.filters.recentlyViewed'))
      entityCard.filterOptions.push(translate.t('global.filters.volumeLowestToHighest'))
      entityCard.filterOptions.push(translate.t('global.filters.volumeHighestLowestTo'))
      document.body.addEventListener('click', handleClick)
      // Don't call retrieveProgramData() immediately - let changeTab handle it


      if (props.selectedTab && props.selectedTab === "potential-suppliers") {
        changeMainTab('potential',props.section)
      } else {
        changeTab(entityCardStore.currentTab === 'lists' ? 'lists' : 'cards')
      }


      // If initial tab is 'lists', load program data after entity cards load
      if (entityCardStore.currentTab === 'lists') {
        loadProgramDataIfNeeded()
      }
      setBrowserTitlebyTab()
    })

     watch(
      () => subscribeStore.refreshPrograms,
      async (newValue) => {
        if (newValue === 'ready') {
          entityCard.recentSuppliers = []
          entityCard.searchEntitySuppliers = []
          entityCard.suppliers = []
          entityCard.remainingItems = true
          checkSearch()
        }
      }
    );

    // *** END onMounted ***

    // *** onBeforeUnmount ***

    onBeforeUnmount(() => {
      window.onscroll = null
    })

    // *** END onBeforeUnmount ***

    // *** onUnmounted ***

    onUnmounted(() => {
      document.body.removeEventListener('click', handleClick)
    })

    // *** END onUnmounted ***

    // *** onBeforeRouteLeave ***

    onBeforeRouteLeave(() => {
      entityCardStore.setQuerySearch(null)

      return true
    })

    // *** END onBeforeRouteLeave ***


    /**
      * Top Right Corner for the current selected view,
      * return the Title
      */
    const entityCardTitleTypeComputed = computed(() => {
      if (entityCard.entityCardType === 'potential') {
        return translate.t('global.potentialSuppliers')
      }
      else if (entityCard.entityCardType === 'pilot') {
        return translate.t('global.pilotSuppliers')
      } else {
        return translate.t('home.components.menu.suppliers')
      }
    })



    const supplierTab = computed(() => {
      return translate.t('home.components.menu.suppliers')
    })

    const potentialSupplierTab = computed(() => {
      return translate.t('global.potentialSuppliers')
    })


    const companyIsPilot = computed(() => {
      return isPilotAccount()
    })

    function changeMainTab(tab: string, section: any = 'cards') {

      data.mainTab = tab

      switch(tab) {
        case 'suppliers':
          changeEntityCardType('supplier')
          changeTab(section)
          return;
        case 'potential':
          changeEntityCardType('potential')
          changeTab(section)
          return;
        default:
          changeEntityCardType('supplier')
      }


    }


    function changeTab(tab: any) {

      data.currentTab = tab

      // Reset flag and load program data when switching to 'lists' tab
      if (tab === 'lists') {
        programDataLoadedForCurrentTab.value = false
        loadProgramDataIfNeeded()
      }

      entityCardStore.currentTab = tab
      setBrowserTitlebyTab()
    }

    function setBrowserTitlebyTab() {
      let title = "Suppliers"
      switch(data.currentTab) {
        case 'cards':
          title+= " - Entities"
          break;
        case 'lists':
          title+= " - List"
          break;
        default:
        break;
      }
      document.title = title
    }

    return {
      ...toRefs(entityCard),
      ...toRefs(data),
      changeChartOptionsState,
      changeEntityCardType,
      cleanSuppliers,
      clickedOnSortByTableArrow,
      clickOutsideRelated,
      companyIsPilot,
      currentOrderDirection,
      currentSortedOrderBy,
      entityCardTitleTypeComputed,
      fontIcons,
      getAllEntityCards,
      getMore,
      goToOverview,
      iconArrow,
      isSuperAdmin,
      newSearchSuppliers,
      openEntityModal,
      optionsTableRef,
      removeRecent,
      scrollToTop,
      showValues,
      sortedByRecentlyIsSelected,
      sortedBySelectedOption,
      toggleSortByArrow,
      toggleSortByTable,
      addEntityToRecentList,
      changeTab,
      changeMainTab,
      usePotentialSupplierFeature,
      StringUtils,
      supplierTab,
      potentialSupplierTab
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors.scss";
@import "src/resources/assets/styles/variables/_colors";

// Set the height of all cards at the top to the same value
.row>[class*="col-"]:has(> .card) {
  display: flex;
}

.analyze-card {
  overflow: hidden !important;
  padding-bottom: 10px !important;
  min-height: 90vh !important;
}

.cards-container {
  min-height: 90vh !important;
}


.arrow {
  width: 15px;
  height: 15px;
  color: black !important;
  z-index: 4;
}

.arrow_margin {
  margin-right: 12px;
}

.arrow-sort-by-up {
  transform: rotate(180deg);
}

.btn-focused {
  background: $color-gray-500;
}


.clear_filters {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 350px !important;
}


.filter_icon {
  scale: 0.75;
  color: $color-gray-500;

  &:hover {
    color: $color-primary-600 !important;
  }
}

.container-top-sections {
  min-height: 30px !important;
}

.filter_arrow_left {
  transform: rotate(-90deg)
}

.filter_arrow_right {
  transform: rotate(90deg)
}

.hideFilter {
  transform: translateX(100%) !important;
}

.hide {
  display: hidden;
}

.show {
  display: block;
}

.sorted-by-title {
  width: 100px;
}

.no_search {
  font-size: 1.5em;
  padding: 1em;
  margin: 0;
}

.no_search_icon {
  width: 50px;
  height: 50px;
}

.options_table {
  width: 265px;
}

.options_table>li {
  display: flex;
  padding: .5em;
  align-items: start;
  justify-content: start;
  margin: 1em;
  cursor: pointer !important;
  transition: all 0.3s ease-in;

  &:hover {
    background: $color-gray-light !important;
    border-radius: 10px;
  }
}

.sortedby_container {
  padding: 0.5em;
  height: 48px;
  transition: all 0.3s ease-in;
}

// .sorted_contained_active {
//   background: $color-white
// }

.specific-filterby {
  width: 135px;
}


.rules_container {
  display: flex;
  flex-direction: row;
  gap: 10px;
  flex-wrap: wrap;
  width: calc(100vw - 450px);
}

.remove_icon {
  color: $gray400;
  width: 15px;
  height: 15px;

  &:hover {
    cursor: pointer;
  }
}

.icon-svg {
  max-width: 16px;
  margin-right: 0px;
}

.custom-padding-btn {
  .icon-svg {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}


.rotate-180 {
  transform: rotate(180deg);
}

.entity-container-dropdown {
  position: absolute;
  top: 50px;
  right: 10px;
  background: white;
  border-radius: 5px;
  padding: 10px;
  border: 1px solid #ABAFB5;
  z-index: 97;

  span {
    border-radius: 10px;
    display: flex;
    padding: 0.5em;
    align-items: start;
    justify-content: start;
    margin: 1em;
    cursor: pointer !important;
    transition: all 0.3s ease-in;

    &:hover {
      background-color: #f9fafb;
    }
  }
}


.icon-title {
    width: 28px;
    height: 28px;
    color: #ff2c4f;
    flex-shrink: 0;
}
</style>
