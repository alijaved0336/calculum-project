<template>
  <CalculumLoading v-if="loading" modal />
  <nav class="sidebar fixed-left">
    <div class="sidebar-header">
      <a class="link--image" @click="goToUserPanel">
        <img class="logo" :src="images.calculumLogo" alt="Calculum" />
      </a>
    </div>

    <div class="sidebar-body">
      <nav class="menu menu__sidebar">
        <ul v-if="showItems" class="menu__ul ml-auto">
          <li v-if="userIsSuperAdmin || userSalesRoleEnabled || userDataRoleEnabled" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.companiesAdmin)"
              @click="Routing.admin.openCompaniesAdmin()"
            >
              <CompanyIcon class="icon-svg icon-svg-32 black-bg" />
              <span>{{ $t('adminBackend.button.companies') }}</span>
            </a>
          </li>
          <li v-if="userIsSuperAdmin || userSalesRoleEnabled || userDataRoleEnabled" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.uiGroupsAdmin)"
              @click="Routing.admin.openUIGroupsAdmin()"
            >
              <LayersIcon class="icon-svg icon-svg-32 black-bg" />
              <span>{{ $t('adminBackend.button.groups') }}</span>
            </a>
          </li>
          <li v-if="userIsSuperAdmin || userSalesRoleEnabled" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.companyUsersGlobal)"
              @click="Routing.admin.openCompanyUsersGlobal()"
            >
              <iconUserManagement class="icon-svg icon-svg-32 black-bg" />
              <span>{{ $t('adminBackend.button.companyUsersGlobal') }}</span>
            </a>
          </li>
          <li v-if="userIsSuperAdmin || userDataRoleEnabled" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.adminData)"
              @click="Routing.admin.openAdminDataController()"
            >
              <iconCogFile class="icon-svg icon-svg-32 black-bg" />
              <span>{{ $t('global.data') }}</span>
            </a>
          </li>
          <li v-if="userIsSuperAdmin" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.statisticsAdmin)"
              @click="Routing.admin.openStatisticsAdmin()"
            >
              <IconChartLine class="icon-svg icon-svg-32 black-bg" />
              <span>{{ $t('adminBackend.button.statistics') }}</span>
            </a>
          </li>
          <li v-if="userIsSuperAdmin" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.auditAdmin)"
              @click="Routing.admin.openAuditAdmin()"
            >
              <IconCheckListSolid class="icon-svg icon-svg-32 black-bg" />
              <span>{{ $t('adminBackend.button.audit') }}</span>
            </a>
          </li>       
          <li v-if="userIsSuperAdmin" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.adminProcess)"
              @click="Routing.admin.openAdminProcess()"
            >
              <ProcessIcon class="icon-svg icon-svg-32 black-bg" />
              <span>{{ $t('adminBackend.adminProcess.title') }}</span>
            </a>
          </li>
          <li v-if="userIsSuperAdmin" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.clustersAdmin)"
              @click="Routing.admin.openClustersAdmin()"
            >
              <iconCluster class="icon-svg icon svg-32 black-bg" />
              <span>{{ $t('adminBackend.adminClusters.clusters') }}</span>
            </a>
          </li>
          <li v-if="userAllowedToCatalog && userIsSuperAdmin" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.listCatalogView)"
              @click="Routing.admin.openListCatalogView()"
            >
              <InvoiceIcon class="icon-svg icon svg-32 black-bg" />
              <span>{{ $t('adminBackend.catalog') }}</span>
            </a>
          </li>
          <li v-if="userIsSuperAdmin || userSalesRoleEnabled || userDataRoleEnabled" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.invitationsView)"
              @click="Routing.admin.openInvitationsView()"
            >
              <LayersIcon class="icon-svg icon svg-32 black-bg" />
              <span>{{ $t('adminBackend.uploadInvitation') }}</span>
            </a>
          </li>
          <li v-if="userIsSuperAdmin" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.supportBotSetupAdmin)"
              @click="Routing.admin.openSupportBotSetupAdmin()"
            >
              <IconSettings class="icon-svg icon-svg-32 black-bg" />
              <span>{{ $t('adminBackend.button.supportBotSetup') }}</span>
            </a>
          </li>
          <li v-if="userIsSuperAdmin" class="menu__item">
            <a
              class="menu__link link link--icon link--special"
              :class="isRouteActive(Routing.admin.negotiationBotSetupAdmin)"
              @click="Routing.admin.openNegotiationBotSetupAdmin()"
            >
              <IconSettings class="icon-svg icon-svg-32 black-bg" />
              <span>{{ $t('adminBackend.button.negotiationBotSetup') }}</span>
            </a>
          </li>
          <li class="menu__item">
            <a class="menu__link link link--icon link--special" @click="goToUserPanel">
              <ChangeViews class="icon-svg icon-svg-32 black-bg" />
              <span>{{ $t('adminBackend.adminProcess.goToUserPanel') }}</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>

    <div class="sidebar-footer">
      <div v-if="!showItems" class="footer footer__logo d-flex flex-column mb-4">
        <a class="link--image">
          <img class="logo" :src="images.aicpaSoc" />
        </a>
      </div>
      <div v-if="showItems" class="footer footer__logo d-flex flex-column">
        <a class="link--image" @click="goToUserPanel">
          <img class="img-logo" :src="images.calculumLogo" alt="Calculum" />
        </a>
      </div>
      <footer class="footer">
        <p class="copyright">{{ $t('global.copyright') }}</p>
      </footer>
    </div>
  </nav>
