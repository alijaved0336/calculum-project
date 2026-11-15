<template>
<CalculumModal :size="'sm'" :showClose="true" :title="''" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row w-100">
      <div class="col-12"><img class="logo-login" :src="images.backgroundLoginFull"/></div>
      <div class="col-12 my-4">               <span class="text-lg">{{ $t('global.changeVPPassword') }}</span></div>
      <div class="col-11 end-justify-content mb-2">
        <div class="form-group">
          <label for="currentPassword">
            <input class="form-control required" id="currentPassword" :type="showcurrentPassword ? 'text' : 'password'" name="currentPassword" v-model="currentPassword" :placeholder="''" @keyup="validatePasswords"/><span>{{ 'Your current password' }}<sup></sup></span>
          </label>
        </div>
      </div>
      <div class="col-1 row-100 cursor-pointer"><i class="fa-solid fa-eye mt-4 cursor-pointer" v-if="!showcurrentPassword" @click="showcurrentPassword = !showcurrentPassword" aria-hidden="true"></i><i class="fa-solid fa-eye-slash text-sm mt-4 cursor-pointer" v-else @click="showcurrentPassword = !showcurrentPassword" aria-hidden="true"></i></div>
      <div class="col-11 end-justify-content mb-2">
        <div class="form-group">
          <label for="password">
            <input class="form-control required" id="password" :type="showPassword ? 'text' : 'password'" name="password" v-model="password" :placeholder="''" @keyup="validatePasswords"/><span>{{ 'Your new password' }}<sup></sup></span>
          </label>
        </div>
      </div>
      <div class="col-1 row-100 cursor-pointer"><i class="fa-solid fa-eye mt-4 cursor-pointer" v-if="!showPassword" @click="showPassword = !showPassword" aria-hidden="true"></i><i class="fa-solid fa-eye-slash text-sm mt-4 cursor-pointer" v-else @click="showPassword = !showPassword" aria-hidden="true"></i></div>
      <div class="col-11 end-justify-content mb-4">
        <div class="form-group">
          <label for="password_confirmation">
            <input class="form-control required" id="password_confirmation" :type="showPasswordConfirmation ? 'text' : 'password'" name="password_confirmation" v-model="password_confirmation" :placeholder="''" @keyup="validatePasswords"/><span>{{ 'Confirm Your new password' }}<sup></sup></span>
          </label>
        </div>
      </div>
      <div class="col-1 row-100 cursor-pointer"><i class="fa-solid fa-eye mt-4 cursor-pointer" v-if="!showPasswordConfirmation" @click="showPasswordConfirmation = !showPasswordConfirmation" aria-hidden="true"></i><i class="fa-solid fa-eye-slash text-sm mt-4 cursor-pointer" v-else @click="showPasswordConfirmation = !showPasswordConfirmation" aria-hidden="true"></i></div>
      <div class="col-12 d-flex flex-column mb-4 gap-2"><span class="text-xs font-semibold text-primary-500" v-if="errorSamePassword">{{ 'The current password and new password must be differents.' }}</span><span class="text-xs font-semibold text-primary-500" v-if="errorRegex">{{ 'Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, one number, and one special character.' }}</span><span class="text-xs font-semibold text-primary-500" v-if="errorPassword">{{ 'Passwords does not match.' }}</span></div>
      <div class="col-12 add-button-section d-flex end-justify-content gap-2 mb-4">
        <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" :disabled="!enabledButton" @click="validateVPPassword"><span class="spinner-border spinner-border-sm" v-if="loading" role="status" aria-hidden="true"></span><span id="add-button-for-value-proposition" v-else>{{ $t('global.send') }}</span></button>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive, computed } from "vue";
import CalculumModal from '@/modules/components/CalculumModal.vue'
import * as CompanyApi from '@/api/companyApi'
import { ApiResponse } from '@/services/api/response'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { StringUtils } from '@/utils'
import { images } from '@/resources/assets/assets'

export default defineComponent({
    name: 'SetNewPassword',
    components: { CalculumModal },    
    props: {
        valuePropositionId: { type: String, required: true },
        invitationId: { type: String, required: true, default: null },        
     },
    emits: ['close','set-token'],
  setup( props: any, { emit } ) {

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const toast = useToast()

    interface DataInterface {
        loading: boolean,
        password: string,
        password_confirmation: string,
        showPassword: boolean,
        showPasswordConfirmation: boolean,
        activateSaveButton: boolean,
        errorPassword: boolean,
        errorRegex: boolean,
        currentPassword: string,
        showcurrentPassword: boolean,
        errorSamePassword: boolean        
    }

    const data: DataInterface = reactive<DataInterface>({
        loading: false,
        password: '',
        password_confirmation: '',
        showPassword: false,
        showPasswordConfirmation: false,
        activateSaveButton: false,
        errorPassword: false,
        errorRegex: true,
        currentPassword: '',
        showcurrentPassword: false,
        errorSamePassword: false
    });

    function validatePasswords(): void {
        const pass = data.password
        const confirm = data.password_confirmation

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[^\s]{8,}$/

        if (pass !== confirm) {            
            data.errorPassword = true
        } else {
            data.errorPassword = false
        }

        if (!strongPasswordRegex.test(pass)) {            
            data.errorRegex = true
        } else {
            data.errorRegex = false
        }

        if (pass === data.currentPassword) {
            data.errorSamePassword = true
        } else {
            data.errorSamePassword = false
        }
        
    }

    const enabledButton = computed(() => {
        return data.errorPassword === false && data.errorRegex === false && data.errorSamePassword === false
    })

  

     function validateVPPassword() {
            data.loading = true

            CompanyApi.validateVPPassword(                
                props.invitationId,    
                props.valuePropositionId,                
                data.currentPassword,
                data.password                
            ).then(async (response: ApiResponse) => {               
                toast.success(translate.t('global.changeVPPasswordSuccess'))
                emit('set-token', response.data.token)

            }).catch((error) => {
                data.loading = false
                toast.error(error.response.data.errorMessage)
            })
        }
    

    return {
        ...toRefs(data),    
        StringUtils,
        validatePasswords,
        enabledButton,
        validateVPPassword,
        images
    };
  }
});
</script>
<style scoped>

.form-group input {
    height: 3rem !important;
    padding-top: 1.25rem;
}

.custom-heading {
    margin-block: 1rem;
    font-weight: 400;
    font-size: 2.5rem;
    letter-spacing: -0.02em;
    color: var(--color-gray-700);
}

</style>
