<template>
<section class="page-content-top">
  <div class="container-steady mt-header"></div>
</section>
<section class="page-content">
  <div class="container-fluid mt-3">
    <CalculumConfirmModal v-if="showConfirmModalResetIdentityProvider" :actionDescription="$t('global.confirmResetIdentityProvider')" @hide-modal="showConfirmModalResetIdentityProvider=false" @confirm-action="confirmResetIdentityProvider"></CalculumConfirmModal>
    <CalculumDeleteModal v-if="showDeleteConfirmModal" forDeleteUser="forDeleteUser" :loading="deletingUser" @hide="showDeleteConfirmModal = !showDeleteConfirmModal" @delete="apiDeleteUser"></CalculumDeleteModal>
    <CalculumRevokeModal v-if="showRevokeAccessModal" :isForRevoking="isForRevoking" @close-modal="closeRevokeModal" @revoke-user-from-all-companies="revokeUserFromAllCompanies" @revoke-user-from-current-company="revokeUserFromCurrentCompany" @grant-user-to-current-company="grantUserToCurrentCompany" @grant-user-to-all-companies="grantUserToAllCompanies"></CalculumRevokeModal>
    <div style="margin-top: 60px;"></div>
    <section class="page-content-overflow2 bg-light-gray">
      <div class="d-flex align-items-center justify-content-between bg-white px-4 py-4 mb-3 shadow-sm">
        <h3 class="page-title mb-0 fw-bold text-dark">{{ $t('home.homeManageTeam.title') }}</h3>
        <button class="btn btn-outline-secondary btn-sm d-flex align-items-center" @click="goBackToCompanies"><i class="fa-solid fa-arrow-left mx-2"></i><span>{{ $t('global.back') }}</span></button>
      </div>
      <section class="page-content bg-white rounded-8 shadow-sm">
        <div class="px-4 pb-4 border-bottom">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div class="d-flex align-items-center gap-3">
              <div class="d-flex flex-column">
                <h4 class="mb-1 fw-bold text-dark">{{ companyNameValue }}</h4>
                <div class="d-flex align-items-center gap-2"><span class="text-secondary small"><i class="fa-solid fa-users mx-2"></i>{{ amountOfUsersComputed }} / {{ limitUsersComputed }} users</span>
                  <label class="d-flex align-items-center gap-1 mb-0" style="cursor: pointer; margin-left: 2rem;">
                    <input class="form-check-input mt-0" type="checkbox" v-model="onlyExternalUsers" @change="toggleCompanyUsers"/><span class="text-secondary small">{{ $t('home.homeManageTeam.onlyExternalUsers') }}</span>
                  </label><span class="badge" v-if="limitReached" :class="{ 'total-users-limit-reached': limitReached }"><i class="fa-solid fa-triangle-exclamation mx-2"></i>{{ $t('home.homeManageTeam.maximumTeamLimitReached') }}</span>
                </div>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2" v-if="!isUserAddOrEditFormShown">
              <div class="input-group" style="width: 280px;"><span class="input-group-text bg-white border-end-0"><i class="fa-brands fa-sistrix text-muted"></i></span>
                <input class="form-control border-start-0 ps-0" type="text" v-model="findByName" :placeholder="$t('global.search')"/>
              </div>
              <button class="btn btn-primary d-flex align-items-center ml-3" id="add-user-to-company" @click="onClickOpenFormToAddUser(UserFormType.ADD_USER)" :disabled="loadingUsers" style="width: 125px; padding: 0"><i class="fa-solid fa-plus text-sm mx-2"></i><span>{{ $t('home.homeManageTeam.buttons.add') }}     </span></button>
            </div>
          </div>
        </div>
        <div class="p-4" :class="{'bg-blur': loadingUsers}">
          <CreateEditUserForm v-if="isUserAddOrEditFormShown" style="width: 100%" :isNewUser="isNewUser" :companyId="`/api/companies/${router.currentRoute._value.params.id}`" :limitReached="limitReached" :formType="typeOfFormShown" :formData="dataFormEdit" @closeForm="callbackFormAddUserClose" @callbackUpdateUserList="callbackUpdateUserList"></CreateEditUserForm>
          <div v-else>
            <div class="alert alert-success mx-3" v-if="showInviteUserSuccess" role="alert" style="cursor: pointer;" @click="onClickMessageClear"><span>{{ $t('home.homeManageTeam.messageInvitationSuccess') }}</span></div>
            <CalculumGridGraphql :gridData="collectionUsers" :gridColumns="listUsersColumns" :sortable="true" :enabledPagination="true" :allowExportExcel="true" :filterable="true" :total="graphqlTotalCount" :skip="pagination.skip" :take="pagination.first" :defaultPageSize="pagination.first" :sort="sortSettings" :loading="loadingUsers" :gridHeight="gridHeight" :selectable="false" :selectableOrdering="true" :rowColors="true" :showFilter="true" :forCompareAddCompany="true" :forSuperAdmin="true" :showToolbar="true" :section="'adminBackend'" :levelOfGrid="'CompanyUserGraphQL'" :entityUuid="companyUuid" :groupUuid="groupUuid" :search="graphqlFilters.search" :key="key" @pagechange="pageChangeHandler" @dataChange="dataChangeHandler" @grant-access="toggleRevokeModal" @edit-user-from-admin-dashboard="onClickOpenFormToEditUser" @delete-user-from-company="showDeleteModal" @toggle-options-admin-dashboard="toggleOptionsForUser" @revoke-access-user-admin-dashboard="toggleRevokeModal" @resend-invitation-user-admin-dashboard="resendInvitation" @reset-identity-provider="confirmResetIdentity" @invalidate-token="invalidateToken" @exportCSV="exportUsersToExcel"></CalculumGridGraphql>
          </div>
        </div>
      </section>
    </section>
  </div>
