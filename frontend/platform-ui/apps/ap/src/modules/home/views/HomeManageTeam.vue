<template>
<CalculumDeleteModal v-if="showDeleteConfirmModal" @delete="apiDeleteUser" @hide="showDeleteConfirmModal = !showDeleteConfirmModal" :forDeleteUser="true" :show="false"></CalculumDeleteModal>
<CalculumRevokeModal v-if="showRevokeAccessModal" :isForRevoking="isForRevoking" @close-modal="closeRevokeModal" @revoke-user-from-all-companies="revokeUserFromAllCompanies" @revoke-user-from-current-company="revokeUserFromCurrentCompany" @grant-user-to-current-company="grantUserToCurrentCompany" @grant-user-to-all-companies="grantUserToAllCompanies"></CalculumRevokeModal>
<div style="margin-top: 60px;" v-if="router.currentRoute.value.name === Routing.admin.adminCompanyTeams"></div>
<CalculumConfirmModal v-if="showConfirmModalResetIdentityProvider" :actionDescription="$t('global.confirmResetIdentityProvider')" @hide-modal="showConfirmModalResetIdentityProvider = false" @confirm-action="confirmResetIdentityProvider"></CalculumConfirmModal>
<CalculumLayout :containerClass="'wizard-programs'">
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row">
        <div class="col">
          <div class="card">
            <div class="card-body">
              <div class="row" :class="{ 'bg-blur': loadingUsers }">
                <div class="col-lg-3 col-xl-2 border-right">
                  <AdminMenuCompany :currentPage="'ManageTeam'" v-if="router.currentRoute.value.name === Routing.admin.adminCompanyTeams"></AdminMenuCompany>
                  <HomeMenuAccount :currentPage="'ManageTeam'" v-else></HomeMenuAccount>
                </div>
                <div class="col-lg-9 col-xl-10 p-5">
                  <div class="mb-4">
                    <h6 class="d-flex align-items-center mb-0 font-weight-bold">{{ $t('home.homeManageTeam.title') }}
                      <CalculumTooltipIcon class="ms-2" :infoText="$t('home.homeManageTeam.titleTooltipDefault')" :advancedTooltipClass="true" :uniqueIdentifier="'popover-preferences-manageteam'" :keyPopOver="'preferencesManageTeam'"></CalculumTooltipIcon>
                    </h6>
                  </div>
                  <div class="px-4 pb-4 border-bottom">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
                      <div class="d-flex align-items-center gap-3">
                        <div class="d-flex flex-column">
                          <div class="d-flex align-items-center gap-2" v-if="loadingFinished"><span class="text-secondary small"><i class="fa-solid fa-users mx-2"></i>{{ amountOfUsersComputed }} / {{ limitUsers }} users</span><span class="badge bg-danger" v-if="limitReached && !isUserAddOrEditFormShown"><i class="fa-solid fa-triangle-exclamation mx-2"></i>{{ $t('home.homeManageTeam.maximumTeamLimitReached') }}</span></div>
                        </div>
                      </div>
                      <div class="d-flex align-items-center gap-2" v-if="!isUserAddOrEditFormShown">
                        <div class="input-group" style="width: 280px;"><span class="input-group-text bg-white border-end-0"><i class="fa-brands fa-sistrix text-muted"></i></span>
                          <input class="no-focus form-control border-start-0 ps-0" type="text" v-model="findByName" :placeholder="$t('global.search')"/>
                        </div>
                        <button class="btn btn-primary d-flex align-items-center" id="add-user-to-company" @click="onClickOpenFormToAddUser(UserFormType.ADD_USER)" :disabled="graphqlLoading"><i class="fa-solid fa-plus text-sm mx-2"></i><span>{{ $t('home.homeManageTeam.buttons.add') }}</span></button>
                      </div>
                    </div>
                  </div>
                  <div class="p-4" :class="{'bg-blur': graphqlLoading}">
                    <CreateEditUserForm v-if="isUserAddOrEditFormShown" style="width: 100%" :isNewUser="isNewUser" :formType="typeOfFormShown" :formData="dataFormEdit" :isFromUserPanel="true" :limitReached="limitReached" @closeForm="callbackFormAddUserClose" @callbackUpdateUserList="callbackUpdateUserList"></CreateEditUserForm>
                    <CalculumGridGraphql v-if="!isUserAddOrEditFormShown" :forCompanyAdmin="true" :gridData="userCollection" :gridColumns="listUsersColumns" :allowExportExcel="true" :selectable="false" :selectableOrdering="true" :rowColors="true" :filterable="true" :showFilter="true" :sortable="true" :sort="sortSettings" :skip="pagination.skip" :take="pagination.first" :defaultPageSize="pagination.first" :total="graphqlTotalCount" :pageable="true" :pageSize="25" :pageSizes="[10, 25, 50, 100]" :loading="graphqlLoading" :forCompareAddCompany="true" :showToolbar="true" :section="'home'" :levelOfGrid="'CompanyUserGraphQL'" :entityUuid="companyUuid" @pagechange="pageChangeHandler" @dataChange="dataChangeHandler" @grant-access="toggleRevokeModal" @edit-user-from-admin-dashboard="onClickOpenFormToEditUser" @delete-user-from-company="showDeleteModal" @revoke-access-user-admin-dashboard="toggleRevokeModal" @resend-invitation-user-admin-dashboard="resendInvitation" @reset-identity-provider="confirmResetIdentity" @invalidate-token="invalidateToken" @exportCSV="exportUsersToExcel" :key="key"></CalculumGridGraphql>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import { defaultCompaniesUsersGridColumnsUserPanel } from '@/modules/adminBackend/data/columns'
