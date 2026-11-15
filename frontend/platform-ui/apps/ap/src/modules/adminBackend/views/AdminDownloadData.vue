<template>
<div class="page-content-overflow2">
  <CalculumDeleteModal v-if="showConfirmDeleteModal" @hide="hideDeleteModal" :forDeleteEMISFile="deleteEMISFileValue" :forDeleteCompanyFile="deleteCompanyFileValue" @deleteEMISFile="deleteEMISFile" @deleteCompanyFile="deleteCompanyFile"></CalculumDeleteModal>
  <section class="page-content-top"></section>
  <section class="page-content">
    <div class="col-12">
      <CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
      <div class="row mb-4">
        <div class="col-4">
          <SearchableDropdown v-model="company" :items="companiesDropdownItems" :placeholder="$t('company.selectCompany')" @update:model-value="changeSelectedCompany"></SearchableDropdown>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <div class="card" style="min-height: auto; height: auto">
            <div class="card-body">
              <div class="row mb-4">
                <div class="col-8 d-flex justify-content-between align-items-center">
                  <h5 class="m-0">{{ $t('adminBackend.adminDownloadData.companyFile') }}</h5>
                </div>
                <div class="col-12 mt-2">
                  <CalculumGrid :gridData="files" :gridColumns="gridColumns" :selectable="false" :allowExportExcel="false" :hideColumnSelector="true" :columnsLocalName="'AdminDownloadCompanyFiles'" :childrenColumns="false" :showToolbar="false" :key="keyGrid" @downloadFile="onDownloadFile" @deleteFile="showDeleteModal"></CalculumGrid>
                </div>
              </div>
            </div>
          </div>
          <div class="card" style="min-height: auto; height: auto">
            <div class="card-body">
              <div class="row mb-4">
                <div class="col-8 d-flex justify-content-between align-items-center">
                  <h5 class="m-0">{{ $t('adminBackend.adminUploadData.emisFile') }}</h5>
                </div>
                <div class="col-12 mt-2">
                  <CalculumGrid :gridData="filesEMIS" :gridColumns="gridEMISColumns" :selectable="false" :allowExportExcel="false" :hideColumnSelector="true" :columnsLocalName="'AdminUploadEMISFiles'" :childrenColumns="false" :showToolbar="false" :buttonText="$t('button.recalculate')" :key="keyGrid" @downloadFile="onDownloadEMISFile" @deleteFile="showDeleteModal" @clean-file="cleanFile"></CalculumGrid>
                </div>
              </div>
            </div>
          </div>
          <div class="card" style="min-height: auto; height: auto;">
            <div class="card-body">
              <div class="row">
                <div class="col-12 d-flex justify-content-between align-items-center" style="height: 48px">
                  <h5 class="m-0">{{ $t('adminBackend.adminDownloadData.loginData') }}</h5><a class="btn btn-primary" @click="generatePDF" style="width: fit-content;"><span>{{ $t('global.download') }}</span></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { useToast } from "vue-toastification";
import { reactive, toRefs, onMounted, computed } from 'vue'
import { useAdminBackendStore } from '@/stores/adminBackend'
import { useSpendFilesStore } from '@/stores/spendFiles'
import * as cacheGrid from '@/utils/dataGridClear'
import { CalculumLoading, SearchableDropdown } from '@ada/design-system'
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue'
import { defaultCompanyFilesGridColumns, defaultEMISFilesGridColumns } from '../data/columns'
import { removeIRI, NumberUtils } from '@/utils'
import * as formatData from '@/utils/FormatData'
import { useI18n } from 'vue-i18n'
import CalculumDeleteModal from '@/modules/components/CalculumDeleteModal.vue'

