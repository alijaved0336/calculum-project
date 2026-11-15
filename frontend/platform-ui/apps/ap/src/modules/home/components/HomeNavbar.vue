<template>
<header id="header-calculum" class="user-topbar full-container">
  <div class="topbar-container" :class="{ 'bg-blur': loading, 'with-pilot': isPilotCompanyBeingUsed }">
    <div v-if="isPilotCompanyBeingUsed" class="d-flex align-items-center">
      <div class="col-md-12 col-lg-12 row-100">
        <div class="pilot-section">
          <div class="clock-container">
            <iconTimeClock class="clock"></iconTimeClock>
          </div><span class="ml-1 get-time-limit">{{ getLimitTime }}</span>
        </div>
      </div>
    </div>
    <div class="d-flex align-items-center">
      <div class="col-md-2 col-lg-2"><a class="link--image" href="/"><img v-if="!StringUtils.isNullUndefinedOrEmpty(logo)" class="user-topbar-logo" :src="logo" alt="Company Logo"/></a></div>
      <div class="col-md-3 col-lg-3">
        <div class="menu-combo-group element-no-outline">
          <label class="label-topbar" for="search">{{ $t('button.search') }}  </label>
          <div v-if="!disableElementPilotIsExpired" class="input-group input-search">
            <input id="search" v-model="searchQuery" class="form-control" type="text" :placeholder="setTitleForSearchInput" :disabled="setGlobalLoading" @keyup.enter="postGlobalSearchResults"/>
            <div id="icon-search" class="input-group-icon input-group-icon-left" @click="postGlobalSearchResults"><i class="fa-brands fa-sistrix cursor-pointer"></i></div>
            <div v-if="searchQuery && searchQuery.trim() !== ''" id="icon-clear" class="input-group-icon input-group-icon-right">
              <Tooltip :anchor-element="'target'" :position="'bottom'"><i class="fa-solid fa-xmark cursor-pointer" data-toggle="tooltip" data-placement="auto" :title="setTitleForSearchInput" @click="clearSearchQuery"></i></Tooltip>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-2 col-lg-2" :class="{ 'homeTourElSelectCompany': NAME === 'dev' }">
        <div v-if="!ArrayUtils.isEmpty(companyList) && companyList.length > 1" class="menu-combo-group element-no-outline">
          <label class="label-topbar">{{ $t('home.components.navbar.topMenu.company') }}</label>
          <div id="company-dropdown-navbar" class="custom-company-dropdown" :class="{ 'dropdown-active': toggleCompanyDropdown }" :disabled="setGlobalLoading" @click="toggleCompanyDropdownFn">
            <Tooltip :anchor-element="'target'" :position="'bottom'">
              <div class="dropdown-selected cursor-pointer"><span :title="getSelectedCompanyName">{{ getSelectedCompanyName }}</span><i class="fa-solid fa-chevron-down dropdown-arrow"></i></div>
            </Tooltip>
            <div v-if="toggleCompanyDropdown" class="dropdown-options-navbar show-scroll" @click.stop>
              <div class="dropdown-list show-scroll">
                <div v-if="toggleCompanyDropdown" class="input-group input-search mb-2 mt-2">
                  <input id="search-companies" ref="companySearchInput" v-model="searchCompany" class="form-control" type="text" :placeholder="$t('home.components.navbar.topMenu.search')" autocomplete="off" @keydown="handleCompanyKeydown" @input="debounceCompanySearch"/>
                  <div id="icon-search-company" class="input-group-icon"><i class="fa-brands fa-sistrix"></i></div>
                </div>
                <Tooltip class="set-tooltip" :anchor-element="'target'" :position="'bottom'">
                  <div v-for="(company, index) in companyFilteredList" :key="company['@id']" class="dropdown-item cursor-pointer" :class="{ 'selected': company['@id'] === selectedCompany, 'highlighted': index === highlightedCompanyIndex }" @click="selectCompany(company)" @mouseenter="highlightedCompanyIndex = index"><span class="cursor-pointer" :title="company.name">{{ company.name }}</span>
                    <iconCheck v-if="company['@id'] === selectedCompany" class="check-svg"></iconCheck>
                  </div>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-2 col-lg-2">
        <div v-if="!ArrayUtils.isEmpty(spendFileVersionsFormatted) && !disableElementPilotIsExpired" class="menu-combo-group element-no-outline"></div>
        <Tooltip :anchor-element="'target'" :position="'bottom'">
          <label class="label-topbar truncate-text d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center justify-content-between"><span :title="spendFileVersionActiveInitialDateAndEndDate ?? ''">{{ setTitleForSpendfileDropdown }} </span>
              <Tooltip :anchor-element="'target'" :position="'bottom'"></Tooltip>
              <div class="d-flex align-items-center justify-content-between">
                <div v-if="userIsCalculumUser && spendFileVersionActiveHasPendingRecalculation" class="status-spendfile status-spendfile-notice ml-3" :title="$t('spendFileStatus.outdatedTooltip')"></div>
                <div v-if="userIsCalculumUser && spendFileVersionIsPrivate" class="status-spendfile status-spendfile-private ml-3" :title="$t('spendFileStatus.spendFileVersionIsPrivate')"></div>
              </div>
            </div><span class="mx-1 truncate-text" :title="spendFileVersionActiveInitialDateAndEndDate ?? ''">{{ spendFileVersionActiveInitialDateAndEndDate ?? '' }}</span>
          </label>
        </Tooltip>
        <div v-if="!ArrayUtils.isEmpty(spendFileVersionsFormatted) && !disableElementPilotIsExpired" id="spendfile-dropdown-navbar" class="custom-spendfile-dropdown" :class="{ 'dropdown-active': toggleSpendFileDropdown }" :disabled="setGlobalLoading" @click="toggleSpendFileDropdownFn">
          <Tooltip :anchor-element="'target'" :position="'bottom'">
            <div class="dropdown-selected cursor-pointer"><span :title="getSelectedSpendFileName">{{ getSelectedSpendFileName }}</span><i class="fa-solid fa-chevron-down dropdown-arrow"></i></div>
          </Tooltip>
          <div v-if="toggleSpendFileDropdown" class="dropdown-options-navbar show-scroll" @click.stop>
            <div class="dropdown-list show-scroll">
              <div v-if="toggleSpendFileDropdown" class="input-group input-search mb-2 mt-2">
                <input id="search-spendfiles" ref="spendFileSearchInput" v-model="searchSpendFile" class="form-control" type="text" :placeholder="$t('home.components.navbar.topMenu.search')" autocomplete="off" @keydown="handleSpendFileKeydown" @input="debounceSpendFileSearch"/>
                <div id="icon-search-spendfile" class="input-group-icon"><i class="fa-brands fa-sistrix"></i></div>
              </div>
              <Tooltip :anchor-element="'target'" :position="'bottom'">
                <div v-for="(version, index) in spendFileFilteredList" :key="version['@id']" class="dropdown-item cursor-pointer" :class="{ 'selected': version['@id'] === spendFileVersionActiveId, 'highlighted': index === highlightedSpendFileIndex }" @click="selectSpendFile(version)" @mouseenter="highlightedSpendFileIndex = index">
                  <div class="d-flex flex-column gap-1 spendfile-status-container">
                    <div v-if="userIsCalculumUser && version.pendingRecalculation" class="status-spendfile status-spendfile-notice" :title="$t('spendFileStatus.outdatedTooltip')"></div>
                    <div v-if="userIsCalculumUser && version.isPublic === false" class="status-spendfile status-spendfile-private" :title="$t('spendFileStatus.spendFileVersionIsPrivate')"></div>
                  </div><span class="name cursor-pointer" :title="version.nameFormatted">{{ version.nameFormatted }}</span>
                  <iconCheck v-if="version['@id'] === spendFileVersionActiveId" class="check-svg"></iconCheck>
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-1 col-lg-1">
        <div class="row">
          <div class="col-8 row-100">
            <div v-if="!disableElementPilotIsExpired" class="d-flex flex-column">
              <label class="label-topbar">{{ $t('home.components.navbar.topMenu.currency') }}</label>
              <div id="currency-dropdown-navbar" class="custom-spendfile-dropdown" :class="{ 'dropdown-active': toggleCurrencyDropdown }">
                <div class="dropdown-selected cursor-pointer" @click="toggleCurrencyDropdownFn"><span class="currency-selected-prefix">{{ currency }}</span><i class="fa-solid fa-chevron-down dropdown-arrow">           </i></div>
              </div>
            </div>
          </div>
          <div class="col-4 row-100">
            <div class="d-flex currency-div ml-2">
              <CalculumTooltipIcon class="mr-2" :advanced-tooltip-class="true" unique-identifier="popover-custom-currency-info" key-pop-over="custom-currency-info"></CalculumTooltipIcon>
            </div>
          </div>
          <div v-if="notLoadingCurrency && toggleCurrencyDropdown" class="custom-currency-dropdown d-flex flex-column">
            <div id="most-used-currencies" class="d-flex flex-column mb-2">
              <label class="label-topbar pl-5">{{ $t('home.components.navbar.topMenu.mostUsedCurrencies') }}</label>
              <div class="d-flex flex-column cursor-pointer">
                <div v-for="currencyItem in currencyMostUsedListComputed" :key="currencyItem" class="d-flex align-items-center currency-item-container cursor-pointer" :class="{ 'current-currency-container': currency === currencyItem }" @click="changeCurrencyStore(currencyItem)">
                  <div class="d-flex justify-content-between align-items-center w-100 cursor-pointer"><span class="cursor-pointer">{{ currencyItem }}</span>
                    <iconCheck v-if="currency === currencyItem" class="check-svg"></iconCheck>
                  </div>
                </div>
              </div>
              <hr class="mt-2 mb-2"/>
              <label v-if="currencyList.length > 0" class="label-topbar mb-2 pl-5">{{ $t('home.components.navbar.topMenu.allCurrencies') }}</label>
              <div v-if="currencyList.length > 0" class="d-flex flex-column all-currencies-container">
                <div class="input-group input-search mb-2 mt-2">
                  <input id="search-currencies" v-model="searchCurrency" class="form-control" type="text" :placeholder="$t('home.components.navbar.topMenu.search')" autocomplete="off"/>
                  <div id="icon-search-currency" class="input-group-icon"><i class="fa-brands fa-sistrix"></i></div>
                </div>
                <div class="d-flex flex-column custom-currency-dropdown-all-currencies cursor-pointer">
                  <div v-for="currencyItem in currencyFilteredList" :key="currencyItem" class="d-flex align-items-center currency-item-container cursor-pointer" @click="changeCurrencyStore(currencyItem)"><span class="cursor-pointer">{{ currencyItem }}</span>
                    <iconCheck v-if="currency === currencyItem" class="check-svg cursor-pointer"></iconCheck>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-2 col-lg-2 d-flex mt-1 user-menu">
        <div v-if="!disableElementPilotIsExpired" class="menu__item dropdown mr-3">
          <button id="user-training-alerts" class="icons-topbar btn btn-simple btn-simple--icon link link--icon dropdown-toggle navbar-tooltip" type="button" :disabled="setGlobalLoading" @click="onClickTraining"><span class="navbar-tooltiptext" style="margin-right: 140px; margin-top: 70px">{{ $t('global.academy') }}</span>
            <TrainingIcon id="training-icon" class="navBarIcon"></TrainingIcon>
          </button>
        </div>
        <HomeNavbarNotifications
          :disable-element-pilot-is-expired="disableElementPilotIsExpired"
          :disabled="setGlobalLoading"
          :exist-messages-pending-to-read="existMessagesPendingToRead"
          :total-unread-notifications="totalUnreadNotifications"
          :is-marking-all-as-read="isMarkingAllAsRead"
          :is-loading-initial-notifications="isLoadingInitialNotifications"
          :is-loading-more-notifications="isLoadingMoreNotifications"
          :unread-notifications="unreadNotifications"
          :notification-clicked-id="notificationClickedId"
          :is-marking-as-read="isMarkingAsRead"
          :is-deleting-message="isDeletingMessage"
          :get-notification-preview-text="getNotificationPreviewText"
          :get-notification-content-has-highlight-spans="getNotificationContentHasHighlightSpans"
          :get-notification-content-is-array="getNotificationContentIsArray"
          :get-notification-content-segments-preview="getNotificationContentSegmentsPreview"
          @notifications-dropdown-click="onClickNotificationsDropdown"
          @mark-all-as-read="onClickMarkAsReadAllMessages"
          @refresh="onClickRefreshNotifications"
          @notifications-scroll="onNotificationsScroll"
          @mark-as-read="onClickNotificationMarkAsRead($event, NotificationType.MESSAGE)"
          @delete="onClickNotificationDelete"
        ></HomeNavbarNotifications>
        <NavbarUserMenu
          :disabled="setGlobalLoading"
          :user-is-admin="userIsAdmin"
          :disable-element-pilot-is-expired="disableElementPilotIsExpired"
          :show-menu="showMenu"
          :user-is-super-admin="userIsSuperAdmin"
          :user-sales-role-enabled="userSalesRoleEnabled"
          :user-data-role-enabled="userDataRoleEnabled"
          :use-feature-value-proposition="useFeatureValueProposition"
          @admin-console="goToAdminConsole"
          @logout="onClickLogOut"
        ></NavbarUserMenu>
      </div>
    </div>
  </div>
  <div v-if="showGlobalFiltersBar" class="d-flex flex-column">
    <MainLayoutFilters v-if="!setGlobalLoading && !disableElementPilotIsExpired" :key="keyGlobalFilter"></MainLayoutFilters>
    <div v-if="showRecalculatingStatus && !showSpendFileRecalculatingStatus" class="d-flex absolute-center-badge"><span class="px-2 py-1 rounded-xl truncate ml-auto recalc-status-pill" :class="(programValues.isBoxesRecalculating || programValues.recalculationInProgress || planStatus.pendingRecalculation) ? 'recalculating-in-progress' : 'pending-recalculation'">{{ labelForRecalculatingStatus }}</span></div>
    <div v-if="showSpendFileRecalculatingStatus" class="d-flex absolute-center-badge"><span class="px-2 py-1 rounded-xl truncate ml-auto recalc-status-pill" :class="[spendFileStatus.spendFileInrecalculation ? 'recalculating-in-progress' : 'pending-recalculation', { 'recalc-progress-fill': spendFileHasProgressFill }]" :style="spendFileHasProgressFill ? { '--recalc-progress': Math.round(spendFileProgressValue ?? 0) + '%' } : undefined" :title="spendFileEtaTitle">{{ labelForRecalculatingStatusSpendFile }}</span></div>
  </div>
  <SpendFileNewVersionBanner v-if="pendingNewSpendFileVersion" :version="pendingNewSpendFileVersion" @load="onBannerLoad" @dismiss="onBannerDismiss"></SpendFileNewVersionBanner>
  <GlobalFilterSessionBanner v-if="showGlobalFilterSessionBanner" @keep="onGlobalFilterBannerKeep" @clear="onGlobalFilterBannerClear"></GlobalFilterSessionBanner>
