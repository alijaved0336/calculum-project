import * as Routing from "@/services/router/Routing";
import { authLogin } from "@/utils/CookieSessionsFns";

export interface ApiResponse {
  success: boolean;
  code: number;
  data: any;
  skipped?: boolean;
}

export interface GiveAnswerOptions {
  /**
   * Skips the redirect to login on a 401 (WI#19104).
   *
   * For an ancillary endpoint whose failure should cost the caller a feature
   * rather than the session — the Firebase event token being the case this
   * exists for — the caller wants the 401 back as data. Exempting it in the
   * axios interceptor alone is not enough: the interceptor hands the original
   * error through, and this helper would then redirect anyway.
   */
  skipAuthRedirect?: boolean;
}

/** A response carries `status`; a batch carries one `code` per entry. */
function hasStatus(response: any, status: number): boolean {
  return Array.isArray(response)
    ? response.some((r: any) => r.code === status)
    : response?.status === status;
}

export function giveAnswer(response: any, tag: any = "", options: GiveAnswerOptions = {}): ApiResponse {


  const isArray: boolean = Array.isArray(response);

  const success: boolean = isArray
    ? response.findIndex(
        (r: any) => r.code !== 200 && r.code !== 201 && r.code !== 204,
      ) === -1
    : response?.status === 200 ||
      response?.status === 201 ||
      response?.status === 204;

  const code = isArray ? response.map((r: any) => r.code) : response?.status;
  
  const data = isArray ? response.map((r: any) => r.data) : response?.data;

  //Review if something is wrong
  if (!options.skipAuthRedirect && hasStatus(response, 401)) {
    if (import.meta.env.DEV) console.info("Unauthorized", response);
    authLogin()
  }

  if (hasStatus(response, 403)) {
    if (import.meta.env.DEV) console.info("Forbidden", response);
    Routing.openMain({
      fromErrorResponse403: "true",
    });
  }

  if (hasStatus(response, 410)) {
    if (import.meta.env.DEV) console.info("Forbidden, PILOT ACCOUNT EXPIRED", response);
    Routing.openMain({
      fromErrorResponse410: "true",
    });
  }

  return {
    success,
    code,
    data,
  };
}
