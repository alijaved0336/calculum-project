import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { secureStorage } from '@/services/pinia/index'
import * as NotificationsApi from '@/modules/notifications/api'
// Types
interface NotificationState {
  dataMessages: Array<any>
  dataNoteMessages: Array<any>
  dataNotificationsAll: Array<any>
  dataProviderFiles: Array<any>
  existMessagesPendingToRead: boolean
  dataNotificationsIsReady: boolean
}

async function getCompanyActivities(props: {
  userID: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { userID, callbackSuccess, callbackError } = props
  try {
    const response = await NotificationsApi.getCompanyActivities(userID)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data['hydra:member'])
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getCompanyActivities:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getUserNotes(props: {
  userID: string
  spendFileVersion: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { userID, spendFileVersion, callbackSuccess, callbackError } = props
  try {
    const response = await NotificationsApi.getUserNotes(userID, spendFileVersion)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data['hydra:member'])
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getUserNotes:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getUserNotificationsCompany(props: {
  userID: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { userID, callbackSuccess, callbackError } = props
  try {
    const response = await NotificationsApi.getUserNotificationsCompany(userID)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data['hydra:member'])
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getUserNotificationsCompany:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function postNotificationsMarkAsRead(props: {
  notificationId: string
  read?: boolean
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { notificationId, read = true, callbackSuccess, callbackError } = props
  try {
    const response = await NotificationsApi.postNotificationsMarkAsRead(notificationId, read)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in postNotificationsMarkAsRead:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function postNotificationsMessagesLastAccess(props: {
  userId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { userId, callbackSuccess, callbackError } = props
  try {
    const response = await NotificationsApi.postNotificationsMessagesLastAccess(userId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in postNotificationsMessagesLastAccess:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function postNotificationsMessagesMarkAsReadAll(props: {
  userId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { userId, callbackSuccess, callbackError } = props
  try {
    const response = await NotificationsApi.postNotificationsMessagesMarkAsReadAll(userId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in postNotificationsMessagesMarkAsReadAll:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function postNotificationsProvidersFilesLastAccess(props: {
  userId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { userId, callbackSuccess, callbackError } = props
  try {
    const response = await NotificationsApi.postNotificationsProvidersFilesLastAccess(userId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in postNotificationsProvidersFilesLastAccess:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function postNotificationsProvidersFilesMarkAsReadAll(props: {
  userId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { userId, callbackSuccess, callbackError } = props
  try {
    const response = await NotificationsApi.postNotificationsProvidersFilesMarkAsReadAll(userId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in postNotificationsProvidersFilesMarkAsReadAll:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function markMultipleNotificationsAsRead(props: {
  userId: string
  notificationUuids: string[]
  read: boolean
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { userId, notificationUuids, read, callbackSuccess, callbackError } = props
  try {
    const response = await NotificationsApi.markMultipleNotificationsAsRead(userId, notificationUuids, read)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in markMultipleNotificationsAsRead:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function fetchUnreadNotifications(props: {
  userId: string
  page: number
  itemsPerPage: number
  spendFileVersionUuid?: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { userId, page, itemsPerPage, spendFileVersionUuid, callbackSuccess, callbackError } = props
  try {
    const response = await NotificationsApi.getUnreadNotifications(userId, page, itemsPerPage, spendFileVersionUuid)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in fetchUnreadNotifications:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function fetchAllMessages(props: { userId: string, page: number, itemsPerPage: number, readFilter?: boolean, spendFileVersionUuid?: string }) {
  return await NotificationsApi.getAllMessages(props.userId, props.page, props.itemsPerPage, props.readFilter, props.spendFileVersionUuid)
}

async function deleteSingleNotification(notificationId: string) {
  return await NotificationsApi.deleteNotification(notificationId)
}

async function deleteMultipleNotifications(userId: string, notificationUuids: string[]) {
  return await NotificationsApi.deleteMultipleNotifications(userId, notificationUuids)
}

export const useNotificationsStore = defineStore('notifications', () => {
  // State
  const dataMessages = ref<Array<any>>([])
  const dataNoteMessages = ref<Array<any>>([])
  const dataNotificationsAll = ref<Array<any>>([])
  const dataProviderFiles = ref<Array<any>>([])
  const existMessagesPendingToRead = ref<boolean>(false)
  const dataNotificationsIsReady = ref<boolean>(false)
  const totalUnreadCount = ref<number>(0)
  const unreadMessagesCount = ref<number>(0)
  const messageReadNotification = ref<{messageId: string, timestamp: number} | null>(null)


  // Getters
  const getExistMessagesPendingToRead = computed(() => existMessagesPendingToRead.value)
  const getMessages = computed(() => dataMessages.value)
  const getNoteMessages = computed(() => dataNoteMessages.value)
  const getNotificationsAllData = computed(() => dataNotificationsAll.value)
  const getDataNotificationsIsReady = computed(() => dataNotificationsIsReady.value)
  const getProviderFiles = computed(() => dataProviderFiles.value)
  const getTotalUnreadCount = computed(() => totalUnreadCount.value)
  const getUnreadMessagesCount = computed(() => unreadMessagesCount.value)
  const getMessageReadNotification = computed(() => messageReadNotification.value)


  // Mutations
  function setInitialState() {
    dataMessages.value = []
    dataNoteMessages.value = []
    dataNotificationsAll.value = []
    dataProviderFiles.value = []
    existMessagesPendingToRead.value = false
    totalUnreadCount.value = 0
    unreadMessagesCount.value = 0
    messageReadNotification.value = null
  }

  function setDataMessages(messages: Array<any>) {
    dataMessages.value = messages
  }

  function setDataNoteMessages(noteMessages: Array<any>) {
    dataNoteMessages.value = noteMessages
  }

  function setDataNotificationsAll(notifications: Array<any>) {
    dataNotificationsAll.value = notifications
  }

  function setDataNotificationsIsReady(isReady: boolean) {
    dataNotificationsIsReady.value = isReady
  }

  function setDataProviderFiles(providerFiles: Array<any>) {
    dataProviderFiles.value = providerFiles
  }

  function setExistMessagesPendingToRead(exist: boolean) {
    existMessagesPendingToRead.value = exist
  }

  function setTotalUnreadCount(count: number) {
    totalUnreadCount.value = count
  }

  function setUnreadMessagesCount(count: number) {
    unreadMessagesCount.value = count
  }

  function notifyMessageRead(messageId: string) {
    // Force reactivity by clearing first, then setting
    messageReadNotification.value = null
    // Use nextTick to ensure the change is detected
    setTimeout(() => {
      messageReadNotification.value = { messageId, timestamp: Date.now() }
    }, 10)
  }



  // Actions
  async function getNotificationsAll(props: {
    userID: string,
    spendFileVersionId: string
    callbackSuccess?: (data: any) => void
    callbackError?: (error: any) => void
  }) {
    const { userID, spendFileVersionId, callbackSuccess, callbackError } = props
    try {
      const response = await NotificationsApi.getNotificationsAll(userID, spendFileVersionId)
      if (response.success) {
        setDataNotificationsAll(response.data['hydra:member'])
        setDataNotificationsIsReady(true)
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
      } else {
        if (callbackError) {
          callbackError(response)
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error in getNotificationsAll:', error)
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  async function getNotificationAmount(props: {
    userId: string
    typeOfNotification?: string,
    spendFileVersionUuid: string
    callbackSuccess?: (data: any) => void
    callbackError?: (error: any) => void
  }) {
    const { userId, typeOfNotification, spendFileVersionUuid, callbackSuccess, callbackError } = props
    try {
      const response = await NotificationsApi.getNotificationAmount(userId, typeOfNotification, spendFileVersionUuid)
      if (response.success) {
        if (typeOfNotification === 'message') {
          setDataMessages(response.data['hydra:member'])
        }
        if (callbackSuccess) {
          callbackSuccess(response.data['hydra:member'])
        }
      } else {
        if (callbackError) {
          callbackError(response)
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error in getNotificationAmount:', error)
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  async function getNotificationsMessages(props: {
    userId: string
    typeOfNotification: string
    spendFileVersionUuid?: string
    callbackSuccess?: (data: any) => void
    callbackError?: (error: any) => void
  }) {
    const { userId, typeOfNotification, spendFileVersionUuid, callbackSuccess, callbackError } = props
    try {
      const response = await NotificationsApi.getNotificationsMessages(userId, typeOfNotification, spendFileVersionUuid)
      if (response.success) {
        if (typeOfNotification === 'message') {
          setDataMessages(response.data['hydra:member'])
        }
        if (typeOfNotification === 'note_entity') {
          setDataNoteMessages(response.data['hydra:member'])
        }
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
      } else {
        if (callbackError) {
          callbackError(response)
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error in getNotificationsMessages:', error)
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  async function getNotificationsMessagesPendingToRead(props: {
    userId: string
    callbackSuccess?: (data: any) => void
    callbackError?: (error: any) => void
  }) {
    const { userId, callbackSuccess, callbackError } = props
    try {
      const response = await NotificationsApi.getNotificationsMessagesPendingToRead(userId)
      if (response.success) {
        setExistMessagesPendingToRead(response.data)
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
      } else {
        if (callbackError) {
          callbackError(response)
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error in getNotificationsMessagesPendingToRead:', error)
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  async function getNotificationsProviderFiles(props: {
    userId: string
    callbackSuccess?: (data: any) => void
    callbackError?: (error: any) => void
  }) {
    const { userId, callbackSuccess, callbackError } = props
    try {
      const response = await NotificationsApi.getNotificationsProviderFiles(userId)
      if (response.success) {
        setDataProviderFiles(response.data['hydra:member'])
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
      } else {
        if (callbackError) {
          callbackError(response)
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error in getNotificationsProviderFiles:', error)
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  async function markAllNotificationsAsRead(userId: string) {
    const response = await NotificationsApi.markAllNotificationsAsRead(userId)
    if (response.success) {
      // Reset unread count when all notifications are marked as read
      setUnreadMessagesCount(0)
    }
    return response
  }

  async function deleteAllNotifications(userId: string) {
    const response = await NotificationsApi.deleteAllNotifications(userId)
    if (response.success) {
      // Reset both total and unread counts when all notifications are deleted
      setTotalUnreadCount(0)
      setUnreadMessagesCount(0)
    }
    return response
  }

  return {
    // State
    dataMessages,
    dataNoteMessages,
    dataNotificationsAll,
    dataProviderFiles,
    existMessagesPendingToRead,
    dataNotificationsIsReady,
    totalUnreadCount,
    unreadMessagesCount,
    messageReadNotification,

    // Getters
    getExistMessagesPendingToRead,
    getMessages,
    getNoteMessages,
    getNotificationsAllData,
    getDataNotificationsIsReady,
    getProviderFiles,
    getTotalUnreadCount,
    getUnreadMessagesCount,
    getMessageReadNotification,

    // Mutations
    setInitialState,
    setDataMessages,
    setDataNoteMessages,
    setDataNotificationsAll,
    setDataNotificationsIsReady,
    setDataProviderFiles,
    setExistMessagesPendingToRead,
    setTotalUnreadCount,
    setUnreadMessagesCount,
    notifyMessageRead,

    // Actions
    getCompanyActivities,
    getNotificationsAll,
    getNotificationAmount,
    getNotificationsMessages,
    getNotificationsMessagesPendingToRead,
    getNotificationsProviderFiles,
    getUserNotes,
    getUserNotificationsCompany,
    postNotificationsMarkAsRead,
    postNotificationsMessagesLastAccess,
    postNotificationsMessagesMarkAsReadAll,
    postNotificationsProvidersFilesLastAccess,
    postNotificationsProvidersFilesMarkAsReadAll,
    markMultipleNotificationsAsRead,
    fetchUnreadNotifications,
    fetchAllMessages,
    deleteSingleNotification,
    deleteMultipleNotifications,
    markAllNotificationsAsRead,
    deleteAllNotifications
  }
}, {
  persist: {
    storage: secureStorage,
    key: 'ada-notifications'
  }
})