</section>
</template>

<script lang="ts">
import { defaultCompaniesUsersGridColumnsUserPanel } from '@/modules/adminBackend/data/columns'
import { fontIcons, images } from '@/resources/assets/assets'
import { reactive, toRefs, computed, onMounted, defineComponent, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Roles, UserFormType } from '@/services/user/UserTypes'
import { useI18n } from 'vue-i18n'
import { useAdminBackendStore } from '@/stores/adminBackend'
import { useWelcomeStore } from '@/stores/welcome'
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import CalculumDeleteModal from '@/modules/components/CalculumDeleteModal.vue'
import CalculumConfirmModal from '@/modules/components/CalculumModalConfirmAction.vue'
import CalculumGridGraphql from '@/modules/components/grid/CalculumGridGraphql.vue'
import { CalculumLoading } from '@ada/design-system'
import CalculumRevokeModal from '@/modules/components/CalculumRevokeModal.vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import iconGrantAccess from '@/resources/assets/images/icons/iconGrantAccess.vue'
import iconPencil from '@/resources/assets/images/icons/iconPencil.vue'
import iconRevokeAccess from '@/resources/assets/images/icons/iconRevokeAccess.vue'
import iconSendOrInvite from '@/resources/assets/images/icons/iconSendOrInvite.vue'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import { useToast } from "vue-toastification";
import router from '@/services/router/index'
import CreateEditUserForm from '@/modules/components/forms/CreateEditUserForm.vue'
import { useUser, useCompanyUsers } from '@/composables'
import { HomeManageTeam } from '@/modules/adminBackend/types'
import { useUserStore } from '@/stores/user'
import { useHomeStore } from '@/stores/home'
import { saveExcel } from '@progress/kendo-vue-excel-export'

