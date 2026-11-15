import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserSession, UserSessionActiveCompany, UserCompanySpendFiles, UserCompanyEMISFiles, UserSessionActiveCompanySpendFileVersion } from '@/types'
import * as User from '@/services/user/api'
import { authWarningState } from "@/utils/authWarningState"
import { isNullOrUndefined, hasFeatureRole } from "@/utils"
import { FEATURE_ROLES } from '@/constants/featureRoles'
import { secureStorage } from '@/services/pinia/index'
import { useEntityCardStore } from '@/stores/entityCard'
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import { useAnalyzeStore } from '@/stores/analyze';

async function postUserCompany(props: any) {
  const { selectedCompany, callbackSuccess, callbackError }: any = props
  const response = User.postUserCompany(selectedCompany)
  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }
    if (callbackError) {
      callbackError(response)
    }
  })
}

async function postCreateMultipleUsersbyEmail(props: any) {
  const {
    email, language, roles, companyId, isFromUserPanel, callbackSuccess, callbackError
  }: any = props
  const response = User.postCreateMultipleUsersbyEmail(email, language, roles, companyId, isFromUserPanel)

  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  })
}

async function getAmountOfUsers(props: any) {
  const { companyId, isFromUserPanel, callbackSuccess, callbackError }: any = props
  const response = User.getAmountOfUsers(companyId, isFromUserPanel)
  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response.data)
    }
  })
}

async function deleteUser(props: any) {
  const { userID, isFromUserPanel, callbackSuccess, callbackError }: any = props
  const response = User.deleteUser(userID, isFromUserPanel)
  if (import.meta.env.DEV) console.log('deleteUser - userID:', userID)

  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response.data)
    }
  })
}

async function resendInvitation(props: any) {
  const { userID, isFromUserPanel, callbackSuccess, callbackError }: any = props
  const response = User.resendInvitation(userID, isFromUserPanel)
  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response.data)
    }
  })
}

async function invalidateToken(props: any) {
  const { userID, isFromUserPanel, callbackSuccess, callbackError }: any = props
  const response = User.invalidateToken(userID, isFromUserPanel)
  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response.data)
    }
  })
}

async function getSessionInfo(props: any) {
  const { callbackSuccess, callbackError }: any = props
  const response = User.getSessionInfo()

  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response)
      }
      return
    }

    if (callbackError) {
      callbackError()
    }
  })
}

async function getFirebaseToken(props: any) {
  const { callbackSuccess, callbackError }: any = props
  const response = User.getFirebaseToken()

  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response)
      }
      return
    }

    if (callbackError) {
      callbackError()
    }
  })
}

async function authLogin(props: any) {
  const { callbackSuccess, callbackError, idps }: any = props
  const response = User.authLogin(idps)

  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError()
    }
  })
}

async function getFlowToLogout(props: any) {
  const { callbackSuccess, callbackError }: any = props
  const response = User.getFlowToLogout()

  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError()
    }
  })
}

async function getFlowResetPassword(props: any) {
  const { callbackSuccess, callbackError }: any = props
  const response = User.getFlowResetPassword()

  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError()
    }
  })
}