</template>

<script lang="ts">
import { fontIcons, images } from '@/resources/assets/assets'
import { ref, onMounted, defineComponent, computed } from "vue"
import * as Routing from '@/services/router/Routing'
import { useUserStore } from '@/stores/user'
import { useAdminBackendStore } from '@/stores/adminBackend'
import { useUser } from '@/composables'
import { RedirectSection } from '@/utils'
import ChangeViews from '@/resources/assets/images/icons/changeViews.vue'
import iconCluster from '@/resources/assets/images/icons/iconCluster.vue'
import iconCogFile from '@/resources/assets/images/icons/iconCogFile.vue'
import iconUserManagement from '@/resources/assets/images/icons/iconUserManagement.vue'
import IconChartLine from '@/resources/assets/images/icons/IconChartLine.vue'
import InvoiceIcon from '@/resources/assets/images/icons/iconInvoice.vue'
import ProcessIcon from '@/resources/assets/images/icons/iconProcess.vue'
import LayersIcon from '@/resources/assets/images/icons/iconLayers.vue'
import CompanyIcon from '@/resources/assets/images/icons/iconCompany.vue'
import IconCheckListSolid from '@/resources/assets/images/icons/IconCheckListSolid.vue'
import IconSettings from '@/resources/assets/images/icons/IconSettings.vue'
import router from '@/services/router/index'
import { CalculumLoading } from '@ada/design-system'

export default defineComponent({
  name: 'MenuAdmin',
  components: {
    CalculumLoading,
    iconCogFile,
    iconUserManagement,
    LayersIcon,
    InvoiceIcon,
    iconCluster,    
    ProcessIcon,
    ChangeViews,
    CompanyIcon,
    IconChartLine,
    IconCheckListSolid,
    IconSettings,
  },
  props: {
    showItems: { type: Boolean, default: true }
  },
  setup() {
    const userStore = useUserStore()
    const adminBackendStore = useAdminBackendStore()
    const { userAllowedToCatalog, userIsSuperAdmin, userSalesRoleEnabled, userDataRoleEnabled } = useUser()

    // Use ref for better type safety
    const loading = ref<boolean>(false)
    const advancedModeEnabled = ref<boolean>(false)

    // Computed property for current route name (reactive to route changes)
    const currentRouteName = computed(() => router.currentRoute.value.name)

    onMounted(() => {
      advancedModeEnabled.value = adminBackendStore.getAdvancedModeStatus
    })

    /**
     * Determines if a given route is currently active
     * @param routeName - The name of the route to check
     * @returns CSS class string ('active' if route matches, empty string otherwise)
     */
    function isRouteActive(routeName: string): string {
      return currentRouteName.value === routeName ? 'active' : ''
    }

    /**
     * Navigates back to the user panel
     * Calls whoAmI to refresh user context before redirecting
     */
    function goToUserPanel(): void {
      loading.value = true
      const params = {
        callbackSuccess: () => {
          RedirectSection.sectionTogo()
        },
        callbackError: () => {
          loading.value = false
        }
      }
      userStore.whoAmI(params)
    }

    /**
     * Toggles the advanced mode status in the admin backend store
     */
    function toggleAdvancedMode(): void {
      adminBackendStore.setAdvancedModeStatus(advancedModeEnabled.value)
    }

    return {
      loading,
      advancedModeEnabled,
      currentRouteName,
      fontIcons,
      goToUserPanel,
      images,
      isRouteActive,
      router,
      Routing,
      toggleAdvancedMode,
      userAllowedToCatalog,
      userIsSuperAdmin,
      userSalesRoleEnabled, 
      userDataRoleEnabled
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

span:hover {
  color: #ff2c4f;
}

.logo {
  width: 50%;
}

.black-bg {
  fill: #000;
  &:hover {
    fill: $color-red !important;
  }
}

.link--special2 {
  display: flex;
  align-items: center;
  font-weight: 400;
  cursor: pointer;
  span { color: $color-gray-500; }
  svg { fill: $color-gray-500; }
  transition: all ease 0.3s;
  &:hover {
    span {
      color: $color-red;
      &:hover {
        color: $color-red !important;
      }
    }
    svg {
      fill: $color-red;
    }
  }
}

.active {
  span {
    color: $color-red;
    &:hover {
      color: $color-red !important;
    }
  }
  svg {
    fill: $color-red;
  }
}

#advanced-mode {
  font-weight: 600;
  font-size: 1rem;
}
</style>