export default defineComponent({
  name: 'CompanyUsers',
  components: {
    CalculumConfirmModal,
    CalculumDeleteModal,
    CalculumGridGraphql,
    CalculumLoading,
    CalculumRevokeModal,
    iconEllipsisVertical,
    iconGrantAccess,
    iconPencil,
    iconRevokeAccess,
    iconSendOrInvite,
    iconTrash,
    CreateEditUserForm,
  },
  props: {
    companyId: { type: String, required: false, default: '' },
    companyName: { type: String, required: true },
    forCompanyAdminValue: { type: Boolean, required: false },
  },
  setup(props) {
    const toast = useToast()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const userStore = useUserStore()
    const homeStore = useHomeStore()
    const adminBackendStore = useAdminBackendStore()
    const welcomeStore = useWelcomeStore()
    const loadExport = ref(false)
    const groupUuid = ref<string | null>(null) //-b947d9c3-24ec-49bc-8b69-263398eecd14
    const onlyExternalUsers = ref(false)

    document.title = translate.t('home.homeManageTeam.title')
    
    // GraphQL: Get company UUID from route
    const companyUuid = computed(() => {
      const companyId = router.currentRoute.value.params.id as string
      // The ID in the route is already the UUID
      return companyId
    })

    // GraphQL: Setup filters for useCompanyUsers (companyUuid/companyUiGroupUuid optional: full universe or filter)
    const graphqlFilters = ref({
      companyUuid: companyUuid.value ?? null,
      companyUiGroupUuid: groupUuid.value ?? null,
      search: '',
      enabled: undefined as boolean | undefined,
      roles: undefined as string | undefined,
      order: [{ userEmail: 'ASC' }] as Array<{ [key: string]: 'ASC' | 'DESC' }> | undefined,
      telerikFilter: undefined as string | undefined,
      companyUsers: false
    })

    // GraphQL: Pagination settings (offset-based for CalculumGridGraphql)
    const pagination = ref({
      first: 25,
      skip: 0
    })

    // GraphQL: Sort settings (for CalculumGridGraphql)
    // Default sort: by full name ascending
    const sortSettings = ref<any>([{ field: 'user', dir: 'asc' }])

    // GraphQL: Filter settings (for CalculumGridGraphql)
    const filterSettings = ref<any>(null)

    // GraphQL: Use the composable to fetch users
    const {
      userCompanies: graphqlUsers,
      loading: graphqlLoading,
      refetch: graphqlRefetch,
      paginationInfo
    } = useCompanyUsers(graphqlFilters, pagination)

    // GraphQL: Total count for grid
    const graphqlTotalCount = computed(() => paginationInfo.value.totalCount)

    const homeManageTeam = reactive<HomeManageTeam>({
      users: [],
      dataFormEdit: {},
      dataTeam: [],
      email: '',
      findByName: '',
      firstName: '',
      lastName: '',
      newTeam: '',
      tokenExpiration: '',
      invitationToken: '',
      roles: {
        admin: false,
        standard: false
      },
      team: '',
      userID: '',
      typeOfFormShown: UserFormType.ADD_USER,
      formErrorMessage: '',
      formHasError: false,
      isUserAddOrEditFormShown: false,
      showCreateTeamDialog: false,
      showInviteUserSuccess: false,
      loadingInviteUsers: false,
      loadingUsers: false,
      userObj: {},
      showRevokeAccessModal: false,
      showDeleteConfirmModal: false,
      showConfirmModalResetIdentityProvider: false,
      deleteUserObj: {},
      deletingUser: false,
      isAdmin: false,
      isNewUser: false,
      isForRevoking: false,
      listUsersColumns: getGridColumns(),
      companyNameValue: '',
      pagable: [8, 10, 25, 50, 100, 150],
      widthScreen: 1024,
      pageSizeNumber: 5,
      XlargeScreen: 1920,
      largeScreen: 1420,
      mediumScreen: 1120,
      smallScreen: 800,
      key: new Date().getUTCMilliseconds(),
      userInputSearch: '',
      loadingLimitUsersValue: true,
      limitUsers: 0,
      amountOfUsers: 0,
      gridHeight: '280px'
    })

    const { user } = useUser();

    // Watch GraphQL users and update local state
    watch(graphqlUsers, (newUsers) => {
      if (newUsers && newUsers.length > 0) {
        homeManageTeam.users = newUsers.map((userCompany: any) => {
          return {
            '@id': `/api/users/${userCompany.userUuid}`,
            id: userCompany.id,
            uuid: userCompany.userUuid,
            userFullName: userCompany.userFullName,
            userEmail: userCompany.userEmail,
            userFirstName: userCompany.userFirstName,
            userLastName: userCompany.userLastName,
            userJobTitle: userCompany.userJobTitle,                        
            userPhoneNumber: userCompany.userPhoneNumber,
            roles: userCompany.roles,
            enabled: userCompany.enabled,
            azureId: userCompany.userAzureId ?? undefined,
            lastActivity: userCompany.lastActivity
              ? formatData.getISODate(userCompany.lastActivity)
              : translate.t('home.homeManageTeam.search.neverAccess'),
            activeDaysLast30: userCompany.activeDaysLast30,
            activeDaysLast60: userCompany.activeDaysLast60,
            activeDaysLast90: userCompany.activeDaysLast90,
            companyUuid: userCompany.companyUuid,
            companyName: userCompany.companyName,
            company: {
              '@id': `/api/companies/${userCompany.companyUuid}`,
              uuid: userCompany.companyUuid,
              name: userCompany.companyName
            },
            invitationToken: userCompany.invitationToken,
            tokenExpiration: userCompany.tokenExpiration,
            userCompanyId: `/api/user_companies/${userCompany.id}`,
            showUserOptions: false
          }
        })
      } else {
        homeManageTeam.users = []
      }
    }, { immediate: true })

    // Watch GraphQL loading state and sync with loadingUsers
    watch(graphqlLoading, (loading) => {
      homeManageTeam.loadingUsers = loading
    }, { immediate: true })

    // Watch search input with debounce and update GraphQL filter
    const updateSearch = useDebounceFn((newSearch: string) => {
      graphqlFilters.value.search = newSearch
    }, 500)

    watch(() => homeManageTeam.findByName, (newSearch) => {
      updateSearch(newSearch)
    })

    /**
     * checks if user is super admin
     */
     const superAdmin = computed(() => {
      return user.value?.isSuperAdmin ?? false
    })
    
    /**
    * if the limit has been reached for the current company, the add button will be disabled
    */
    const amountOfUsersComputed = computed(() => homeManageTeam.amountOfUsers)
    const limitUsersComputed = computed(() => homeManageTeam.limitUsers)

    /**
     * loading is finished for both the amount of users and the limit
     */
    const loadingFinished = computed(() => {
      return homeManageTeam.loadingLimitUsersValue === false && homeManageTeam.loadingUsers === false
    })
    
    /**
     * 
     * if the limit has been reached for the current company, the add button will be disabled
     * and text below the btn will show
     * **/ 
     const limitReached = computed(() => {
        return loadingFinished.value && (amountOfUsersComputed.value >= limitUsersComputed.value)
    })


    onMounted(() => {
      getAmountOfUsers()
      // GraphQL will automatically fetch on mount
      homeManageTeam.companyNameValue = adminBackendStore.getCurrentCompanyName
      homeManageTeam.isAdmin = admin()
      setGridHeight()
    })

    function setGridHeight() {
      const getSubMain = document.getElementsByClassName("main-content")[0];
      if (getSubMain) {
        if (getSubMain.clientHeight < 600) {
          homeManageTeam.gridHeight = "310px";
        } else {
          homeManageTeam.gridHeight = getSubMain.clientHeight - 120 + "px";
        }
      }
    }

    /**
     * Get list of column titles for company users grid
     * 
     * @returns {Array<any>}
     */
    function getGridColumns(): Array<any> {
      return defaultCompaniesUsersGridColumnsUserPanel
    }


    function admin() {
      if (user.value && user.value.roles) {
        const arrayRoles = Object.values(user.value.roles);
        return !!arrayRoles.find((x: any) => x === 'ROLE_ADMIN')
      } else {
        return false
      }
    }

    function closeRevokeModal() {
      homeManageTeam.showRevokeAccessModal = false
    }

    const collectionUsers = computed(() => {
      // For server-side pagination: return only the actual data fetched
      // The grid should NOT paginate client-side, it should trigger refetch
      const users = homeManageTeam.users || []
      console.log(`Grid data: ${users.length} users, total: ${graphqlTotalCount.value}`)
      return users
    })

   
    function callbackFormAddUserClose() {
      homeManageTeam.isUserAddOrEditFormShown = false
    }

    function callbackUpdateUserList() {
      getAmountOfUsers()
      // GraphQL: Refetch users data
      graphqlRefetch()
    }

    function showDeleteModal(userObj: any) {
      homeManageTeam.deleteUserObj = userObj["userCompanyId"]
      homeManageTeam.showDeleteConfirmModal = true
    }


    function toggleRevokeModal(user: any, revoke: boolean) {
      homeManageTeam.userObj.id = user['@id']
      homeManageTeam.userObj.company = user.companyUuid
      homeManageTeam.isForRevoking = revoke
      homeManageTeam.showRevokeAccessModal = true
    }

    function confirmResetIdentity(user: any) {
      homeManageTeam.userObj.id = user['@id']
      homeManageTeam.userObj.company = user.companyUuid
      homeManageTeam.showConfirmModalResetIdentityProvider = true
    }

    function grantUserToAllCompanies() {
      const params = {
        userId: homeManageTeam.userObj.id,
        companyId: homeManageTeam.userObj.company,
        allCompanies: true,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.grant.all.success'));
          homeManageTeam.showRevokeAccessModal = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.grant.all.error'));
          homeManageTeam.showRevokeAccessModal = false
        }
      }
      adminBackendStore.grantAccess(params)
    }

    function grantUserToCurrentCompany() {

      const params = {
        userId: homeManageTeam.userObj.id,
        companyId: homeManageTeam.userObj.company,
        allCompanies: false,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.grant.current.success'));
          homeManageTeam.showRevokeAccessModal = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.grant.current.error'));
          homeManageTeam.showRevokeAccessModal = false
          graphqlRefetch()
        }
      }
      adminBackendStore.grantAccess(params)
    }

    function revokeUserFromAllCompanies() {
      const params = {
        userId: homeManageTeam.userObj.id,
        companyId: homeManageTeam.userObj.company,
        allCompanies: true,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.revoke.all.success'));
          homeManageTeam.showRevokeAccessModal = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.revoke.all.error'));
          homeManageTeam.showRevokeAccessModal = false
          graphqlRefetch()
        }
      }
      adminBackendStore.revokeAccess(params)
    }

    function confirmResetIdentityProvider() {
      homeManageTeam.showConfirmModalResetIdentityProvider = false
      const params = {
        userId: homeManageTeam.userObj.id,
        companyId: homeManageTeam.userObj.company,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.resetIdentity.success'));
          homeManageTeam.showConfirmModalResetIdentityProvider = false
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.resetIdentity.error'));
          homeManageTeam.showConfirmModalResetIdentityProvider = false
        } 
      }
      adminBackendStore.resetIdentityProvider(params)  
    }

    function revokeUserFromCurrentCompany() {
      const params = {
        userId: homeManageTeam.userObj.id,
        companyId: homeManageTeam.userObj.company,
        allCompanies: false,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.revoke.current.success'));
          homeManageTeam.showRevokeAccessModal = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.revoke.current.error'));
          homeManageTeam.showRevokeAccessModal = false
        }
      }
      adminBackendStore.revokeAccess(params)
    }
    function apiDeleteUser() {
      homeManageTeam.deletingUser = true
      homeManageTeam.loadingUsers = true
      const params = {
        userID: homeManageTeam.deleteUserObj,
        callbackSuccess: () => {
          homeManageTeam.deletingUser = false
          homeManageTeam.showDeleteConfirmModal = false
          homeManageTeam.loadingUsers = false
          toast.success(translate.t('global.successDeleteUser'));
          getAmountOfUsers()
          graphqlRefetch()
        },
        callbackError: (response: any) => {
          homeManageTeam.deletingUser = false
          homeManageTeam.showDeleteConfirmModal = false
          homeManageTeam.loadingUsers = false
          toast.error(translate.t('global.errorDeleteUser'));
        }
      }
      userStore.deleteUser(params)
    }

    function getAmountOfUsers() {
      homeManageTeam.loadingLimitUsersValue = true
      const params = {
        companyId: `/api/companies/${router.currentRoute.value.params.id}`,
        callbackSuccess: (callbackSuccessData: any) => {
          homeManageTeam.limitUsers = callbackSuccessData.limitUsers
          homeManageTeam.amountOfUsers = callbackSuccessData.externalUsers
          homeManageTeam.loadingLimitUsersValue = false
        },
        callbackError: (callbackErrorData: any) => {
          homeManageTeam.loadingLimitUsersValue = true
        }
      }
      userStore.getAmountOfUsers(params)
    }

    function onClickMessageClear() {
      homeManageTeam.showInviteUserSuccess = false
    }

    function onClickOpenFormToAddUser(type: string, user: { showUserOptions: boolean }) {
      homeManageTeam.typeOfFormShown = type || UserFormType.ADD_USER
      homeManageTeam.dataFormEdit = {
        firstName: '',
        lastName: '',
        email: '',
        roles: '',
        team: ''
      }
      homeManageTeam.isNewUser = homeManageTeam.typeOfFormShown === UserFormType.ADD_USER
      if (user) {
        user.showUserOptions = !user.showUserOptions
      }
      homeManageTeam.isUserAddOrEditFormShown = true
    }

    function onClickOpenFormToEditUser(type: boolean, user: any) {
      homeManageTeam.isUserAddOrEditFormShown = true
      homeManageTeam.typeOfFormShown = type ? UserFormType.EDIT_USER : UserFormType.ADD_USER

      if (type) {
        homeManageTeam.dataFormEdit = {
          firstName: user.userFirstName,
          lastName: user.userLastName,
          email: user.userEmail,
          roles: user.roles,
          team: user.team,
          userId: user['@id'],
          company: user.companyUuid,
          userCompanyId: user.userCompanyId

        }
        if (user) {
          user.showUserOptions = !user.showUserOptions
        }
      }
    }

    
    function userRolesToString(roles: any) {
      let result = ''
      if (roles !== undefined) {
        if (Object.values(roles).includes(Roles.ADMIN)) {
          result += result.length > 0 ? ', Admin' : 'Admin'
        }
        if (Object.values(roles).includes(Roles.STANDARD)) {
          result += result.length > 0 ? ', User' : 'User'
        }

      }
      return result
    }


    function resendInvitation(user: any) {
      homeManageTeam.loadingUsers = true
      const params = {
        userID: user['userCompanyId'],
        callbackSuccess: (response: any) => {
          toast.success(translate.t('global.successResendInvitationUser'));
          
          homeManageTeam.loadingUsers = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.errorResendInvitationUser'));
          
          homeManageTeam.loadingUsers = false
        }
      }

      userStore.resendInvitation(params)
    }


    function invalidateToken(user: any) {
      homeManageTeam.loadingUsers = true
      const params = {
        userID: user['@id'],
        callbackSuccess: (response: any) => {
          toast.success(translate.t('global.successInvalidatetoken'));
          
          homeManageTeam.loadingUsers = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.errorInvalidatetoken'));
          
          homeManageTeam.loadingUsers = false
        }
      }

      userStore.invalidateToken(params)
    }

    /**
     * Handle page change from CalculumGridGraphql
     * Supports both page size changes and page navigation
     * Pattern from Lists.vue
     */
    async function pageChangeHandler(event: any) {
      console.log('Page change event:', event)
      
      // Handle page size change (dropdown)
      if (event.event && event.event.value) {
        pagination.value = {
          first: event.event.value,
          skip: 0  // Reset to first page
        }
      } 
      // Handle page navigation (prev/next buttons, page numbers)
      else if (event.page) {
        pagination.value = {
          first: event.page.take,
          skip: event.page.skip
        }
      }
      
      // Refetch data with new pagination
      await graphqlRefetch()
    }

    /**
     * Navigate back to companies list
     */
    function goBackToCompanies() {
      Routing.admin.openCompaniesAdmin()
    }

    /**
     * Handle sort change event from grid
     * Converts Kendo sort format to GraphQL order format
     */
    // Handle data change (filter and sort) from grid
    async function dataChangeHandler(filter: any, sort: any) {
      console.log('Data change event - filter:', filter, 'sort:', sort)

      // Reset pagination to first page
      pagination.value = {
        first: pagination.value.first,
        skip: 0
      }

      // Update filter settings for grid (visual state)
      filterSettings.value = filter

      // Update sort settings for grid (visual state)
      sortSettings.value = sort

      // Convert Kendo sort format to GraphQL order format
      if (sort && sort.length > 0) {
        const order = sort.map((sortDescriptor: any) => {
          return {
            [sortDescriptor.field]: sortDescriptor.dir.toUpperCase()
          }
        })
        console.log('Setting order to:', order)
        graphqlFilters.value.order = order
      } else {
        console.log('Clearing order')
        graphqlFilters.value.order = undefined
      }


      // Convert Kendo filter format to GraphQL filter format
      if (filter) {
        graphqlFilters.value.telerikFilter = JSON.stringify(filter)
      } else {
        // Clearing all grid filters
        graphqlFilters.value.telerikFilter = undefined
      }
      
      // NOTE: We do NOT call graphqlRefetch() here
      // The watch in the composable will detect the change and trigger refetch automatically
    }

    /** Export company users list to Excel via global filter export API */
    function exportUsersToExcel() {
      loadExport.value = true
      const filters_grid: Record<string, any> = {
        telerikFilter: formatData.convertFiltersToREST(filterSettings.value),
        globalFilter: null,
        entityUuid: companyUuid.value,
      }
      if (onlyExternalUsers.value) filters_grid.companyUsers = true
      if (graphqlFilters.value.search) filters_grid.search = graphqlFilters.value.search
      const params = {
        level: 'CompanyUserGraphQL',
        section: 'adminBackend',
        filters_grid,
        callbackSuccess: (callbackSuccessData: any) => {
          loadExport.value = false
          const columnsToExport = homeManageTeam.listUsersColumns
            .filter((c: any) => c.field && c.field !== 'actions')
            .map((c: any) => c.field === 'roles' ? { ...c, width: 250 } : c)
          const transformedData = callbackSuccessData.map((row: any) => ({
            ...row,
            enabled: row.enabled ? 'Enabled' : 'Disabled',
            roles: Array.isArray(row.roles) ? row.roles.map((r: string) => r.replace('ROLE_', '')).join(', ') : row.roles
          }))
          saveExcel({
            data: transformedData,
            fileName: 'Company_Users',
            columns: columnsToExport,
            filterable: true
          })
        },
        callbackError: () => {
          loadExport.value = false
          toast.error(translate.t('error.get-data') || 'Export failed.')
        }
      }
      homeStore.exportData(params)
    }

    function toggleCompanyUsers() {
      graphqlFilters.value = {
        ...graphqlFilters.value,
        companyUsers: onlyExternalUsers.value
      }
    }

    return {
      ...toRefs(homeManageTeam),
      amountOfUsersComputed,
      apiDeleteUser,
      callbackFormAddUserClose,
      callbackUpdateUserList,
      closeRevokeModal,
      collectionUsers,
      fontIcons,
      formatData,
      UserFormType,
      goBackToCompanies,
      grantUserToAllCompanies,
      grantUserToCurrentCompany,
      graphqlFilters,
      graphqlTotalCount,
      images,      
      limitReached,
      limitUsersComputed,
      loadingFinished,
      onlyExternalUsers,
      onClickMessageClear,
      onClickOpenFormToAddUser,
      onClickOpenFormToEditUser,
      pageChangeHandler,
      pagination,
      resendInvitation,
      revokeUserFromAllCompanies,
      revokeUserFromCurrentCompany,
      confirmResetIdentityProvider,
      router,
      Routing,
      showDeleteModal,
      sortSettings,
      filterSettings,
      dataChangeHandler,
      superAdmin,
      toggleCompanyUsers,
      toggleRevokeModal,
      confirmResetIdentity,
      userRolesToString,
      invalidateToken,
      companyUuid,
      exportUsersToExcel,
      loadExport,
      groupUuid
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

#create-new-team {
  .close-create-new-team {
    color: #abafb5;
    transition: all ease 0.3s;
    width: 10px;
    margin-bottom: 10px;
    cursor: pointer;

    &:hover {
      color: #212529;
    }
  }
}

