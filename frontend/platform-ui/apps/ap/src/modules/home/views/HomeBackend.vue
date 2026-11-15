<template>
  <WelcomeVideoModal />

  <ModalEntity
    v-if="isModalEntityShowing"
    :entity="selectedEntityObj"
    :high-z-index="true"
    :no-footer-display="noFooterToDisplay"
    @close="closeModalEntity"
  />

  <SupportBotWidget
    v-if="calculumAgentEnabled && userIsSuperAdmin && useFeatureSupportBot && supportBotUserId && supportBotTenantId && supportBotApiBaseUrl"
    :user-id="supportBotUserId"
    :tenant-id="supportBotTenantId"
    :support-api-base-url="supportBotApiBaseUrl"
    accent="#7a5af8"
  />

    <HomeNavbar
    :class="{ 'env-notice--show': envNoticeShow }"
    @show-alerts="showAlertsFn"
  />

  <div class="main-container">
    <CalculumModalIdle v-if="isIdle" />
    <FeedbackSurveyModal />

    <section
      v-if="
        !getGlobalLoading &&
        userFireBaseLogged !== null &&
        userFireBaseLogged !== undefined
      "
      class="page-contents"
      :class="{ 'bg-blur': getGlobalLoading }"
      :style="isBannerVisible ? { marginTop: '172px' } : {}"
    >
      <HomeSidebarUser />

      <section
        v-if="!disableElementPilotIsExpired"
        class="page-main-contents"
      >
        <HomeAlerts
          v-if="showAlerts"
          :type-alert="typeAlerts"
        />
        <router-view v-else />
      </section>

      <section
        v-if="disableElementPilotIsExpired"
        class="page-main-contents"
      >
        <div class="pilot-account-expired">
          <span class="expired-text-1 mr-2 font-weight-600">{{
            $t("global.accountExpired.part1")
          }}</span>
          <span class="expired-text-1">{{
            $t("global.accountExpired.part2")
          }}</span>
        </div>
      </section>
    </section>
  </div>
</template>

<script lang="ts">
import { computed, reactive, toRefs, watch, ref } from "vue";

import { NumberUtils } from "@/utils";
import type { HomeAlertLevel } from '@/modules/home/types'

import { useHomeStore } from "@/stores/home";
import { useEntityCardStore } from "@/stores/entityCard";
import { useSubscribeStore } from "@/stores/subscribe";
import { useAppStore } from "@/stores/app";
import { useUserStore } from "@/stores/user";
import CalculumModalIdle from "@/modules/components/CalculumModalIdle.vue";
import HomeAlerts from "../components/HomeAlerts.vue";
import HomeNavbar from "../components/HomeNavbar.vue";
import HomeSidebarUser from "../components/HomeSidebarUser.vue";
import ModalEntity from "@/modules/home/entityCard/components/modals/ModalEntity.vue";
import FeedbackSurveyModal from "@/modules/components/FeedbackSurveyModal.vue";
import WelcomeVideoModal from "../components/WelcomeVideoModal.vue";
import useEntity from "@/modules/home/entityCard/composables/useEntity";
import { useGlobalInactivityLogout } from "@/composables/useGlobalInactivityLogout";

// Composables
import { useUser } from "@/composables";

