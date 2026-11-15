import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { secureStorage } from '@/services/pinia/index'
import * as SpendFilesApi from '@/modules/home/spendFiles/api'

// Types
interface SpendFile {
  '@id': string
  '@type': string
  name: string
  processing: boolean
  isProcessedWithNoErrors: boolean
  isPublic: boolean
  showOpportunityExpectedOpportunity?: string
  strategiesVisibility?: string
}

interface SpendFileVersion {
  '@id': string
  '@type': string
  name: string
  version: string
  processing: boolean
  isProcessedWithNoErrors: boolean
  isPublic: boolean
}

interface EMISFile {
  '@id': string
  '@type': string
  name: string
}

interface ValueProposition {
  '@id': string
  '@type': string
  name: string
  isPublic: boolean
  expirationDays: number
}

interface SpendFilesState {
  spendFiles: SpendFile[]
  emisFiles: EMISFile[]
  emisFileVersions: any[]
  spendFileVersions: SpendFileVersion[]
  urlSpendTemplateDownload: string
  urlSpendExampleDownload: string
}

export const useSpendFilesStore = defineStore('spendFiles', () => {
  // State
  const spendFiles = ref<SpendFile[]>([])
  const emisFiles = ref<EMISFile[]>([])
  const emisFileVersions = ref<any[]>([])
  const spendFileVersions = ref<SpendFileVersion[]>([])
  const urlSpendTemplateDownload = ref<string>('/documents/SpendFileTemplate.xlsx')
  const urlSpendExampleDownload = ref<string>('')

  // Getters
  const getEmisFiles = computed(() => emisFiles.value)
  const getSpendFiles = computed(() => spendFiles.value)
  const getEMISFilesVersions = computed(() => emisFileVersions.value)
  const getSpendFilesVersions = computed(() => spendFileVersions.value)
  const getUrlSpendTemplateDownload = computed(() => urlSpendTemplateDownload.value)
  const getUrlSpendExampleDownload = computed(() => urlSpendExampleDownload.value)

  // Mutations
  const setInitialState = () => {
    spendFiles.value = []
    spendFileVersions.value = []
  }

  const setEMISFile = (generatedEMISFiles: EMISFile[]) => {
    emisFiles.value = generatedEMISFiles
  }

  const setSpendFile = (generatedSpendFiles: SpendFile[]) => {
    spendFiles.value = generatedSpendFiles
  }

  const setEMISFilesVersions = (generatedEMISFiles: any[]) => {
    emisFileVersions.value = generatedEMISFiles
  }

  const setSpendFilesVersions = (generatedSpendFilesVersions: SpendFileVersion[]) => {
    spendFileVersions.value = generatedSpendFilesVersions
  }

  // Actions
  const uploadAdjustmentsFile = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    newFile: any
    id: string
    behavior: string
  }) => {
    const { callbackSuccess, callbackError, newFile, id, behavior } = props
    try {
      const response = await SpendFilesApi.uploadAdjustmentsFile(newFile, id, behavior)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const postEMISFile = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    newFile: any
    companyUUID: string
  }) => {
    const { callbackSuccess, callbackError, newFile, companyUUID } = props
    try {
      const response = await SpendFilesApi.postEMISFile(newFile, companyUUID)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const postCSVFile = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    newFile: any
  }) => {
    const { callbackSuccess, callbackError, newFile } = props
    try {
      const response = await SpendFilesApi.postCSVFile(newFile)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const getEMISMediaFileVersion = async (props: {
    mediaID: string
    callbackSuccess?: (data: any) => void
    callbackError?: () => void
  }) => {
    const { mediaID, callbackSuccess, callbackError } = props
    try {
      const response = await SpendFilesApi.getEMISMediaFileVersion(mediaID)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError()
      }
    } catch (error) {
      if (callbackError) {
        callbackError()
      }
    }
  }

  const postSpendFileVersion = async (props: {
    fileID: string
    file: any
    companyUUID: string
    callbackSuccess?: (data: any) => void
    callbackError?: () => void
  }) => {
    const { fileID, file, companyUUID, callbackSuccess, callbackError } = props
    try {
      const response = await SpendFilesApi.postSpendFileVersion(file, fileID, companyUUID)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError()
      }
    } catch (error) {
      if (callbackError) {
        callbackError()
      }
    }
  }

  const fetchSpendFilesVersions = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: () => void
    actualFile: string
  }) => {
    const { callbackSuccess, callbackError, actualFile } = props
    try {
      const response = await SpendFilesApi.getSpendFilesVersions(actualFile)
      if (response.success && callbackSuccess) {
        // Save the data in the store
        setSpendFilesVersions(response.data["hydra:member"])
        // Notify caller
        callbackSuccess(response.data)
      } else if (callbackError) {
        // Notify caller
        callbackError()
      }
    } catch (error) {
      if (callbackError) {
        callbackError()
      }
    }
  }

  const getSpendFileUploadableFormat  = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: () => void
    actualFile: string
  }) => {
    const { callbackSuccess, callbackError, actualFile } = props
    try {
      const response = await SpendFilesApi.getSpendFileUploadableFormat(actualFile)
      if (response.success && callbackSuccess) {
        // Notify caller
        callbackSuccess(response.data)
      } else if (callbackError) {
        // Notify caller
        callbackError()
      }
    } catch (error) {
      if (callbackError) {
        callbackError()
      }
    }
  }

  const spendFilesVersionsByCompanyAPIReadAll = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: () => void
    companyId: string
  }) => {
    const { callbackSuccess, callbackError, companyId } = props
    try {
      const response = await SpendFilesApi.spendFilesVersionsByCompanyAPIReadAll(companyId)
      if (response.success && callbackSuccess) {
        // Notify caller
        callbackSuccess(response.data)
      } else if (callbackError) {
        // Notify caller
        callbackError()
      }
    } catch (error) {
      if (callbackError) {
        callbackError()
      }
    }
  }

  const spendFilesVersionsAPIReadAll = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: () => void
  }) => {
    const { callbackSuccess, callbackError } = props
    try {
      const response = await SpendFilesApi.spendFilesVersionsAPIReadAll()
      if (response.success && callbackSuccess) {
        // Notify caller
        callbackSuccess(response.data)
      } else if (callbackError) {
        // Notify caller
        callbackError()
      }
    } catch (error) {
      if (callbackError) {
        callbackError()
      }
    }
  }

  const getSpendFilesVersionsByStatus = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: () => void
    status: string
  }) => {
    const { callbackSuccess, callbackError, status } = props
    try {
      const response = await SpendFilesApi.getSpendFilesVersionsByStatus(status)
      if (response.success) {
        setSpendFilesVersions(response.data["hydra:member"])
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError()
      }
    } catch (error) {
      if (callbackError) {
        callbackError()
      }
    }
  }

  const getSpendFileVersion = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: () => void
    fileVersionID: string
  }) => {
    const { callbackSuccess, callbackError, fileVersionID } = props
    try {
      const response = await SpendFilesApi.getSpendFileVersion(fileVersionID)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError()
      }
    } catch (error) {
      if (callbackError) {
        callbackError()
      }
    }
  }

  const postSpendFile = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    file: any
    companyUUID: string
    spendFileVersion?: string | null
    isPublic?: boolean | null
    forStatusChange?: boolean | null
    isSupplier?: boolean | null
    showOpportunityExpectedOpportunity?: string | null
    strategiesVisibility?: string | null,
    syncData?: any | null,    
    spendfileUUID?: string | null,
    uploadType?: string | null
  }) => {
    const { 
      callbackSuccess, 
      callbackError, 
      file, 
      companyUUID, 
      spendFileVersion, 
      isPublic, 
      forStatusChange, 
      isSupplier, 
      showOpportunityExpectedOpportunity, 
      strategiesVisibility,
      syncData,      
      spendfileUUID,
      uploadType
    } = props
    try {
      const response = await SpendFilesApi.postSpendFile(
        file, 
        companyUUID, 
        spendFileVersion ?? null, 
        isPublic, 
        forStatusChange, 
        isSupplier, 
        showOpportunityExpectedOpportunity, 
        strategiesVisibility,
        syncData,
        spendfileUUID,
        uploadType
      )

      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const postSpendFileVisibility = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    spendFileVersion: string
    isPublic: boolean
  }) => {
    const { callbackSuccess, callbackError, spendFileVersion, isPublic } = props
    try {
      const response = await SpendFilesApi.postSpendFileVisibility(spendFileVersion, isPublic)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const postSpendFileCompany = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    file: any
    companyUUID: string
    startDate: any
    endDate: any
    userName: any
    email: any
    message: any
    companyName: any
    invitationId: any
  }) => {
    const { callbackSuccess, callbackError, file, companyUUID, startDate, endDate, userName, email, message, companyName, invitationId } = props
    try {
      const response = await SpendFilesApi.postSpendFileCompany(file, companyUUID, startDate, endDate, userName, email, message, companyName, invitationId)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const deleteSpendFileVersion = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    versionID: string
  }) => {
    const { callbackSuccess, callbackError, versionID } = props
    try {
      const response = await SpendFilesApi.deleteSpendFile(versionID)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const deleteEMISFile = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    EMISFileId: string
  }) => {
    const { callbackSuccess, callbackError, EMISFileId } = props
    try {
      const response = await SpendFilesApi.deleteEMISFile(EMISFileId)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const deleteCompanyFile = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    fileID: string
  }) => {
    const { callbackSuccess, callbackError, fileID } = props
    try {
      const response = await SpendFilesApi.deleteCompanyFile(fileID)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const downloadAdjustmentsFile = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    spendFileId: string
    behavior: string
  }) => {
    const { callbackSuccess, callbackError, spendFileId, behavior } = props
    try {
      const response = await SpendFilesApi.downloadAdjustmentsFile(spendFileId, behavior)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const downloadCSVFile = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
  }) => {
    const { callbackSuccess, callbackError } = props
    try {
      const response = await SpendFilesApi.downloadCSVFile()
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const getMediaFileVersion = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    mediaID: string
  }) => {
    const { callbackSuccess, callbackError, mediaID } = props
    try {
      const response = await SpendFilesApi.getMediaFileVersion(mediaID)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const recalculateFileVersion = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    filesIDs: string[]
  }) => {
    const { callbackSuccess, callbackError, filesIDs } = props
    try {
      const response = await SpendFilesApi.recalculateSpendFileVersion(filesIDs)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const recalculateDenominatorMatchFileVersion = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    fileID: string
  }) => {
    const { callbackSuccess, callbackError, fileID } = props
    try {
      const response = await SpendFilesApi.recalculateDenominatorMatchSpendFileVersion(fileID)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const resetFileVersionStatus = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    filesIDs: string[]
  }) => {
    const { callbackSuccess, callbackError, filesIDs } = props
    try {
      const response = await SpendFilesApi.resetSpendFileVersionStatus(filesIDs)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const createValueProposition = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    activeProgramDefaultId: string
    valuePropositionName: string
    valuePropositionCurrency: string
    expirationDays: number
    spendFileVersion: string
  }) => {
    const { callbackSuccess, callbackError, activeProgramDefaultId, valuePropositionName, valuePropositionCurrency, expirationDays, spendFileVersion } = props
    try {
      const response = await SpendFilesApi.createValueProposition(activeProgramDefaultId, valuePropositionName, valuePropositionCurrency, expirationDays, spendFileVersion)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const cloneValueProposition = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    uuid: string
  }) => {
    const { callbackSuccess, callbackError, uuid } = props
    try {
      const response = await SpendFilesApi.cloneValueProposition(uuid)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const resetVpInvitationPassword = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    uuid: string
  }) => {
    const { callbackSuccess, callbackError, uuid } = props
    try {
      const response = await SpendFilesApi.resetVpInvitationPassword(uuid)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const deleteValueProposition = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    uuid: string
  }) => {
    const { callbackSuccess, callbackError, uuid } = props
    try {
      const response = await SpendFilesApi.deleteValueProposition(uuid)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const deleteValuePropositionInvitation = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    uuid: string
  }) => {
    const { callbackSuccess, callbackError, uuid } = props
    try {
      const response = await SpendFilesApi.deleteValuePropositionInvitation(uuid)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const postValuePropositionInvitation = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    valuePropositionId: string
    emails: Array<string>
  }) => {
    const { callbackSuccess, callbackError, valuePropositionId, emails } = props
    
    // Validate emails array is not null or empty
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      if (callbackError) {
        callbackError({ message: 'Emails array cannot be empty' })
      }
      return
    }
    
    // Filter out any empty or invalid emails
    const validEmails = emails.filter((email: string) => {
      return email && typeof email === 'string' && email.trim() !== ''
    })
    
    if (validEmails.length === 0) {
      if (callbackError) {
        callbackError({ message: 'No valid emails provided' })
      }
      return
    }
    
    try {
      const response = await SpendFilesApi.postValuePropositionInvitation(valuePropositionId, validEmails)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const getInvitationsByValueProposition = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    valuePropositionId: string
  }) => {
    const { callbackSuccess, callbackError, valuePropositionId } = props
    try {
      const response = await SpendFilesApi.getInvitationsByValueProposition(valuePropositionId)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data['hydra:member'])
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const validateValuePropositionForInternalUsers = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    valuePropositionId: string
  }) => {
    const { callbackSuccess, callbackError, valuePropositionId } = props
    try {
      const response = await SpendFilesApi.validateValuePropositionForInternalUsers(valuePropositionId)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const setNewExpirationDateValueProposition = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    uuid: string
    expirationDays: string
  }) => {
    const { callbackSuccess, callbackError, uuid, expirationDays } = props
    try {
      const response = await SpendFilesApi.setNewExpirationDateValueProposition(uuid, expirationDays)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const setStatusforValueProposition = async (props: {
    callbackSuccess?: (data: any) => void
    callbackError?: (data: any) => void
    uuid: string
    isPublic: string|boolean
  }) => {
    const { callbackSuccess, callbackError, uuid, isPublic } = props
    try {
      const response = await SpendFilesApi.setStatusforValueProposition(uuid, isPublic)
      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data)
        }
        return
      }
      if (callbackError) {
        callbackError(response.data)
      }
    } catch (error) {
      if (callbackError) {
        callbackError(error)
      }
    }
  }

  const clearStore = () => {
    spendFiles.value = []
    emisFiles.value = []
    emisFileVersions.value = []
    spendFileVersions.value = []
  }

  return {
    // State
    spendFiles,
    emisFiles,
    emisFileVersions,
    spendFileVersions,
    urlSpendTemplateDownload,
    urlSpendExampleDownload,

    // Getters
    getEmisFiles,
    getSpendFiles,
    getEMISFilesVersions,
    getSpendFilesVersions,
    getUrlSpendTemplateDownload,
    getUrlSpendExampleDownload,

    // Mutations
    setInitialState,
    setEMISFile,
    setSpendFile,
    setEMISFilesVersions,
    setSpendFilesVersions,

    // Actions
    uploadAdjustmentsFile,
    postEMISFile,
    postCSVFile,
    getEMISMediaFileVersion,
    postSpendFileVersion,
    fetchSpendFilesVersions,
    spendFilesVersionsByCompanyAPIReadAll,
    spendFilesVersionsAPIReadAll,
    getSpendFilesVersionsByStatus,
    getSpendFileVersion,
    postSpendFile,
    postSpendFileVisibility,
    postSpendFileCompany,
    deleteSpendFileVersion,
    deleteEMISFile,
    deleteCompanyFile,
    downloadAdjustmentsFile,
    downloadCSVFile,
    getMediaFileVersion,
    recalculateFileVersion,
    recalculateDenominatorMatchFileVersion,
    resetFileVersionStatus,
    createValueProposition,
    cloneValueProposition,
    resetVpInvitationPassword,
    deleteValueProposition,
    deleteValuePropositionInvitation,
    postValuePropositionInvitation,
    getInvitationsByValueProposition,
    validateValuePropositionForInternalUsers,
    setNewExpirationDateValueProposition,
    setStatusforValueProposition,
    clearStore,
    getSpendFileUploadableFormat
  }
}, {
  persist: {
    storage: secureStorage,
    key: 'ada-spendFiles'
  }
})

export type { SpendFile, SpendFileVersion, EMISFile, ValueProposition } 