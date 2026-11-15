import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { getUrlWithQueryParams } from '@/services/api/apiServices'
import { removeIRI } from '@/utils'
import { spendFileVersion } from '@ada/design-system/data/globalColumns';


const ITEM_PER_PAGE = 30
const PAGE = 1

export async function getCompanyActivities(userId: string): Promise<ApiResponse> {
  let response = null
  const url = import.meta.env.VITE_BASE_URL + '/api/users/' + `${userId}/company_activities?page=${PAGE}&itemsPerPage=${ITEM_PER_PAGE}`

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'Get Company Activities')
}

export async function getNotificationsAll(userId: string, spendFileVersionUuid: string, all = false, type = 'spend_file'): Promise<ApiResponse> {
  let response = null

  let queryParams: any[] = []

  // Always include spend file version filter for proper data isolation
  queryParams.push({ value: removeIRI(spendFileVersionUuid), query: 'spendFileVersion.uuid=' })

  if(!all) {
    queryParams.push(
      { value: type, query: 'type=' },
      { value: PAGE, query: 'page=' },
      { value: ITEM_PER_PAGE, query: 'itemsPerPage=' },
      { value: 'desc', query: 'order[created]=' }
    )
  } else {
    // When getting all notifications, still include pagination and ordering
    queryParams.push(
      { value: PAGE, query: 'page=' },
      { value: ITEM_PER_PAGE, query: 'itemsPerPage=' },
      { value: 'desc', query: 'order[created]=' }
    )
  }

  const url = getUrlWithQueryParams(import.meta.env.VITE_BASE_URL + '/api/users/' +`${userId}/notifications`, queryParams)

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}



export async function getNotificationAmount(userId: string, typeOfNotification?: string, spendFileVersionUuid?: string): Promise<ApiResponse> { 
  let response = null
  const tag = getNotificationsMessages.name
  //&type=note_entity

  const queryParams = [
    { value: typeOfNotification, query: 'type='},
    { value: removeIRI(spendFileVersionUuid), query: 'spendFileVersion.uuid='},
    { value: PAGE, query: 'page=' },
    { value: ITEM_PER_PAGE, query: 'itemsPerPage=' },
    { value: 'desc', query: 'order[created]=' }
  ]

  const url = getUrlWithQueryParams(import.meta.env.VITE_BASE_URL + `/api/users/${userId}/notifications`, queryParams)

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)

}

/***
 * get list notifications depending on the type of notification
 */

export async function getNotificationsMessages(userId: string, typeOfNotification: string, spendFileVersionUuid?: string): Promise<ApiResponse> {
  let response = null
  const tag = getNotificationsMessages.name
  
  // Build URL with query parameters
  const baseUrl = import.meta.env.VITE_BASE_URL + `/api/users/${userId}/notifications`
  const params = new URLSearchParams()
  
  // Add type parameter
  params.append('type', typeOfNotification)
  
  // Add spend file version filter if provided
  if (spendFileVersionUuid) {
    params.append('spendFileVersion.uuid', removeIRI(spendFileVersionUuid))
  }
  
  const url = `${baseUrl}?${params.toString()}`

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function getNotificationsMessagesPendingToRead(userId: string): Promise<ApiResponse> {
  let response = null
  const tag = getNotificationsMessagesPendingToRead.name
  const url = import.meta.env.VITE_BASE_URL + '/api/users/'  + `${removeIRI(userId)}/messages-notification-view`

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function getNotificationsProviderFiles(
  userId: string, itemsPerPage = 6, itemsRead = 'false'):
  Promise<ApiResponse> {
  let response = null
  const tag = getNotificationsProviderFiles.name
  const queryParams = [
    { value: 'spend_file', query: 'type=' },
    { value: itemsRead, query: 'read=' },
    { value: itemsPerPage, query: 'itemsPerPage=' }
  ]
  const url = getUrlWithQueryParams(import.meta.env.VITE_BASE_URL + `/${userId}/notifications`, queryParams)

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}


/**
 * get user notes for the home page, home notes section
 * @param userId 
 * @param spendFileVersionUuid 
 * @returns 
 */

export async function getUserNotes(userId: string, spendFileVersionUuid: string): Promise<ApiResponse> {
  let response = null

  const queryParams = [
    { value: 'note_entity', query: 'type='},
    { value: removeIRI(spendFileVersionUuid), query: 'spendFileVersion.uuid='},//{ value: spendFileVersionUuid, query: 'spendFileVersion.uuid='},
    { value: PAGE, query: 'page=' },
    { value: ITEM_PER_PAGE, query: 'itemsPerPage=' },
    { value: 'desc', query: 'order[created]=' }
  ]

  const url = getUrlWithQueryParams(import.meta.env.VITE_BASE_URL + '/api/users/' + `${userId}/notifications`, queryParams)

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'Get User Notes')
}

export async function getUserNotificationsCompany(userId: string): Promise<ApiResponse> {
  let response = null
  const queryParams = [
    { value: 'update', query: 'type=' },
    { value: PAGE, query: 'page=' },
    { value: ITEM_PER_PAGE, query: 'itemsPerPage=' }
  ]
  const url = getUrlWithQueryParams(import.meta.env.VITE_BASE_URL + '/api/users/' + `${userId}/company_activities`, queryParams)

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'Get User Notifications Company')
}

