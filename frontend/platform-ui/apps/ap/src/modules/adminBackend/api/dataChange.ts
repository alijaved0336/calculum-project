import { ApiResponse, giveAnswer } from "@/services/api/response";
import { useAdminBackendStore } from '@/stores/adminBackend';
import { getBaseApi } from '@/utils/getBaseApi';
import * as Iso36166 from "@/utils/ISO3166-1";
import axios from '@/utils/axios';
import { useToast } from "vue-toastification";

/**
 * update values
 *
 */
export function updateValues(currentObj: string, selectedCategory: string) {
  const adminBackendStore = useAdminBackendStore();
  const params = {
    dataItem: currentObj,
    changeType: selectedCategory,
    callbackSuccess: () => {
      if (import.meta.env.DEV) console.log("success: updated ");
    },
    callbackError: () => {
      if (import.meta.env.DEV) console.log("error : cannot update ");
    }
  };

  adminBackendStore.updateDataChangeValues(params);
}

/**
 * get list of countries
 *
 */
export function getListOfCountries() {
  return Iso36166.getListOfCountries().map((item: any) => item.name);
}

/**
 * get suppliers
 *
 * api/categorize/suppliers
 * List of companies
 */
export function getSuppliers(spendFile: string) {
  const adminBackendStore = useAdminBackendStore();
  const params = {
    spendFileVersion: spendFile,

    callbackSuccess: (callbackSuccessData: any) => {
      // Nothing to do here?
    },

    callbackError: () => {
      if (import.meta.env.DEV) console.log("** error, cannot get suppliers");
    }
  };

  adminBackendStore.getSuppliersForDataChange(params);
}

/**
 * get credit values
 *
 */
export function getCreditRatingValues() {
  const adminBackendStore = useAdminBackendStore();
  const params = {
    callbackSuccess: (callbackSuccessData: any) => {
      //get value here
      let data = callbackSuccessData["hydra:member"];

      const listOfRatings = data
        .map((item: any) => item.stockPerformanceMarketIndex)
        .filter((value: any, index: any, self: any) => {
          return self.indexOf(value) === index;
        });

      return listOfRatings;
    },
    callbackError: () => {
      if (import.meta.env.DEV) console.log("error : get values for company credit");
    }
  };

  // Make API call
  adminBackendStore.getValuesForCreditRating(params);
}

/**
 * Save updated data to DB
 */
export function saveUpdatedData() {
  useToast().error("ReqWasNotSaved");
}
export async function postSpendNotes(
  spendFileVersionUUID: string,
  spendFileVersionNotes: string
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/spend-file-versions/notes/update";
  const params = {
    spendFileVersionUUID:spendFileVersionUUID,
    spendFileVersionNotes:spendFileVersionNotes
  };

  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST UPDATE NOTES");
}