<template>
<div class="page-sidebar show-scroll d-flex flex-column justify-content-between" v-if="!disableElementPilotIsExpired">
  <div class="d-flex flex-column">
    <ul class="user-sidebar">
      <li class="user-sidebar-item"><a class="link--special2 hover-primary-600" @click="moduleHomeDashboardOpen" :class="router.currentRoute.value.name === Routing.home.homeDashBoard ? 'active' : ''"><span class="container-icon"><span class="icon-dashboard icon-svg-sidebar"></span></span><span>{{ $t('home.components.menu.dashboard') }}</span></a></li>
      <li class="spacer" v-if="showMenu"></li>
      <li class="user-sidebar-item" v-if="showMenu && moduleCategorizeIsAvailable"><a class="link--special2 hover-primary-600" @click="moduleCategorizeOpen" :class="{ 'active': moduleCategorizeIsActive }"><span class="container-icon"><span class="icon-svg-sidebar icon-analyze"></span></span><span>{{ $t('home.components.menu.analyze') }}</span></a></li>
      <li class="user-sidebar-item" v-if="showMenu && moduleProgramIsAvailable"><a class="link--special2 hover-primary-600" @click="moduleProgramOpen" :class="moduleProgramIsActive ? 'active' : ''"><span class="container-icon"><span class="icon-categorize icon-svg-sidebar"></span></span><span>{{ $t('home.components.menu.opportunity') }}</span></a></li>
      <li class="user-sidebar-item" v-if="showMenu && modulePlanIsAvailable"><a class="link--special2 hover-primary-600" @click="modulePlanOpen" :class="modulePlanIsActive ? 'active' : ''"><span class="container-icon"><span class="icon-plan icon-svg-sidebar"></span></span><span>{{ $t('home.components.menu.plan') }}</span></a></li>
      <li class="user-sidebar-item" v-if="showMenu"><a class="link--special2 hover-primary-600" @click="moduleManageOpen" :class="moduleManageIsActive ? 'active' : ''"><span class="container-icon"><span class="icon-manage-module icon-svg-sidebar"></span></span><span>{{ $t('home.components.menu.manage') }}</span></a></li>
      <li class="user-sidebar-item" v-if="showMenu && moduleEntityCardIsAvailable"><a class="link--special2 hover-primary-600" @click="moduleEntityCardOpen" :class="moduleEntityCardIsActive ? 'active' : ''"><span class="container-icon"><span class="icon-card icon-svg-sidebar"></span></span><span>{{ setTitleForsupplier }}</span></a></li>
      <li class="spacer" v-if="showMenu && (moduleEntityCardIsAvailable || moduleManageIsAvailable || modulePlanIsAvailable || moduleProgramIsAvailable || moduleCategorizeIsAvailable)"></li>
      <li class="user-sidebar-item" v-if="showMenu && moduleCompareIsAvailable"><a class="link--special2 hover-primary-600" @click="moduleCompareOpen" :class="moduleCompareIsActive ? 'active' : ''"><span class="container-icon"><span class="icon-compare icon-svg-sidebar"></span></span><span>{{ $t('home.components.menu.compare') }}</span></a></li>
      <li class="user-sidebar-item" v-if="showMenu && moduleOverviewIsAvailable"><a class="link--special2 hover-primary-600" @click="moduleOverviewOpen" :class="{ 'active': moduleOverviewIsActive }"><span class="container-icon"><span class="icon-overview icon-svg-sidebar"></span></span><span>{{ $t('home.components.menu.match') }}</span></a></li>
      <li class="user-sidebar-item" v-if="showMenu && moduleCompanySettingsIsAvailable"><a class="link--special2 hover-primary-600" @click="moduleCompanySettingsOpen" :class="{ 'active': moduleCompanySettingsIsActive }"><span class="container-icon"><span class="icon-settings icon-svg-sidebar"></span></span><span>{{ $t('home.components.menu.setup') }}</span></a></li>
    </ul>
    <div class="w-100 switch-container d-flex">
      <!-- UC-ENT-12 A6. MODULE_AR on the active company alone puts the entry in front of every user. -->
      <SwitchPlatforms v-if="receivablesSwitchIsVisible" :current-platform="'ap'" @action:change-platform="changeToPlatform" />
    </div>
  </div>
  <div class="logo-calculum"><img class="logo-user-sidebar" v-if="hasUiGroupImage" :src="companyActiveUIGroupLogoPath" :style="{width: '80px'}"/><a v-if="!hasUiGroupImage" href="https://www.calculum.ai/" target="_blank"><img class="logo-user-sidebar" :src="logo" :style="{width: '40px' }"/></a></div>
</div>
<div class="page-sidebar show-scroll d-flex flex-column" v-if="disableElementPilotIsExpired">
  <ul class="user-sidebar">
    <li class="user-sidebar-item"><a class="link--special2 hover-primary-600"></a></li>
  </ul>
</div>
</template>

<script lang="ts">

import { computed, reactive, toRefs } from "vue";
import { useI18n } from "vue-i18n";
import { SwitchPlatforms } from '@ada/design-system'

// Composables
import {
  useModuleCategorize,
  useModuleCompanySettings,
  useModuleCompare,
  useModuleEntityCard,
  useModuleManage,
  useModuleOverview,
  useModulePlan,
  useModuleProgram,
  useUser,
  useModuleHomeDashboard,
  useReceivablesComposable,
} from "@/composables";