</header>
</template>

<script lang="ts">
import {
  computed,
  reactive,
  toRefs,
  defineComponent,
  onMounted,
  ref,
  watch,
  onUnmounted,
} from "vue";
import { NotificationType } from "@/modules/home/HomeTypes";


// Utils
import {
  stringLimit,
  isNullOrUndefined,
  StringUtils,
  ArrayUtils,
} from "@/utils";

import { fontIcons } from "@/resources/assets/assets";
import TrainingIcon from "@/resources/assets/images/icons/training.vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useI18n } from "vue-i18n";
import { useCompany, useSpendFile, useUser, useProgram } from "@/composables";
import usePilotAccount from "@/modules/home/composables/usePilotAccount";
import useRecalculationStatus, { RecalculationStatusBridge } from "@/modules/home/composables/useRecalculationStatus";
import useCurrencySwitcher from "@/modules/home/composables/useCurrencySwitcher";
import useCompanySwitcher from "@/modules/home/composables/useCompanySwitcher";
import useSpendFileVersionSwitcher from "@/modules/home/composables/useSpendFileVersionSwitcher";
import useSessionBootstrap from "@/modules/home/composables/useSessionBootstrap";
import useUnreadNotifications from "@/modules/home/composables/useUnreadNotifications";
import HomeNavbarNotifications from "@/modules/home/components/HomeNavbarNotifications.vue";
import NavbarUserMenu from "@/modules/home/components/NavbarUserMenu.vue";
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import { useHomeStore } from '@/stores/home';
import * as Routing from "@/services/router/Routing";

