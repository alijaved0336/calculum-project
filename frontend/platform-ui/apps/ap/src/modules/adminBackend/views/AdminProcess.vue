<template>
<div class="page-content-overflow2">
  <section class="page-content-top px-4">
    <h3>{{ $t('adminBackend.adminProcess.title') }}</h3>
  </section>
  <section class="page-content px-4">
    <ul class="nav nav-tabs mt-2">
      <li class="nav-item" v-for="tab in tabs" :key="tab.key">
        <a
          class="nav-link cursor-pointer"
          :class="{ active: activeTab === tab.key }"
          @click="selectTab(tab.key)"
        >{{ $t(`adminBackend.adminProcess.tabs.${tab.key}`) }}</a>
      </li>
    </ul>

    <!-- v-if (not v-show): the monitor must tear down its Firestore listeners
         and polling when its tab deactivates. -->
    <AdminProcessSpendFilesMonitor v-if="activeTab === 'spendFiles'" />
    <AdminProcessPrograms v-if="activeTab === 'programs'" />
    <AdminProcessMaintenance v-if="activeTab === 'maintenance'" />
  </section>
</div>
</template>

<script lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

import AdminProcessMaintenance from "@/modules/adminBackend/components/adminProcess/AdminProcessMaintenance.vue";
import AdminProcessPrograms from "@/modules/adminBackend/components/adminProcess/AdminProcessPrograms.vue";
import AdminProcessSpendFilesMonitor from "@/modules/adminBackend/components/adminProcess/AdminProcessSpendFilesMonitor.vue";

type AdminProcessTab = "spendFiles" | "programs" | "maintenance";

const TAB_KEYS: AdminProcessTab[] = ["spendFiles", "programs", "maintenance"];

export default {
  name: "AdminProcess",
  components: {
    AdminProcessMaintenance,
    AdminProcessPrograms,
    AdminProcessSpendFilesMonitor
  },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
    const route = useRoute();
    const router = useRouter();
    document.title = translate.t("adminBackend.adminProcess.title");

    const initialTab = TAB_KEYS.includes(route.query.tab as AdminProcessTab)
      ? (route.query.tab as AdminProcessTab)
      : "spendFiles";
    const activeTab = ref<AdminProcessTab>(initialTab);

    function selectTab(tab: AdminProcessTab) {
      activeTab.value = tab;
      router.replace({ query: { ...route.query, tab } });
    }

    return {
      activeTab,
      selectTab,
      tabs: TAB_KEYS.map((key) => ({ key }))
    };
  }
};
</script>