import { images } from "@/resources/assets/assets";
import { StringUtils } from "@/utils";
import * as Routing from "@/services/router/Routing";
import router from "@/services/router";
import useCompany from "@/composables/useCompany";
import { useUserStore } from '@/stores/user';
import { useAppStore } from '@/stores/app';
import { useHomeStore } from '@/stores/home';

export default {
  name: "HomeSidebarUser",
  components: {
    SwitchPlatforms
  },
  setup() {
    const userStore = useUserStore();

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const appStore = useAppStore();
    const homeStore = useHomeStore();

    const {      
      moduleReceivablesIsAvailable,      
    } = useReceivablesComposable()

    const showMenu = computed(() => userStore.getShowMenu);
    const {
      user,
      userIsAdmin: isAdmin,
      getPilotTimeExpire,
      isPilotAccount
    } = useUser();

    /**
     * UC-ENT-12 A6. MODULE_AR says the company is enabled for receivables, and that alone shows
     * the entry: no user role narrows it, so ticking the checkbox exposes it to all its users.
     */
    const receivablesSwitchIsVisible = computed(() => moduleReceivablesIsAvailable.value);

    /** Leaves for the AR app at VITE_CHANGE_TO_PLATFORM. */
    function changeToPlatform() {
      const platformUrl = import.meta.env.VITE_CHANGE_TO_PLATFORM;
      console.log("** platformUrl",platformUrl)
      if (platformUrl) {
        globalThis.location.href = platformUrl;
      }
    }

    const disableElementPilotIsExpired = computed(() => {
      if (isPilotAccount()) {
        let userisSuperAdmin = user?.value?.isSuperAdmin ?? false
        if (userisSuperAdmin) {
          return false
        }
        let timeLimitValue = getPilotTimeExpire()
          return timeLimitValue === 'Pilot Expired: Upgrade for Full Access'
      }

      return false
    })
    const {
      companyActiveUIGroupLogoPath
    } = useCompany();

    interface Data {
      showCompare: boolean;
      showCategorize: boolean;
      showExecute: boolean;
      showEntityCard: boolean;
      showOverview: boolean;
      appVersion: string;
      hasUiGroupImage: boolean;
      showManageModule: boolean;
    }

    const data = reactive<Data>({
      showCompare: true,
      showCategorize: true,
      showExecute: true,
      showOverview: true,
      showEntityCard: true,
      appVersion: appStore.getAppVersion,
      hasUiGroupImage: false,
      showManageModule: false
    });

    const {
      moduleCategorizeOpen,
      moduleCategorizeIsActive,
      moduleCategorizeIsAvailable
    } = useModuleCategorize();

    const {
      moduleProgramIsActive,
      moduleProgramIsAvailable,
      moduleProgramOpen
    } = useModuleProgram();

    const {
      modulePlanIsActive,
      modulePlanIsAvailable,
      modulePlanOpen
    } = useModulePlan();

    const {
      moduleManageIsActive,
      moduleManageIsAvailable,
      moduleManageOpen
    } = useModuleManage();

    const {
      moduleEntityCardIsActive,
      moduleEntityCardIsAvailable,
      moduleEntityCardOpen
    } = useModuleEntityCard();

    const {
      moduleCompareIsActive,
      moduleCompareIsAvailable,
      moduleCompareOpen
    } = useModuleCompare();

    const {
      moduleOverviewIsAvailable,
      moduleOverviewOpen,
      moduleOverviewIsActive
    } = useModuleOverview();

    const {
      moduleCompanySettingsIsActive,
      moduleCompanySettingsIsAvailable,
      moduleCompanySettingsOpen
    } = useModuleCompanySettings();


    const {
      moduleHomeDashboardOpen
    } = useModuleHomeDashboard()

    const hasUiGroupImage = computed(() => {
      if (
        !StringUtils.isNullUndefinedOrEmpty(companyActiveUIGroupLogoPath.value)
      ) {
        return true;
      }
      return false;
    });

    const logo = computed(() => {
      return images.calculumLogoNoText;
    });

    
    const setTitleForsupplier = computed(() => {
      return translate.t('home.components.menu.suppliers')
    })

    return {
      ...toRefs(data),
      BASE_URL: import.meta.env.VITE_BASE_URL,
      companyActiveUIGroupLogoPath,
      disableElementPilotIsExpired,      
      hasUiGroupImage,
      images,
      logo,
      moduleCategorizeIsActive,
      moduleCategorizeIsAvailable,
      moduleCategorizeOpen,
      moduleCompanySettingsIsActive,
      moduleCompanySettingsIsAvailable,
      moduleCompanySettingsOpen,
      moduleCompareIsActive,
      moduleCompareIsAvailable,
      moduleCompareOpen,
      moduleEntityCardIsActive,
      moduleEntityCardIsAvailable,
      moduleEntityCardOpen,
      moduleManageIsActive,
      moduleManageIsAvailable,
      moduleManageOpen,
      moduleOverviewIsActive,
      moduleOverviewIsAvailable,
      moduleOverviewOpen,
      modulePlanIsActive,
      modulePlanIsAvailable,
      modulePlanOpen,
      moduleProgramIsActive,
      moduleProgramIsAvailable,
      moduleProgramOpen,
      router,
      Routing,
      showMenu,
      moduleHomeDashboardOpen,
      moduleReceivablesIsAvailable,
      receivablesSwitchIsVisible,      
      setTitleForsupplier,
      changeToPlatform
    };
  }
};
</script>