.card--full .card__body {
    margin: 20px;
    font-size: 1rem;
}

.width-250 {
  width: 250px;
}

.total-users-limit-reached {
  background-color: $color-warning-50;
  border-radius: 6px;
  padding: 8px 12px;
}

.total-users-label {
  color: $color-gray-500;
  font-weight: 400;
}

.total-users-value {
  color: $color-gray-700;
  font-weight: 600;
}

// Back button styling
.btn-back {
  color: $color-gray-600;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  
  &:hover {
    color: $color-primary;
    text-decoration: none;
    transform: translateX(-2px);
  }
  
  &:focus {
    box-shadow: none;
  }
  
  i {
    font-size: 1rem;
  }
}

// Page title
.text-gray-700 {
  color: $color-gray-700;
}

// Gap utility for flexbox
.gap-3 {
  gap: 1rem;
}

// Page header styling
.page-title {
  font-size: 1.5rem;
  color: #1f2937;
}

.shadow-sm {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

// Badge styling
.badge {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-weight: 500;
}

.badge-warning {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-weight: 500;
}

// Unified header border separator
.border-bottom {
  border-bottom: 1px solid #e5e7eb !important;
}

.no-focus:focus {
  box-shadow: none;
  border-color: #ced4da;
}

.no-focus:hover {
  box-shadow: none;
  border-color: #ced4da;
}


.input-group-text {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

// Search input styling
.input-group {
  .input-group-text.bg-white {
    background-color: #fff !important;
    transition: background-color 0.15s ease-in-out;
  }

  .form-control.border-start-0 {
    border-left: 0;
    background-color: #fff !important;
    transition: background-color 0.15s ease-in-out;

    &:focus {
      background-color: #fff !important;
      border-color: #d0d5dd;
      box-shadow: none;
    }

    &:hover {
      background-color: #fff !important;
      border-color: #d0d5dd;
      box-shadow: none;
    }
  }

  .input-group-text.border-end-0 {
    border-right: 0;
  }

  // Ensure consistent background on hover for the entire group
  &:hover {
    .input-group-text.bg-white {
      background-color: #f8f9fa !important;
    }
    .form-control {
      background-color: #f8f9fa !important;
    }
  }

  // Keep white background when input is focused
  &:focus-within {
    .input-group-text.bg-white {
      background-color: #fff !important;
    }
    .form-control {
      background-color: #fff !important;
    }
  }
}

// Button improvements
.btn-outline-secondary {
  border-color: #d1d5db;
  color: #6b7280;

  &:hover {
    background-color: #f3f4f6;
    border-color: #9ca3af;
    color: #4b5563;
  }
}

// Responsive layout adjustments
@media (max-width: 992px) {
  .flex-wrap {
    flex-direction: column;
    align-items: flex-start !important;

    > div:first-child {
      width: 100%;
      margin-bottom: 1rem;
    }

    > div:last-child {
      width: 100%;

      .d-flex {
        width: 100%;
        flex-direction: column;
        gap: 0.75rem;

        .input-group,
        .btn {
          width: 100%;
        }
      }
    }
  }
}
</style>
