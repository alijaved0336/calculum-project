<template>
<CalculumLoading v-if="loadingSomeData" :modal="true">   </CalculumLoading>
<CalculumModal :size="'xl'" :showClose="true" :title="'Invitations'" @close="cancelShareModal" v-if="showModal">
  <template v-slot:modalContent>
    <div class="row w-100">
      <div class="col-12 add-button-section d-flex end-justify-content mb-4" v-if="!showFormInvitation">
        <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="showFormInvitation = true"><span id="add-button-share-email">{{ $t('global.add') }}</span></button>
      </div>
      <div class="col-12 end-justify-content mb-4" v-if="showFormInvitation">
        <div class="form-group">
          <label for="email">
            <input class="form-control required" id="email" type="email" name="email" v-model="emails" :placeholder="$t('placeholder.email')" @keyup="checkFields"/><span>{{ $t('valueProposition.form.emailForinvitation') }}</span>
          </label><span class="error text-left errors-days" v-if="errorEmails">{{ $t("global.errorEmails") }}</span>
        </div>
      </div>
      <div class="col-12 add-button-section d-flex end-justify-content gap-2 mb-4" v-if="showFormInvitation">
        <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancelSendInvitation"> <span>{{ $t('button.cancel') }}</span></button>
        <button class="btn btn-primary font-md" id="send-button-share-email-btn" style="z-index: 1; width: fit-content" :disabled="validationfields" @click="sendInvitation"><span id="send-button-share-email">{{ $t('global.send') }}</span></button>
      </div>
      <div class="col-12">
        <CalculumGrid :gridData="dataGridForInvitations" :gridColumns="invitationColumns" :allowExportExcel="false" :hideColumnSelector="true" :childrenColumns="false" :showToolbar="false" :selectable="false" :forAdminDataChange="true" :key="'invitations' + key" :gridHeight="gridHeight + 'px'">  </CalculumGrid>
      </div>
    </div>
  </template>
</CalculumModal>
<div class="row w-100">
  <div class="col-12">
    <CalculumGrid :gridData="dataGrid" :gridColumns="defaultColumns" :allowExportExcel="false" :hideColumnSelector="true" :childrenColumns="false" :showToolbar="false" :selectable="false" :forAdminDataChange="true" :key="'valuePropositions' + key" :gridHeight="gridHeight + 'px'" @launch-share-modal="launchShareModal" @refresh-invitations="getAllValuePropositions">                              </CalculumGrid>
  </div>
</div>
</template>

<script lang="ts">

import { reactive, toRefs, defineComponent, computed, onMounted,ref } from "vue";
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { useSpendFilesStore } from '@/stores/spendFiles'
import { useValuePropositionStore } from '@/stores/valueProposition'
import { StringUtils } from "@/utils";
import * as Validator from "@/utils/validators";
import CalculumGrid from "@/modules/components/grid/CalculumGrid.vue";
import { defaultColumns, invitationColumns } from './columns'
import { useI18n } from 'vue-i18n'
import { CalculumLoading } from '@ada/design-system'
import { useSpendFile } from '@/composables'
import * as formatData from "@/utils/FormatData";
import { useToast } from "vue-toastification";

