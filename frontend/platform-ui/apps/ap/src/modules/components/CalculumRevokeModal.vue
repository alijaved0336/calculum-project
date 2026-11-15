<template>
<CalculumModal :size="'lg-70'" :showClose="true" :title="isForRevoking ? $t('global.modal.revoke.title') : $t('global.modal.grant.title')" @close="closeModal">
  <template v-slot:modalContent>
    <p>{{ isForRevoking ? $t('global.modal.revoke.message') : $t('global.modal.grant.message')}}</p>
  </template>
  <template v-slot:modalButtons v-if="isForRevoking && !isLoading">
    <button class="btn outline-secondary-btn font-md" @click="closeModal" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" v-if="showButtonForAllCompanies" @click="revokeUserFromAllCompanies" style="z-index: 1; width: fit-content"> <span>{{ $t('adminBackend.options.revokeAccessAllCompanies') }}</span></button>
    <button class="btn btn-primary font-md" v-if="showButtonForCurrentCompany && showCurrentCompanyButton" @click="revokeUserFromCurrentCompany" style="z-index: 1; width: fit-content"> <span>{{ $t('adminBackend.options.revokeAccessButton') }}</span></button>
  </template>
  <template v-slot:modalButtons v-if="isForRevoking && isLoading">
    <button class="btn btn-primary font-md" @click="closeModal" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true">       </span>
  </template>
  <template v-slot:modalButtons v-if="!isForRevoking && !isLoading">
    <button class="btn outline-secondary-btn font-md" @click="closeModal" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" v-if="showButtonForAllCompanies" @click="grantUserToAllCompanies" style="z-index: 1; width: fit-content"> <span>{{ $t('adminBackend.options.grantAccessAllCompanies') }}</span></button>
    <button class="btn btn-primary font-md" v-if="showButtonForCurrentCompany && showCurrentCompanyButton" @click="grantUserToCurrentCompany" style="z-index: 1; width: fit-content"> <span>{{ $t('adminBackend.options.grantAccessButton') }}</span></button>
  </template>
  <template v-slot:modalButtons v-if="!isForRevoking && isLoading">
    <button class="btn btn-primary font-md" @click="closeModal" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true">             </span>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, ref } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import iconClose from '@/resources/assets/images/icons/iconClose.vue'
import * as Routing from '@/services/router/Routing'
import { useI18n } from 'vue-i18n'
import { errorNotification } from '@/utils/Notification'
import { useUser } from '@/composables'


export default defineComponent({
  name: 'CalculumRevokeModal',
  components: {
    iconClose, CalculumModal
  },
  props: {
    isForRevoking: { type: Boolean, required: true },
    showCurrentCompanyButton: { type: Boolean, required: false, default: true }
  },
  emits: ['close-modal', 'revoke-user-from-all-companies', 'revoke-user-from-current-company', 'grant-user-to-current-company', 'grant-user-to-all-companies'],
  setup(props, { emit }) {
    
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const { userIsAdmin: isAdmin, userSalesRoleEnabled: isSalesTeam, userIsSuperAdmin: isSuperAdmin } = useUser();
    
    const isLoading = ref(false)

    onMounted(() => {     
      if (!isAdmin.value && !isSalesTeam.value) {
        errorNotification(translate.t('global.accessDenied'))
        Routing.home.openHome()
      }
    })

    const showButtonForAllCompanies = computed(() => {
      return isSalesTeam.value || isSuperAdmin.value
    })

    const showButtonForCurrentCompany = computed(() => {
      return isSalesTeam.value || isAdmin.value
    })
    

    function closeModal() {
      emit('close-modal')
    }

    function revokeUserFromAllCompanies() {
      isLoading.value = true
      emit('revoke-user-from-all-companies',true)
    }

    function revokeUserFromCurrentCompany() {
      isLoading.value = true
      emit('revoke-user-from-current-company',false)
    }

    function grantUserToCurrentCompany() {
      isLoading.value = true
      emit('grant-user-to-current-company',false)
    }

    function grantUserToAllCompanies() {
      isLoading.value = true
      emit('grant-user-to-all-companies',true)
    }

    return {
      closeModal,
      grantUserToAllCompanies,
      grantUserToCurrentCompany,
      isAdmin,      
      isLoading,
      revokeUserFromAllCompanies,
      revokeUserFromCurrentCompany,
      showButtonForAllCompanies,
      isSalesTeam,
      showButtonForCurrentCompany
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

// ? - Use utility classes
.primary {
  background-color: $primary700;
  color: #fff;
}
</style>