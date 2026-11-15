import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { removeIRI } from '@/utils'
import { getBaseApi } from '@/utils/getBaseApi';

export async function getAmountOfUsers(companyId:string, isFromUserPanel?: boolean) : Promise<ApiResponse> {
  let response = null

  let url = ''
  url = getBaseApi() + "/api/companies/" + removeIRI(companyId)
  // if (isFromUserPanel) {
  //   url = getBaseApi() + "/api/companies/" + removeIRI(companyId)
  // } else {
  //   url = getBaseApi() + "/api/admin/companies/" + removeIRI(companyId)
  // }

 
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Amount of Users')
}

export async function deleteUser(userID: any, isFromUserPanel?: boolean): Promise<ApiResponse> {
  let response = null

  let url = ''
  if (isFromUserPanel) {
    url = getBaseApi() + '/api/user_companies/' + removeIRI(userID)
  } else {
    url = getBaseApi() + '/api/admin/user_companies/' + removeIRI(userID)
  }

  
  try {
    response = await axios.delete(url, {
      headers: {
        
        'Content-Type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'DELETE User')
}

/**
 * Remove user–company assignment by user UUID and company UUID (soft delete).
 * Same effect as DELETE /api/user_companies/{id} when id is the UserCompany for that user+company.
 */
export async function removeUserCompanyByUuids(userUuid: string, companyUuid: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/admin/user_companies/remove'
  try {
    response = await axios.post(url, { userUuid, companyUuid }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Remove User Company by UUIDs')
}

/**
 * Update roles for the user-company relation by user UUID and company UUID.
 * PATCH /api/user_companies/update-roles with body { userUuid, companyUuid, roles }.
 */
export async function updateUserCompanyRolesByUuids(
  userUuid: string,
  companyUuid: string,
  roles: string[]
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/admin/user_companies/update-roles'
  try {
    response = await axios.patch(url, { userUuid, companyUuid, roles }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'PATCH Update User Company Roles by UUIDs')
}

export async function getCompanySpendFiles(companyId: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + companyId + '/spend_files'

  try {
    response = await axios.get(url, {
      headers: {
        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'GET Company Spend Files')
}

/**
 * Get the current user information from the API.
 *
 * @return {Promise<ApiResponse>} The response from the API call
 */
export async function getWhoAmI(): Promise<ApiResponse> {
  let response = null;

  const url = getBaseApi() + '/api/user/who_am_i'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  
  return giveAnswer(response, 'GET Who Am I')
}

/**
 * Change the active spend file version for the current user session.
 *
 * @param {any} file - The file to be updated
 * @param {any} userID - The ID of the user
 * @return {Promise<ApiResponse>} The response from the API call
 */
export async function patchChangeActualFile(file: any, userID: any): Promise<ApiResponse> {
  let response = null
  
  const cleanUserId = removeIRI(userID)

  const url = getBaseApi() + '/api/users/'+cleanUserId
  
  try {
    response = await axios.patch(url, file, {
      headers: {
        
        'Content-Type': 'application/merge-patch+json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'PATCH Change Actual File')
}




export async function updateVideoPreferences(status: any, userID: any): Promise<ApiResponse> {
  let response = null
  
  const cleanUserId = removeIRI(userID)

  const url = getBaseApi() + '/api/users/'+cleanUserId
  
  try {
    response = await axios.patch(url, status, {
      headers: {
        
        'Content-Type': 'application/merge-patch+json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'PATCH Change Actual File')
}


export async function patchFeedbackSurveyResponse(
  userIri: string,
  response: 'accept' | 'decline'
): Promise<ApiResponse> {
  let apiResponse = null
  const url = getBaseApi() + '/api/users/' + removeIRI(userIri)
  const now = new Date().toISOString()
  try {
    apiResponse = await axios.patch(url, {
      lastFeedbackSurveyAt: now,
      lastFeedbackSurveyResponse: response,
    }, {
      headers: { 'Content-Type': 'application/merge-patch+json' }
    })
  } catch (e: any) {
    apiResponse = e.response
  }
  return giveAnswer(apiResponse, 'PATCH Feedback Survey Response')
}

export async function postUserCompany(selectedCompany: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/user/set_active_company'
  const params = {
    selectedCompany: selectedCompany
  }
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e : any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Update Selected company')
}


export async function postCreateMultipleUsersbyEmail(
  email: string | string[], language: string, roles: Array<string>, companyId: string, isFromUserPanel?: boolean
): Promise<ApiResponse> {
  let response = null


  let url = ''
  if (isFromUserPanel) {
    url = getBaseApi() + '/api/user_companies/create_user_account'
  } else {
    url = getBaseApi() + '/api/admin/user_companies/create_user_account'
  }

  const params = {
    user: {
      email,
      language
    },
    roles,
    company: companyId
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

  return giveAnswer(response, 'create users')
}


export async function resendInvitation(userID: string, isFromUserPanel?: boolean): Promise<ApiResponse> {
  let response = null

  let url = ''
  if (isFromUserPanel) {
    url = getBaseApi() + '/api/user/resend_invitation/' +  parseInt(removeIRI(userID))
  } else {
    url = getBaseApi() + '/api/admin/user/resend_invitation/' +  parseInt(removeIRI(userID))
  }

  try {
    response = await axios.get(url, {
      headers: {
        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e : any) {
    response = e.response
  }

  return giveAnswer(response, 'GET Resend Invitation')
}


export async function invalidateToken(userID: string, isFromUserPanel?: boolean): Promise<ApiResponse> {
  let response = null

  let url = ''
  if (isFromUserPanel) {
    url = getBaseApi() + '/api/user/invalidate_token/' +  removeIRI(userID)
  } else {
    url = getBaseApi() + '/api/admin/user/invalidate_token/' +  removeIRI(userID)
  }

  

  const params = {
    userID: removeIRI(userID)
  }

  try {
    response = await axios.post(url, params, {
      headers: {
        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e : any) {
    response = e.response
  }

  return giveAnswer(response, 'GET Resend Invitation')
}


/** Apis for session by cookies */


export async function getSessionInfo(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/session/info'

  try {
    response = await axios.get(url, {      
    })
  } catch (e : any) {
    response = e.response
  }

  return giveAnswer(response, 'GET Resend Invitation')
}


export async function getFirebaseToken(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/session/envent-token'

  try {
    response = await axios.get(url, {      
    })
  } catch (e : any) {
    response = e.response
  }

  // A failed mint must cost the caller its realtime updates, not its session:
  // the 401 comes back as data instead of redirecting to login (WI#19104).
  return giveAnswer(response, 'GET Firebase Token', { skipAuthRedirect: true })
}

export async function authLogin(idps: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/auth/login?idps=' + idps

  try {
    response = await axios.get(url, {})
  } catch (e : any) {
    response = e.response
  }

  return giveAnswer(response, 'GET Resend Invitation')
}

export async function getFlowToLogout(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/auth/logout'

  try {
    response = await axios.get(url, {      
    })
  } catch (e : any) {
    response = e.response
  }

  return giveAnswer(response, 'GET Resend Invitation')
}

export async function getFlowResetPassword(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/auth/reset-password'

  try {
    response = await axios.get(url, {      
    })
  } catch (e : any) {
    response = e.response
  }

  return giveAnswer(response, 'GET Resend Invitation')
}
