<template>
<div class="page-content-overflow2">
  <section class="page-content-top">
    <h3>{{ $t('adminBackend.companiesAdmin.header') }}</h3>
  </section>
  <section class="page-content">
    <div class="row px-4 mb-4">
      <div class="col-12 d-flex align-items-center">
        <TabStrip @select="changeTab" :selected="selectedTabIndex" :tabs="tabs">
          <template v-if="tabs.length > 1" v-slot:program="{ props }"><span>{{ props.title }}</span><span>{{ props.title }}</span><span>{{ props.title }}</span></template>
        </TabStrip>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <ListCatalog></ListCatalog>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive } from "vue";
import { TabStrip } from "@progress/kendo-vue-layout";
import { useI18n } from "vue-i18n";

import ListCatalog from '@/modules/adminBackend/components/ListCatalog.vue'

export default defineComponent({
  name: "AdminSpendsController",
  components: {
     TabStrip, ListCatalog
  },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    interface AdminDataController {
      selectedTab: string;
      selectedTabIndex: number;
      tabs: Array<any>;
    }

    const adminDataController = reactive<AdminDataController>({
      selectedTab: "uploadData",
      selectedTabIndex: 0,
      tabs: [
        {
          id: "data-1-catalog-data",
          title: translate.t("adminBackend.adminSpendsController.tab.catalog")
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
