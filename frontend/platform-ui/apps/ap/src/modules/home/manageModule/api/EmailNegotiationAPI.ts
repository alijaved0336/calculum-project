import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { getBaseApi } from '@/utils/getBaseApi';
import { StringUtils, isNullOrUndefined } from "@/utils";

// *** Email Negotiation API ***

export default class EmailNegotiationAPI {
  /**
   * Get list of plans imported from the file given a program.
   * Route: GET /api/email-negotiation/get-plans/{programId}
   *
   *  [{"key": "planUuid", "value": "Nombre de plan"}]
   *
   * @param {string} programId
   */
  static async emailNegotiationGetPlans({
    programId
  }: {
    programId: string;
  }): Promise<ApiResponse> {
    // Validate
    if (StringUtils.isNullUndefinedOrEmpty(programId)) {
      return giveAnswer(null, "ProgramId is missing");
    }

    let response = null;

    const url =
      getBaseApi() + `/api/email-negotiation/get-plans/${programId}`;

    try {
      response = await axios.get(url, {
        headers: {
          
        }
      });
    } catch (e) {
      response = (e as any).response;
    }

    return giveAnswer(response);
  }

  /**
   * Get the data for a given email negotiation section (summary or a specific plan).
   *
   * @param {number} currencyRate
   * @param {string} programId
   * @param {string} planId
   */
  static async emailNegotiationGetStats({
    currencyRate,
    programId,
    planId
  }: {
    currencyRate: number;
    programId: string;
    planId?: string;
  }): Promise<any> {
    // Validate
    if (StringUtils.isNullUndefinedOrEmpty(programId)) {
      return giveAnswer(null, "ProgramId is missing");
    }

    if (isNullOrUndefined(currencyRate)) {
      // Warning
      currencyRate = 1;

      if (import.meta.env.DEV)
        console.warn(
          "Currency rate is not specified. Using default value: " + currencyRate
        );
    }

    const params = {
      currencyRate: currencyRate,
      programUuid: programId,
      planUuid: planId
    };

    let response = null;

    const url = getBaseApi() + `/api/email-negotiation/get-stats`;

    try {
      response = await axios.post(url, params, {
        headers: {
          
        }
      });
    } catch (e) {
      response = (e as any).response;
    }

    return giveAnswer(response);
  }

  static async emailNegotiationFileUpload({
    file,
    spendFileVersionId
  }: {
    file: any;
    spendFileVersionId: string;
  }): Promise<ApiResponse> {
    // Validate

    if (isNullOrUndefined(file)) {
      return giveAnswer(null, "File is missing");
    }

    if (StringUtils.isNullUndefinedOrEmpty(spendFileVersionId)) {
      return giveAnswer(null, "SpendFileVersionId is missing");
    }

    let response = null;

    const url = `${getBaseApi()}/api/email-negotiation/upload/${spendFileVersionId}`;

    const formData = new FormData();

    formData.append("file", file);

    try {
      response = await axios.post(url, formData, {
        headers: {
          
          "Content-type": "multipart/form-data"
        }
      });
    } catch (e) {
      response = (e as any).response;
    }

    return giveAnswer(response);
  }
}

// *** END Injection API ***
