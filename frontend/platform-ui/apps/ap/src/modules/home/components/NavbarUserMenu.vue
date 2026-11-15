<template>
<div class="menu__item dropdown" id="dropdown_user">
  <button class="icons-topbar btn btn-simple btn-simple--icon link link--icon dropdown-toggle navbar-tooltip" id="user-menu" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" :disabled="disabled"><span class="navbar-tooltiptext" style="margin-right: 170px; margin-top: 70px"> {{ $t('home.components.navbar.preferences.tooltip') }}</span>
    <IconUser class="navBarIcon"></IconUser>
  </button>
  <div class="dropdown-header-menu dropdown-header-menu__user dropdown-menu" aria-labelledby="user-menu"><a class="dropdown-item btn btn-simple link link--icon" @click="Routing.home.openHomeCompanyInfo()" v-if="userIsAdmin && !disableElementPilotIsExpired && showMenu"><span>{{ $t('home.components.navbar.user.companyInfo') }}</span></a><a class="dropdown-item btn btn-simple link link--icon" @click="Routing.home.openHomeFinancialData()" v-if="userIsAdmin && !disableElementPilotIsExpired && showMenu"><span>{{ $t('home.components.navbar.user.financialData') }}</span></a><a class="dropdown-item btn-simple link link--icon" @click="Routing.home.openHomePreferences()" v-if="!disableElementPilotIsExpired && showMenu"><span>{{ $t('home.components.navbar.user.preferences') }}</span></a><a class="dropdown-item btn btn-simple link link--icon" v-if="userIsAdmin && !disableElementPilotIsExpired && showMenu" @click="Routing.home.openHomeAllSpendFiles()"><span>{{ $t('home.components.navbar.user.manageSpendFile') }}</span></a><a class="dropdown-item btn btn-simple link link--icon" v-if="userIsAdmin && !disableElementPilotIsExpired" @click="Routing.home.openHomeManageTeam()"><span>{{ $t('home.components.navbar.user.manageTeam') }}</span></a><a class="dropdown-item btn btn-simple link link--icon" v-if="(userIsSuperAdmin || (userIsAdmin && useFeatureValueProposition)) && !disableElementPilotIsExpired" @click="Routing.home.openHomeValueProposition()"><span>{{ $t('home.homeCompanySettings.cardGroups.valueProposition') }}</span></a><a class="dropdown-item btn-simple link link--icon" @click="$emit('admin-console')" v-if="(userIsSuperAdmin || userSalesRoleEnabled || userDataRoleEnabled) && !disableElementPilotIsExpired"><span>{{ $t('home.dashboard.adminConsole') }}</span></a><a class="dropdown-item btn-simple link link--icon" @click="Routing.home.openHomeHelpSupport()" v-if="!disableElementPilotIsExpired"><span>{{ $t('home.components.navbar.user.helpSupport') }}</span></a>
    <div class="dropdown-divider"></div><a class="dropdown-item btn btn-simple link link--icon" @click="$emit('logout')"><span>{{ $t('home.components.navbar.user.button') }}    </span></a>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import * as Routing from "@/services/router/Routing";
import IconUser from "@ada/design-system/assets/icons/iconUser.vue";

/**
 * The 8 permission-gated user-menu links, extracted from HomeNavbar.vue
 * (US-2, Sprint 116 refactor) — presentational: the permission flags come
 * in as props exactly as HomeNavbar.vue computed them; `admin-console` and
 * `logout` go back out as emits to the same goToAdminConsole/onClickLogOut
 * handlers HomeNavbar.vue always called directly.
 */
export default defineComponent({
  name: "NavbarUserMenu",
  components: { IconUser },
  props: {
    disabled: { type: Boolean, default: false },
    userIsAdmin: { type: Boolean, required: true },
    disableElementPilotIsExpired: { type: Boolean, required: true },
    showMenu: { type: Boolean, required: true },
    userIsSuperAdmin: { type: Boolean, required: true },
    userSalesRoleEnabled: { type: Boolean, required: true },
    userDataRoleEnabled: { type: Boolean, required: true },
    useFeatureValueProposition: { type: Boolean, required: true },
  },
  emits: ["admin-console", "logout"],
  setup() {
    return { Routing };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";

// Hover tooltip for the icon button. Scoped styles don't cross component
// boundaries, so this must be duplicated here (and in
// HomeNavbarNotifications.vue) — see
// docs/context/change-homenavbar-refactor.md.
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
</style>