export default defineComponent({
    name: "ListValuePropositions",
    components: { CalculumModal, CalculumGrid, CalculumLoading },
    setup() {
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
        const spendFilesStore = useSpendFilesStore();
        const valuePropositionStore = useValuePropositionStore();
        const toast = useToast();

        const createposthogToDashboardsVP = ref<string[]>([])

        const { spendFileVersionActiveId } = useSpendFile()

        interface DataInterface {
            showModal: boolean,
            companyName: string | null,
            emails: string | null,
            validationfields: boolean,
            errorEmails: boolean,
            errorDaysInvitation: boolean,
            key: number,
            dataGrid: Array<any>,
            expirationDays: number | null,
            loadingSomeData: boolean,
            gridHeight: number,
            dataGridForInvitations: Array<any>,
            showFormInvitation: boolean,
            valuePropositionIdForInvitations: string | null
        }

        const data = reactive<DataInterface>({
            showModal: false,
            companyName: null,
            emails: null,
            validationfields: true,
            errorEmails: false,
            errorDaysInvitation: false,
            key: new Date().getUTCMilliseconds(),
            dataGrid: [],
            expirationDays: null,
            loadingSomeData: false,
            gridHeight: 500,
            dataGridForInvitations: [],
            showFormInvitation: false,
            valuePropositionIdForInvitations: null

        })


        onMounted(() => {
            getAllValuePropositions()
        })


        function closeModalNReset() {
            data.showModal = false
            data.companyName = null
            data.emails = null
        }


        function checkFields() {
            if (
                (data.emails === null || StringUtils.isNullUndefinedOrEmpty(data.emails))
            ) {
                data.validationfields = true
            } else {
                const emailList = StringUtils.getEmails(data.emails)
                data.errorEmails = emailList.some((email: any) => !Validator.isValidEmail(email));
                data.validationfields = data.errorEmails
            }
        }

        const disabledSendbutton = computed(() => {
            return !data.errorDaysInvitation && data.validationfields
        })


        /** Api calls */

        
        function posthogToDashboardsVP(vpId: string, type: 'create' | 'delete') {
            const params = {
                value_proposition_id: vpId,
                type: type,
                callbackSuccess: (callBackSucess: any) => {
                    if(import.meta.env.DEV) console.log('posthogToDashboardsVP', callBackSucess.dashboard_id)       
                    if(type === 'create') {
                        const vp = data.dataGrid.find((vp: any) => vp['@id'] === vpId)
                        if(vp) {
                            vp.analyticPostHogDashBoardId = callBackSucess.dashboard_id
                            vp.analyticPostHogDashBoardUrl = callBackSucess.dashboard_url
                        }
                    }

                }, callbackError: () => {
                    data.loadingSomeData = false
                    toast.error(translate.t('global.errorUpdatingValueProposition'));
                }
            }
            valuePropositionStore.trackingActivityDashboard(params)
        }

        function getAllValuePropositions() {
            data.loadingSomeData = true
            const params = {
                spendFileVersion: spendFileVersionActiveId.value,
                callbackSuccess: (callBackSucess: any) => {
                    data.loadingSomeData = false
                    const parsedData: Array<any> = [];
                    callBackSucess.forEach(function (dataElement: any) {
                        const datas = { ...dataElement };   
                        datas.isPublicText = translate.t(
                            formatData.getYesOrNo(dataElement.isPublic)
                        );
                        //-This is for old VP before the posthog implementation    
                        if (StringUtils.isNullUndefinedOrEmpty(datas.analyticPostHogDashBoardId) || StringUtils.isNullUndefinedOrEmpty(datas.analyticPostHogDashBoardUrl) && datas.status !== 'canceled') {
                            createposthogToDashboardsVP.value.push(datas['@id'])
                        }
                        
                        parsedData.push(datas);
                    })
                    data.dataGrid = parsedData
                    createPosthogToDashboardsVPForNewVP()
                },
                callbackError: () => {
                    data.loadingSomeData = false
                    toast.error(translate.t('global.errorUpdatingValueProposition'));
                }
            }
            valuePropositionStore.getAllValuePropositions(params)
        }


        function createPosthogToDashboardsVPForNewVP() {
            if(createposthogToDashboardsVP.value.length > 0) {
                createposthogToDashboardsVP.value.forEach(function (vpId: string) {
                    posthogToDashboardsVP(vpId, 'create')
                })
            }
        }


        function getInvitationsByValueProposition() {
            data.loadingSomeData = true
            const params = {
                valuePropositionId: data.valuePropositionIdForInvitations || '',
                callbackSuccess: (callBackSucess: any) => {
                    data.loadingSomeData = false                    
                    data.dataGridForInvitations = callBackSucess
                    data.showModal = true
                },
                callbackError: () => {
                    data.loadingSomeData = false                    
                    data.showModal = true
                    toast.error(translate.t('global.errorUpdatingValueProposition'));
                }
            }
            spendFilesStore.getInvitationsByValueProposition(params)
        }



        function sendInvitation() {
            data.loadingSomeData = true
            const params = {
                valuePropositionId: data.valuePropositionIdForInvitations || '',
                emails: data.emails ? StringUtils.getEmails(data.emails) : [],
                callbackSuccess: () => {
                    data.loadingSomeData = false
                    toast.success(translate.t('global.invitationSuccess'));
                    data.emails = null
                    getInvitationsByValueProposition()
                    getAllValuePropositions()
                },
                callbackError: () => {
                    data.loadingSomeData = false
                    toast.error(translate.t('global.invitationError'));
                    getInvitationsByValueProposition()
                    if (import.meta.env.DEV) console.error('** Error, cannot set invitation')
                }
            }

            spendFilesStore.postValuePropositionInvitation(params)
        }

        function resetData() {
            data.companyName = null
            data.emails = null
            data.expirationDays = null
            // data.showModal = false
            data.companyName = null
            data.emails = null
            getAllValuePropositions()
        }

        function cancelSendInvitation() {
            data.showFormInvitation = false
            data.emails = null
            data.errorEmails = false
            data.validationfields = false

        }

        function launchShareModal(id: string) {
            data.valuePropositionIdForInvitations = id
            getInvitationsByValueProposition()

        }

        function cancelShareModal() {
            data.showModal = false
            data.valuePropositionIdForInvitations = null
        }

        return {
            ...toRefs(data),
            closeModalNReset,
            checkFields,
            sendInvitation,
            defaultColumns,
            invitationColumns,
            disabledSendbutton,
            getAllValuePropositions,
            resetData,
            cancelSendInvitation,
            launchShareModal,
            cancelShareModal,
            getInvitationsByValueProposition
        };

    },
})  
</script>