export default {
  name: "HomeBackend",
  components: {
    CalculumModalIdle,
    FeedbackSurveyModal,
    HomeAlerts,
    HomeNavbar,
    HomeSidebarUser,
    ModalEntity,
    WelcomeVideoModal,
  },
  setup() {

    const homeStore = useHomeStore()
    const entityCardStore = useEntityCardStore()
    const subscribeStore = useSubscribeStore()
    const appStore = useAppStore()
    const userStore = useUserStore()
    const { user, isPilotAccount, getPilotTimeExpire, userIsSuperAdmin, useFeatureSupportBot } = useUser()

    homeStore.setGlobalLoading(true);

    interface App {
      forceRerenderKey: number;
      isHigherZIndexNeeded: boolean;
      isModalShowing: boolean;
      noFooterToDisplay: boolean;
      showAlerts: boolean;
      typeAlerts: number;
    }

    const app = reactive<App>({
      forceRerenderKey: NumberUtils.getRandomInt(),
      isHigherZIndexNeeded: false,
      isModalShowing: false,
      noFooterToDisplay: false,
      showAlerts: false,
      typeAlerts: 0,
    });

    useGlobalInactivityLogout();

    const envName: string = import.meta.env.VITE_NAME;
    const userFireBaseLogged = ref(subscribeStore.getAuthFirestoreUser);

    const disableElementPilotIsExpired = computed(() => {
      if (isPilotAccount()) {
        const userisSuperAdmin = user?.value?.isSuperAdmin ?? false;
        if (userisSuperAdmin) return false;
        const timeLimitValue = getPilotTimeExpire();
        return timeLimitValue === "Pilot Expired: Upgrade for Full Access";
      }
      return false;
    });

    const envNoticeShow = computed(() => envName === "dev");

    const getGlobalLoading = computed(() => homeStore.getGlobalLoading);

    const isBannerVisible = computed(() => {
      const pending = userStore.getPendingNewSpendFileVersion;
      return !!pending;
    });

    watch(
      () => subscribeStore.getAuthFirestoreUser,
      () => {
        if (import.meta.env.DEV)
          console.log(
            "** watch userFireBaseLogged in FB",
            subscribeStore.getAuthFirestoreUser,
          );
        userFireBaseLogged.value = subscribeStore.getAuthFirestoreUser;
      },
    );

    const { selectedEntityObj } = useEntity()

    const supportBotUserId = computed(() => userStore.getUser?.azureId ?? '')
    const supportBotTenantId = computed(() => userStore.getUser?.activeCompany?.tenantId ?? '')
    // SupportBotWidget talks to the support query/chat service, not the ingestion service
    // SupportAgentSetupWidget uses — VITE_SUPPORT_API_URL, not VITE_SUPPORT_INGESTION_API_URL.
    // The widget calls this backend directly; auth rides the browser's cookie jar via withCredentials.
    const supportBotApiBaseUrl = import.meta.env.VITE_SUPPORT_API_URL ?? ''
    // The whole calculum-ui integration is production-only; see .env's committed default.
    const calculumAgentEnabled = import.meta.env.VITE_ENABLE_CALCULUM_AGENT === 'true'

    watch(selectedEntityObj, () => {
      app.forceRerenderKey = NumberUtils.getRandomInt();
    });

    watch(
      () => entityCardStore.getRefreshTabsValue,
      () => {
        app.forceRerenderKey = NumberUtils.getRandomInt();
      },
    );

    // *** Inactivity ***

    const InactivityBoolean = appStore.getInactivityBoolean;

    const isIdle = computed(() => appStore.getIsIdle);

    const timeStore = computed(() => appStore.getTimeInactivity);

    const timeInactivity = computed(() => {
      if (timeStore.value === "five") return 300000;
      if (timeStore.value === "ten") return 600000;
      return 900000;
    });

    // *** END Inactivity ***

    function closeModalEntity() {
      entityCardStore.setIsModalEntityShowing(false);
      entityCardStore.setSelectedTabIndexSpend(0);
      entityCardStore.setHigherZIndexForEntityModal(false);
    }

    function showAlertsFn(alert: HomeAlertLevel, status: boolean) {
      app.showAlerts = status
      app.typeAlerts = alert
    }

    const isModalEntityShowing = computed(
      () => entityCardStore.getIsModalEntityShowing,
    );

    watch(
      () => entityCardStore.getHigherZIndexForEntityModal,
      (newValue) => {
        app.isHigherZIndexNeeded = newValue;
      },
    );

    const higherZIndex = computed(() => app.isHigherZIndexNeeded);

    return {
      ...toRefs(app),
      closeModalEntity,
      supportBotUserId,
      supportBotTenantId,
      supportBotApiBaseUrl,
      calculumAgentEnabled,
      userIsSuperAdmin,
      useFeatureSupportBot,
      disableElementPilotIsExpired,
      envNoticeShow,
      getGlobalLoading,
      higherZIndex,
      InactivityBoolean,
      isBannerVisible,
      isIdle,
      isModalEntityShowing,
      NAME: import.meta.env.VITE_NAME,
      selectedEntityObj,
      showAlertsFn,
      timeInactivity,
      timeStore,
      userFireBaseLogged,
    };
  },
};
</script>

<style lang="scss" scoped>
@use "src/resources/assets/styles/variables/dimensions" as *;
@use "src/resources/assets/styles/variables/colors" as *;
@use "sass:map";

.main-content.env-notice--show {
  margin-top: $notice-height;
}

.pilot-account-expired {
  padding: 1rem;
  border-radius: 8px;
  border-color: map.get($colors, "warning-200");
  background: map.get($colors, "warning-100");

  .expired-text-1 {
    color: map.get($colors, "warning-700");
  }
}
</style>