export default {
  name: 'AdminDownloadData',
  components: {
    CalculumLoading,
    CalculumGrid,
    CalculumDeleteModal,
    SearchableDropdown,
  },
  setup() {
    const adminBackendStore = useAdminBackendStore()
    const spendFilesStore = useSpendFilesStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    document.title = translate.t('adminBackend.adminDownloadData.title')
    const toast = useToast();

    interface AdminUploadData {
      loading: boolean,
      companies: Array<any>,
      company: string,
      files: Array<any>,
      filesEMIS: Array<any>,
      gridColumns: Array<any>,
      gridEMISColumns: Array<any>,
      fileToDelete: string,
      selectedFileIdForDelete: string,
      showConfirmDeleteModal: boolean,
      deleteEMISFileValue: boolean,
      deleteCompanyFileValue: boolean,
      keyGrid: number
    }

    const data = reactive<AdminUploadData>({
      loading: false,
      companies: [],
      company: 'all',
      files: [],
      filesEMIS: [],
      gridColumns: getGridColumns(),
      gridEMISColumns: getGridEMISColumns(),
      fileToDelete: '',
      selectedFileIdForDelete: '',
      showConfirmDeleteModal: false,
      deleteEMISFileValue: false,
      deleteCompanyFileValue: false,
      keyGrid: NumberUtils.getRandomInt()
    })

    onMounted(() => {
      getCompanies()
    })

    function getGridEMISColumns() {
      let resetcolumns = []
      const gridCache = JSON.parse(localStorage.getItem('AdminUploadEMISFiles') ?? '[]')

      if (gridCache.length && (JSON.stringify(defaultEMISFilesGridColumns) !== JSON.stringify(gridCache))) {
        resetcolumns = cacheGrid.clearCache(defaultEMISFilesGridColumns, gridCache)
        localStorage.setItem('AdminUploadEMISFiles', JSON.stringify(resetcolumns))
      } else {
        resetcolumns = defaultEMISFilesGridColumns
      }
      return resetcolumns
    }

    /**
     *
     */
    function getGridColumns() {
      return defaultCompanyFilesGridColumns
    }

    function showDeleteModal(event: any, selectedFileType: string) {
      data.selectedFileIdForDelete = event['@id']

      data.deleteEMISFileValue = selectedFileType === 'emis'
      data.deleteCompanyFileValue = selectedFileType === 'company'
      data.showConfirmDeleteModal = true
    }

    function hideDeleteModal() {
      data.showConfirmDeleteModal = false
      data.deleteEMISFileValue = false
      data.deleteCompanyFileValue = false
    }

    function cleanFile(id: any, fileType: string) {

      const params = {
        id: id,
        fileType: fileType,
        callbackSuccess: () => {          
          toast.success(translate.t('global.noty.success.clean.file'));
          if (fileType === 'emis') {
            getEMISFiles()
          } else {
            getCompanyFiles()
          }

        },
        callbackError: () => {
          toast.error(translate.t('global.noty.error.clean.file'));

        }
      }
      adminBackendStore.cleanSelectedFile(params)
    }

    function generatePDF() {
      data.loading = true
      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          const file = new Blob([callbackSuccessData.data], { type: 'application/pdf' })
          const fileURL = URL.createObjectURL(file)
          const fileLink = document.createElement('a')
          fileLink.href = fileURL
          fileLink.download = 'loginLog'
          fileLink.click()
          data.loading = false
        },
        callbackError: () => {

          data.loading = false
        }
      }
      adminBackendStore.getLoginLogPdf(params)
    }

    const companiesDropdownItems = computed(() => {
      const allOption = { value: 'all', label: translate.t('company.allCompanies') }
      const companyOptions = (data.companies || []).map((company: any) => ({
        value: company['@id'],
        label: company.name,
      }))
      return [allOption, ...companyOptions]
    })

    function changeSelectedCompany() {
      getCompanyFiles()
      getEMISFiles()
    }

    function getCompanies() {
      // Check if companies already exist in the store
      const existingCompanies = adminBackendStore.getCompanies
      if (Array.isArray(existingCompanies) && existingCompanies.length > 0) {
        data.companies = existingCompanies
        //Sort the list by name 
        data.companies.sort((a, b) => a.name.localeCompare(b.name));

        if (data.company !== null) {
          getCompanyFiles()
          getEMISFiles()
        }
        return
      }

      data.loading = true
      data.companies = []
      const params = {
        callbackSuccess: () => {
          data.companies = adminBackendStore.getCompanies
          if (data.companies && data.companies.length > 0) {

            //Sort the list by name 
            data.companies.sort((a, b) => a.name.localeCompare(b.name));

            // data.company = data.companies[0]['@id']
            if (data.company !== null) {
              getCompanyFiles()
              getEMISFiles()
            }
          }
          data.loading = false
        },
        callbackError: () => {

          data.loading = false
        }
      }
      adminBackendStore.fetchCompanies(params)
    }

    function getEMISFiles() {

      data.filesEMIS = []
      data.loading = true
      const params = {
        companyId: removeIRI(data.company),
        callbackSuccess: (callbackSuccessData: any) => {

          data.filesEMIS = callbackSuccessData['hydra:member']

          data.filesEMIS.sort((a, b) => {
            return new Date(b.created).getTime() - new Date(a.created).getTime();
          });
          parseEMISData()
          data.loading = false
          data.keyGrid++;
        },
        callbackError: () => {
          data.loading = false
        }
      }
      adminBackendStore.getCompanyEMISFiles(params)
    }

    function getCompanyFiles() {
      data.files = []
      data.loading = true
      const params = {
        companyId: removeIRI(data.company),
        callbackSuccess: (callbackSuccessData: any) => {
          data.files = callbackSuccessData['hydra:member']

          data.files.sort((a, b) => {
            return new Date(b.created).getTime() - new Date(a.created).getTime();
          });

          parseData()
          data.loading = false
          data.keyGrid++;
        },
        callbackError: () => {
          data.loading = false
        }
      }
      adminBackendStore.getCompanyFiles(params)
    }

    function parseEMISData() {
      const parsedData: Array<any> = []
      data.filesEMIS.forEach(function (file: any) {
        const newFile = { ...file }
        newFile.created = formatData.getISODate(file.created)
        newFile.mediaIdForClean = (file.media !== null && file.media !== undefined) ? file.media['@id'] : null
        newFile.mediaIdForCleanMediaResult = (file.mediaResult !== null && file.mediaResult !== undefined) ? file.mediaResult['@id'] : null
        parsedData.push(newFile)

      })
      data.filesEMIS = parsedData
    }

    function parseData() {
      const parsedData: Array<any> = []
      data.files.forEach(function (file: any) {
        const newFile = { ...file }
        newFile.created = formatData.getISODate(file.created)
        parsedData.push(newFile)
      })
      data.files = parsedData
    }

    function onDownloadEMISFile(file: any) {

      data.loading = true
      const params = {
        mediaID: file.mediaResult['@id'],
        callbackSuccess: (response: any) => {
          window.open(response.download_url, '_blank')
          data.loading = false
        },
        callbackError: () => {
          toast.error(translate.t('global.noty.error.noFiles'));
          data.loading = false
        }
      }
      spendFilesStore.getMediaFileVersion(params)
    }

    function onDownloadFile(file: any) {
      data.loading = true
      const params = {
        mediaID: file.media['@id'],
        callbackSuccess: (response: any) => {
          window.open(response.download_url, '_blank')
          data.loading = false
        },
        callbackError: () => {
          toast.error(translate.t('global.noty.error.noFiles'));
          data.loading = false
        }
      }
      spendFilesStore.getMediaFileVersion(params)
    }

    function onDeleteFile(event: any) {
      const fileDOM = document.getElementById('deleteFileResponseButton')
      if (fileDOM !== null) {
        data.fileToDelete = event['@id']
        fileDOM.click()
      }
    }

    function deleteEMISFile() {

      data.showConfirmDeleteModal = false
      if (data.fileToDelete !== null) {
        data.loading = true
        const params = {
          EMISFileId: data.selectedFileIdForDelete,
          callbackSuccess: (callbackSuccessData: any) => {

            data.loading = false
            toast.success(translate.t('global.noty.success.delete.file'));
            // Reload select if there aren't versions to show
            if (data.company) {
              getEMISFiles()
            }
          },
          callbackError: () => {
            toast.error(translate.t('global.noty.error.delete.file'));

            data.loading = false
          }
        }
        spendFilesStore.deleteEMISFile(params)
      }

    }

    function deleteCompanyFile() {
      if (data.fileToDelete !== null) {
        data.loading = true
        const params = {
          fileID: data.fileToDelete,
          callbackSuccess: (callbackSuccessData: any) => {

            data.loading = false
            toast.success(translate.t('global.noty.success.delete.file'));
            // Reload select if there aren't versions to show
            if (data.company) {
              getCompanyFiles()
            }
          },
          callbackError: () => {
            toast.error(translate.t('global.noty.error.delete.file'));

            data.loading = false
          }
        }
        spendFilesStore.deleteCompanyFile(params)
      }
    }

    return {
      ...toRefs(data),
      changeSelectedCompany,
      companiesDropdownItems,
      cleanFile,
      deleteCompanyFile,
      deleteEMISFile,
      generatePDF,
      getGridColumns,
      hideDeleteModal,
      onDeleteFile,
      onDownloadEMISFile,
      onDownloadFile,
      showDeleteModal,
    }
  }
}
</script>
