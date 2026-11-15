import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { removeIRI } from '@/utils'
import { getBaseApi } from '@/utils/getBaseApi';
import uuidRandom from "uuid-random";
let basicAuth = 'Basic ' + btoa(`${import.meta.env.VITE_EXTERNAL_USER_UPLOAD_FILES}:${import.meta.env.VITE_EXTERNAL_PASSWORD_UPLOAD_FILES}`)

/** Start APIs for NO logged users */

//* Upload spend lines

export async function validateInvitation (invitationId: any): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/validate-invitation'

  const idempotencyKey = uuidRandom()  

  const params = {
    invitationId
  }

  
  try {
    response = await axios.post(url, params, {
      headers: {
        idk: idempotencyKey,
        Authorization: basicAuth,
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}


//* END Upload spend lines



export async function validateValuePropositionInvitation(valuePropositionId: any, invitationId: any, token: any): Promise<ApiResponse> {
  const url = getBaseApi() + '/api/value_proposition/validate_invitations_value_proposition'
  const idempotencyKey = uuidRandom()

  const params = {
    valuePropositionId,
    invitationId,
    token
  }
  

  try {
    const response = await axios.post(url, params, {
      headers: {
        idk: idempotencyKey        
      }
    })

    return giveAnswer(response)

  } catch (e: any) {
    console.error('Error en API:', e.response?.data || e.message)
    throw e 
  }
}



export async function setCookieSelectedOption(valuePropositionId: any, invitationId: any, token: any, trackingCookies: any): Promise<ApiResponse> {
  const url = getBaseApi() + '/api/value_proposition/tracking_cookies_invitations'
  const idempotencyKey = uuidRandom()

  const params = {
    valuePropositionId,
    invitationId,
    token,
    trackingCookies
  }
  

  try {
    const response = await axios.post(url, params, {
      headers: {
        idk: idempotencyKey        
      }
    })

    return giveAnswer(response)

  } catch (e: any) {
    console.error('Error en API:', e.response?.data || e.message)
    throw e 
  }
}



export async function validateVPPassword(invitationId: any, valuePropositionId: any, password: any, newPassword: any = null): Promise<ApiResponse> {
  const url = getBaseApi() + '/api/value_proposition/validate_invitations_password'
  const idempotencyKey = uuidRandom()

  const params = {
    invitationId, valuePropositionId, password, newPassword
  }

  try {
    const response = await axios.post(url, params, {
      headers: {
        idk: idempotencyKey,
        Authorization: basicAuth,
      }
    })

    return giveAnswer(response)

  } catch (e: any) {
    console.error('Error en API:', e.response?.data || e.message)
    throw e 
  }
}


export async function sendQuestionsForExternalUsers(email: any, subject: any, body: any, invitationId: any, valuePropositionId: any, token: any): Promise<ApiResponse> {
  const url = getBaseApi() + '/api/value_proposition/send_external_email'
  const idempotencyKey = uuidRandom()

  const params = {
    email, subject, body, invitationId, valuePropositionId, token
  }

  try {
    const response = await axios.post(url, params, {
      headers: {
        idk: idempotencyKey
      }
    })

    return giveAnswer(response)

  } catch (e: any) {
    console.error('Error en API:', e.response?.data || e.message)
    throw e 
  }
}


export async function getInvitationDetails(invitationId: any, valuePropositionId: any, token: any): Promise<ApiResponse> {
  const url = getBaseApi() + '/api/value_proposition/invitations_value_proposition_get_data'
  const idempotencyKey = uuidRandom()

  const params = {
     invitationId, 
     valuePropositionId,
      token
  }

  
  try {
    const response = await axios.post(url, params, {
      headers: {
        idk: idempotencyKey,        
      }
    })

    return giveAnswer(response)

  } catch (e: any) {
    console.error('Error en API:', e.response?.data || e.message)
    throw e 
  }
}



export async function sendExternalInvitations (valuePropositionId: any, emails: Array<string>): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/create_invitations_externals_value_proposition'

  const idempotencyKey = uuidRandom()  

  const params = {
    valuePropositionId,    
    emails
  }

    try {
    const response = await axios.post(url, params, {
      headers: {
        idk: idempotencyKey,
        Authorization: basicAuth,
      }
    })

    return giveAnswer(response)

  } catch (e: any) {
    console.error('Error en API:', e.response?.data || e.message)
    throw e 
  }
}




export async function uploadFile (file: Blob, companyUUID: string, startDate: any, endDate: any, userName: any, email: any, message: any, companyName: any, invitationId: any): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/injection/' + companyUUID + '/external-company-file'

  const idempotencyKey = uuidRandom()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('companyUUID', companyUUID)
  formData.append('currentEndDate', endDate)
  formData.append('currentStartDate', startDate)
  formData.append('currentUserName', userName)
  formData.append('currentEmail', email)
  formData.append('currentMessage', message)
  formData.append('companyName', companyName)
  formData.append('invitationId', invitationId)

  try {
    response = await axios.post(url, formData, {
      headers: {
        idk: idempotencyKey,
        Authorization: basicAuth,
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}
















/** END APIs for NO logged users */
















export async function deleteCompanyIndustryRelation(companyIndustryRelationId: string): Promise<ApiResponse> {
  let response = null
  const tag = deleteCompanyIndustryRelation.name
  const url = getBaseApi() + companyIndustryRelationId

  try {
    response = await axios.delete(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, tag)
}

export async function getCompanyUsers(companyId: string, notAll: boolean | null): Promise<ApiResponse> {
  let response = null
  const tag = getCompanyUsers.name

  let url = getBaseApi() + companyId + '/user_companies'
  const params = new URLSearchParams()
  params.append('itemsPerPage', '500')
  
  if (notAll){
    params.append('type', 'notAll')
  }
  
  url = url + '?' + params.toString()

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, tag)
}


export async function getCompanyData(companyId: string): Promise<ApiResponse> {
  let response = null
  const tag = getCompanyUsers.name
  const url = getBaseApi() + companyId

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, tag)
}

export async function sendUserCompanyinfoForEdit(roles: any, companyId: any) : Promise<ApiResponse> {
 let response = null
 const url = getBaseApi() + `/api/user_companies/${removeIRI(companyId)}`
 const params = {
  roles
 }
 try {
  
  response = await axios.patch(url, params, {
    headers: {
      
      'Content-Type': 'application/merge-patch+json'
    }
  })
} catch (e: any) {
  
  response = e.response
}

return giveAnswer(response)

}

export async function patchCompanyInfo(
  id: string, name: string, identificationType: string, identificationValue: string, address: string,
  country: any, city: string, zipCode: string, domain: string, logoUrl: string, currency: string
): Promise<ApiResponse> {
  let response = null
  const tag = patchCompanyInfo.name
  const url = getBaseApi() + id
  const params = {
    name,
    identificationType,
    identificationValue,
    address,
    country,
    city,
    zipCode,
    domain,
    logoUrl,
    currency
  }

  try {
    response = await axios.patch(url, params, {
      headers: {
        
        'Content-Type': 'application/merge-patch+json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function patchCompanyIndustryRelation(id: string, revenuePercentage: string): Promise<ApiResponse> {
  let response = null
  const tag = patchCompanyIndustryRelation.name
  const url = getBaseApi() + id
  const params = {
    revenuePercentage: revenuePercentage
  }

  try {
    response = await axios.patch(url, params, {
      headers: {
        
        'Content-Type': 'application/merge-patch+json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function postCompanyIndustryRelation(company: string, revenuePercentage: number, industry: string): Promise<ApiResponse> {
  let response = null
  const tag = postCompanyIndustryRelation.name
  const url = getBaseApi() + '/api/company_industry_relations'
  const params = {
    revenuePercentage: revenuePercentage,
    industry: industry,
    company: company
  }

  try {
    response = await axios.post(url, params, {
      headers: {
        
        'Content-Type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}


export async function patchCompanyUserInfo(
  userId: string, firstName: string, lastName: string, language: string, jobTitle: string, dialCode: string,
  dialIsoCode: any, phoneNumber: string, email: string, 
  userNotificationSetting: any, timezone: string, decimalFormatting: string, isFromUserPanel?: boolean
): Promise<ApiResponse> {
  let response = null
  const tag = patchCompanyUserInfo.name
  
  let url = ''
  if (isFromUserPanel) {
    url = getBaseApi() + `/api/users/${removeIRI(userId)}`
  } else {
    url = getBaseApi() + `/api/admin/users/${removeIRI(userId)}`
  }


  const params = {
    firstName,
    lastName,
    language,
    jobTitle,
    dialCode,
    dialIsoCode,
    phoneNumber,
    decimalFormatting,
    email,
    userNotificationSetting,
    timezone
  }

  try {
    response = await axios.patch(url, params, {
      headers: {
        
        'Content-Type': 'application/merge-patch+json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function patchCompanyProfile(
  id: string, currency: string, companyIndustryRelations: Array<any>, annualSalesRevenueMillions: number,
  annualSpendMillions: number, accountsReceivablesMillions: number, averagePaymentTerms: number, wacc: number, taxRate: number,
  averagePaymentTermsWithCustomersDays: number, averageTimeApproveInvoicesReceivedFromSuppliersDays: number,
  creditRating?: string | null
): Promise<ApiResponse> {
  let response = null
  const tag = patchCompanyProfile.name
  const url = getBaseApi() + id
  const params = {
    currency,
    companyIndustryRelations,
    annualSalesRevenueMillions,
    annualSpendMillions,
    accountsReceivablesMillions,
    averagePaymentTerms,
    wacc,
    taxRate,
    averagePaymentTermsWithCustomersDays,
    averageTimeApproveInvoicesReceivedFromSuppliersDays,
    creditRating
  }

  try {
    response = await axios.patch(url, params, {
      headers: {
        
        'Content-Type': 'application/merge-patch+json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function postUploadCompanyLogo(companyId: string, file: any): Promise<ApiResponse> {
  let response = null
  const tag = postUploadCompanyLogo.name
  const url = getBaseApi() + companyId + '/logo'
  const formData = new FormData()
  formData.append('file', file)

  try {
    response = await axios.post(url, formData, {
      headers: {
        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}
