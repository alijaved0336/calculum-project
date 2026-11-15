<template>
<CalculumModal :size="'sm'" :showClose="true" :title="''" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row w-100">
      <div class="col-12"><img class="logo-login" :src="images.backgroundLoginFull"/></div>
      <div class="col-12 mb-4"><span class="text-lg">{{ $t('global.enterVPPassword') }}</span></div>
      <div class="col-11 end-justify-content mb-4">
        <div class="form-group">
          <label for="password">
            <input class="form-control required" id="password" :type="showPassword ? 'text' : 'password'" name="password" v-model="password" :placeholder="''"/><span>{{ 'Your password' }}<sup></sup></span>
          </label>
        </div>
      </div>
      <div class="col-1 row-100 cursor-pointer"><i class="fa-solid fa-eye mt-4 cursor-pointer" v-if="!showPassword" @click="showPassword = !showPassword" aria-hidden="true"></i><i class="fa-solid fa-eye-slash text-sm mt-4 cursor-pointer" v-else @click="showPassword = !showPassword" aria-hidden="true"></i></div>
      <div class="col-12 add-button-section d-flex end-justify-content gap-2 mb-4">
        <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" :disabled="StringUtils.isNullUndefinedOrEmpty(password) || loading" @click="validateVPPassword"><span class="spinner-border spinner-border-sm" v-if="loading" role="status" aria-hidden="true"></span><span id="add-button-for-value-proposition" v-else>{{ $t('global.send') }}</span></button>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive } from "vue";
import CalculumModal from '@/modules/components/CalculumModal.vue'
import * as CompanyApi from '@/api/companyApi'
import { ApiResponse } from '@/services/api/response'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { StringUtils } from '@/utils'
import { images } from '@/resources/assets/assets'

export default defineComponent({
    name: 'ValidateVpPassword',
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
        password: string | null,
        showPassword: boolean        
    }

    const data: DataInterface = reactive<DataInterface>({
        loading: false,
        password: null,
        showPassword: false
    });

  

      function validateVPPassword() {
            data.loading = true
            CompanyApi.validateVPPassword(                
                props.invitationId,    
                props.valuePropositionId,                
                data.password,
                null                
            ).then(async (response: ApiResponse) => {               
                emit('set-token', response.data.token)
            }).catch((error) => {
                data.loading = false
                toast.error(error.response.data.errorMessage)
        })
        }

    

    return {
        ...toRefs(data),    
        StringUtils,
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

</style>
