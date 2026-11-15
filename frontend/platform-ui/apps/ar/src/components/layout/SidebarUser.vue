<template>
<div class="page-sidebar show-scroll d-flex flex-column justify-content-between">
  <div class="d-flex flex-column">
    <ul class="user-sidebar">

       <li class="user-sidebar-item" :class="{ active: isActive(OpportunityRouting.opportunity) }">
        <a class="link--special2 hover-primary-600" :class="{ active: isActive(OpportunityRouting.opportunity) }" @click="OpportunityRouting.openOpportunity()">
          <span class="container-icon">
            <span class="icon-categorize icon-svg-sidebar" />
          </span>
          <span>{{ $t('home.components.menu.opportunity') }}</span>
        </a>
      </li>
      <!--
        UC-UI-05: no `icon-*.svg` asset exists for this screen (design-system only ships
        icon-dashboard/icon-overview - see _sidebaricons.scss), same situation Setup's own link
        below was already in. Same fallback it already uses rather than a new, unreviewed SVG.
      -->
      <li class="user-sidebar-item" :class="{ active: isActive(BuyersRouting.buyers) }">
        <a class="link--special2 hover-primary-600" :class="{ active: isActive(BuyersRouting.buyers) }" @click="BuyersRouting.openBuyers()">
          <span class="container-icon">
            <span class="icon-card icon-svg-sidebar" />
          </span>
          <span>{{ $t('home.components.menu.buyers') }}</span>
        </a>
      </li>


      <li class="spacer" />
      <li class="user-sidebar-item" :class="{ active: isActive(MatchRouting.match) }">
        <a class="link--special2 hover-primary-600" :class="{ active: isActive(MatchRouting.match) }" @click="MatchRouting.openMatch()"><span class="container-icon"><span class="icon-overview icon-svg-sidebar"></span></span><span>{{ $t('home.components.menu.match') }}</span></a>
      </li>
      <!-- AB#20702 (FR-01): administrators only, last in the menu. -->
      <li v-if="canSeeSetup" class="user-sidebar-item" :class="{ active: isActive(SetupRouting.setup) }">
        <a class="link--special2 hover-primary-600" :class="{ active: isActive(SetupRouting.setup) }" @click="SetupRouting.openSetup()"><span class="container-icon"><i class="fa-solid fa-gear setup-icon"></i></span><span>{{ $t('arSetup.title') }}</span></a>
      </li>

    </ul>
     <div class="w-100 switch-container d-flex">
        <SwitchPlatforms :currentPlatform="'ar'" @action:change-platform="changeToPlatform"/>
     </div>

  </div>
</div>

</template>

<script lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSession } from '@ada/auth'
import * as MatchRouting from '@/modules/match/MatchRouting'
import * as BuyersRouting from '@/modules/buyers/BuyersRouting'
import * as OpportunityRouting from '@/modules/opportunity/OpportunityRouting'
import * as SetupRouting from '@/modules/setup/SetupRouting'
import { hasSetupAccess } from '@/modules/setup/setupAccess'

function changeToPlatform() {
    const platformUrl = import.meta.env.VITE_CHANGE_TO_PLATFORM;
    if (platformUrl) {
      globalThis.location.href = platformUrl;
    }
  }

import { SwitchPlatforms } from '@ada/design-system'

export default {
  name: "SidebarUser",
  components: { SwitchPlatforms },
  setup() {
    const currentRoute = useRoute()
    const isActive = (name: string) => currentRoute.name === name
    const { session } = useSession()
    const canSeeSetup = computed(() => hasSetupAccess(session.value?.roles))



    return {
      MatchRouting,
      BuyersRouting,
      OpportunityRouting,
      SetupRouting,
      isActive,changeToPlatform,
      canSeeSetup,
    };
  }
};
</script>

<style lang="scss" scoped>
@import "variables/colors";

.setup-icon {
  display: inline-block;
  width: 30px;
  height: 30px;
  color: $color-gray-500;
  font-size: 20px;
  line-height: 30px;
  text-align: center;
}

.link--special2.active .setup-icon,
.link--special2:hover .setup-icon {
  color: $color-primary-600;
}
</style>