export const useUserStore = defineStore('user', () => {
  // State
  const globalFiltersStore = useGlobalFiltersStore();
  const analyzeStore = useAnalyzeStore();
  const actualUser = ref<UserSession | null>(null)
  const sourceAccount = ref<string | null>(null)
  const guardUri = ref<string | null>(null)
  const userCompanySpendFiles = ref<UserCompanySpendFiles>({ spendFiles: [] })
  const userCompanyEMISFiles = ref<UserCompanyEMISFiles>({ emisFiles: [] })
  const showMenus = ref<boolean>(false)
  const showGlobalFiltersPanel = ref<number | null>(null)
  const paymentCycleDays = ref<number | null>(null)
  const financingStrategyMethod = ref<string | null>(null)
  const hideAverageDaysPaid = ref<boolean>(false)
  const hasContractualPaymentTerms = ref<boolean>(false)
  const payOnTermsStrategyAllowed = ref<boolean>(true)
  const error409 = ref<number>(0)
  const error410 = ref<boolean>(false)
  const error403 = ref<boolean>(false)
  const showSpendNoty = ref<boolean>(false)
  const fromLogin = ref<boolean>(false)
  const userInvitation = ref<boolean>(false)
  const userInvitationId = ref<string | null>(null)
  const lastSectionVisitedbyUser = ref<any | null>(null)
  const eventToken = ref<string | null>(null)
  const last9boxOptionVisited = ref<string | null>(null)
  const tokenForExternalVPUser = ref<string | null>(null)  
  // Non-persisted: reset on every page load (session-only, like disableWatchers in globalFilters)
  const pendingNewSpendFileVersion = ref<UserSessionActiveCompanySpendFileVersion | null>(null)

  // Getters
  const getTokenForExternalVPUser = computed(() => tokenForExternalVPUser.value)

  const getLast9boxOptionVisited = computed(() => last9boxOptionVisited.value)

  const getLastSectionVisitedbyUser = computed(() => lastSectionVisitedbyUser.value)

  const getUserInvitation = computed(() => userInvitation.value)
  
  const getUserInvitationId = computed(() => userInvitationId.value)

  const getFromLogin = computed(() => fromLogin.value)

  const getShowSpendNoty = computed(() => showSpendNoty.value)
  
  const getError410 = computed(() => error410.value)
  
  const getError403 = computed(() => error403.value)
  
  const getError409 = computed(() => error409.value)
  
  const getPaymentCycleDays = computed(() => paymentCycleDays.value)
  
  const getFinancingStrategyMethod = computed(() => financingStrategyMethod.value)

  const getHideAverageDaysPaid = computed(() => hideAverageDaysPaid.value)

  const getHasContractualPaymentTerms = computed(() => hasContractualPaymentTerms.value)

  const getPayOnTermsStrategyAllowed = computed(() => payOnTermsStrategyAllowed.value)

  // AB#20023: hideAverageDaysPaid is the cash flow basis switch (hide = Contractual). On a
  // Contractual basis Pay on Terms is hidden too, whatever its own strategy switch says.
  const getShowPayOnTerms = computed(() => payOnTermsStrategyAllowed.value && !hideAverageDaysPaid.value)

  const getUser = computed(() => actualUser.value)
  
  const getUserNumberFormatting = computed(() => {
    let finalFormatting = ""
    const langUser = actualUser.value?.language
    const decimalFormattingUser = actualUser.value?.decimalFormatting
    if (decimalFormattingUser === null || langUser === null) {
      finalFormatting = "en-US"
    } else {
      finalFormatting = langUser + "-" + decimalFormattingUser
    }
    return finalFormatting
  })
  
  const getUserCompanyId = computed(() => {
    if (import.meta.env.DEV)
      console.warn(
        "** DEPRECATED: userStore / getUserCompanyId. Use useUser instead."
      )

    // Validate
    if (
      isNullOrUndefined(actualUser.value) ||
      isNullOrUndefined(actualUser.value.activeCompany)
    ) {
      if (import.meta.env.DEV)
        console.error(
          "** Error in getUserCompanyId: state.actualUser is null."
        )

      return ""
    }

    return actualUser.value.activeCompany["@id"]
  })
  
  const getUserId = computed(() => {
    if (import.meta.env.DEV)
      console.warn(
        "** DEPRECATED: userStore / getUserId. Use useUser instead."
      )

    // Validate
    if (isNullOrUndefined(actualUser.value)) {
      if (import.meta.env.DEV)
        console.error(
          "** Error in getUserId: state.actualUser is null."
        )

      return ""
    }

    return actualUser.value["@id"]
  })
  
  const isInitialSetupCompleted = computed(() => {
    if (import.meta.env.DEV) {
      console.warn(
        "** DEPRECATED: userStore / isInitialSetupCompleted. Not in the API."
      )
    }

    return false
  })
  
  const needInitialSetup = computed(() => {
    if (
      actualUser.value !== null &&
      actualUser.value.roles !== null &&
      actualUser.value.roles !== undefined
    ) {
      if (
        Object.values(actualUser.value.roles).includes("ROLE_COMPANY_ADMIN")
      ) {
        return true
      }
    }
    return false
  })
  
  const isSuperAdmin = computed(() => {
    return (
      actualUser.value !== null &&
      ((actualUser.value.roles !== null &&
        actualUser.value.roles !== undefined &&
        Object.values(actualUser.value.roles).includes("ROLE_ADMIN")) ||
        actualUser.value.isSuperAdmin)
    )
  })
  
  const isSalesTeam = computed(() => {

    if (actualUser.value) {
      return Object.values(actualUser.value.roles).includes("ROLE_SALES")
    }
    return false

  })

  const isDataTeam = computed(() => {

    if (actualUser.value) {
      return Object.values(actualUser.value.roles).includes("ROLE_DATA")
    }
    return false

  })
  
  const isAdmin = computed(() => {
    if (
      actualUser.value !== null &&
      actualUser.value.roles !== null &&
      actualUser.value.roles !== undefined
    ) {
      const arrayRoles = Object.values(actualUser.value.roles)
      const adminRole = arrayRoles.find(
        (x: any) => x === "ROLE_ADMIN" || x === "ROLE_COMPANY_ADMIN"
      )
      return adminRole || actualUser.value.isSuperAdmin ? true : false
    } else {
      return false
    }
  })
  
  const getCompanyName = computed(() => {
    if (
      actualUser.value !== null &&
      actualUser.value.activeCompany !== null &&
      actualUser.value.activeCompany !== undefined
    ) {
      return actualUser.value.activeCompany.name
    }
    return ""
  })
  
  const getCompany = computed(() => {
    if (
      actualUser.value !== null &&
      actualUser.value.activeCompany !== null &&
      actualUser.value.activeCompany !== undefined
    ) {
      return actualUser.value.activeCompany
    }
    return null
  })
  
  const getCompanySpendFiles = computed(() => userCompanySpendFiles.value)
  
  const getCompanyEMISFiles = computed(() => userCompanyEMISFiles.value)
  
  const getPageSize = computed(() => actualUser.value?.pageSize || 25)
  
  const getUserCompanyIndustryRelations = computed(() => {
    if (
      actualUser.value !== null &&
      actualUser.value.activeCompany !== null &&
      actualUser.value.activeCompany !== undefined &&
      (actualUser.value.activeCompany as any).companyIndustryRelations !== null &&
      (actualUser.value.activeCompany as any).companyIndustryRelations !== undefined
    ) {
      return (actualUser.value.activeCompany as any).companyIndustryRelations
    }
    return []
  })
  
  const getShowMenu = computed(() => showMenus.value)
  const getShowGlobalFiltersPanel = computed(() => showGlobalFiltersPanel.value)
  
  const getSourceAccount = computed(() => sourceAccount.value)
  
  const getEventToken = computed(() => eventToken.value)
  
  const getGuardURI = computed(() => guardUri.value)

  const getPendingNewSpendFileVersion = computed(() => pendingNewSpendFileVersion.value)
  // Actions
  function logOut() {
    // US-17561 AC-01: with FEATURE_DYNAMIC_FILTERED_SUMMARIES the global filter must survive the
    // logout so the session-restore banner has something to announce on the next login. Read the
    // role BEFORE actualUser is nulled below, or there is no company left to read it from.
    const keepGlobalFilters = hasFeatureRole(
      actualUser.value?.roles ?? [],
      FEATURE_ROLES.DYNAMIC_FILTERED_SUMMARIES
    )

    actualUser.value = null
    sourceAccount.value = null
    guardUri.value = null
    userCompanySpendFiles.value = { spendFiles: [] }
    userCompanyEMISFiles.value = { emisFiles: [] }
    showMenus.value = false
    paymentCycleDays.value = null
    financingStrategyMethod.value = null
    hideAverageDaysPaid.value = false
    payOnTermsStrategyAllowed.value = true
    error409.value = 0
    error410.value = false
    error403.value = false
    showSpendNoty.value = false
    fromLogin.value = false
    userInvitation.value = false
    userInvitationId.value = null
    lastSectionVisitedbyUser.value = null
    eventToken.value = null
    last9boxOptionVisited.value = null
    tokenForExternalVPUser.value = null
    pendingNewSpendFileVersion.value = null

    analyzeStore.setFinancingsGroupsbyProgram([]);
    analyzeStore.setHarmonizationsGroupsbyProgram([]);
    analyzeStore.setHasFinancing(false)
    analyzeStore.setHasHarmonization(false)
    analyzeStore.setGroups([])
    analyzeStore.setFinancing([])

    // Clean global filters when user logs out (skipped when the company keeps them across sessions)
    if (!keepGlobalFilters) {
      globalFiltersStore.setFiltersApplied({
        filters: [],
        logic: "and"
      });
      globalFiltersStore.setValuesByColumn({
        spends: [],
        suppliers: [],
        parents: [],
        potentials: []
      });
    }
  }

  function setBatchUpdate(updates: {
    setError403?: boolean
    setError410?: boolean
    setShowSpendNoty?: boolean
    setFromLogin?: boolean
    setUserInvitation?: boolean
    setUserInvitationId?: string | null
    setLastSectionVisitedbyUser?: any | null
    setLast9boxOptionVisited?: string | null
    setTokenForExternalVPUser?: string | null
  }) {
    if (updates.setError403 !== undefined) error403.value = updates.setError403
    if (updates.setError410 !== undefined) error410.value = updates.setError410
    if (updates.setShowSpendNoty !== undefined) showSpendNoty.value = updates.setShowSpendNoty
    if (updates.setFromLogin !== undefined) fromLogin.value = updates.setFromLogin
    if (updates.setUserInvitation !== undefined) userInvitation.value = updates.setUserInvitation
    if (updates.setUserInvitationId !== undefined) userInvitationId.value = updates.setUserInvitationId
    if (updates.setLastSectionVisitedbyUser !== undefined) lastSectionVisitedbyUser.value = updates.setLastSectionVisitedbyUser
    if (updates.setLast9boxOptionVisited !== undefined) last9boxOptionVisited.value = updates.setLast9boxOptionVisited
    if (updates.setTokenForExternalVPUser !== undefined) tokenForExternalVPUser.value = updates.setTokenForExternalVPUser
  }

  function setFromLogin(value: any): boolean {
    fromLogin.value = value
    return fromLogin.value
  }

  function setShowSpendNoty(value: any): any {
    showSpendNoty.value = value
    return showSpendNoty.value
  }

  function setPendingNewSpendFileVersion(version: UserSessionActiveCompanySpendFileVersion | null) {
    pendingNewSpendFileVersion.value = version
  }

  function setError409(value: any): any {
    error409.value = value
    return error409.value
  }

  function setError410(value: any): any {
    error410.value = value
    return error410.value
  }

  function setError403(value: any): any {
    error403.value = value
    return error403.value
  }

  function setPaymentCycleDays(days: any) {
    paymentCycleDays.value = days
  }

  function setFinancingStrategyMethod(methods: any) {
    financingStrategyMethod.value = methods
  }

  function setHideAverageDaysPaid(value: boolean) {
    hideAverageDaysPaid.value = value
  }

  function setHasContractualPaymentTerms(value: boolean) {
    hasContractualPaymentTerms.value = value
  }

  function setPayOnTermsStrategyAllowed(value: boolean) {
    payOnTermsStrategyAllowed.value = value
  }

  function setActualUser(userSession: UserSession) {
    actualUser.value = userSession
    setDefaultProgram()

    if (actualUser.value.activeCompany) {
      setPaymentCycleDays(actualUser.value.activeCompany.paymentCycleDays)
      setFinancingStrategyMethod(actualUser.value.activeCompany.financingStrategyMethod)
      setHideAverageDaysPaid(actualUser.value.activeSpendFileVersion?.hideAverageDaysPaid ?? false)
      setHasContractualPaymentTerms(actualUser.value.activeSpendFileVersion?.hasContractualPaymentTerms ?? false)
      setPayOnTermsStrategyAllowed(actualUser.value.activeSpendFileVersion?.payOnTermsStrategyAllowed ?? true)
    }
  }

  function setDefaultProgram() {
    const entityCardStore = useEntityCardStore()
    entityCardStore.setSelectedProgram(actualUser.value?.activeProgramDefaultId ?? null)
  }

  function setShowMenu(status: boolean) {
    showMenus.value = status
  }

  function setShowGlobalFiltersPanel(numberRandom: number) {
    console.log("** watch 2")
    showGlobalFiltersPanel.value = numberRandom
  }

  function setUserCompany(company: UserSessionActiveCompany) {
    if (actualUser.value) {
      actualUser.value.activeCompany = company
    }
  }

  function setCompanyLogo(companyLogoData: UserSessionActiveCompany["logo"]) {
    if (
      actualUser.value !== null &&
      actualUser.value.activeCompany !== null &&
      actualUser.value.activeCompany !== undefined
    ) {
      actualUser.value.activeCompany.logo = companyLogoData
    }
  }

  function setGeneratedSpendFiles(spendFiles: UserCompanySpendFiles) {
    userCompanySpendFiles.value = spendFiles
  }

  function setActiveSpendFileVersion(activeSpendFileVersion: any) {
    if (actualUser.value) {
      actualUser.value.activeSpendFileVersion = activeSpendFileVersion
    }
  }

  function setPageSize(pageSize: number) {
    if (actualUser.value) {
      actualUser.value.pageSize = pageSize
    }
  }

  function setDecimalFormatting(payload: string): void {
    if (actualUser.value) {
      actualUser.value.decimalFormatting = payload
    }
  }

  function setSourceAccount(source: any): void {
    sourceAccount.value = source
  }

  function setEventToken(token: any): void {
    eventToken.value = token
  }

  function setGuardURI(uri: any) {
    guardUri.value = uri
  }

  function setUserInvitation(user: any): void {
    userInvitation.value = user
  }

  function setUserInvitationId(user: any): void {
    userInvitationId.value = user
  }

  function setLastSectionVisitedbyUser(section: any): void {
    lastSectionVisitedbyUser.value = section
  }

  function setLast9boxOptionVisited(section: any): void {
    last9boxOptionVisited.value = section
  }

  function setTokenForExternalVPUser(token: any): void {
    tokenForExternalVPUser.value = token
  }

  function setUserCompanyIndustryRelations(relations: any[]): void {
    if (actualUser.value && actualUser.value.activeCompany) {
      (actualUser.value.activeCompany as any).companyIndustryRelations = relations
    }
  }

  // API Actions
  async function whoAmI(props: any): Promise<void> {
    const { callbackSuccess, callbackError }: any = props

    const response = User.getWhoAmI()
    await response.then(response => {
      if (response.success) {
        // Set the user in the store
        setActualUser(response.data)
        
        // Reset the 401 warning state since we're now authenticated
        authWarningState.resetWarningState()

        if (callbackSuccess) {
          callbackSuccess(response.data)
        }

        return
      }

      if (callbackError) {
        callbackError()
      }
    })
  }

  async function fetchCompanySpendFiles(props: any) {
    const { companyId, callbackSuccess, callbackError }: any = props
    const response = User.getCompanySpendFiles(companyId)

    await response.then((response) => {
      if (response.success) {
        setGeneratedSpendFiles(response.data['hydra:member'])
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }

      if (callbackError) {
        callbackError()
      }
    })
  }

  async function changeActualFile(props: any) {
    const { obj, user, callbackSuccess, callbackError }: any = props
    const response = User.patchChangeActualFile(obj, user)

    await response.then((response) => {
      if (response.success) {
        setActiveSpendFileVersion(response.data.activeSpendFileVersion)
        
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        
        return
      }

      if (callbackError) {
        callbackError()
      }
    })
  }



    async function updateVideoPreferences(props: any) {
    const { obj, user, callbackSuccess, callbackError }: any = props
    const response = User.updateVideoPreferences(obj, user)

    await response.then((response) => {
      if (response.success) {
        setActiveSpendFileVersion(response.data.activeSpendFileVersion)
        
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        
        return
      }

      if (callbackError) {
        callbackError()
      }
    })
  }

  /** Remove user–company assignment by user UUID and company UUID (same effect as deleteUser for that relation). */
  async function removeUserCompanyByUuids(props: any) {
    const { userUuid, companyUuid, callbackSuccess, callbackError }: any = props
    const response = User.removeUserCompanyByUuids(userUuid, companyUuid)
    if (import.meta.env.DEV) console.log('removeUserCompanyByUuids - userUuid:', userUuid, 'companyUuid:', companyUuid)

    await response.then((response) => {
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }

      if (callbackError) {
        callbackError(response)
      }
    })
  }

  /** Update roles for the user-company relation by user UUID and company UUID. */
  async function updateUserCompanyRolesByUuids(props: any) {
    const { userUuid, companyUuid, roles, callbackSuccess, callbackError }: any = props
    const response = User.updateUserCompanyRolesByUuids(userUuid, companyUuid, roles)
    if (import.meta.env.DEV) console.log('updateUserCompanyRolesByUuids - userUuid:', userUuid, 'companyUuid:', companyUuid, 'roles:', roles)

    await response.then((response) => {
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }

      if (callbackError) {
        callbackError(response)
      }
    })
  }


  return {
    // State
    actualUser,
    sourceAccount,
    guardUri,
    userCompanySpendFiles,
    userCompanyEMISFiles,
    showMenus,
    paymentCycleDays,
    financingStrategyMethod,
    hideAverageDaysPaid,
    payOnTermsStrategyAllowed,
    error409,
    error410,
    error403,
    showSpendNoty,
    fromLogin,
    userInvitation,
    userInvitationId,
    lastSectionVisitedbyUser,
    eventToken,
    last9boxOptionVisited,
    tokenForExternalVPUser,
    showGlobalFiltersPanel,
    
    // Getters
    getTokenForExternalVPUser,
    getLast9boxOptionVisited,
    getLastSectionVisitedbyUser,
    getUserInvitation,
    getUserInvitationId,
    getFromLogin,
    getShowSpendNoty,
    getError410,
    getError403,
    getError409,
    getPaymentCycleDays,
    getFinancingStrategyMethod,
    getHideAverageDaysPaid,
    getHasContractualPaymentTerms,
    getPayOnTermsStrategyAllowed,
    getShowPayOnTerms,
    getUser,
    getUserNumberFormatting,
    getUserCompanyId,
    getUserId,
    isInitialSetupCompleted,
    needInitialSetup,
    isSuperAdmin,
    isSalesTeam,
    isDataTeam,
    isAdmin,
    getCompanyName,
    getCompany,
    getCompanySpendFiles,
    getCompanyEMISFiles,
    getPageSize,
    getUserCompanyIndustryRelations,
    getShowMenu,
    getShowGlobalFiltersPanel,
    getSourceAccount,
    getEventToken,
    getGuardURI,
    getPendingNewSpendFileVersion,

    // Actions
    logOut,
    setBatchUpdate,
    setFromLogin,
    setShowSpendNoty,
    setPendingNewSpendFileVersion,    
    setError409,
    setError410,
    setError403,
    setPaymentCycleDays,
    setFinancingStrategyMethod,
    setHideAverageDaysPaid,
    setHasContractualPaymentTerms,
    setPayOnTermsStrategyAllowed,
    setActualUser,
    setShowMenu,
    setShowGlobalFiltersPanel,
    setUserCompany,
    setCompanyLogo,
    setGeneratedSpendFiles,
    setActiveSpendFileVersion,
    setPageSize,
    setDecimalFormatting,
    setSourceAccount,
    setEventToken,
    setGuardURI,
    setUserInvitation,
    setUserInvitationId,
    setLastSectionVisitedbyUser,
    setLast9boxOptionVisited,
    setTokenForExternalVPUser,
    setUserCompanyIndustryRelations,    
    
    // API Actions
    postUserCompany,
    postCreateMultipleUsersbyEmail,
    whoAmI,
    fetchCompanySpendFiles,
    changeActualFile,
    getAmountOfUsers,
    deleteUser,
    removeUserCompanyByUuids,
    updateUserCompanyRolesByUuids,
    resendInvitation,
    invalidateToken,
    getSessionInfo,
    getFirebaseToken,
    authLogin,
    getFlowToLogout,
    getFlowResetPassword,
    updateVideoPreferences,
  }
}, {
  persist: {
    storage: secureStorage,
    key: 'ada-user',
    pick: [
      'actualUser',
      'sourceAccount',
      'guardUri',
      'showMenus',
      'paymentCycleDays',
      'financingStrategyMethod',
      'hideAverageDaysPaid',
      'payOnTermsStrategyAllowed',
      'userInvitation',
      'userInvitationId',
      'lastSectionVisitedbyUser',
      'eventToken',
      'last9boxOptionVisited',
      'tokenForExternalVPUser'      
    ],
  }
}) 