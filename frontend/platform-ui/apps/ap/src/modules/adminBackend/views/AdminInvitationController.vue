<template>
<div class="page-content-overflow2">
  <section class="page-content-top">
    <h3>{{ $t('adminBackend.companiesAdmin.header') }}</h3>
  </section>
  <section class="page-content">
    <div class="row px-4 mb-4">
      <div class="col-12 d-flex align-items-center">
        <TabStrip @select="changeTab" :selected="selectedTabIndex" :tabs="tabs"></TabStrip>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <ListInvitations></ListInvitations>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive } from "vue";
import { TabStrip } from "@progress/kendo-vue-layout";
import { useI18n } from "vue-i18n";

import ListInvitations from '@/modules/adminBackend/components/ListInvitations.vue'

export default defineComponent({
  name: "AdminInvitationController",
  components: {
     TabStrip, ListInvitations
  },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    interface AdminDataController {
      selectedTab: string;
      selectedTabIndex: number;
      tabs: Array<any>;
    }

    const adminDataController = reactive<AdminDataController>({
      selectedTab: "sendInvitations",
      selectedTabIndex: 0,
      tabs: [
        {
          id: "data-1-catalog-data",
          title: translate.t("adminBackend.adminInvitationController.tab.invitation")
        }
      ]
    });

    function changeTab(e: { selected: number }) {
      adminDataController.selectedTabIndex = e.selected;
    }

    return {
      ...toRefs(adminDataController),
      changeTab
    };
  }
});
</script>

<style lang="scss" scoped>
@import "@/resources/assets/styles/variables/_colors.scss";

</style>