import MainLayoutFilters from "@/modules/globalFilters/views/MainLayoutFilters.vue";
import { useToast } from "vue-toastification";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import iconCheck from "@/resources/assets/images/icons/iconCheck.vue";
import { HomeNavBar, HOME_ALERT, HomeAlertLevel } from "@/modules/home/types";
import useFirebase from "@/composables/firebase/useFirebase";
import { Locales } from "@ada/design-system/locales/keys";
import iconTimeClock from "@/resources/assets/images/icons/iconTimeClock.vue";
import { useRouter } from 'vue-router';
import { getFlowToLogout } from '@/utils/CookieSessionsFns'
import { hasActiveGlobalFilter } from '@/utils/globalFiltersUtils'
import { unloadTidio } from '@/utils/tidio';
import { useCompanyChangeOptimizer } from '@/composables/useCompanyChangeOptimizer';
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useEntityCardStore } from '@/stores/entityCard'
import SpendFileNewVersionBanner from "@/modules/components/SpendFileNewVersionBanner.vue";
import GlobalFilterSessionBanner from "@/modules/globalFilters/components/GlobalFilterSessionBanner.vue";


export default defineComponent({
  name: "HomeNavbar",
  components: {
    CalculumTooltipIcon,
    iconCheck,
    iconTimeClock,
    MainLayoutFilters,
    HomeNavbarNotifications,
    NavbarUserMenu,
    SpendFileNewVersionBanner,
    GlobalFilterSessionBanner,
    Tooltip,
    TrainingIcon,
  },
  emits: {
    showAlerts: (level: HomeAlertLevel, show: boolean) => true,
  },
  setup(props, { emit }) {
    // Cross-composable wiring for calls that would otherwise be circular
    // (e.g. the recalculation-status watcher needs to call into the
    // spend-file switcher, which is constructed later in this function).
    // Populated once every piece below is built; safe because nothing on it
    // is invoked before setup() finishes. See
    // docs/context/change-homenavbar-refactor.md.
    const bridge: RecalculationStatusBridge & {
      updateSpendFileVersionList?: () => void;
      getWhoAmI?: (callApis?: boolean) => void;
      validateSpendFilesActive?: (fromWhoami?: boolean) => Promise<void>;
      commonApiCalls?: () => void;
      getMaxDateSpend?: (
        actionFromUser: boolean,
        spendFileVersionUuid: string,
        onComplete?: () => void,
      ) => any;
      goToHomeDashboard?: () => void;
      firtCallsOrWhoAmI?: () => void;
      getVCardGroups?: () => void;
    } = {};
    // `useSpendFile()` owns spendFileVersionActive and registers its own
    // watcher further down; this getter lets useRecalculationStatus read its
    // current value without moving either composable's construction point
    // (which would reorder their watcher registrations).
    let spendFileVersionActiveForRecalcStatus: any;
    // Same idea for the spend-file-version *id* ref, which
    // useUnreadNotifications (constructed early, for the notifications
    // watchers' original registration order) needs but which is created
    // later, in the "Spend File Version" section.
    let spendFileVersionActiveIdForNotifications: any;

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const globalFiltersStore = useGlobalFiltersStore();
    const homeStore = useHomeStore();
    const toast = useToast();
    const router = useRouter();

    const { programSelectedDefaultId } = useProgram()

    const userStore = useUserStore();
    const appStore = useAppStore();
    const entityCardStore = useEntityCardStore();

    //-Flag to show the GF bar
    const showGlobalFiltersBar = computed(() => userStore.getShowMenu);

    // Initialize company change optimizer
    const {
      cleanupBeforeCompanyChange,
      cleanupAfterCompanyChange,
      checkMemoryLeaks,
      verifyGridConfigurations,
      getCleanupInfo,
      checkActiveListeners
    } = useCompanyChangeOptimizer();

    // *** User Session ***

    const {
      user,
      userIsCalculumUser,
      userIri,
      userSessionAvailableCompanies,
      userIsAdmin,
      userIsSuperAdmin,
      userSalesRoleEnabled,
      userDataRoleEnabled,
      useFeatureValueProposition
    } = useUser();

    const {
       companyActive,
        companyActiveIri,
        companyActiveSpendFileVersions,
        companyActiveLogoPublicUrl: logo,
        companyActiveId,
        usevCardGroupsEnabled
      } = useCompany();

    const {
      disableElementPilotIsExpired,
      getLimitTime,
      isPilotCompanyBeingUsed,
    } = usePilotAccount();

    // *** END User Session ***

    const {
      logoutFirebase,
      getAuthenticationStatus,
    } = useFirebase();

    const data = reactive<HomeNavBar>({
      searchCurrency: "",
      searchCompany: "", // new variable for company search
      searchSpendFile: "", // new variable for spend file search
      toggleCurrencyDropdown: false,
      toggleCompanyDropdown: false, // new variable for company dropdown
      toggleSpendFileDropdown: false, // new variable for spend file dropdown
      notLoadingCurrency: false,
      notificationClickedId: "",
      isLoadingMessages: false,
      isLoadingNotificationMarkAsRead: false,
      isLoadingChangeSpendFile: false,
      loading: true,
      searchQuery: "",
      currency: appStore.getCurrencyTo,
      currencyFrom: appStore.getCurrencyFrom,
      currencyDate: appStore.getCurrencyDate,
      selectedCompany: "",
      companyList: userSessionAvailableCompanies.value,
      intervalDownCount: null,
      keyGlobalFilter: new Date().getUTCMilliseconds(),
      notificationAmountNotes: [],
      notificationAmountOther: [],
      status403: false,
      status410: false,
      unreadNotifications: [],
      currentPage: 1,
      hasMoreNotifications: true,
      isLoadingMoreNotifications: false,
      isLoadingInitialNotifications: false,
      totalUnreadNotificationsCount: 0,
      isMarkingAsRead: false,
      isDeletingMessage: false,
      isMarkingAllAsRead: false,
    });

    // *** Notifications ***

    const {
      getNotificationAmount,
      dataNotificationMessages,
      existMessagesPendingToRead,
      totalUnreadNotifications,
      notificationsLastMessagesPendingRead,
      getExistsMessagesPendingToRead,
      getMessages,
      getUnreadNotifications,
      loadMoreNotifications,
      onNotificationsScroll,
      cleanupScrollThrottle,
      onClickMarkAsReadAllMessages,
      onClickNotificationMarkAsRead,
      onClickNotificationDelete,
      getNotificationPreviewText,
      getNotificationContentIsArray,
      getNotificationContentHasHighlightSpans,
      getNotificationContentSegmentsPreview,
      onClickNotificationsDropdown,
      onClickRefreshNotifications,
    } = useUnreadNotifications(data, () => spendFileVersionActiveIdForNotifications?.value ?? "");

    // *** END Notifications ***

    const highlightedCompanyIndex = ref(-1);
    const highlightedSpendFileIndex = ref(-1);
    const companySearchInput = ref<HTMLInputElement | null>(null);
    const spendFileSearchInput = ref<HTMLInputElement | null>(null);

    const setGlobalLoading = ref(true);

    // Event handler for beforeunload to cleanup Tidio
    const handleBeforeUnload = () => {
      unloadTidio();
    };

    const {
      programValues,
      planStatus,
      spendFileStatus,
      cleanValues,
      labelForRecalculatingStatus,
      spendFileProgressValue,
      spendFileHasProgressFill,
      labelForRecalculatingStatusSpendFile,
      spendFileEtaTitle,
      showSpendFileRecalculatingStatus,
      showRecalculatingStatus,
    } = useRecalculationStatus(
      () => data.selectedCompany,
      () => data.isLoadingChangeSpendFile,
      () => spendFileVersionActiveForRecalcStatus?.value,
      bridge,
    );

    watch(
      () => data.loading,
      (newValue) => {

        homeStore.setGlobalLoading(newValue);
        setGlobalLoading.value = newValue;
      },
    );


    watch(
      () => appStore.getCurrencyTo,
      () => {
        // alert('Hi you Changed de proposed value now es: ' + entityCardNegotiationGraphic.approachTerms)
        data.currency = appStore.getCurrencyTo;
      },
    );

    // Replace Vuex user store watches with Pinia userStore watches
    watch(
      () => userStore.getShowMenu,
      (newValue) => {
        if (newValue === false) {
          if (data.status403) {
            emit("showAlerts", HOME_ALERT.FORBIDDEN, true);
          } else if (data.status410) {
            emit("showAlerts", HOME_ALERT.PILOT_EXPIRED, true);
          } else {
            emit("showAlerts", HOME_ALERT.NO_ACTIVE_SPEND_FILE, true);
          }
        }
      },
    );

    watch(
      () => userStore.getError410,
      (newValue) => {
        if (newValue === true) {
          emit("showAlerts", HOME_ALERT.PILOT_EXPIRED, true);
        } else {
          emit("showAlerts", HOME_ALERT.NONE, false);
        }
      },
    );

    watch(
      () => userStore.getError403,
      (newValue) => {
        if (newValue === true) {
          emit("showAlerts", HOME_ALERT.FORBIDDEN, true);
        } else {
          emit("showAlerts", HOME_ALERT.NONE, false);
        }
      },
    );


    //** Watch vCardGroupsEnabled to refresh the globalfilter component
    watch(usevCardGroupsEnabled, () => {
      data.keyGlobalFilter++
    })

    function onClickTraining() {
      globalThis.open("https://academy.hello-ada.com", "_blank");
    }

    async function onClickLogOut() {
      if (data.loading) {
        return false;
      } else {
        try {
          // Unmount Tidio chat before logout
          unloadTidio();

          // Check authentication status before logout
          const authStatus = await getAuthenticationStatus();
          if (import.meta.env.DEV) console.log("** Authentication status before logout:", authStatus);

          data.loading = true;

          // Perform Firebase logout with verification
          if (authStatus.isAuthenticated) {
            if (import.meta.env.DEV) console.log("** User authenticated, proceeding with Firebase logout");
            await logoutFirebase();

            // Verify logout was successful
            const logoutVerification = await getAuthenticationStatus();
            if (logoutVerification.isAuthenticated) {
              if (import.meta.env.DEV) console.warn("** WARNING: User is still authenticated after logout");
              toast.warning("There was an issue with Firebase logout, but general logout will proceed");
            } 
          } 

          // Continue with normal logout flow
          getFlowToLogout();

        } catch (error) {
          if (import.meta.env.DEV) console.error("** Error during logout:", error);
          toast.error("Error during logout process");
          data.loading = false;
        }
      }
    }

    // Watch entityCard store querySearch using Pinia
    watch(
      () => entityCardStore.getQuerySearch,
      (newValue) => {
        data.searchQuery = newValue || '';
      },
    );


    watch(user, () => {
      if (isNullOrUndefined(user.value)) {
        return;
      }

      setUserLanguage(user.value.language);
    });

    function setUserLanguage(lang: string = Locales.EN) {

      if (user) {
        translate.locale.value = lang;
      }
    }

    function postGlobalSearchResults() {
      const queryBeforeClean = data.searchQuery;
      entityCardStore.setQuerySearch(queryBeforeClean);
      router.push({
        name: Routing.home.entityCard.entityCard,
        query: {
          searchQuerys: queryBeforeClean
        }
      })
    }

    function clearSearchQuery() {
      data.searchQuery = "";
      entityCardStore.setQuerySearch("");
      
      // Only call postGlobalSearchResults if we're in the entityCard view
      if (router.currentRoute.value.name === 'entityCard') {
        postGlobalSearchResults();
      }
    }

    // Init
    data.selectedCompany = companyActiveIri.value;

    const { changeCompany, selectCompany } = useCompanySwitcher(data, companyActive, user, {
      cleanupBeforeCompanyChange,
      cleanupAfterCompanyChange,
      checkMemoryLeaks,
      verifyGridConfigurations,
      cleanValues,
      emit,
      bridge,
    });
    bridge.changeCompany = changeCompany;

    // *** END Company ***

    // *** Spend File Version ***

    const {
      spendFileVersionActive,
      spendFileVersionActiveHasPendingRecalculation,
      spendFileVersionIsPrivate,
      spendFileVersionActiveInitialDateAndEndDate
    } = useSpendFile();
    spendFileVersionActiveForRecalcStatus = spendFileVersionActive;

    const {
      spendFileVersionActiveId,
      spendFileVersionsFormatted,
      subscribetoSpendFile,
      subscribeToDefaultProgram,
      validateSpendFilesActive,
      updateSpendFileVersionList,
      selectSpendFile,
      pendingNewSpendFileVersion,
      onBannerLoad,
      onBannerDismiss,
    } = useSpendFileVersionSwitcher(
      data,
      companyActiveSpendFileVersions,
      user,
      {
        userIri,
        programSelectedDefaultId,
        spendFileVersionActive,
        cleanValues,
        getUnreadNotifications,
        getNotificationAmount,
        emit,
        bridge,
      },
    );
    spendFileVersionActiveIdForNotifications = spendFileVersionActiveId;
    bridge.selectSpendFile = selectSpendFile;
    bridge.updateSpendFileVersionList = updateSpendFileVersionList;

    // *** END Spend File Version ***

    // *** Currency ***

    const {
      currencyList,
      currencyMostUsedListComputed,
      currencyFilteredList,
      goToHomeDashboard,
      getMaxDateSpend,
      changeCurrencyStore,
      loadCurrencies,
    } = useCurrencySwitcher(data);
    bridge.getMaxDateSpend = getMaxDateSpend;
    bridge.goToHomeDashboard = goToHomeDashboard;

    // *** END Currency ***

    const showMenu = computed(() => userStore.getShowMenu);

    /**
     * Computed property that returns the company list sorted alphabetically by name
     * Optimized for better performance
     */
    const sortedCompanyList = computed(() => {
      if (ArrayUtils.isEmpty(data.companyList)) {
        return [];
      }
      return [...data.companyList].sort((a: any, b: any) =>
        a.name.localeCompare(b.name)
      );
    });

    /**
     * Computed property that returns filtered company list based on search
     */
    const companyFilteredList = computed(() => {
      const searchTerm = data.searchCompany.trim().toLowerCase();

      if (searchTerm === "") {
        return sortedCompanyList.value;
      }

      return sortedCompanyList.value.filter((company: any) =>
        company.name.toLowerCase().includes(searchTerm)
      );
    });

    /**
     * Computed property that returns filtered spend file list based on search
     */
    const spendFileFilteredList = computed(() => {
      const searchTerm = data.searchSpendFile.trim().toLowerCase();

      if (searchTerm === "") {
        return spendFileVersionsFormatted.value;
      }

      return spendFileVersionsFormatted.value.filter((version: any) =>
        version.nameFormatted.toLowerCase().includes(searchTerm)
      );
    });


    /**
     * Get the name of the currently selected company
     */
    const getSelectedCompanyName = computed(() => {
      const selected = data.companyList.find((company: any) =>
        company['@id'] === data.selectedCompany
      );
      return selected ? selected.name : '';
    });

    /**
     * Debounced search function for company filtering
     */
    let companySearchTimeout: any | null = null;
    function debounceCompanySearch() {
      if (companySearchTimeout) {
        clearTimeout(companySearchTimeout);
      }
      companySearchTimeout = setTimeout(() => {
        // Reset highlighted index when search changes
        highlightedCompanyIndex.value = -1;
      }, 300);
    }

    /**
     * Handle keyboard navigation for company dropdown
     */
    function handleCompanyKeydown(event: KeyboardEvent) {
      const filteredList = companyFilteredList.value;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          highlightedCompanyIndex.value = Math.min(
            highlightedCompanyIndex.value + 1,
            filteredList.length - 1
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          highlightedCompanyIndex.value = Math.max(
            highlightedCompanyIndex.value - 1,
            -1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedCompanyIndex.value >= 0 && filteredList[highlightedCompanyIndex.value]) {
            selectCompany(filteredList[highlightedCompanyIndex.value]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          data.toggleCompanyDropdown = false;
          data.searchCompany = '';
          highlightedCompanyIndex.value = -1;
          break;
      }
    }

    /**
     * Get the name of the currently selected spend file
     */
    const getSelectedSpendFileName = computed(() => {
      const selected = spendFileVersionsFormatted.value.find((version: any) =>
        version['@id'] === spendFileVersionActiveId.value
      );
      return selected ? selected.nameFormatted : '';
    });

    /**
     * Debounced search function for spend file filtering
     */
    let spendFileSearchTimeout: any | null = null;
    function debounceSpendFileSearch() {
      if (spendFileSearchTimeout) {
        clearTimeout(spendFileSearchTimeout);
      }
      spendFileSearchTimeout = setTimeout(() => {
        // Reset highlighted index when search changes
        highlightedSpendFileIndex.value = -1;
      }, 300);
    }

    /**
     * Handle keyboard navigation for spend file dropdown
     */
    function handleSpendFileKeydown(event: KeyboardEvent) {
      const filteredList = spendFileFilteredList.value;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          highlightedSpendFileIndex.value = Math.min(
            highlightedSpendFileIndex.value + 1,
            filteredList.length - 1
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          highlightedSpendFileIndex.value = Math.max(
            highlightedSpendFileIndex.value - 1,
            -1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedSpendFileIndex.value >= 0 && filteredList[highlightedSpendFileIndex.value]) {
            selectSpendFile(filteredList[highlightedSpendFileIndex.value]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          data.toggleSpendFileDropdown = false;
          data.searchSpendFile = '';
          highlightedSpendFileIndex.value = -1;
          break;
      }
    }

    // *** Global filter session-restore banner (US-17561 AC-01..AC-04) ***

    // "Once per login", so it lives in sessionStorage rather than in the persisted
    // filter store: the filter itself must survive the reload, the banner must not.
    const GLOBAL_FILTER_BANNER_SEEN_KEY = 'ada-globalFilterSessionBannerSeen'

    const globalFilterBannerDismissed = ref(true)

    const showGlobalFilterSessionBanner = computed(
      () =>
        !globalFilterBannerDismissed.value
        && hasActiveGlobalFilter(globalFiltersStore.getFiltersApplied),
    )

    function dismissGlobalFilterBanner() {
      globalFilterBannerDismissed.value = true
      try {
        globalThis.sessionStorage?.setItem(GLOBAL_FILTER_BANNER_SEEN_KEY, '1')
      } catch {
        // Private-mode / storage-disabled browsers: the banner simply reappears
        // on the next login, which is preferable to breaking the navbar.
      }
    }

    /** AC-02: dismiss and leave the global filter active. */
    function onGlobalFilterBannerKeep() {
      dismissGlobalFilterBanner()
    }

    /** AC-03: dismiss and clear every applied global filter. */
    function onGlobalFilterBannerClear() {
      globalFiltersStore.setFiltersApplied({ filters: [], logic: 'and' })
      dismissGlobalFilterBanner()
    }

    onMounted(() => {
      // AC-04 falls out of showGlobalFilterSessionBanner: with no persisted
      // filter there is nothing to announce.
      try {
        globalFilterBannerDismissed.value =
          globalThis.sessionStorage?.getItem(GLOBAL_FILTER_BANNER_SEEN_KEY) === '1'
      } catch {
        globalFilterBannerDismissed.value = false
      }
    })

    // *** Setup ***

    function commonApiCalls() {
      setUserLanguage();
      getExistsMessagesPendingToRead();
      getMaxDateSpend(false, spendFileVersionActiveId.value);
      getNotificationAmount();
      getVCardGroups();
      getUnreadNotifications(1, false);
    }
    bridge.commonApiCalls = commonApiCalls;

    const { firtCallsOrWhoAmI, getWhoAmI, getVCardGroups } = useSessionBootstrap(data, {
      user,
      companyActiveId,
      highlightedCompanyIndex,
      highlightedSpendFileIndex,
      setUserLanguage,
      validateSpendFilesActive,
      updateSpendFileVersionList,
      subscribetoSpendFile,
      subscribeToDefaultProgram,
      loadCurrencies,
      handleBeforeUnload,
      commonApiCalls,
      emit,
    });
    bridge.getWhoAmI = getWhoAmI;
    bridge.firtCallsOrWhoAmI = firtCallsOrWhoAmI;
    bridge.getVCardGroups = getVCardGroups;

    onUnmounted(() => {
      if (companySearchTimeout) {
        clearTimeout(companySearchTimeout);
        companySearchTimeout = null;
      }


      if (spendFileSearchTimeout) {
        clearTimeout(spendFileSearchTimeout);
        spendFileSearchTimeout = null;
      }
      
      // Clear search data
      data.searchCompany = '';
      data.searchSpendFile = '';
      highlightedCompanyIndex.value = -1;
      highlightedSpendFileIndex.value = -1;
      
      
      if (data.intervalDownCount) {
        clearInterval(data.intervalDownCount);
        data.intervalDownCount = null;
      }

      // Clean up scroll throttle timer
      cleanupScrollThrottle();


      // data.currencyList = []; // No longer necessary, using currencyList.value from app store
      data.companyList = [];
      data.notificationAmountNotes = [];
      data.notificationAmountOther = [];


      getCleanupInfo();


      checkActiveListeners();
    });

    function goToAdminConsole() {      
      Routing.admin.openCompaniesAdmin();
    }

  
    function toggleCurrencyDropdownFn() {
      // Close other dropdowns before opening/closing the currency dropdown  
      data.toggleCompanyDropdown = false;
      data.toggleSpendFileDropdown = false;
      data.toggleCurrencyDropdown = !data.toggleCurrencyDropdown;

    }

    function toggleCompanyDropdownFn() {
      // Close other dropdowns before opening/closing the company dropdown
      data.toggleCurrencyDropdown = false;
      data.toggleSpendFileDropdown = false;
      data.searchCurrency = '';
      
      data.toggleCompanyDropdown = !data.toggleCompanyDropdown;
      
      if (data.toggleCompanyDropdown) {
        // Reset search and highlighted index when opening
        data.searchCompany = '';
        highlightedCompanyIndex.value = -1;
        // Focus on search input after a short delay
        setTimeout(() => {
          if (companySearchInput.value) {
            companySearchInput.value.focus();
          }
        }, 100);
      } else {
        // Clear search when closing
        data.searchCompany = '';
        highlightedCompanyIndex.value = -1;
      }
    }

    function toggleSpendFileDropdownFn() {
      // Close other dropdowns before opening/closing the spend file dropdown
      data.toggleCurrencyDropdown = false;
      data.toggleCompanyDropdown = false;
      data.searchCurrency = '';

      data.toggleSpendFileDropdown = !data.toggleSpendFileDropdown;
      
      if (data.toggleSpendFileDropdown) {
        // Reset search and highlighted index when opening
        data.searchSpendFile = '';
        highlightedSpendFileIndex.value = -1;
        // Focus on search input after a short delay
        setTimeout(() => {
          if (spendFileSearchInput.value) {
            spendFileSearchInput.value.focus();
          }
        }, 100);
      } else {
        // Clear search when closing
        data.searchSpendFile = '';
        highlightedSpendFileIndex.value = -1;
      }
    }

    const setTitleForSearchInput = computed(() => {
      return translate.t('home.components.navbar.search')
    })

    const setTitleForSpendfileDropdown = computed(() => {
      return translate.t('home.components.navbar.topMenu.spendFile')
    })

      return {
        ...toRefs(data),
        programValues,
        planStatus,
        spendFileStatus,
        toggleCurrencyDropdownFn,
        toggleCompanyDropdownFn,
        toggleSpendFileDropdownFn,
        ArrayUtils,
        changeCurrencyStore,
        currencyFilteredList,        
        currencyMostUsedListComputed,      
        dataNotificationMessages,
        disableElementPilotIsExpired,
        existMessagesPendingToRead,
        fontIcons,
        getLimitTime,
        getMessages,      
        goToAdminConsole,
        userIsAdmin,
        isPilotCompanyBeingUsed,
        userIsSuperAdmin,
        logo,
        NAME: import.meta.env.VITE_NAME,      
        notificationsLastMessagesPendingRead,
        NotificationType,        
        onClickLogOut,
        onClickMarkAsReadAllMessages,
        onClickNotificationMarkAsRead,
        onClickTraining,
        postGlobalSearchResults,
        clearSearchQuery,
        setGlobalLoading,
        showMenu,
        sortedCompanyList,
        companyFilteredList,
        spendFileFilteredList,
        getSelectedCompanyName,
        debounceCompanySearch,
        handleCompanyKeydown,
        selectCompany,
        getSelectedSpendFileName,
        debounceSpendFileSearch,
        handleSpendFileKeydown,
        selectSpendFile,
        highlightedCompanyIndex,
        highlightedSpendFileIndex,
        companySearchInput,
        spendFileSearchInput,
        spendFileVersionActiveHasPendingRecalculation,
        spendFileVersionActiveId,
        spendFileVersionIsPrivate,
        spendFileVersionsFormatted,
        stringLimit,
        StringUtils,        
        userIsCalculumUser,
        userSalesRoleEnabled,
        userDataRoleEnabled,
        useFeatureValueProposition,
        labelForRecalculatingStatus,
        showRecalculatingStatus,                
        currencyList,
        onClickNotificationDelete,
        getNotificationPreviewText,
        getNotificationContentIsArray,
        getNotificationContentHasHighlightSpans,
        onClickRefreshNotifications,
        totalUnreadNotifications,
        getUnreadNotifications,
        loadMoreNotifications,
        onNotificationsScroll,
        onClickNotificationsDropdown,
        showGlobalFiltersBar,
        showSpendFileRecalculatingStatus,
        labelForRecalculatingStatusSpendFile,
        spendFileProgressValue,
        spendFileHasProgressFill,
        spendFileEtaTitle,
        spendFileVersionActiveInitialDateAndEndDate,
        getNotificationContentSegmentsPreview,        
        setTitleForSearchInput,
        setTitleForSpendfileDropdown,
        pendingNewSpendFileVersion,        
        onBannerLoad,
        onBannerDismiss,
        showGlobalFilterSessionBanner,
        onGlobalFilterBannerKeep,
        onGlobalFilterBannerClear,

      };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";

.element-no-outline {
  outline: none !important;

  select:focus,
  select.form-control:focus {
    outline: none 0 !important;
    box-shadow: none;
    border-color: black;
    -moz-box-shadow: none;
    -webkit-box-shadow: none;
  }
}

.status-spendfile {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;    
    
    &-notice {
      background-color: #dc3545;
    }

    &-private {
      background-color: #eaaa08;
    }
}
  
.dropdown-item:active {
  background-color: #e9ecef;

  .h6 {
    color: $color-red;
  }
}

.navbar-tooltip {
  display: flex;
  justify-content: center;
  align-items: center;
  color: $color-white !important;
}

.navbar-tooltip .navbar-tooltiptext {
  visibility: hidden;
  width: auto;
  height: auto;
  background-color: $color-black;
  color: $color-white !important;
  font-size: 0.8em;
  text-align: center;
  padding: 5px 10px;
  border-radius: 4px;
  margin-top: 0;
  position: absolute;
  z-index: 1;
}

.navbar-tooltip:hover .navbar-tooltiptext {
  visibility: visible;
  color: white !important;
}


.mr-3,
.mx-3 {
  margin-right: 1.5% !important;
}

// responsive



.notes-home-icon {
  fill: $color-gray-500;
  scale: 1.5;
}

.input-group {
  position: relative;
  
  // Add padding to input to prevent text from reaching the clear icon
  input.form-control {
    padding-right: 40px; // Ensure text doesn't overlap with clear icon
  }
  
  .input-group-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    cursor: pointer;
    color: #6c757d;
    transition: color 0.2s ease;
    
    &:hover {
      color: #495057;
    }
    
    &.input-group-icon-left {
      left: 10px; // Position left icon (search) on the left side
    }
    
    &.input-group-icon-right {
      right: 10px; // Position right icon (clear) on the right side
      opacity: 0.2; // Hide by default
      transition: opacity 0.2s ease, color 0.2s ease;
      
      // Make the clear icon appear thinner
      i.fa-times {
        font-size: 0.875rem; // Slightly smaller for a more refined look
      }
      &:hover {
        opacity: 1;
      }
    }
  }
}


.custom-currency-dropdown {
  top: 60px;
  background: #fff;
  border-radius: 8px;
  color: #000;
  position: absolute;
  z-index: 100;
  border: 1px solid $color-gray-200;
  box-shadow:
    0px 4px 6px -2px rgba(16, 24, 40, 0.03),
    0px 12px 16px -4px rgba(16, 24, 40, 0.08);
  padding: 0.5rem;

  .all-currencies-container {
    width: 200px;

    .custom-currency-dropdown-all-currencies {
      overflow-y: scroll;
      background: #fff;
      max-height: 20vh;
    }
  }
}

.check-svg {
  height: 15px;
}

.currency-item-container {
  padding: 10px 14px;
  border-radius: 8px;

  span {
    font-size: 14px;
  }

  &:hover {
    background: $color-gray-100;

    .check-svg {
      color: $color-primary-500;
    }
  }
}



.pilot-section {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  background: $color-gray-600;
  text-align: center;
}


.currency-div {
  margin-top: 1.5rem;
}

.spendfile-status-container {
  width: 10px;
}

.absolute-center-badge {
    position: absolute;
    left: 50%;
    top: 84%;
    transform: translate(-50%, -50%);
}

/* Floating navbar recalc pills: pin a width so the label + growing "· NN%" doesn't
   wobble. The shared look + gauge fill live globally in _general.scss
   (.recalc-status-pill / .recalc-progress-fill). */
.absolute-center-badge .recalc-status-pill {
    min-width: 168px;
    max-width: 260px;
}

.truncate-text {    
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap; 
}


:deep(.highlight-mention) {
    color: $color-violet-700;
    font-weight: 600;
    background-color: $color-violet-100;
    padding: 2px 2px;
    border-radius: 999px;
  }

</style>
