<template>
<div class="page-content-overflow2">
  <section class="page-content-top">
    <section class="page-content">
      <CalculumLoading v-if="loadingSomeData" :modal="true"></CalculumLoading>
      <CalculumModal v-if="showModal" :size="'lg'" :showClose="true" :title="'Add invitation'" @close="showModal = false">
        <template v-slot:modalContent>
          <p>{{  $t('global.selectAndUploadFileDate') }}</p>
          <div class="row container-form">
            <div class="col-6">
              <div class="form-group">
                <label for="companyName">
                  <input class="form-control" id="companyName" type="text" name="companyName" v-model="companyName" placeholder="Enter the Company Name" @keyup="checkFields"/><span>* {{'Company Name' }}</span>
                </label>
              </div>
            </div>
            <div class="col-6">
              <div class="form-group">
                <label for="expirationDays">
                  <input class="form-control" id="expirationDays" type="number" name="expirationDays" v-model="expirationDays" min="1" max="30" placeholder="Enter a number between 1 - 30" @keyup="checkFields"/><span>* {{'Expiration Days' }}                                        </span>
                </label><span class="error text-left errors-days" v-if="errorDaysInvitation">{{ $t("global.invitationExpiration") }}</span>
              </div>
            </div>
            <div class="col-12"><span>* {{ 'Write the emails separated by commas' }}</span>
              <textarea class="w-100 border border-gray-300" v-model="emails" name="emails" placeholder="example1@email.com,example2@email.com" aria-label="Message" @keyup="checkFields"></textarea>
              <div class="span"><span class="error text-left errors-days" v-if="errorEmails">{{ $t("global.errorEmails") }}</span></div>
            </div>
          </div>
        </template>
        <template v-slot:modalButtons>
          <button class="btn outline-secondary-btn font-md" @click="closeModalNReset" style="z-index: 1; width: fit-content"> <span>{{$t('button.cancel')}} </span></button>
          <button class="btn btn-primary font-md" @click="sendInvitation" :disabled="!disabledSendbutton" style="z-index: 1; width: fit-content"> <span>{{ $t('button.send') }}</span></button>
        </template>
      </CalculumModal>
      <div class="row">
        <div class="col-12">
          <div class="card ml-4" style="min-height: auto; height: auto">
            <div class="card-body">
              <div class="row w-100">
                <div class="col-12 d-flex end-justify-content"><a class="menu__link link link--icon link--special"><span @click="showModal = true">+ {{ $t('adminBackend.button.createInvitation') }}</span></a></div>
              </div>
              <div class="row w-100">
                <div class="col-12">
                  <CalculumGrid :gridData="dataGrid" :gridColumns="defaultColumns" :allowExportExcel="false" :hideColumnSelector="true" :childrenColumns="false" :showToolbar="false" :selectable="false" :forAdminDataChange="true" :key="key" :gridHeight="gridHeight+'px'" @refreshInvitations="resetData"> </CalculumGrid>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</div>
</template>

<script lang="ts">

import { reactive, toRefs, defineComponent, computed, onMounted } from "vue";
import { useAdminBackendStore } from '@/stores/adminBackend';
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { StringUtils } from "@/utils";
import { MAX_EMAILS_PER_BATCH } from '@/modules/adminBackend/views/composables/constants'
import * as Validator from "@/utils/validators";
import CalculumGrid from "@/modules/components/grid/CalculumGrid.vue";
import { defaultColumns  } from '../data/columnsListInvitations'
import { useToast } from "vue-toastification";
import { useI18n } from 'vue-i18n'
import { CalculumLoading } from '@ada/design-system'
import { useUser } from '@/composables'



