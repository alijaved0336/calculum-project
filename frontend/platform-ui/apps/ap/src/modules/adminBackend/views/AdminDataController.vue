<template>
<div class="page-content-overflow2">
  <section class="page-content-top">
    <h3>{{ $t('adminBackend.companiesAdmin.header') }}</h3>
  </section>
  <section class="page-content">
    <div class="row px-4 mb-3">
      <div class="col-12">
        <CustomTabs
          :items="domains"
          :model-value="selectedDomain"
          appearance="segmented"
          @update:model-value="changeDomain"
        />
      </div>
    </div>
    <div class="row px-4 mb-4">
      <div class="col-12 d-flex align-items-center">
        <TabStrip :key="selectedDomain" :selected="selectedTabIndex" :tabs="tabs" @select="changeTab">
          <template v-if="tabs.length > 1" #program="{ props }"><span>{{ props.title }}</span><span>{{ props.title }}</span><span>{{ props.title }}</span></template>
        </TabStrip>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <AdminUploadData v-if="selectedTabKey === 'uploadData'"></AdminUploadData>
        <AdminDownloadData v-else-if="selectedTabKey === 'downloadData'"></AdminDownloadData>
        <AdminDataChange v-else-if="selectedTabKey === 'dataChange'"></AdminDataChange>
        <AdminDataPotentialRequests v-else-if="selectedTabKey === 'potentialSupplier'"></AdminDataPotentialRequests>
        <AdminUploadDataReceivables v-else-if="selectedTabKey === 'uploadDataReceivables'"></AdminUploadDataReceivables>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs, reactive } from "vue";
import { TabStrip } from "@progress/kendo-vue-layout";
import { useI18n } from "vue-i18n";
import { CustomTabs } from "@ada/design-system";
import AdminUploadData from "@/modules/adminBackend/views/AdminUploadData.vue";
import AdminUploadDataReceivables from "@/modules/adminBackend/views/AdminUploadDataReceivables.vue";
import AdminDownloadData from "@/modules/adminBackend/views/AdminDownloadData.vue";
import AdminDataChange from "@/modules/adminBackend/views/AdminDataChange.vue";
import AdminDataPotentialRequests from "@/modules/adminBackend/views/AdminDataPotentialRequests.vue";

type DataDomain = "payables" | "receivables";

interface DataTab {
  id: string;
  key: string;
  title: string;
}

export default defineComponent({
  name: "AdminDataController",
  components: {
    AdminDataChange,
    AdminDataPotentialRequests,
    AdminDownloadData,
    AdminUploadData,
    AdminUploadDataReceivables,
    CustomTabs,
    TabStrip
  },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    interface AdminDataController {
      selectedDomain: DataDomain;
      selectedTabIndex: number;
    }

    const adminDataController = reactive<AdminDataController>({
      selectedDomain: "payables",
      selectedTabIndex: 0
    });

    const domains = [
      {
        id: "payables",
        label: translate.t("adminBackend.adminDataController.domain.payables")
      },
      {
        id: "receivables",
        label: translate.t("adminBackend.adminDataController.domain.receivables")
      }
    ];

    const tabsByDomain: Record<DataDomain, DataTab[]> = {
      payables: [
        {
          id: "data-1-upload-data",
          key: "uploadData",
          title: translate.t("adminBackend.adminDataController.tab.upload")
        },
        {
          id: "data-3-download-data",
          key: "downloadData",
          title: translate.t(
            "adminBackend.adminDataController.tab.downloadData"
          )
        },
        {
          id: "data-3-data-change",
          key: "dataChange",
          title: translate.t("adminBackend.adminDataController.tab.dataChange")
        },
        {
          id: "data-4-data-potential-supplier-request",
          key: "potentialSupplier",
          title: translate.t("adminBackend.adminDataController.tab.potantielSupplier")
        }
      ],
      receivables: [
        {
          id: "data-2-upload-data-receivables",
          key: "uploadDataReceivables",
          title: translate.t("adminBackend.adminDataController.tab.upload")
        }
      ]
    };

    const tabs = computed(() => tabsByDomain[adminDataController.selectedDomain]);

    const selectedTabKey = computed(
      () => tabs.value[adminDataController.selectedTabIndex]?.key
    );

    function changeDomain(domain: string) {
      if (domain === adminDataController.selectedDomain) {
        return;
      }
      adminDataController.selectedDomain = domain as DataDomain;
      adminDataController.selectedTabIndex = 0;
    }

    function changeTab(e: { selected: number }) {
      adminDataController.selectedTabIndex = e.selected;
    }

    return {
      ...toRefs(adminDataController),
      domains,
      tabs,
      selectedTabKey,
      changeDomain,
      changeTab
    };
  }
});
</script>

<style lang="scss" scoped>
@import "@/resources/assets/styles/variables/_colors.scss";

</style>
