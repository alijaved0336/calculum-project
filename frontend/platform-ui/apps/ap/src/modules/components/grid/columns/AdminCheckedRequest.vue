<template>
<td class="custom-td-cell-for-grid"><span>{{dataItem.superAdminCheckedRequest === 'Yes' ? 'Yes' : 'No' }}</span></td>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import * as Routing from '@/services/router/Routing'
import { CalculumLoading } from '@ada/design-system'
import { useUserStore } from '@/stores/user'
import { useAdminBackendStore } from '@/stores/adminBackend'

export default defineComponent({
  name: 'AdminCheckedRequest',
  components: {
    CalculumLoading
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

    function onShowDeleteConfirmation(){
      showOption.value = !showOption.value
    }

    function goToCompanyUsers(id: any, name: string) {
      adminBackendStore.setCurrentCompanyName(name)
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
                Routing.admin.openAdminCompanyTeams({forCompanyAdminValue: true})
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
      showOption.value = !showOption.value      
      const params = {
        companyId: company,
        callbackSuccess: () => {
          loadingCompanies.value = false
          emit('refresh-companies')
        },
        callbackError: () => {
          
        }
      }
      adminBackendStore.deleteCompany(params)
    }

    function showOptions(){
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
      apiGetCompanyData
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
      }
    }
  } 
</style>