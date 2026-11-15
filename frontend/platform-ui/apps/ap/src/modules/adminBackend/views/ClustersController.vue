<template>
<div class="page-content-overflow2">
  <section class="page-content-top">
    <h3>{{ $t('adminBackend.companiesAdmin.header') }}</h3>
  </section>
  <section class="page-content">
    <div class="row px-4 mb-4">
      <div class="col-12 d-flex align-items-center">
        <TabStrip class="cluster-tab-wrapper" @select="changeTab" :selected="selectedTabIndex" :tabs="tabs">
          <template v-if="tabs.length > 1" v-slot:program="{ props }">
            <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'"><span class="clusters-tabs" :title="props.title">{{ props.title }}</span></Tooltip>
            <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'"><span class="clusters-tabs" :title="props.title">{{ props.title }}</span></Tooltip>
          </template>
        </TabStrip>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <ClusterTemplate v-if="selectedTabIndex === 0" :clusterType="'peerGroup'">            </ClusterTemplate>
        <ClusterTemplate v-if="selectedTabIndex === 1" :clusterType="'supplierStandard'"></ClusterTemplate>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive } from "vue";
import { TabStrip } from "@progress/kendo-vue-layout";
import { useI18n } from "vue-i18n";
import ClusterTemplate from "@/modules/adminBackend/components/clusters/ClusterTemplate.vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";

export default defineComponent({
  name: "AdminDataController",
  components: {
    ClusterTemplate,
    TabStrip,
    Tooltip,
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
          id: "data-1-peer-group-cluster-tab",
          title: translate.t("adminBackend.adminClusters.adminClusterController.tabs.peerGroup")
        },
        {
          id: "data-2-supplier-standard-cluster-tab",
          title: translate.t(
            "adminBackend.adminClusters.adminClusterController.tabs.supplierStandard"
          )
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
