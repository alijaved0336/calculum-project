<template>
<td>
  <CalculumLoading v-if="loadingCompanies" :modal="true"></CalculumLoading><span class="pointer mr-3" @click="apiGetCompanyData(dataItem['@id'])">
    <CalculumEditIcon></CalculumEditIcon></span><span class="option-company delete-company" :class="showOption ? 'active' : ''" ref="button">
    <CalculumDeleteIcon @click-action="showOptions"></CalculumDeleteIcon>
    <Popup class="custom-pop-up" :anchor="'button'" :show="showOption" :popup-class="'manage-team-popup-settings'">
      <div class="d-flex flex-column custom-paddings-container">
        <p class="text-center">{{ $t('adminBackend.companiesAdmin.deleteQuestion') }} {{ dataItem.name }}?</p>
        <div class="d-flex justify-content-center"><a class="btn outline-secondary-btn font-md mr-1" @click="onShowDeleteConfirmation" style="width: 50px">{{ $t('button.cancel') }}</a><a class="btn btn-primary font-md" @click="deleteCompany(dataItem['@id'])" style="width: 50px">{{ $t('button.delete') }}</a></div>
      </div>
    </Popup></span><span class="pointer ml-3 go-to-company" v-if="userIsSuperAdmin || userSalesRoleEnabled" @click.stop="goToCompanyUsers(dataItem['@id'], dataItem.name)">
    <CalculumManageTeamsIcon></CalculumManageTeamsIcon></span>
</td>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from "vue-toastification";
import * as Routing from '@/services/router/Routing'
import { CalculumLoading } from '@ada/design-system'
import CalculumEditIcon from '@/modules/components/icons/IconEdit.vue'
import CalculumDeleteIcon from '@/modules/components/CalculumDeleteIcon.vue'
import CalculumManageTeamsIcon from '@/modules/components/CalculumManageTeamsIcon.vue'
import { useUserStore } from '@/stores/user'
import { useAdminBackendStore } from '@/stores/adminBackend'
import { Popup } from '@progress/kendo-vue-popup';
import { useUser } from '@/composables'
const POPUP_OPEN_EVENT = 'actions-company-popup-open'

export default defineComponent({
  name: 'ActionsCompany',
  components: {
    CalculumLoading,
    CalculumEditIcon,
    CalculumDeleteIcon,
    CalculumManageTeamsIcon,
    Popup
  },
  props: {
    dataItem: { type: Object, required: true },   
  },
  emits: ['refresh-companies'],
  setup(props, { emit }) {
    const userStore = useUserStore()
    const adminBackendStore = useAdminBackendStore()
    const showDeleteConfirmation = ref(true)   
    const loadingCompanies = ref(false)
    const showOption = ref(false)
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const toast = useToast()
    const { userIsSuperAdmin, userSalesRoleEnabled } = useUser()

    /**
     * Generates a cryptographically secure random string
     * Similar to Math.random().toString(36).substring(7)
     */
    function generateSecureRandomString(): string {
      const randomBytes = new Uint8Array(9)
      crypto.getRandomValues(randomBytes)
      
      // Convert random bytes to base36 string
      return Array.from(randomBytes)
        .map(byte => byte.toString(36))
        .join('')
        .substring(0, 9)
    }

    // Unique ID for this instance
    const instanceId = computed(() => {
      return props.dataItem['@id'] || props.dataItem.id || generateSecureRandomString()
    })

    // Function to handle popup open event
    function handlePopupOpen(event: CustomEvent) {
      if (event.detail.instanceId !== instanceId.value) {
        showOption.value = false
      }
    }

    // Listen to events from other popups
    onMounted(() => {
      window.addEventListener(POPUP_OPEN_EVENT as any, handlePopupOpen as EventListener)
    })

    // Clean up listener on unmount
    onUnmounted(() => {
      window.removeEventListener(POPUP_OPEN_EVENT as any, handlePopupOpen as EventListener)
    })

    function onShowDeleteConfirmation(){
      showOption.value = false
    }

    function goToCompanyUsers(id: any, name: string) {
      adminBackendStore.setCurrentCompanyName(name)
      // Navigate to company users
      Routing.admin.openCompanyUsers({
        id: id.replace('/api/companies/', '')
      })
    }

    function apiGetCompanyData(idCompany: any) {
      
      Routing.admin.openEditCompanyAdmin({
        idCompany: idCompany.replace('/api/companies/', '')
      })
    }


    function setCompany(idCompany: any, action: string) {
      loadingCompanies.value = true
      const params = {
        selectedCompany: idCompany,
        callbackSuccess: () => {
          const params = {
            callbackSuccess: () => {
              loadingCompanies.value = false
              if (action === 'editInfo'){
                Routing.admin.openAdminCompanyInfo()
              } else {
                Routing.admin.openAdminCompanyTeams({forCompanyAdminValue: true,
                  limitUsersRelated: { limitUsers:  props.dataItem.limitUsers ?? 0, externalUsers: props.dataItem.externalUsers ?? 0 }
                })
              }
            },
            callbackError: () => {       
              loadingCompanies.value = false
            }
          }
          userStore.whoAmI(params)
        },
        callbackError: () => {
          loadingCompanies.value = false
                   
        }
      }
      userStore.postUserCompany(params)
    }

    function deleteCompany(company: any) {
      loadingCompanies.value = true
      showOption.value = false
      const params = {
        companyId: company,
        callbackSuccess: () => {
          loadingCompanies.value = false
          toast.info(translate.t('global.noty.info.companyDeleteSchedule'));
          emit('refresh-companies')
        },
        callbackError: () => {
          loadingCompanies.value = false
          toast.error(translate.t('global.noty.error.delete.company'));
        }
      }
      adminBackendStore.deleteCompany(params)
    }

    function showOptions(){
      // Emit event to close other popups
      const event = new CustomEvent(POPUP_OPEN_EVENT, {
        detail: { instanceId: instanceId.value }
      })
      window.dispatchEvent(event)
      // Open this popup
      showOption.value = true
    }

    return {
      onShowDeleteConfirmation,
      showDeleteConfirmation,
      goToCompanyUsers,
      setCompany,
      loadingCompanies,
      showOptions,
      showOption,
      deleteCompany,
      apiGetCompanyData,
      userIsSuperAdmin, userSalesRoleEnabled
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translate3d(0, -100%, 0);
    }

    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  .icon-svg__button-18 {
    width: 20px !important;
    height: 20px !important;
  }

  .option-company {
    .show-options {
      width: auto;
      background: white;
      border-radius: 5px;
      padding: 10px;
      position: absolute;    
      border: 1px solid #ABAFB5;
      display: none;
    }

    &.active {
      .show-options {
        animation-name: fadeInDown;
        animation-duration:0.3s;
        display: block;
        z-index: 100;
      }
    }
  } 


  .custom-pop-up {
  width: 350px !important;
}

.custom-paddings-container {
  padding: .875em;
}

</style>