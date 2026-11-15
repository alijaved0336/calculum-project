<template>
<div class="page-content-overflow2">
  <section class="page-content-top">
    <h3>| {{ $t('adminBackend.audit.title') }}</h3>
  </section>
  <section class="page-content">
    <div class="row px-4 mb-4">
      <div class="col-12 d-flex align-items-center">
        <TabStrip @select="onTabSelect" :selected="selectedTabIndex" :tabs="tabs">
          <template v-slot:tab="{ props }"><span>| {{ props.title }}</span></template>
        </TabStrip>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <AuditLogHealth v-if="selectedTabIndex === 0"></AuditLogHealth>
        <AuditLogMetrics v-if="selectedTabIndex === 1"></AuditLogMetrics>
        <AuditLogs v-if="selectedTabIndex === 2"></AuditLogs>
        <AuditEmails v-if="selectedTabIndex === 3"></AuditEmails>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { TabStrip } from "@progress/kendo-vue-layout";
import { useI18n } from "vue-i18n";
import AuditLogs from "@/modules/adminBackend/views/AuditLogs.vue";
import AuditEmails from "@/modules/adminBackend/views/AuditEmails.vue";
import AuditLogHealth from "@/modules/adminBackend/views/AuditLogHealth.vue";
import AuditLogMetrics from "@/modules/adminBackend/views/AuditLogMetrics.vue";

interface Tab {
  id: string;
  title: string;
}

interface TabSelectEvent {
  selected: number;
}

export default defineComponent({
  name: "AuditAdmin",
  components: {
    AuditLogs,
    AuditEmails,
    AuditLogHealth,
    AuditLogMetrics,
    TabStrip
  },
  setup() {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    // Translation keys as constants for better maintainability
    const TAB_LOGS = t("adminBackend.audit.tab.logs");
    const TAB_EMAILS = t("adminBackend.audit.tab.emails");
    const TAB_HEALTH = "Health";
    const TAB_METRICS = "Metrics";

    // Use ref for better type safety with individual properties
    const selectedTabIndex = ref<number>(0);
    const selectedTab = ref<string>("health");

    // Computed property for tabs to ensure type safety
    // Order: Health, Metrics, Logs, Emails
    const tabs = computed<Tab[]>(() => [
      {
        id: "audit-1-health",
        title: TAB_HEALTH
      },
      {
        id: "audit-2-metrics",
        title: TAB_METRICS
      },
      {
        id: "audit-3-logs",
        title: TAB_LOGS
      }, 
      {
        id: "audit-4-emails",
        title: TAB_EMAILS
      }
    ]);

    /**
     * Handles tab selection events from the TabStrip component
     * @param e - Event object containing the selected tab index
     */
    function onTabSelect(e: TabSelectEvent): void {
      selectedTabIndex.value = e.selected;
      const tabMap: Record<number, string> = {
        0: "health",
        1: "metrics",
        2: "logs",
        3: "emails"
      };
      selectedTab.value = tabMap[e.selected] || "health";
    }

    return {
      selectedTabIndex,
      selectedTab,
      tabs,
      onTabSelect
    };
  }
});
</script>

<style lang="scss" scoped>
// Component-specific styles (if any) would go here
</style>

