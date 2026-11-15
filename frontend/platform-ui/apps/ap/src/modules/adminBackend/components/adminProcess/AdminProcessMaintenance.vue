<template>
<div>
  <CalculumDeleteModal v-if="showConfirmDeleteModal" @hide="hideDeleteModal" @deleteSpendFile="deleteSpendFile" :forDeleteSpendFile="true"></CalculumDeleteModal>
  <CalculumModal v-if="showModal" @close="showModal = false" :size="'xl'" :showClose="true" :title="$t('adminBackend.adminUploadData.spendFile')">
    <template v-slot:modalContent>
      <CalculumLoading v-if="loadingData" :modal="true">     </CalculumLoading>
      <CalculumGrid @downloadFile="onDownloadFile" @deleteFile="showDeleteModal" @button-action-clicked="spendFilesVersionsGridOnActionClicked" @clean-file="cleanFile" :gridData="filesVersions" :gridColumns="gridColumns" :buttonText="$t('button.recalculate')" gridHeight="500px"></CalculumGrid>
    </template>
  </CalculumModal>
  <div class="alert alert-warning cursor-pointer mt-2" v-if="errorMessage.length > 0" @click="errorMessage = ''"><span>{{ errorMessage }}</span></div>
  <h3>{{ $t('adminBackend.adminProcess.spendFilesStatus') }}</h3>
  <div class="row">
    <div class="col-12">
      <div class="card" style="min-height: auto; height: auto">
        <div class="card-body min-h-32">
          <CalculumLoading v-if="loadingData" block="block"></CalculumLoading>
          <template v-else>
            <div class="row">
              <div class="col-4 d-flex align-items-center">
                <h6 class="m-0">{{ $t('adminBackend.adminProcess.status') }}</h6>
              </div>
              <div class="col-4 d-flex align-items-center">
                <h6 class="m-0">{{ $t('adminBackend.adminProcess.amount') }}  </h6>
              </div>
              <div class="col-4 d-flex align-items-center">
                <div class="d-flex w-100 justify-content-end">
                  <h6 class="m-0">{{ $t('adminBackend.adminProcess.action') }}  </h6>
                </div>
              </div>
            </div>
            <hr/>
            <div class="row g-0 mb-2" v-for="item in status" :key="item.status">
              <div class="col-4 d-flex align-items-center"><span>{{ $t('spendFileStatus.'+item.status) }}</span></div>
              <div class="col-4 d-flex align-items-center"><span>{{ item.amount }}  </span></div>
              <div class="col-4 d-flex align-items-center">
                <div class="d-flex w-100 justify-content-end"><a class="btn btn-primary font-md" @click="viewDetails(item.status)"><span>{{ $t('adminBackend.adminProcess.buttons.viewDetails') }}</span></a></div>
              </div>
              <div class="col-12">
                <hr/>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
  <h3>{{ $t('adminBackend.adminProcess.title') }}</h3>
  <div class="row">
    <div class="col-12">
      <div class="card" style="min-height: auto; height: auto">
        <div class="card-body min-h-32">
          <CalculumLoading v-if="loadingData" block="block"></CalculumLoading>
          <template v-else>
            <div class="row mb-2">
              <div class="col-8 d-flex align-items-center">
                <h5 class="m-0">{{ $t('adminBackend.adminProcess.brandScoreFile') }} (CSV)</h5>
              </div>
              <div class="col-4 d-flex align-items-center">
                <div class="d-flex w-100 justify-content-end"><a class="btn btn-primary font-md" @click="addBrandScoreFiles()"><span>{{ $t('adminBackend.adminProcess.buttons.process') }}</span></a></div>
              </div>
            </div>
            <hr/>
            <div class="row mt-2">
              <div class="col-8 d-flex align-items-center">
                <h5 class="m-0">{{ $t('adminBackend.adminProcess.companyLeverages') }}</h5>
              </div>
              <div class="col-4 d-flex align-items-center">
                <div class="d-flex w-100 justify-content-end"><a class="btn btn-primary font-md" @click="recalculateLeverages()"><span>{{ $t('adminBackend.adminProcess.buttons.recalculate') }}</span></a></div>
              </div>
            </div>
            <hr/>
            <div class="row mt-2">
              <div class="col-8 d-flex align-items-center">
                <h5 class="m-0">{{ $t('adminBackend.adminProcess.capitalize') }}</h5>
              </div>
              <div class="col-4 d-flex align-items-center">
                <div class="d-flex w-100 justify-content-end"><a class="btn btn-primary font-md" @click="capitalizeRegions()"><span>{{ $t('adminBackend.adminProcess.buttons.execute') }}</span></a></div>
              </div>
            </div>
            <hr/>
            <div class="row mt-2">
              <div class="col-8 d-flex align-items-center">
                <h5 class="m-0">{{ $t('adminBackend.adminProcess.denominator') }} (TSV)</h5>
              </div>
              <div class="col-4 d-flex align-items-center">
                <div class="d-flex w-100 justify-content-end"><a class="btn btn-primary font-md" @click="addDenominatorScoreFiles()"><span>{{ $t('adminBackend.adminProcess.buttons.process') }}</span></a></div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
  <h3>{{ $t('adminBackend.adminProcess.dataIngestion.title') }}</h3>
  <div class="row">
    <div class="col-12">
      <div class="card" style="min-height: auto; height: auto">
        <div class="card-body min-h-32">
          <CalculumLoading v-if="loadingData" block="block"></CalculumLoading>
          <template v-else>
            <div class="row mb-2">
              <div class="col-8 d-flex align-items-center">
                <h5 class="m-0">{{ $t('adminBackend.adminProcess.dataIngestion.detailsClients') }}</h5>
              </div>
              <div class="col-4 d-flex align-items-center">
                <div class="d-flex w-100 justify-content-end"><a class="btn btn-primary font-md" @click=" syncClientsDataIngestion()"><span>{{ $t('adminBackend.adminProcess.buttons.execute') }}</span></a></div>
              </div>
            </div>
            <hr/>
            <div class="row mb-2">
              <div class="col-8 d-flex align-items-center">
                <h5 class="m-0">{{ $t('adminBackend.adminProcess.dataIngestion.detailsCompanies') }}</h5>
              </div>
              <div class="col-4 d-flex align-items-center">
                <div class="d-flex w-100 justify-content-end"><a class="btn btn-primary font-md" @click="syncCompaniesDataIngestion()"><span>{{ $t('adminBackend.adminProcess.buttons.execute') }}</span></a></div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
  <h3><span class="mr-2">{{ $t('adminBackend.adminProcess.supplierChainFinance.title') }}</span>
    <ButtonIconStandard @click="supplyChainFinanceGridDataRefresh" :ignorePopOver="true">
      <IconSync class="w-5"></IconSync>
    </ButtonIconStandard>
  </h3>
  <div class="row">
    <div class="col-12">
      <div class="card" style="min-height: auto; height: auto">
        <div class="card-body min-h-32">
          <CalculumLoading v-if="supplyChainFinanceIsLoading" block="block">     </CalculumLoading>
          <template v-else>
            <CalculumGrid class="mt-2" @button-action-clicked="actionButtonOnClicked" :columnsLocalName="'AdminProcessSCFFiles'" :defaultPageSize="10" :gridColumns="supplyChainFinanceGridColumns" :gridData="supplyChainFinanceGridData" :hideColumnSelector="true" :selectable="false" :showToolbar="false"></CalculumGrid>
          </template>
        </div>
      </div>
    </div>
  </div>
  <SpendAgreedManagement></SpendAgreedManagement>