import { fontIcons, images } from '@/resources/assets/assets'
import { reactive, toRefs, computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Roles, UserFormType } from '@/services/user/UserTypes'
import { useI18n } from 'vue-i18n'
import { useUser, useCompanyUsers } from '@/composables'
import { useWelcomeStore } from '@/stores/welcome'
import * as cacheGrid from '@/utils/dataGridClear'
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import AdminMenuCompany from '@/modules/adminBackend/components/AdminMenuCompany.vue'
import CalculumDeleteModal from '@/modules/components/CalculumDeleteModal.vue'
import CalculumGridGraphql from '@/modules/components/grid/CalculumGridGraphql.vue'
import { CalculumLayout, CalculumLoading } from '@ada/design-system'
import CalculumRevokeModal from '@/modules/components/CalculumRevokeModal.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import HomeMenuAccount from '../components/HomeMenuAccount.vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import iconGrantAccess from '@/resources/assets/images/icons/iconGrantAccess.vue'
import iconPencil from '@/resources/assets/images/icons/iconPencil.vue'
import iconRevokeAccess from '@/resources/assets/images/icons/iconRevokeAccess.vue'
import iconSendOrInvite from '@/resources/assets/images/icons/iconSendOrInvite.vue'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import router from '@/services/router/index'
import type { UserSession } from '@/types'
import CreateEditUserForm from '@/modules/components/forms/CreateEditUserForm.vue'
import { HomeManageTeam } from '@/modules/home/types'
import CalculumConfirmModal from '@/modules/components/CalculumModalConfirmAction.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useToast } from 'vue-toastification'
import { useUserStore } from '@/stores/user'
import { useHomeStore } from '@/stores/home'
import { useAdminBackendStore } from '@/stores/adminBackend'
import { saveExcel } from '@progress/kendo-vue-excel-export'

/**
 * HomeManageTeam – Manage Team / Company Users (GraphQL)
 *
 * This view uses GraphQL for the team list:
 * - Data: useCompanyUsers composable → collectionQueryCompanyUsers
 * - Grid: CalculumGridGraphql (not CalculumGrid) with :forCompanyAdmin="true"
 * - Pagination, sort, and search are handled via GraphQL; grid receives transformed data
 *   (data.users) from the composable's graphqlUsers to keep compatibility with existing
 *   columns and handlers (edit, delete, revoke, resend invite, reset IdP, invalidate token).
 */