/**
 * Mark a single notification as read or unread using the new backend endpoint
 * @param notificationId - The notification UUID
 * @param read - Boolean indicating whether to mark as read (true) or unread (false), defaults to true
 * @returns Promise<ApiResponse>
 */
export async function postNotificationsMarkAsRead(notificationId: string, read: boolean = true): Promise<ApiResponse> {
  let response = null
  const tag = postNotificationsMarkAsRead.name
  const url = import.meta.env.VITE_BASE_URL + '/api/notifications/' + notificationId + '/read'

  const requestBody = {
    read: read
  }

  try {
    response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function deleteNotification(notificationId: string): Promise<ApiResponse> {
  let response = null
  const tag = deleteNotification.name
  const url = import.meta.env.VITE_BASE_URL + '/api/notifications/' + notificationId

  try {
    response = await axios.delete(url)
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function deleteMultipleNotifications(userId: string, notificationUuids: string[]): Promise<ApiResponse> {
  let response = null
  const tag = deleteMultipleNotifications.name
  const url = import.meta.env.VITE_BASE_URL + '/api/users/' + userId + '/notifications/delete-multiple'

  try {
    response = await axios.delete(url, {
      data: { notificationUuids }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function markAllNotificationsAsRead(userId: string): Promise<ApiResponse> {
  let response = null
  const tag = markAllNotificationsAsRead.name
  const url = import.meta.env.VITE_BASE_URL + '/api/users/' + userId + '/notifications/mark-all-read'

  try {
    response = await axios.post(url)
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function deleteAllNotifications(userId: string): Promise<ApiResponse> {
  let response = null
  const tag = deleteAllNotifications.name
  const url = import.meta.env.VITE_BASE_URL + '/api/users/' + userId + '/notifications/delete-all'

  try {
    response = await axios.delete(url)
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

export async function postNotificationsMessagesLastAccess(userId: string): Promise<ApiResponse> {
  let response = null
  const tag = postNotificationsMessagesLastAccess.name
  const url = import.meta.env.VITE_BASE_URL + '/api/users/' + `${removeIRI(userId)}/messages-notification-view`
  const params = {}

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

export async function postNotificationsMessagesMarkAsReadAll(userId: string): Promise<ApiResponse> {
  let response = null
  const tag = postNotificationsMessagesMarkAsReadAll.name
  const url = import.meta.env.VITE_BASE_URL + `/${userId}/messages-notification-read`
  const params = {}

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

export async function postNotificationsProvidersFilesLastAccess(userId: string): Promise<ApiResponse> {
  let response = null
  const tag = postNotificationsProvidersFilesLastAccess.name
  const url = import.meta.env.VITE_BASE_URL + `/${userId}/files-notifications-view`
  const params = {}

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

export async function postNotificationsProvidersFilesMarkAsReadAll(userId: string): Promise<ApiResponse> {
  let response = null
  const tag = postNotificationsProvidersFilesMarkAsReadAll.name
  const url = import.meta.env.VITE_BASE_URL + `/${userId}/files-notifications-read`
  const params = {}

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

/**
 * Get notifications count for unread notifications using the new endpoint
 * @param userId - The user UUID (not IRI)
 * @returns Promise<ApiResponse>
 */
export async function getNotificationsCount(userId: string): Promise<ApiResponse> {
  let response = null
  const tag = getNotificationsCount.name
  const url = import.meta.env.VITE_BASE_URL + '/api/users/' + `${userId}/notifications-count`

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

/**
 * Get unread notifications paginated using the main API Platform endpoint
 * @param userId - The user UUID (not IRI)
 * @param page - Page number (default: 1)
 * @param itemsPerPage - Items per page (default: 10)
 * @param spendFileVersionUuid - The spend file version UUID to filter notifications
 * @returns Promise<ApiResponse>
 */
export async function getUnreadNotifications(userId: string, page: number = 1, itemsPerPage: number = 10, spendFileVersionUuid?: string): Promise<ApiResponse> {
  let response = null
  const tag = getUnreadNotifications.name
  
  // Build URL with encoded parameters
  const baseUrl = import.meta.env.VITE_BASE_URL + '/api/users/' + `${userId}/notifications`
  const params = new URLSearchParams()
  
  // Add parameters with proper encoding
  params.append('read', 'false')
  params.append('page', page.toString())
  params.append('itemsPerPage', itemsPerPage.toString())
  params.append('order[created]', 'desc')
  
  // Add spend file version filter if provided
  if (spendFileVersionUuid) {
    params.append('spendFileVersion.uuid', removeIRI(spendFileVersionUuid))
  }
  
  const url = `${baseUrl}?${params.toString()}`

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

/**
 * Get all messages paginated using the main API Platform endpoint (with optional read filter)
 * @param userId - The user UUID (not IRI)
 * @param page - Page number (default: 1)
 * @param itemsPerPage - Items per page (default: 10)
 * @param readFilter - Optional read filter (true for read, false for unread, undefined for all)
 * @param spendFileVersionUuid - The spend file version UUID to filter notifications
 * @returns Promise<ApiResponse>
 */
export async function getAllMessages(userId: string, page: number = 1, itemsPerPage: number = 10, readFilter?: boolean, spendFileVersionUuid?: string): Promise<ApiResponse> {
  let response = null
  const tag = getAllMessages.name
  
  // Build URL with encoded parameters
  const baseUrl = import.meta.env.VITE_BASE_URL + '/api/users/' + `${userId}/notifications`
  const params = new URLSearchParams()
  
  // Add parameters with proper encoding
  params.append('page', page.toString())
  params.append('itemsPerPage', itemsPerPage.toString())
  params.append('order[created]', 'desc')
  
  // Add read filter if specified
  if (readFilter !== undefined) {
    params.append('read', readFilter.toString())
  }
  
  // Add spend file version filter if provided
  if (spendFileVersionUuid) {
    params.append('spendFileVersion.uuid', removeIRI(spendFileVersionUuid))
  }
  
  const url = `${baseUrl}?${params.toString()}`

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}

/**
 * Mark multiple notifications as read/unread using the new backend endpoint
 * @param userId - The user UUID (not IRI)
 * @param notificationUuids - Array of notification UUIDs to mark
 * @param read - Boolean indicating whether to mark as read (true) or unread (false)
 * @returns Promise<ApiResponse>
 */
export async function markMultipleNotificationsAsRead(
  userId: string, 
  notificationUuids: string[], 
  read: boolean
): Promise<ApiResponse> {
  let response = null
  const tag = markMultipleNotificationsAsRead.name
  
  const url = import.meta.env.VITE_BASE_URL + '/api/users/' + `${userId}/notifications/mark-multiple`
  
  const requestBody = {
    notificationUuids: notificationUuids,
    read: read
  }

  try {
    response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, tag)
}
