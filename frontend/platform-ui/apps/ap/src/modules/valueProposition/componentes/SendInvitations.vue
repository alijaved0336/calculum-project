<template>
<CalculumLoading v-if="loading" :modal="true">   </CalculumLoading>
<CalculumModal v-if="!loading" :size="'lg'" :showClose="true" :title="'Share'" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row w-100">
      <div class="col-12 end-justify-content mb-4">
        <div class="form-group">
          <label for="email">
            <input class="form-control required" id="email" type="email" name="email" v-model="emails" :placeholder="$t('placeholder.email')" @keyup="checkFields"/><span>{{ $t('valueProposition.form.emailForinvitation') }}</span>
          </label><span class="error text-left errors-days" v-if="errorEmails">{{ $t("global.errorEmails") }}</span>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="$emit('close')"><span>{{ $t('button.cancel') }}</span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" :disabled="validationfields" @click="sendMails"><span id="add-button-for-value-proposition">{{ $t('global.send') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive } from "vue";
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { CalculumLoading } from '@ada/design-system'
import { StringUtils, isNullOrUndefined } from '@/utils'
import * as Validator from "@/utils/validators";
import * as CompanyApi from '@/api/companyApi'
import { ApiResponse } from '@/services/api/response'
import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n'
import { useSpendFilesStore } from '@/stores/spendFiles'

export default defineComponent({
    name: 'SendInvitations',
    components: { CalculumModal, CalculumLoading },    
    props: {
        valuePropositionId: { type: String, required: true, default: null },
        invitationId: { type: String, required: true, default: null },
     },
    emits: ['close'],
  setup( props: any, { emit } ) {

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const spendFilesStore = useSpendFilesStore()
    const toast = useToast()
    interface DataInterface {
        loading: boolean,
        emails: string | null,        
        validationfields: boolean,
        errorEmails: boolean,
        
    }

    const data: DataInterface = reactive<DataInterface>({
        loading: false,
        emails: props.email,        
        validationfields: true,
        errorEmails: false,
    });


     function checkFields() {
            if (
                (data.emails === null || StringUtils.isNullUndefinedOrEmpty(data.emails))
            ) {
                data.validationfields = false
            } else {
                const emailList = StringUtils.getEmails(data.emails)
                data.errorEmails = emailList.some((email: any) => !Validator.isValidEmail(email));
                data.validationfields = data.errorEmails
            }
        }


         function sendMails() {
            if (!isNullOrUndefined(props.invitationId)) {
                sendInvitation()
            } else {
                sendInvitationInternal()
            }
        }


         function sendInvitationInternal() {
            // Validate emails before sending
            if (!data.emails || StringUtils.isNullUndefinedOrEmpty(data.emails)) {
                toast.error(translate.t('global.errorEmails'))
                return
            }
            
            const emailList = StringUtils.getEmails(data.emails)
            
            // Validate email list is not empty
            if (!emailList || emailList.length === 0) {
                toast.error(translate.t('global.errorEmails'))
                return
            }
            
            // Filter out any invalid emails
            const validEmails = emailList.filter((email: string) => {
                return email && email.trim() !== '' && Validator.isValidEmail(email)
            })
            
            if (validEmails.length === 0) {
                toast.error(translate.t('global.errorEmails'))
                return
            }
            
            data.loading = true
            const params = {
                valuePropositionId: props.valuePropositionId,
                emails: validEmails,
                callbackSuccess: () => {
                    data.loading = false
                    toast.success(translate.t('global.successSendingInvitations'))
                    data.emails = null
                    emit('close')
                },
                callbackError: () => {
                    data.loading = false
                    toast.error(translate.t('global.errorSendingInvitations'))
                    if (import.meta.env.DEV) console.error('** Error, cannot set invitation')
                }
            }

            spendFilesStore.postValuePropositionInvitation(params)
        }

        function sendInvitation() {
            // Validate emails before sending
            if (!data.emails || StringUtils.isNullUndefinedOrEmpty(data.emails)) {
                toast.error(translate.t('global.errorEmails'))
                return
            }
            
            let emailsArray = StringUtils.getEmails(data.emails)
            
            // Validate email list is not empty
            if (!emailsArray || emailsArray.length === 0) {
                toast.error(translate.t('global.errorEmails'))
                return
            }
            
            // Filter out any invalid emails
            const validEmails = emailsArray.filter((email: string) => {
                return email && email.trim() !== '' && Validator.isValidEmail(email)
            })
            
            if (validEmails.length === 0) {
                toast.error(translate.t('global.errorEmails'))
                return
            }
            
            data.loading = true

            CompanyApi.sendExternalInvitations(
                props.valuePropositionId,
                validEmails

            ).then(async (response: ApiResponse) => {
                
                data.loading = false
                toast.success(translate.t('global.successSendingInvitations'))
                data.emails = null
                emit('close')

            }).catch(() => {
                
                data.loading = false
                toast.error(translate.t('global.errorSendingInvitations'))
            })
        }
    




    
    return {
        ...toRefs(data),
        checkFields,
        sendMails
    
    };
  }
});
</script>
