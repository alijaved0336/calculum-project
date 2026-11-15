<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<nav class="menu menu--account">
  <ul class="menu__ul">
    <li class="menu__item" v-if="userIsAdmin && !disableElementPilotIsExpired && showMenu"><a class="menu__link link link--icon link--account-menu" @click="goToCompanyInfo()" :class="currentPage === 'CompanyInfo' ? 'active' : ''"><span>{{ $t('home.components.menuAccount.companyInfo') }}    </span></a></li>
    <li class="menu__item" v-if="userIsAdmin && !disableElementPilotIsExpired && showMenu"><a class="menu__link link link--icon link--account-menu" @click="Routing.home.openHomeFinancialData()" :class="currentPage === 'FinancialData' ? 'active' : ''"><span>{{ $t('home.components.menuAccount.financialData') }}</span></a></li>
    <li class="menu__item" v-if="showMenu && !disableElementPilotIsExpired"><a class="menu__link link link--icon link--account-menu" @click="goToPreferences()" :class="currentPage === 'Preferences' ? 'active' : ''"><span>{{ $t('home.components.menuAccount.preferences') }}</span></a></li>
    <li class="menu__item" v-if="userIsAdmin && !disableElementPilotIsExpired && showMenu"><a class="menu__link link link--icon link--account-menu" @click="goToAllSpendFiles()" :class="currentPage === 'ManageFiles' ? 'active' : ''"><span>{{ $t('home.components.menuAccount.manageSpendFile') }}</span></a></li>
    <li class="menu__item" v-if="userIsAdmin && !disableElementPilotIsExpired"><a class="menu__link link link--icon link--account-menu" @click="goToManageTeam()" :class="currentPage === 'ManageTeam' ? 'active' : ''"><span>{{ $t('home.components.menuAccount.manageTeam') }}</span></a></li>
    <li class="menu__item" v-if="(userIsSuperAdmin || (userIsAdmin && useFeatureValueProposition)) && !disableElementPilotIsExpired"><a class="menu__link link link--icon link--account-menu" @click="goToVP" :class="currentPage === 'ValueProposition' ? 'active' : ''"><span>{{ $t('home.homeCompanySettings.cardGroups.valueProposition') }}</span></a></li>
    <li class="menu__item"><a class="menu__link link link--icon link--account-menu" @click="goToHelpSupport()" :class="currentPage === 'HelpSupport' ? 'active' : ''"><span>{{ $t('home.components.menuAccount.helpSupport') }}</span></a></li>
    <li class="mt-8 menu__item"><a class="menu__link link link--icon link--account-menu" @click="goToLogout()" :class="currentPage === 'Logout' ? 'active' : ''"><span>{{ $t('home.components.menuAccount.logout') }}</span></a></li>
  </ul>
</nav>
</template>

<script lang="ts">
import * as HomeRouting from '../HomeRouting'
import * as Routing from '@/services/router/Routing'
import { computed, ref } from 'vue'
import { fontIcons, images } from '@/resources/assets/assets'
import { CalculumLoading } from '@ada/design-system'
import { useUser } from '@/composables'
import { getFlowToLogout } from '@/utils/CookieSessionsFns'
import { useUserStore } from '@/stores/user'

export default {
  name: 'HomeMenuAccount',
  components: { CalculumLoading },
  props: {
    currentPage: { type: String, required: true }
  },
  setup() {
    const userStore = useUserStore()

    const { userIsSuperAdmin, useFeatureValueProposition, userIsAdmin, isPilotAccount, getPilotTimeExpire } = useUser();

    const disableElementPilotIsExpired = computed(() => {
      if (isPilotAccount()) {

        if (userIsSuperAdmin.value) {
          return false;
        }
        let timeLimitValue = getPilotTimeExpire();
        return timeLimitValue === "Pilot Expired: Upgrade for Full Access";
      }

      return false;
    });
    
    const loading = ref(false)


    function goToProfile() {
      HomeRouting.openHomeProfile()
    }
    function goToCompanyInfo() {
      HomeRouting.openHomeCompanyInfo()
    }
    function goToCompanySettings(){
      HomeRouting.openHomeCompanySettings()
    }
    function goToPreferences() {
      HomeRouting.openHomePreferences()
    }
    function goToManageTeam() {
      HomeRouting.openHomeManageTeam()
    }
    function goToAllSpendFiles() {
      HomeRouting.openHomeAllSpendFiles()
    }
    function goToHelpSupport() {
      HomeRouting.openHomeHelpSupport()
    }    
    function goToUserManual() {
      HomeRouting.openHomeUserManual()
    }

    function goToVP() {
      HomeRouting.openHomeValueProposition()
    }

    function goToReleases() {
      window.open('https://academy.hello-ada.com/new-releases', '_blank');
    }


    function goToLogout() {
      if (loading.value){
          return false
        } else {
          loading.value = true
          getFlowToLogout()
        }      
    }

    const showMenu = computed(() => userStore.getShowMenu)

    return {
      userIsAdmin,
      fontIcons,
      goToAllSpendFiles,
      goToCompanyInfo,
      goToCompanySettings,
      goToHelpSupport,
      goToLogout,
      goToManageTeam,
      goToPreferences,
      goToProfile,
      goToUserManual,      
      images,
      loading,
      Routing,
      showMenu,
      goToReleases,
      userIsSuperAdmin,
      goToVP,
      useFeatureValueProposition,
      disableElementPilotIsExpired
    }
  }
}
</script>

<style lang='scss' scoped>
@import "src/resources/assets/styles/variables/colors";

nav {
  background: $color-white;
}

.link--account-menu {
  display: flex;
  align-items: center;
  font-weight: 400;
  cursor: pointer;
  span { color: $color-black; }
  transition: all ease 0.3s;
  &:hover {
    span {
      color: $color-red;
      &:hover {
        color: $color-red !important;
      }
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
}
</style>