export default defineComponent({
  name: "ListInvitations",
  components: { CalculumModal, CalculumGrid, CalculumLoading },  
  setup() {
        const adminBackendStore = useAdminBackendStore();
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

        const { userSalesRoleEnabled, userId: currentUserId } = useUser()


        interface DataInterface {
            showModal: boolean,
            companyName: string | null,
            emails: string  | null,
            validationfields: boolean,
            errorEmails: boolean,
            errorDaysInvitation: boolean,
            key: number,
            dataGrid: Array<any>,
            expirationDays: number | null,
            loadingSomeData: boolean,
            gridHeight: number
        }

        const data = reactive<DataInterface>({
            showModal: false,
            companyName: null,
            emails: null,
            validationfields: false,
            errorEmails: false,
            errorDaysInvitation: false,
            key: new Date().getUTCMilliseconds(),
            dataGrid: [],
            expirationDays: null,
            loadingSomeData: false,
            gridHeight: 500
            
        })


        onMounted(() => {
            getAllInvitations()
        })


        function closeModalNReset() {
            data.showModal = false
            data.companyName = null
            data.emails = null            
        }


        function checkFields() {
            if  (                 
                (data.companyName === null || StringUtils.isNullUndefinedOrEmpty(data.companyName)) ||
                (data.emails === null || StringUtils.isNullUndefinedOrEmpty(data.emails)) ||
                (data.expirationDays === null || isNaN(data.expirationDays))
            ) 
            {
                data.validationfields = false
            } else {

                const emailList = StringUtils.getEmails(data.emails)
                data.errorEmails = emailList.some((email: any) => !Validator.isValidEmail(email));
                data.validationfields = !data.errorEmails

                if (!isNaN(data.expirationDays) && ( data.expirationDays < 1 || data.expirationDays > 30 )   ) {                    
                    data.errorDaysInvitation = true                    
                } else {
                    data.errorDaysInvitation = false
                }

            }
        }

        const disabledSendbutton = computed (() => {
            return !data.errorDaysInvitation && data.validationfields
        })

    
        /** Api calls */


        function getAllInvitations() {
            data.loadingSomeData = true
            
            const params ={            
                byUser: userSalesRoleEnabled.value ? currentUserId.value : null,
                callbackSuccess: (callBackSucess: any) => {
                    data.loadingSomeData = false                    
                    data.dataGrid = callBackSucess
                },
                callbackError: () => {
                    data.loadingSomeData = false
                    const toast = useToast();
                    toast.error(translate.t('error.server500'));
                }
            }

            adminBackendStore.getAllInvitations(params)
        }


        function getExpirationDate(expirationDays: number): string {
        const today = new Date(); 
        today.setDate(today.getDate() + expirationDays); 

        return today.toISOString().split("T")[0];
        }

        function sendInvitation() {
            data.loadingSomeData = true
            data.showModal = false
            const emailList = data.emails ? StringUtils.getEmails(data.emails) : []
            const isLargeBatch = emailList.length > MAX_EMAILS_PER_BATCH
            const params ={
                companyName: data.companyName,
                emails: emailList,
                invitationExpireDate: getExpirationDate(data.expirationDays ?? 0),
                callbackSuccess: () => {
                    data.loadingSomeData = false
                    const toast = useToast();
                    toast.success(translate.t(isLargeBatch ? 'global.invitationAsyncSuccess' : 'global.invitationSuccess'));
                    resetData()

                },
                callbackError: () => {
                    data.loadingSomeData = false
                    const toast = useToast();
                    toast.error(translate.t('global.invitationError'));
                    resetData()
                    if (import.meta.env.DEV) console.error('** Error, cannot set invitation')
                }
            }

            adminBackendStore.postNewInvitation(params)
        }

        function resetData() {
            data.companyName = null
            data.emails = null
            data.expirationDays = null
            getAllInvitations()
        }


    return {
        ...toRefs(data),
        closeModalNReset,
        checkFields,
        sendInvitation,
        defaultColumns,
        disabledSendbutton,
        getAllInvitations,
        resetData
    };

},    
})  
</script>
<style scoped>


textarea {
    height: 100px;
}

</style>        