</div>
</template>

<script lang="ts">
import { reactive, ref, Ref, toRefs, computed } from "vue";

// Types
import { SCFFileRefAPIResponse } from "@/types";

// Icons
import IconSync from "@/resources/assets/images/icons/IconSync.vue";

import { defaultadminProcessSpendFilesColumns } from "@/modules/adminBackend/data/columns";
import { images, fontIcons } from "@/resources/assets/assets";
import { useI18n } from "vue-i18n";
import { useAdminBackendStore } from '@/stores/adminBackend';
import { useSpendFilesStore } from '@/stores/spendFiles';
import * as formatData from "@/utils/FormatData";
import ButtonIconStandard from "@/modules/components/ButtonIconStandard.vue";
import CalculumDeleteModal from "@/modules/components/CalculumDeleteModal.vue";
import CalculumGrid from "@/modules/components/grid/CalculumGrid.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";

import { useToast } from "vue-toastification";
import supplyChainFinanceGridColumns from "@/modules/adminBackend/data/supplyChainFinanceGridColumns";


import SpendAgreedManagement from "@/modules/adminBackend/components/SpendAgreedManagement.vue";
import { removeIRI } from '@/utils';
import { shouldShowErrorToasts } from "@/utils/axios";

export default {
  name: "AdminProcessMaintenance",
  components: {
    ButtonIconStandard,
    CalculumDeleteModal,
    CalculumGrid,
    CalculumLoading,
    CalculumModal,

    fontIcons,
    IconSync,
    SpendAgreedManagement
  },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const spendFilesStore = useSpendFilesStore();
    const adminBackendStore = useAdminBackendStore();

    interface AdminUploadData {
      loadingData: boolean;
      errorMessage: string;
      status: any[];
      files: any[];
      showModal: boolean;
      showConfirmDeleteModal: boolean;
      showModalForUploadedFile: boolean;
      spendFileErrorMessage: string;
      filesVersions: any[];
      gridColumns: any[];
      versionToDelete: string;
      selectStatus: string;
      selectedFileIdForDelete: string;
    }

    const data = reactive<AdminUploadData>({
      loadingData: false,
      errorMessage: "",
      status: [],
      files: [],
      showModal: false,
      showConfirmDeleteModal: false,
      showModalForUploadedFile: false,
      spendFileErrorMessage: "",
      filesVersions: [],
      gridColumns: defaultadminProcessSpendFilesColumns,
      versionToDelete: "",
      selectedFileIdForDelete: "",
      selectStatus: ""
    });

    function addBrandScoreFiles() {
      data.loadingData = true;
      data.errorMessage = "";
      const params = {
        callbackSuccess: () => {
          data.loadingData = false;
          const toast = useToast();
          toast.success("Process completed successfully");
        },
        callbackError: (callbackErrorData: any) => {
          if (callbackErrorData !== null && callbackErrorData !== undefined) {
            if (
              Object.prototype.hasOwnProperty.call(
                callbackErrorData,
                "hydra:description"
              )
            ) {
              data.errorMessage = callbackErrorData["hydra:description"];
            } else if (
              Object.prototype.hasOwnProperty.call(callbackErrorData, "data") &&
              Object.prototype.hasOwnProperty.call(
                callbackErrorData.data,
                "error"
              )
            ) {
              data.errorMessage = callbackErrorData.data.error;
            } else if (shouldShowErrorToasts()) {
              data.errorMessage = translate.t("error.server400");
            }
          } else if (shouldShowErrorToasts()) {
            data.errorMessage = translate.t("error.server400");
          }
          data.loadingData = false;
        }
      };
      adminBackendStore.postBrandScoreFile(params);
    }

    function syncClientsDataIngestion() {
      data.loadingData = true;

      data.errorMessage = "";

      const params = {
        callbackSuccess: () => {
          data.loadingData = false;
          const toast = useToast();
          toast.success("Process completed successfully");
        },
        callbackError: (callbackErrorData: any) => {
          if (callbackErrorData !== null && callbackErrorData !== undefined) {
            if (
              Object.prototype.hasOwnProperty.call(
                callbackErrorData,
                "hydra:description"
              )
            ) {
              data.errorMessage = callbackErrorData["hydra:description"];
            } else if (
              Object.prototype.hasOwnProperty.call(callbackErrorData, "data") &&
              Object.prototype.hasOwnProperty.call(
                callbackErrorData.data,
                "error"
              )
            ) {
              data.errorMessage = callbackErrorData.data.error;
            } else if (shouldShowErrorToasts()) {
              data.errorMessage = translate.t("error.server400");
            }
          } else if (shouldShowErrorToasts()) {
            data.errorMessage = translate.t("error.server400");
          }
          data.loadingData = false;
        }
      };
      adminBackendStore.syncClientsDataIngestion(params);
    }

    function syncCompaniesDataIngestion() {
      data.loadingData = true;
      data.errorMessage = "";
      const params = {
        callbackSuccess: () => {
          data.loadingData = false;
          const toast = useToast();
          toast.success("Process completed successfully");
        },
        callbackError: (callbackErrorData: any) => {
          if (callbackErrorData !== null && callbackErrorData !== undefined) {
            if (
              Object.prototype.hasOwnProperty.call(
                callbackErrorData,
                "hydra:description"
              )
            ) {
              data.errorMessage = callbackErrorData["hydra:description"];
            } else if (
              Object.prototype.hasOwnProperty.call(callbackErrorData, "data") &&
              Object.prototype.hasOwnProperty.call(
                callbackErrorData.data,
                "error"
              )
            ) {
              data.errorMessage = callbackErrorData.data.error;
            } else if (shouldShowErrorToasts()) {
              data.errorMessage = translate.t("error.server400");
            }
          } else if (shouldShowErrorToasts()) {
            data.errorMessage = translate.t("error.server400");
          }
          data.loadingData = false;
        }
      };
      adminBackendStore.syncCompaniesDataIngestion(params);
    }

    function addDenominatorScoreFiles() {
      data.loadingData = true;
      data.errorMessage = "";
      const params = {
        callbackSuccess: () => {
          data.loadingData = false;
          const toast = useToast();
          toast.success("Process completed successfully");
        },
        callbackError: (callbackErrorData: any) => {
          if (callbackErrorData !== null && callbackErrorData !== undefined) {
            if (
              Object.prototype.hasOwnProperty.call(
                callbackErrorData,
                "hydra:description"
              )
            ) {
              data.errorMessage = callbackErrorData["hydra:description"];
            } else if (
              Object.prototype.hasOwnProperty.call(callbackErrorData, "data") &&
              Object.prototype.hasOwnProperty.call(
                callbackErrorData.data,
                "error"
              )
            ) {
              data.errorMessage = callbackErrorData.data.error;
            } else if (shouldShowErrorToasts()) {
              data.errorMessage = translate.t("error.server400");
            }
          } else if (shouldShowErrorToasts()) {
            data.errorMessage = translate.t("error.server400");
          }
          data.loadingData = false;
        }
      };
      adminBackendStore.postDenominatorScoreFile(params);
    }

    function recalculateLeverages() {
      data.loadingData = true;
      data.errorMessage = "";
      const params = {
        callbackSuccess: () => {
          data.loadingData = false;
          const toast = useToast();
          toast.success("Process completed successfully");
        },
        callbackError: (callbackErrorData: any) => {
          if (callbackErrorData !== null && callbackErrorData !== undefined) {
            if (
              Object.prototype.hasOwnProperty.call(
                callbackErrorData,
                "hydra:description"
              )
            ) {
              data.errorMessage = callbackErrorData["hydra:description"];
            } else if (
              Object.prototype.hasOwnProperty.call(callbackErrorData, "data") &&
              Object.prototype.hasOwnProperty.call(
                callbackErrorData.data,
                "error"
              )
            ) {
              data.errorMessage = callbackErrorData.data.error;
            } else if (shouldShowErrorToasts()) {
              data.errorMessage = translate.t("error.server400");
            }
          } else if (shouldShowErrorToasts()) {
            data.errorMessage = translate.t("error.server400");
          }
          data.loadingData = false;
        }
      };

      adminBackendStore.postRecalculateLeverages(params);
    }

    function capitalizeRegions() {
      data.loadingData = true;
      data.errorMessage = "";
      const params = {
        callbackSuccess: () => {
          data.loadingData = false;
          const toast = useToast();
          toast.success("Process completed successfully");
        },
        callbackError: (callbackErrorData: any) => {
          if (callbackErrorData !== null && callbackErrorData !== undefined) {
            if (
              Object.prototype.hasOwnProperty.call(
                callbackErrorData,
                "hydra:description"
              )
            ) {
              data.errorMessage = callbackErrorData["hydra:description"];
            } else if (
              Object.prototype.hasOwnProperty.call(callbackErrorData, "data") &&
              Object.prototype.hasOwnProperty.call(
                callbackErrorData.data,
                "error"
              )
            ) {
              data.errorMessage = callbackErrorData.data.error;
            } else if (shouldShowErrorToasts()) {
              data.errorMessage = translate.t("error.server400");
            }
          } else if (shouldShowErrorToasts()) {
            data.errorMessage = translate.t("error.server400");
          }
          data.loadingData = false;
        }
      };

      adminBackendStore.postCapitalize(params);
    }

    function getSpendFilesStatusCount() {
      data.loadingData = true;
      data.errorMessage = "";
      const params = {
        callbackSuccess: (callbackSucessData: any) => {
          data.loadingData = false;
          data.status = callbackSucessData;
        },
        callbackError: (callbackErrorData: any) => {
          if (callbackErrorData !== null && callbackErrorData !== undefined) {
            if (
              Object.prototype.hasOwnProperty.call(
                callbackErrorData,
                "hydra:description"
              )
            ) {
              data.errorMessage = callbackErrorData["hydra:description"];
            } else if (
              Object.prototype.hasOwnProperty.call(callbackErrorData, "data") &&
              Object.prototype.hasOwnProperty.call(
                callbackErrorData.data,
                "error"
              )
            ) {
              data.errorMessage = callbackErrorData.data.error;
            } else if (shouldShowErrorToasts()) {
              data.errorMessage = translate.t("error.server400");
            }
          } else if (shouldShowErrorToasts()) {
            data.errorMessage = translate.t("error.server400");
          }
          data.loadingData = false;
        }
      };

      adminBackendStore.getSpendFilesStatusCount(params);
    }

    getSpendFilesStatusCount();

    function onDownloadFile(file: any) {
      data.loadingData = true;
      const params = {
        mediaID: file.media["@id"],
        callbackSuccess: (response: any) => {
          const url = window.URL.createObjectURL(new Blob([response]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `${file.media.originalFileName}`);
          document.body.appendChild(link);
          link.click();
          data.loadingData = false;
        },
        callbackError: () => {
          data.loadingData = false;
        }
      };

      spendFilesStore.getMediaFileVersion(params);
    }

    function showDeleteModal(event: any) {
      data.selectedFileIdForDelete = event["@id"];
      data.showModal = false;
      data.showConfirmDeleteModal = true;
    }

    function hideDeleteModal() {
      data.showConfirmDeleteModal = false;
      data.showModal = true;
    }

    function deleteSpendFile() {
      data.showConfirmDeleteModal = false;
      if (data.versionToDelete !== null) {
        data.loadingData = true;
        const params = {
          versionID: data.selectedFileIdForDelete,
          callbackSuccess: (callbackSuccessData: any) => {
            const toast = useToast();
            toast.success("Process completed successfully");
            data.loadingData = false;
            data.showModal = true;
            getFileVersions();
            getSpendFilesStatusCount();
          },
          callbackError: () => {
            const toast = useToast();
            toast.error("Error deleting file");
            data.loadingData = false;
          }
        };
        spendFilesStore.deleteSpendFileVersion(params);
      }
    }

    function cleanFile(id: any, fileType: string) {
      const params = {
        id: id,
        fileType: fileType,
        callbackSuccess: () => {
          const toast = useToast();
          toast.success("Process completed successfully");
          getFileVersions();
        },
        callbackError: () => {
          const toast = useToast();
          toast.error("Error cleaning file");
        }
      };

      adminBackendStore.cleanSelectedFile(params);
    }

    function spendFilesVersionsGridOnActionClicked({
      action,
      dataItem
    }: {
      action: "recalculate";
      dataItem: any;
    }) {
      onRecalculateSpendFile([removeIRI(dataItem["@id"])]);
    }

    function onRecalculateSpendFile(fileVersions: any) {
      data.loadingData = true;
      const params = {
        filesIDs: fileVersions,
        callbackSuccess: () => {
          data.loadingData = false;
          const toast = useToast();
          toast.success("Process completed successfully");
          getFileVersions();
          getSpendFilesStatusCount();
        },
        callbackError: () => {
          data.loadingData = false;
        }
      };

      spendFilesStore.recalculateFileVersion(params);
    }

    function getFileVersions() {
      data.filesVersions = [];
      data.loadingData = true;
      const params = {
        status: data.selectStatus,
        callbackSuccess: (callbackSuccessData: any) => {
          data.filesVersions = callbackSuccessData;
          parseData();
          data.loadingData = false;
        },
        callbackError: () => {
          data.loadingData = false;
        }
      };

      spendFilesStore.getSpendFilesVersionsByStatus(params);
    }

    function parseData() {
      const parsedData: any[] = [];
      data.filesVersions.forEach(function(file: any) {
        const newFile = { ...file };
        newFile.created = formatData.getISODate(file.created);
        newFile.initialDate = file.initialDate
          ? formatData.getISODate(file.initialDate)
          : null;
        newFile.finalDate = file.finalDate
          ? formatData.getISODate(file.finalDate)
          : null;
        newFile.statusValue = file.status
          ? translate.t("spendFileStatus." + file.status)
          : null;
        newFile.mediaIdForClean =
          file.media !== null && file.media !== undefined
            ? file.media["@id"]
            : null;
        parsedData.push(newFile);
      });

      data.filesVersions = parsedData;
    }

    function viewDetails(status: string) {
      data.selectStatus = status;

      data.showModal = true;

      getFileVersions();
    }

    // *** Supply Chain Finance ***

    const supplyChainFinance: Ref<SCFFileRefAPIResponse[]> = ref([]);

    const supplyChainFinanceGridData = computed(() => {
      return supplyChainFinance.value.map((file: SCFFileRefAPIResponse) => {
        return {
          ...file,
          statusFormatted: translate.te("scfFileStatus." + file.status)
            ? translate.t("scfFileStatus." + file.status)
            : "-"
        };
      });
    });

    const supplyChainFinanceIsLoading = ref(false);

    /**
     * Handle the click on the refresh grid button.
     *
     * @return {void}
     */
    function supplyChainFinanceGridDataRefresh(): void {
      supplyChainFinanceAPIReadAll();
    }

    /**
     * Get all supply chain finance data from the API.
     * Route: GET - /api/scf_file_refs
     *
     * @return {void}
     */
    function supplyChainFinanceAPIReadAll(): void {
      // Enable loading
      supplyChainFinanceIsLoading.value = true;

      const params = {
        callbackSuccess: (callbackSuccessData: SCFFileRefAPIResponse[]) => {
          supplyChainFinance.value = callbackSuccessData;

          // Disable loading
          supplyChainFinanceIsLoading.value = false;
        },
              callbackError: (callbackErrorData: unknown) => {
          if (import.meta.env.DEV)
            console.error(
              "** (spendFilesVersionsAPIReadAll) callbackErrorData:",
              callbackErrorData
            );

        // Disable loading
        supplyChainFinanceIsLoading.value = false;
      }
      };

      adminBackendStore.supplyChainFinanceAPIReadAll(params);
    }

    /**
     * Request file recalculation to API.
     * Route: PATCH - /api/scf_file_refs/{iri}
     *
     * @return {void}
     */
    function supplyChainFinanceAPIRecalculate(iri: string): void {
      // Enable loading
      supplyChainFinanceIsLoading.value = true;

      const params = {
        iri,
        callbackSuccess: (callbackSuccessData: any) => {
          // Disable loading
          supplyChainFinanceIsLoading.value = false;
        },
        callbackError: (callbackErrorData: unknown) => {
          if (import.meta.env.DEV) console.error("** (supplyChainFinanceAPIRecalculate) callbackErrorData:", callbackErrorData);

          // Disable loading
          supplyChainFinanceIsLoading.value = false;
        }
      };

      adminBackendStore.supplyChainFinanceAPIRecalculate(params);
    }

    /**
     * Handle the click on the action button.
     *
     * @param {object} action
     * @param {object} dataItem
     * @return {void}
     */
    function actionButtonOnClicked({
      action,
      dataItem
    }: {
      action: "recalculate";
      dataItem: any;
    }): void {
      // Validate
      if (action !== "recalculate") {
        if (import.meta.env.DEV) console.log("** Action not valid:", action);
      }

      const iri = dataItem["@id"];

      supplyChainFinanceAPIRecalculate(iri);
    }

    supplyChainFinanceAPIReadAll();

    // *** END Supply Chain Finance ***

    return {
      ...toRefs(data),
      actionButtonOnClicked,
      addBrandScoreFiles,
      addDenominatorScoreFiles,
      capitalizeRegions,
      cleanFile,
      deleteSpendFile,
      fontIcons,
      hideDeleteModal,
      images,
      onDownloadFile,
      recalculateLeverages,
      showDeleteModal,
      spendFilesVersionsGridOnActionClicked,
      supplyChainFinanceGridColumns,
      supplyChainFinanceGridData,
      supplyChainFinanceGridDataRefresh,
      syncClientsDataIngestion,
      syncCompaniesDataIngestion,
      viewDetails,
      supplyChainFinanceIsLoading
    };
  }
};
</script>
