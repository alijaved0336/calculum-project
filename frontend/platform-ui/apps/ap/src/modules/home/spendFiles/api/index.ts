import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { removeIRI } from '@/utils'
import { getBaseApi } from '@/utils/getBaseApi';


/**
 * creates a link based on the behavior
 * @param behavior 
 * @returns 
 */
function getLinkHelper(behavior: string) {
  switch (behavior) {
    case 'smeAdjustments': 
      return '/api/sme-data-customization/file/'
    case 'peerGroupAndSupplierStandardAdjustments':
      return '/api/data-customization/file/'

  }
}

/**
 * PeerGroupAndSupplierStandardAdjustments
 * Upload the Excel File
 * @param file 
 * @param companyUUID 
 * @returns 
 */
export async function uploadAdjustmentsFile(file: any, id: string, behavior: string): Promise<ApiResponse> {
  let response = null
  let dynamiLink = getLinkHelper(behavior)
  const url = getBaseApi() + dynamiLink + id
  const formData = new FormData()
  formData.append('file', file)
  formData.append('companyUUID', id)
  try {
    response = await axios.post(url, formData, {
      headers: {        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function postEMISFile(file: any, companyUUID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + `/api/company_enhancing_files/${removeIRI(companyUUID)}`
  const formData = new FormData()
  formData.append('file', file)
  formData.append('companyUUID', companyUUID)
  try {
    response = await axios.post(url, formData, {
      headers: {        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}



export async function postCSVFile(file: any): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + `/api/company/upload-company-data-from-csv`
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

  return giveAnswer(response)
}


export async function postSpendFile(
  file: any, 
  companyUUID: string, 
  spendFileVersion: string | null, 
  isPublic: boolean | null = null, 
  forStatusChange: boolean | null = null,
  isSupplier: boolean | null = false,
  showOpportunityExpectedOpportunity: string | null = null,
  strategiesVisibility  : string | null = null,
  syncData: any | null = null,
  spendfileUUID: string | null = null,
  uploadType: string | null = null
): Promise<ApiResponse> {


  let response = null;
  // Determine the URL based on whether it's for status change or not
  const url = forStatusChange || showOpportunityExpectedOpportunity !== null || strategiesVisibility !== null
    ? `${getBaseApi()}/api/spend_file_versions/${removeIRI(spendFileVersion)}`  // Assuming spendFileVersion is part of the URL
    : `${getBaseApi()}/api/spend_files`;

  if (forStatusChange) {
    // Prepare data for PATCH request
    const patchData = {
      companyUUID: companyUUID,
      isPublic: isPublic
    };

    try {
      response = await axios.patch(url, patchData, {
        headers: {
          
          'Content-Type': 'application/merge-patch+json'  // Correct content type for PATCH
        }
      });
    } catch (e: any) {
      response = e.response;
    }
  }
  /**
   * if user change the showOpportunityExpectedOpportunity from setup
   */

    else if(showOpportunityExpectedOpportunity !== null) { 
      const patchData = {
        showOpportunityExpectedOpportunity: showOpportunityExpectedOpportunity
      };

      try {
        response = await axios.patch(url, patchData, {
          headers: {
            
            'Content-Type': 'application/merge-patch+json'  // Correct content type for PATCH
          }
        });
      } catch (e: any) {
        response = e.response;
      }
   
    }

    else if(strategiesVisibility !== null) { 
      const patchData = {
        strategiesVisibility: strategiesVisibility
      };

      try {
        response = await axios.patch(url, patchData, {
          headers: {
            
            'Content-Type': 'application/merge-patch+json'  // Correct content type for PATCH
          }
        });
      } catch (e: any) {
        response = e.response;
      }
   
    }
    
    
    
    else {

    if (import.meta.env.DEV) console.log('** syncData', syncData)
    // Prepare FormData for POST request
    const formData = new FormData();    
    
    if (syncData) {
      formData.append('syncData', JSON.stringify(syncData));
    }
    //-if isSupplier, then isPotentialSupplier is true, otherwise isPublic, spendfileUUID and uploadType are not needed
    if (isSupplier) {
      formData.append('isPotentialSupplier', isSupplier ? 'true' : 'false');    
    } else {
      formData.append('companyUUID', companyUUID);    
      formData.append('isPublic', isPublic ? 'true' : 'false');    
      formData.append('spendfileUUID', spendfileUUID ?? '');      
    }

    if (uploadType) {
      formData.append('uploadType', uploadType);
    }
    
    if (file) {
      formData.append('file', file);
    }

    if (spendFileVersion) {
      formData.append('spendFileVersion', removeIRI(spendFileVersion));
    }

    try {
      response = await axios.post(url, formData, {
        headers: {
          
          'Content-Type': 'multipart/form-data'  // Correct content type for POST with FormData
        }
      });
    } catch (e: any) {
      response = e.response;
    }
  }

  return giveAnswer(response);
}

export async function postSpendFileVisibility(
  spendFileVersion: string,
  isPublic: boolean,
): Promise<ApiResponse> {
  let response = null;

  const url = `${getBaseApi()}/api/spend-file-versions/visibility/update`;

  const params = {
    spendFileVersionUUID: removeIRI(spendFileVersion),
    isPublic: isPublic,
  };

  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}



export async function postSpendFileCompany(file: any, companyUUID: string, startDate: any, endDate: any, userName: any, email: any, message: any, companyName: any, invitationId: any): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/company_files'
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
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}


export async function postSpendFileVersion(file: any, fileID: string, companyUUID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + fileID + '/versions'
  const formData = new FormData()
  formData.append('file', file)
  formData.append('companyUUID', companyUUID)
  
  try {
    response = await axios.post(url, formData, {
      headers: {        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function getSpendFilesVersions(fileID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + fileID + '/versions'

  try {
    response = await axios.get(url, {
      headers: {        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}



export async function getSpendFileUploadableFormat(fileID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/spend-file-versions/'+removeIRI(fileID)+'/request-export'

  const params = {}

  try {
    response = await axios.post(url, params, {
      headers: {        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}


export async function spendFilesVersionsByCompanyAPIReadAll(companyId: string): Promise<ApiResponse> {
  let response = null;

  const url = `${getBaseApi()}/api/companies/${companyId}/spend_files_versions`

  try {
    response = await axios.get(url, {
      headers: {        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}


export async function spendFilesVersionsAPIReadAll(): Promise<ApiResponse> {
  let response = null;

  const url = `${getBaseApi()}/api/companies/spend_files_versions`

  try {
    response = await axios.get(url, {
      headers: {        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function getSpendFilesVersionsByStatus(status: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/spend-file-version/status/' + status

  try {
    response = await axios.get(url, {
      headers: {        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function getSpendFileVersion(fileVersionID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + fileVersionID
  try {
    response = await axios.get(url, {
      headers: {        
        'Content-type': 'multipart/form-data'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}


export async function getEMISMediaFileVersion(emisFileVersionID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + emisFileVersionID + '/download'

  try {
    response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {        
        Accept: 'application/*'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

function downloadLinkHelper(behavior: string, spendFileId: string) {
  switch (behavior) {
    case 'smeAdjustments':
      return `/api/spend-file-versions/get-entities-data/${spendFileId}`   
   case 'peerGroupAndSupplierStandardAdjustments':
      return `/api/spend-file-versions/get-strategies-data/${spendFileId}`
  }
}

export async function downloadAdjustmentsFile(spendFileId: string, behavior: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + downloadLinkHelper(behavior, spendFileId) 
  try {
    response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {        
        Accept: 'application/*'
      }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}


export async function downloadCSVFile(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + "/api/company/export-company-data-to-csv"
  try {
    response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {        
        Accept: 'application/*'
      }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}

export async function getMediaFileVersion(versionID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + versionID + '/download'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function deleteEMISFile(emisFileVersionID: string): Promise<ApiResponse> {
  let response = null 
  const url = getBaseApi() + emisFileVersionID
  try {
    response = await axios.delete(url, {
      headers: {
        
        'Content-type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function deleteSpendFile(versionID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + versionID

  try {
    response = await axios.delete(url, {
      headers: {
        
        'Content-type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function deleteCompanyFile(fileID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + fileID

  try {
    response = await axios.delete(url, {
      headers: {
        
        'Content-type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

/**
 * Recalculates the spend file version and returns the API response.
 * Route: POST - "/api/spend-file-versions/recalculate"
 *
 * @param {string} fileID - The ID of the file to recalculate the spend version for
 * @return {Promise<ApiResponse>} The API response after recalculating the spend file version
 */
export async function recalculateSpendFileVersion(filesIDs: string[]): Promise<ApiResponse> {
  let response = null

  const params = {
    "files": filesIDs
  }

  const url = getBaseApi() + '/api/spend-file-versions/recalculate'

  try {
    response = await axios.post(url, params, {
      headers: {
        
        'Content-type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

/**
 * Resets the spend file version status to 'ready' and returns the API response.
 * Route: POST - "/api/spend-file-versions/reset-status"
 *
 * @param {string[]} filesIDs - Array of file UUIDs to reset status for
 * @return {Promise<ApiResponse>} The API response after resetting the spend file version status
 */
export async function resetSpendFileVersionStatus(filesIDs: string[]): Promise<ApiResponse> {
  let response = null

  const params = {
    "files": filesIDs
  }

  const url = getBaseApi() + '/api/spend-file-versions/reset-status'

  try {
    response = await axios.post(url, params, {
      headers: {
        'Content-type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function recalculateDenominatorMatchSpendFileVersion(fileID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/denominator-match-proccess/' + fileID

  try {
    response = await axios.post(url, null, {
      headers: {
        
        'Content-type': 'application/json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}




export async function createValueProposition(
  activeProgramDefaultId: string,
  valuePropositionName: string, 
  valuePropositionCurrency: string, 
  expirationDays: number, 
  spendFileVersion: string

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/value_propositions";


  const params = {
    activeProgramDefaultId,
    valuePropositionName,
    codeCurrency: valuePropositionCurrency,
    spendFileVersion
  }



  try {
    response = await axios.post(url, params, {
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}



export async function cloneValueProposition(
  uuid: string

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/value_proposition/clone_value_proposition"

const params = {
  uuid: removeIRI(uuid)
}


  try {
    response = await axios.post(url, params, {
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}



export async function resetVpInvitationPassword(
  uuid: string

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/value_proposition/reset_vp_invitation_password"

const params = {
  uuid: removeIRI(uuid)
}


  try {
    response = await axios.post(url, params, {
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}



export async function deleteValueProposition(
  uuid: string

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + uuid;


  try {
    response = await axios.delete(url, {
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}


export async function deleteValuePropositionInvitation(
  uuid: string

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/value_proposition/delete_invitations_value_proposition"

  const params = {
    uuid
  }


  try {
    response = await axios.post(url, params, {
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}



export async function postValuePropositionInvitation(valuePropositionId: string, emails: Array<string>): Promise<ApiResponse> {
  const url = getBaseApi() + '/api/value_proposition/create_invitations'

  let response = null;

  const params = {
    uuid: removeIRI(valuePropositionId),
    emails
  }
  
  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e:any) {
    response = e.response;
  }

  return giveAnswer(response);
}


export async function getAllValuePropositions(
  spendFileVersion: string

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/value_propositions?spendFileVersion.uuid=" + spendFileVersion;


  try {
    response = await axios.get(url, {
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}



export async function getInvitationsByValueProposition(
  valuePropositionId: string

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/invitation_value_propositions?valueProposition.uuid=" + removeIRI(valuePropositionId)


  try {
    response = await axios.get(url, {
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}


export async function validateValuePropositionForInternalUsers(
  valuePropositionId: string

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/value_proposition/validate_invitations_logIn_user_value_proposition"

  const params = {
    valuePropositionId: removeIRI(valuePropositionId)
  }

  try {
    response = await axios.post(url, params, {
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}



export async function setNewExpirationDateValueProposition(
  uuid: string,
  expirationDays: string

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + uuid;

  const params = {
    expirationDays
  }


  try {
    response = await axios.patch(url, params, {
      headers: {          
          'Content-Type': 'application/merge-patch+json'
        }

    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}



export async function setStatusforValueProposition(
  uuid: string,
  isPublic: string|boolean

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + uuid;

  const params = {
    isPublic
  }


  try {
    response = await axios.patch(url, params, {
      headers: {          
          'Content-Type': 'application/merge-patch+json'
        }

    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}



export async function setPersistValuePropositionJson(
  uuid: string,
  valuePropositionData: string

): Promise<ApiResponse> {


  if (import.meta.env.DEV) console.log("** valuePropositionData",valuePropositionData)

  let response = null;
  const url = getBaseApi() + "/api/value_propositions/" + uuid;

  const params = {
    valuePropositionData
  }


  try {
    response = await axios.patch(url, params, {
      headers: {          
          'Content-Type': 'application/merge-patch+json'
        }

    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}


export async function postUploadImagesValueProposition(file: any): Promise<ApiResponse> {
  let response = null
  
  const url = getBaseApi() + '/api/value_proposition/save_image_value_proposition_data'
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

  return giveAnswer(response, 'POSt Upload image VP')
}



export async function requestNewContent(type: any, valuepropositionId: any, spendFileVersionUuid: any,activeProgramDefaultId: string, supplierUuid: string): Promise<ApiResponse> {
  let response = null
  
  const url = getBaseApi() + '/api/value_proposition/get_data_to_value_propositions'
  
  const params = {
    
    type,
    valuepropositionId,
    spendFileVersionUuid,
    activeProgramDefaultId,
    supplierUuid
  }

  try {
    response = await axios.post(url, params, {
      headers: {
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'POSt Upload image VP')
}




export async function requestNewContentToExportSupplierPDF(spendFileVersionUuid: any,activeProgramDefaultId: string, entities: Array<string>, codeCurrency: string): Promise<ApiResponse> {
  let response = null
  
  const url = getBaseApi() + '/api/value_proposition/export_data_supplier'
  
  const params = {    
    spendFileVersionUuid,
    activeProgramDefaultId,
    entities,
    codeCurrency
  }

  try {
    response = await axios.post(url, params, {
      headers: {
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'POSt Upload image VP')
}


export async function setNameInGridValueProposition(
  uuid: string,
  valuePropositionName: string

): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/value_propositions/" + removeIRI(uuid)

const params = {
  valuePropositionName
}


  try {
    response = await axios.patch(url, params, {
      headers: {          
          'Content-Type': 'application/merge-patch+json'
        }

    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}
