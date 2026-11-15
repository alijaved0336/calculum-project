<template>
<CalculumLoading v-if="loading" :modal="true">   </CalculumLoading>
<CalculumModal v-if="!loading" :size="'lg'" :showClose="true" :title="'Send your questions'" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row w-100">
      <div class="col-12 end-justify-content mb-4">
        <div class="form-group">
          <label for="subject">
            <input class="form-control required" id="subject" type="text" name="subject" v-model="subject" :placeholder="$t('home.homeHelpSupport.subjectPlaceholder')" @keyup="checkInputError"/><span>{{ $t('home.homeHelpSupport.subject') }}<sup>*</sup></span>
          </label>
        </div>
      </div>
      <div class="col-12 end-justify-content mb-4">
        <div class="form-group">
          <label for="message">
            <textarea class="form-control required" id="message" name="message" cols="30" rows="10" v-model="message" :placeholder="$t('home.homeHelpSupport.contentPlaceholder')" @keyup="checkInputError"></textarea><span>{{ $t('home.homeHelpSupport.content') }}<sup>*</sup></span>
          </label>
        </div>
      </div>
      <div class="col-12 add-button-section d-flex end-justify-content gap-2">
        <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="$emit('close')"> <span>{{ $t('button.cancel') }}</span></button>
        <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" :disabled="validationfields" @click="sendQuestionsForExternalUsers"><span id="add-button-for-value-proposition">{{ $t('global.send') }}</span></button>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive } from "vue";
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { CalculumLoading } from '@ada/design-system'
import { StringUtils, ObjectUtils } from '@/utils'
import * as Validator from "@/utils/validators";
import * as CompanyApi from '@/api/companyApi'
import { ApiResponse } from '@/services/api/response'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { useUserStore } from '@/stores/user';

export default defineComponent({
    name: 'AskQuestions',
    components: { CalculumModal, CalculumLoading },    
    props: {
        email: { type: String, required: true },
        valuePropositionId: { type: String, required: true, default: null },
        invitationId: { type: String, required: true, default: null },
     },
    emits: ['close'],
  setup( props: any, { emit } ) {

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const toast = useToast()
    const userStore = useUserStore();

    interface DataInterface {
        loading: boolean,
        emails: string,
        subject: string,
        message: string,
        validationfields: boolean,
        errorEmails: boolean
    }

    const data: DataInterface = reactive<DataInterface>({
        loading: false,
        emails: ObjectUtils.cloneDeep(props.email) || '',
        subject: '',
        message: '',
        validationfields: true,
        errorEmails: false
    });

    function checkInputError() {
      if (
        StringUtils.isNullUndefinedOrEmpty(data.emails) || !Validator.isValidEmail(data.emails) ||  
        StringUtils.isNullUndefinedOrEmpty(data.subject) ||
        StringUtils.isNullUndefinedOrEmpty(data.message)
      ) {
        data.validationfields = true
        data.errorEmails = !Validator.isValidEmail(data.emails)
      } else {
        data.validationfields = false
        data.errorEmails = false
      }
    }


      function sendQuestionsForExternalUsers() {
            data.loading = true

            CompanyApi.sendQuestionsForExternalUsers(
                data.emails,
                data.subject,
                data.message,                
                props.invitationId,
                props.valuePropositionId,
                userStore.getTokenForExternalVPUser
            ).then(async (response: ApiResponse) => {               
                data.loading = false
                toast.success(translate.t('global.sendQuestionsForExternalUsersSucess'))
                emit('close')


            }).catch((error) => {
                data.loading = false
                toast.error(translate.t('global.sendQuestionsForExternalUsersError'))
        })
    }
    

    return {
        ...toRefs(data),
        checkInputError,
        sendQuestionsForExternalUsers
    
    };
  }
});
</script>
