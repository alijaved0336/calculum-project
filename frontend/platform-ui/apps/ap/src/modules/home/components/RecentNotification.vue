<template>
<div class="card notifications-card d-flex flex-column gap-1" v-if="notification" @click="Routing.home.openHomeAllMessages()">
  <div class="d-flex justify-content-between"><span class="text-base font-semibold text-gray-600">{{  'Feature Release ' }}</span><span class="text-xs font-medium new-button" v-if="notification.read === null">{{ 'NEW' }}</span></div>
  <div class="d-flex"><span class="text-sm font-normal text-gray-500" v-html="notification.message"></span></div>
  <div class="d-flex"><span class="text-xs font-normal text-gray-400">{{ notification.humanDate }}</span></div>
  <div class="d-flex end-justify-content cursor-pointer goto-notifications">
    <CalculumChevronRight @click="Routing.home.openHomeAllMessages()"></CalculumChevronRight>
  </div>
</div>
<div class="card notifications-card shadow-none d-flex flex-column gap-1" v-else>
  <NoDataAvailable :icon="'icon-release'" :message="$t('home.homePage.noNotifications')"></NoDataAvailable>
</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { recentNotification } from "@/types/homeView";
import * as formatData from "@/utils/FormatData";
import * as Routing from "@/services/router/Routing";
import CalculumChevronRight from "@/modules/components/CalculumChevronRight.vue";
import NoDataAvailable from "@/modules/components/NoDataAvailable.vue";
import type { PropType } from "vue";

export default defineComponent({
  name: "RecentNotification",
  components: { CalculumChevronRight, NoDataAvailable },
  props: {
    notification: {
      type: Object as PropType<recentNotification>,
      required: true,
    },
  },
  setup(props) {
    return {
      formatData,
      Routing,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.notifications-card {
  min-height: 175px;
}

.goto-notifications {
  color: $color-gray-400;

  &:hover {
    color: $color-primary-500;
  }
}

.new-button {
  display: flex;
  padding: 2px 8px;
  align-items: center;
  border-radius: 16px;
  background: $color-success-50;
  mix-blend-mode: multiply;
  color: $color-success-500;
  text-align: center;
}
</style>
