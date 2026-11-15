import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as CompanyApi from '@/api/companyApi'
interface UserInfo {
  email: string,
  password: string,
}

interface GeneratedUser {
  email: string,
  firstName: string,
  lastName: string,
  language: string,
  userCompanyId: string,
  roles: Array<string>,
  invitationToken: string,
  invitationLink: string,
  tokenExpiration: string
  azureId: string
}

interface UserCompany{
  '@id': string,
  user: GeneratedUser,
  roles: Array<string>,
  invitationToken: string,
  invitationLink: string,
  tokenExpiration: string
}

async function companyInfo(props: any) {
  const {
    id, name, identificationType, identificationValue, address, country, city, zipCode, domain, logoUrl, currency, callbackSuccess, callbackError
  }: any = props
  const response = CompanyApi.patchCompanyInfo(
    id, name, identificationType, identificationValue, address, country, city, zipCode, domain, logoUrl, currency
  )

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

async function sendUserCompanyinfoForEdit(props: any) {
  const {roles, companyId, callbackSuccess, callbackError} : any = props
  const response = CompanyApi.sendUserCompanyinfoForEdit(roles, companyId)
  await response.then((response) => {
    if (response.success) {


        // if was saved on the server
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

async function companyUserInfo(props: any) {
  const {
    userId,
    firstName,
    lastName,
    email,
    language,
    jobTitle,
    dialCode, dialIsoCode, phoneNumber,
    userNotificationSetting, callbackSuccess, callbackError,
    timezone,
    decimalFormatting,
    isFromUserPanel,

  }: any = props

  const response = CompanyApi.patchCompanyUserInfo(
    userId,
    firstName,
    lastName,
    language,
    jobTitle,
    dialCode,
    dialIsoCode,
    phoneNumber,
    email,
    userNotificationSetting,
    timezone,
    decimalFormatting,
    isFromUserPanel,
  )

  await response.then((response) => {
    if (response.success) {
      if (import.meta.env.DEV) console.log('Company user info', response.data)

      // if was saved on the server
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

async function companyProfile(props: any) {
  const {
    id, currency, companyIndustryRelations, annualSalesRevenueMillions, annualSpendMillions,
    accountsReceivablesMillions, averagePaymentTerms, wacc,creditRating, taxRate, averagePaymentTermsWithCustomersDays,
    averageTimeApproveInvoicesReceivedFromSuppliersDays,
    callbackSuccess, callbackError
  }: any = props
  const response = CompanyApi.patchCompanyProfile(
    id, currency, companyIndustryRelations, annualSalesRevenueMillions, annualSpendMillions,
    accountsReceivablesMillions, averagePaymentTerms, wacc, taxRate, averagePaymentTermsWithCustomersDays,
    averageTimeApproveInvoicesReceivedFromSuppliersDays, creditRating
  )

  await response.then((response) => {
    if (response.success) {
      if (import.meta.env.DEV) console.log('Company profile', response.data)
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

async function patchCompanyIndustryRelation(props: any) {
  const {
    id, revenuePercentage, callbackSuccess, callbackError
  }: any = props
  const response = CompanyApi.patchCompanyIndustryRelation(id, revenuePercentage)

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

async function postCompanyIndustryRelation(props: any) {
  const {
    company, revenuePercentage, industry, callbackSuccess, callbackError
  }: any = props
  const response = CompanyApi.postCompanyIndustryRelation(company,revenuePercentage, industry)

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

async function deleteCompanyIndustryRelation(props: any) {
  const { companyIndustryRelationId, callbackSuccess, callbackError }: any = props

  const response = CompanyApi.deleteCompanyIndustryRelation(companyIndustryRelationId)
  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess()
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  })
}

async function getCompanyData(props: any) {
  const { companyId, callbackSuccess, callbackError }: any = props

  const response = CompanyApi.getCompanyData(companyId)
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

async function postUploadCompanyLogo(props: any) {
  const { companyId, file, callbackSuccess, callbackError }: any = props
  const response = CompanyApi.postUploadCompanyLogo(companyId, file)

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

export const useWelcomeStore = defineStore('welcome', () => {
  // State
  const userInfo = ref<UserInfo | null>(null)
  const generatedUsers = ref<Array<UserCompany> | null>(null)

  // Getters
  const getUsers = computed((): Array<GeneratedUser> | null => {
    if (generatedUsers.value === null) {
      return []
    }

    return generatedUsers.value.map((uc) => {
      uc.user.userCompanyId = uc['@id']
      uc.user.roles = uc.roles
      uc.user.invitationToken = uc.invitationToken
      uc.user.tokenExpiration = uc.tokenExpiration
      uc.user.invitationLink = uc.invitationLink
      return uc.user
    })
  })

  // Mutations
  function setInitialState() {
    userInfo.value = null
    generatedUsers.value = null
  }

  function setCompanyUserInfo(userInfoValue: UserInfo): void {
    userInfo.value = userInfoValue
  }

  function setGeneratedUsers(generatedUsersValue: Array<UserCompany>) {
    generatedUsers.value = generatedUsersValue
  }

  // Actions
  async function getCompanyUsers(props: any) {
    const { companyId, notAll, callbackSuccess, callbackError }: any = props

    const response = CompanyApi.getCompanyUsers(companyId, notAll)
    await response.then((response) => {
      if (response.success) {
        setGeneratedUsers(response.data['hydra:member'])
        if (callbackSuccess) {
          callbackSuccess(response.data['hydra:member'])
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
    userInfo,
    generatedUsers,
    // Getters
    getUsers,
    // Mutations
    setInitialState,
    setCompanyUserInfo,
    setGeneratedUsers,
    // Actions
    companyInfo,
    sendUserCompanyinfoForEdit,
    companyUserInfo,
    companyProfile,
    patchCompanyIndustryRelation,
    postCompanyIndustryRelation,
    deleteCompanyIndustryRelation,
    getCompanyUsers,
    getCompanyData,
    postUploadCompanyLogo
  }
})