export default defineComponent({
  name: 'HomeManageTeam',
  components: {
    AdminMenuCompany,
    CalculumDeleteModal,
    CalculumGridGraphql,
    CalculumLayout,
    CalculumLoading,
    CalculumRevokeModal,
    CalculumTooltipIcon,
    HomeMenuAccount,
    iconEllipsisVertical,
    iconGrantAccess,
    iconPencil,
    iconRevokeAccess,
    iconSendOrInvite,
    iconTrash,
    CreateEditUserForm,
    CalculumConfirmModal,
    CalculumModal,
    Tooltip
  },
  setup() {
    const userStore = useUserStore()
    const adminBackendStore = useAdminBackendStore()
    const welcomeStore = useWelcomeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const toast = useToast()

    const { userIsAdmin: isAdmin, userIsSuperAdmin: isSuperAdmin } = useUser();

    // GraphQL: Get company UUID for filters
    const companyUuid = computed(() => {
      const company = userStore.getCompany
      if (company) {
        // Try to get uuid property
        if ('uuid' in company && company.uuid) {
          return company.uuid as string
        }
        // Fallback: extract from @id (format: /api/companies/{uuid})
        if (company['@id']) {
          const match = company['@id'].match(/\/api\/companies\/([a-f0-9-]+)/)
          if (match && match[1]) {
            return match[1]
          }
        }
      }
      return ''
    })

    // GraphQL: Setup filters for useCompanyUsers
    const graphqlFilters = ref({
      companyUuid: companyUuid.value,
      search: '',
      enabled: undefined as boolean | undefined,
      roles: undefined as string | undefined,
      companyUsers: true,  // ✅ Show only company users (not system users)
      order: [{ userEmail: 'ASC' }] as Array<{ [key: string]: 'ASC' | 'DESC' }> | undefined,
      telerikFilter: undefined as string | undefined
    })

    // Grid filter kept for Excel export (current Kendo filter state)
    const lastGridFilter = ref<any>(null)

    // GraphQL: Pagination settings (offset-based for CalculumGridGraphql)
    const pagination = ref({
      first: 25,
      skip: 0
    })

    // GraphQL: Sort settings (for CalculumGridGraphql)
    const sortSettings = ref<any>([{ field: 'user', dir: 'asc' }])

    // GraphQL: Use the composable to fetch users (replaces legacy apiGetCompanyUsers REST call)
    const {
      userCompanies: graphqlUsers,
      loading: graphqlLoading,
      error: graphqlError,
      refetch: graphqlRefetch,
      paginationInfo
    } = useCompanyUsers(graphqlFilters, pagination)

    // GraphQL: Error handling – show toast on fetch failure (equivalent to former REST try-catch)
    watch(graphqlError, (err) => {
      if (err) {
        toast.error(translate.t('error.get-data') || 'There was an error loading team members.')
      }
    })

    // GraphQL: Total count for grid
    const graphqlTotalCount = computed(() => paginationInfo.value.totalCount)

    // GraphQL: Watch for company changes
    watch(() => userStore.getCompany, (newCompany) => {
      if (newCompany) {
        // Try to get uuid property
        if ('uuid' in newCompany && newCompany.uuid) {
          graphqlFilters.value.companyUuid = newCompany.uuid as string
        }
        // Fallback: extract from @id
        else if (newCompany['@id']) {
          const match = newCompany['@id'].match(/\/api\/companies\/([a-f0-9-]+)/)
          if (match && match[1]) {
            graphqlFilters.value.companyUuid = match[1]
          }
        }
      }
    }, { immediate: true })

    const companyName = userStore.getCompanyName
    document.title = translate.t('home.homeManageTeam.title')
    const homeStore = useHomeStore()
    const loadExport = ref(false)
    const data = reactive<HomeManageTeam>({
      amountOfUsers: 0,
      dataFormEdit: {},
      deleteUserObj: {},
      email: '',
      findByName: '',
      firstName: '',
      formErrorMessage: '',
      formHasError: false,
      getCompanyUsers: [],
      isForRevoking: false,
      isNewUser: false,
      isUserAddOrEditFormShown: false,
      key: new Date().getUTCMilliseconds(),
      largeScreen: 1420,
      lastName: '',
      limitUsers: 0,
      listUsersColumns: getGridColumns(),
      loadingInviteUsers: false,
      loadingLimitUsersValue: true,
      loadingUsers: false,  // Changed: Don't sync with GraphQL loading to avoid hiding UI
      mediumScreen: 1120,
      pagable: [8, 10, 25, 50, 100, 150],
      pageSizeNumber: 5,
      roles: {
        admin: false,
        categorize: false,
        compare: false,
        execute: false,
        plan: false,
        setup: false,
        view: false
      },
      showDeleteConfirmModal: false,
      showInviteUserSuccess: false,
      showRevokeAccessModal: false,
      smallScreen: 800,
      typeOfFormShown: UserFormType.ADD_USER,
      userID: '',
      userObj: {},
      users: getUsers(),
      widthScreen: 1024,
      XlargeScreen: 1920,
      showConfirmModalResetIdentityProvider: false,
      homeManageTeam: {
        id: '',
        company: ''
      }
    })

    // GraphQL: Use GraphQL field names directly (userEmail, userFirstName, etc.)
    watch(graphqlUsers, (newUsers) => {
      if (newUsers && newUsers.length > 0) {
        data.users = newUsers.map((userCompany: any) => {
          return {
            '@id': `/api/users/${userCompany.userUuid}`,
            id: userCompany.id,
            uuid: userCompany.userUuid,
            userEmail: userCompany.userEmail,
            userFirstName: userCompany.userFirstName,
            userLastName: userCompany.userLastName,
            userFullName: userCompany.userFullName,
            userJobTitle: userCompany.userJobTitle,
            companyUiGroupUuid: userCompany.companyUiGroupUuid,
            companyUiGroupName: userCompany.companyUiGroupName,
            userPhoneNumber: userCompany.userPhoneNumber,
            activeDaysLast30: userCompany.activeDaysLast30,
            activeDaysLast60: userCompany.activeDaysLast60,
            activeDaysLast90: userCompany.activeDaysLast90,
            roles: userCompany.roles || [],
            enabled: userCompany.enabled,
            lastActivity: userCompany.lastActivity
              ? formatData.getISODate(userCompany.lastActivity)
              : translate.t('home.homeManageTeam.search.neverAccess'),
            companyUuid: userCompany.companyUuid,
            companyName: userCompany.companyName,
            company: {
              '@id': `/api/companies/${userCompany.companyUuid}`,
              uuid: userCompany.companyUuid,
              name: userCompany.companyName
            },
            userCompanyId: `/api/user_companies/${userCompany.id}`,
            invitationToken: userCompany.invitationToken,
            tokenExpiration: userCompany.tokenExpiration,
            showUserOptions: false
          }
        })
        
        // Create getCompanyUsers with nested structure for edit functionality
        data.getCompanyUsers = newUsers.map((userCompany: any) => {
          return {
            '@id': `/api/user_companies/${userCompany.id}`,
            id: userCompany.id,
            enabled: userCompany.enabled,
            roles: userCompany.roles || [],
            user: {
              '@id': `/api/users/${userCompany.userUuid}`,
              uuid: userCompany.userUuid,
              email: userCompany.userEmail,
              firstName: userCompany.userFirstName,
              lastName: userCompany.userLastName,
              jobTitle: userCompany.userJobTitle,
              phoneNumber: userCompany.userPhoneNumber,
              activeDaysLast30: userCompany.activeDaysLast30,
              activeDaysLast60: userCompany.activeDaysLast60,
              activeDaysLast90: userCompany.activeDaysLast90,
              companyUiGroupUuid: userCompany.companyUiGroupUuid,
              companyUiGroupName: userCompany.companyUiGroupName
            },
            company: {
              '@id': `/api/companies/${userCompany.companyUuid}`,
              uuid: userCompany.companyUuid,
              name: userCompany.companyName
            }
          }
        })

        welcomeStore.setGeneratedUsers(data.getCompanyUsers)
      } else if (newUsers && newUsers.length === 0) {
        data.users = []
        data.getCompanyUsers = []
      }
    }, { immediate: true })

    // GraphQL: Link search input to GraphQL filter with debounce (500ms delay)
    const updateSearch = useDebounceFn((newSearch: string) => {
      graphqlFilters.value.search = newSearch
    }, 500)

    watch(() => data.findByName, (newSearch) => {
      updateSearch(newSearch)
    })

    /**
     * if the limit has been reached for the current company, the add button will be disabled
     */
    const amountOfUsersComputed = computed(() => data.amountOfUsers)
    const limitUsers = computed(() => data.limitUsers)
    const showAddUser = computed(() => limitUsers.value === data.amountOfUsers)


    /**
     * loading is finished for both the amount of users and the limit
     */
    const loadingFinished = computed(() => {
      return data.loadingLimitUsersValue === false && data.loadingUsers === false
    })

    /**
     * if the limit has been reached for the current company, the add button will be disabled
     * and text below the btn will show
     * **/
    const limitReached = computed(() => {
      if (isSuperAdmin.value) {
        return false
      } else {
        return loadingFinished.value && (limitUsers.value <= amountOfUsersComputed.value)
      }
    })

    /**
     * Get amount of users
     */
    function getAmountOfUsers() {
      data.loadingLimitUsersValue = true
      const params = {
        companyId: userStore.getUserCompanyId,
        isFromUserPanel: true,
        callbackSuccess: (response: any) => {
          data.limitUsers = response.limitUsers
          data.amountOfUsers = response.externalUsers
          data.loadingLimitUsersValue = false
        },
        callbackError: (callbackErrorData: any) => {
          data.loadingLimitUsersValue = true
        }
      }
      userStore.getAmountOfUsers(params)
    }

    function adjustDefaultPageSize() {
      data.widthScreen = window.innerWidth;
      if (data.widthScreen < data.XlargeScreen) {
        data.pageSizeNumber = 10
      }
      if (data.widthScreen < data.largeScreen) {
        data.pageSizeNumber = 8
      }
      if (data.widthScreen < data.mediumScreen) {
        data.pageSizeNumber = 5
      }
      if (data.widthScreen < data.smallScreen) {
        data.pageSizeNumber = 5
      }
      data.key++
    }

    // ? - Use vuex
   function getGridColumns(): Array<any> {
      return defaultCompaniesUsersGridColumnsUserPanel
    }

    function closeRevokeModal() {
      data.showRevokeAccessModal = false
    }

    // GraphQL: Page change handler for CalculumGridGraphql
    function pageChangeHandler(event: any) {
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
    }

    // GraphQL: Data change handler (sorting and filtering) for CalculumGridGraphql
    async function dataChangeHandler(filter: any, sort: any) {
      lastGridFilter.value = filter ?? null
      const fieldMapping: Record<string, string> = {
        'user': 'userEmail',
        'email': 'userEmail',
        'lastActivity': 'lastActivity',
        'activeDaysLast30': 'activeDaysLast30',
        'activeDaysLast60': 'activeDaysLast60',
        'activeDaysLast90': 'activeDaysLast90',
        'user.enabled': 'enabled'
      }

      // Reset pagination to first page when sorting or filtering changes
      pagination.value = { first: pagination.value.first, skip: 0 }

      // Convert Kendo filter to telerikFilter (JSON string) for GraphQL query
      graphqlFilters.value.telerikFilter = filter ? (formatData.convertFiltersToREST(filter) ?? undefined) : undefined

      // Update sort settings for grid (visual state)
      sortSettings.value = sort
      
      if (sort && sort.length > 0) {
        const order = sort.map((s: any) => {
          const graphqlField = fieldMapping[s.field] || s.field
          return { [graphqlField]: s.dir.toUpperCase() }
        })
        graphqlFilters.value.order = order
      } else {
        graphqlFilters.value.order = undefined
      }

      // Convert Kendo filter format to GraphQL filter format
      if (filter && filter.filters && filter.filters.length > 0) {
        // Reset specific filters that come from the grid
        graphqlFilters.value.enabled = undefined
        graphqlFilters.value.roles = undefined
        
        filter.filters.forEach((f: any) => {
          if (f.field === 'user' || f.field === 'email') {
            // Both map to search for now
            graphqlFilters.value.search = f.value
            data.findByName = f.value // Sync with manual search box UI
          } else if (f.field === 'user.enabled') {
            graphqlFilters.value.enabled = f.value
          } else if (f.field === 'roles') {
            graphqlFilters.value.roles = f.value
          }
        })
        
        // If text filters were cleared
        const hasTextFilter = filter.filters.some((f: any) => f.field === 'user' || f.field === 'email')
        if (!hasTextFilter) {
          graphqlFilters.value.search = ''
          data.findByName = ''
        }
      } else {
        // Clearing all filters
        graphqlFilters.value.enabled = undefined
        graphqlFilters.value.roles = undefined

        if (filter !== null) {
          graphqlFilters.value.search = ''
          data.findByName = ''
        }
      }

      // Note: No need to call graphqlRefetch() manually - the composable watches graphqlFilters reactively
    }

    /**
     * Get users
     * removes the underscore from the role(s)
     */
    const userCollection = computed(() => {
      const result = data.users.map((u: UserSession) => {
        // Parse roles
        const roles = u.roles.map((role: string) => {
          // Remove "ROLE_" prefix
          let parsedRole = role.substring(5)

          // parsedRole = parsedRole.charAt(0).toUpperCase() + parsedRole.slice(1)

          return parsedRole
        })

        return {
          ...u,
          roles
          // logo: '//logo.clearbit.com/' + u.email.substring(u.email.indexOf('@') + 1, u.email.length)
        }
      })

      // GraphQL: No client-side filtering needed, search is done server-side
      return result
    })

    function showDeleteModal(userObj: any) {
      data.deleteUserObj = userObj['userCompanyId']
      data.showDeleteConfirmModal = true
    }

    function letterOfDomain(name: any) {
      return name ? name.substring(0, 1) : ''
    }

    function imagesError(user: any) {
      user.letter = true
    }

    /** CALLBACKS */
    function callbackFormAddUserClose() {
      data.isUserAddOrEditFormShown = false
    }

    function callbackUpdateUserList() {
      getAmountOfUsers()
      graphqlRefetch()
    }

    /** Export users list to Excel via global filter export API */
    function exportUsersToExcel() {
      loadExport.value = true
      const filters_grid: Record<string, any> = {
        telerikFilter: formatData.convertFiltersToREST(lastGridFilter.value),
        globalFilter: null,
        companyUuid: companyUuid.value,
        companyUsers: true,
      }
      if (graphqlFilters.value.search) filters_grid.search = graphqlFilters.value.search
      const params = {
        level: 'CompanyUserGraphQL',
        section: 'home',
        filters_grid,
        callbackSuccess: (callbackSuccessData: any) => {
          loadExport.value = false
          const columnsToExport = data.listUsersColumns
            .filter((c: any) => c.field && c.field !== 'actions')
            .map((c: any) => c.field === 'roles' ? { ...c, width: 250 } : c)
          const transformedData = callbackSuccessData.map((row: any) => ({
            ...row,
            enabled: row.enabled ? 'Enabled' : 'Disabled',
            roles: Array.isArray(row.roles) ? row.roles.map((r: string) => r.replace('ROLE_', '')).join(', ') : row.roles
          }))
          const safeCompany = (companyName ?? 'Company')
            .toString().trim().replace(/[^\w-]+/g, '_')
          const exportDate = formatData.getISODate(new Date().toISOString())
          saveExcel({
            data: transformedData,
            fileName: `${safeCompany}_Users_${exportDate}`,
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

    /** PRIVATE METHODS */
    function apiDeleteUser() {
      data.loadingUsers = true
      data.showDeleteConfirmModal = false

      const params = {
        userID: data.deleteUserObj,
        isFromUserPanel: true,
        callbackSuccess: () => {
          data.showDeleteConfirmModal = false
          data.loadingUsers = false

          toast.success(translate.t('global.successDeleteUser'))
          getAmountOfUsers()
          graphqlRefetch()
        },
        callbackError: () => {
          data.loadingUsers = false
          data.showDeleteConfirmModal = false
          toast.error(translate.t('global.errorDeleteUser'))
        }
      }
      userStore.deleteUser(params)
    }

    function getUser(user: any) {
      data.userID = user['@id']
      data.firstName = user.userFirstName
      data.lastName = user.userLastName
      data.email = user.userEmail

      data.roles.view = false
      data.roles.admin = false
      data.roles.compare = false
      data.roles.categorize = false
      data.roles.plan = false
      data.roles.execute = false
      data.roles.setup = false
      rolesChecked(user)
    }

    function getUsers() {
      return welcomeStore.getUsers ? parseUsers(welcomeStore.getUsers) : []
    }

    function onClickMessageClear() {
      data.showInviteUserSuccess = false
    }

    function onClickOpenFormToAddUser(type: string, user?: any) {
      data.typeOfFormShown = type || UserFormType.ADD_USER
      data.dataFormEdit = {
        firstName: '',
        lastName: '',
        email: '',
        roles: ''
      }
      if (user) {
        user.showUserOptions = !user.showUserOptions
      }
      data.isUserAddOrEditFormShown = true
    }

    function onClickOpenFormToEditUser(type: boolean, user: any) {
      data.isUserAddOrEditFormShown = true
      data.typeOfFormShown = type ? UserFormType.EDIT_USER : UserFormType.ADD_USER
      let userCompany = ''
      data.getCompanyUsers.forEach(users => {
        if (user['@id'] === users.user['@id']) {
          userCompany = users['@id']
        }
      })

      data.isNewUser = data.typeOfFormShown === UserFormType.ADD_USER

      if (type) {
        data.dataFormEdit = {
          firstName: user.userFirstName,
          lastName: user.userLastName,
          email: user.userEmail,
          roles: user.roles,
          userId: user['@id'],
          userCompany: userCompany,
          userCompanyId: user.userCompanyId
        }
        if (user) {
          user.showUserOptions = !user.showUserOptions
        }
      }
    }

    function onShowUserOptions(user: any) {
      user.showUserOptions = !user.showUserOptions
    }

    /**
     * Takes an array of users as input and returns a new array with some modifications applied 
     * to each user object.
     * 1. Add showUserOptions prop to each user
     * 2. ? -: Remove the IRI from user IDs ??
     */
    function parseUsers(users: Array<any>) {
      const result: Array<any> = []

      users.forEach((user: any) => {
        // Add the modified user object to the 'result' array with
        // an additional property called 'showUserOptions' set to "false"
        result.push(Object.assign(user, { showUserOptions: false }))
      })

      return result
    }

    function rolesChecked(user: any) {
      user.roles.forEach((ele: string) => {
        if (ele === Roles.ADMIN || ele === Roles.COMPANY_ADMIN) {
          data.roles.admin = true
        }
        if (ele === Roles.COMPANY_ADMIN) {
          data.roles.admin = true
        }

      })
    }

    function userRolesToString(roles: Array<string>): string {
      let result = ''

      if (!roles || (roles && roles.length === 0)) return result

      if (Object.values(roles).includes(Roles.ADMIN)) {
        result += result.length > 0 ? ', Admin' : 'Admin'
      }
      if (Object.values(roles).includes(Roles.STANDARD)) {
        result += result.length > 0 ? ', User' : 'User'
      }

      return result
    }

    function toggleRevokeModal(user: any, revoke: boolean) {
      data.userObj.id = user['@id']
      data.userObj.company = user.companyUuid
      data.isForRevoking = revoke
      data.showRevokeAccessModal = true

    }

    function grantUserToAllCompanies() {
      const params = {
        userId: data.userObj.id,
        companyId: data.userObj.company,
        allCompanies: true,
        isFromUserPanel: true,
        callbackSuccess: () => {

          toast.success(translate.t('global.modal.grant.all.success'))
          data.showRevokeAccessModal = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.grant.all.error'))
          data.showRevokeAccessModal = false
        }
      }
      adminBackendStore.grantAccess(params)
    }

    function grantUserToCurrentCompany() {
      const params = {
        userId: data.userObj.id,
        companyId: data.userObj.company,
        allCompanies: false,
        isFromUserPanel: true,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.grant.current.success'))
          data.showRevokeAccessModal = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.grant.current.error'))
          data.showRevokeAccessModal = false
          graphqlRefetch()
        }
      }
      adminBackendStore.grantAccess(params)
    }

    function revokeUserFromAllCompanies() {
      const params = {
        userId: data.userObj.id,
        companyId: data.userObj.company,
        allCompanies: true,
        isFromUserPanel: true,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.revoke.all.success'))
          data.showRevokeAccessModal = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.revoke.all.error'))
          data.showRevokeAccessModal = false
          graphqlRefetch()
        }
      }
      adminBackendStore.revokeAccess(params)
    }

    function revokeUserFromCurrentCompany() {
      const params = {
        userId: data.userObj.id,
        companyId: data.userObj.company,
        allCompanies: false,
        isFromUserPanel: true,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.revoke.current.success'))
          data.showRevokeAccessModal = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.revoke.current.error'))
          data.showRevokeAccessModal = false
        }
      }
      adminBackendStore.revokeAccess(params)
    }

    function resendInvitation(user: any) {
      data.loadingUsers = true
      const params = {
        userID: user['userCompanyId'],
        isFromUserPanel: true,
        callbackSuccess: (response: any) => {
          toast.success(translate.t('global.successResendInvitationUser'))
          data.loadingUsers = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.errorResendInvitationUser'))
          data.loadingUsers = false
        }
      }
      userStore.resendInvitation(params)
    }

    /**
     * onMounted
     */
    onMounted(() => {
      getAmountOfUsers()
      // GraphQL: Data is fetched automatically by useCompanyUsers composable
      if (!isAdmin.value) {
        Routing.home.openHomeDashBoard()
      }

      window.addEventListener('resize', adjustDefaultPageSize)
    })

    /**
     * onUnmounted
     */
    onUnmounted(() => {
      welcomeStore.setGeneratedUsers([])
      window.removeEventListener('resize', adjustDefaultPageSize)
    })


    function confirmResetIdentity(user: any) {

      data.homeManageTeam.id = user['@id']
      data.homeManageTeam.company = user.companyUuid

      data.showConfirmModalResetIdentityProvider = true
    }


    function confirmResetIdentityProvider() {
      data.showConfirmModalResetIdentityProvider = false
      const params = {
        userId: data.homeManageTeam.id,
        companyId: data.homeManageTeam.company,
        isFromUserPanel: true,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.resetIdentity.success'))
          data.showConfirmModalResetIdentityProvider = false
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.resetIdentity.error'))
          data.showConfirmModalResetIdentityProvider = false
        }
      }
      adminBackendStore.resetIdentityProvider(params)
    }


    function invalidateToken(user: any) {
      data.loadingUsers = true
      const params = {
        userID: user['@id'],
        isFromUserPanel: true,
        callbackSuccess: (response: any) => {
          toast.success(translate.t('global.successInvalidatetoken'))
          data.loadingUsers = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.errorInvalidatetoken'))
          data.loadingUsers = false
        }
      }

      userStore.invalidateToken(params)
    }

    return {
      ...toRefs(data),
      amountOfUsersComputed,
      apiDeleteUser,
      callbackFormAddUserClose,
      callbackUpdateUserList,
      closeRevokeModal,
      companyName,
      companyUuid,
      dataChangeHandler,
      exportUsersToExcel,
      loadExport,
      fontIcons,
      formatData,
      UserFormType,
      getUser,
      graphqlLoading,
      graphqlTotalCount,
      grantUserToAllCompanies,
      grantUserToCurrentCompany,
      images,
      imagesError,
      isSuperAdmin,
      isAdmin,
      userCollection,
      letterOfDomain,
      limitReached,
      limitUsers,
      loadingFinished,
      onClickMessageClear,
      onClickOpenFormToAddUser,
      onClickOpenFormToEditUser,
      onShowUserOptions,
      pageChangeHandler,
      pagination,
      resendInvitation,
      revokeUserFromAllCompanies,
      revokeUserFromCurrentCompany,
      router,
      sortSettings,
      Routing,
      showDeleteModal,
      toggleRevokeModal,
      userRolesToString,
      confirmResetIdentity,
      confirmResetIdentityProvider,
      invalidateToken,
      showAddUser
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
// ? - Remove unused styles

.width-250 {
  width: 250px;
}

.card--full .card__body {
  margin-bottom: 0 !important;
  height: 100% !important;
}

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

.circle {
  width: 40px;
  height: 40px;
  -moz-border-radius: 50%;
  -webkit-border-radius: 50%;
  border-radius: 50%;
  background: gray;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    color: white !important;
  }

  span {
    color: white;
  }
}

#custom-scroll {
  overflow-x: scroll;
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
  font-size: 0.75rem;
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
      border-color: #dee2e6;
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

        .input-group {
          width: 100%;
        }
      }
    }
  }
}
</style>
