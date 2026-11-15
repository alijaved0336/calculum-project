import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { getBaseApi } from '@/utils/getBaseApi';
import { readContentDispositionFilename } from '@/utils/contentDisposition';

/**
 * Account Receivables (AR) counterpart of spendFiles/api::postSpendFile.
 * Uploads a sale file (multipart) to POST /api/sale_files; the backend stores it in the
 * dedicated AR bucket and creates the ar.sale_file / ar.sale_file_version rows.
 *
 * @param file        the file to upload
 * @param companyUUID target company UUID (not IRI)
 */
export async function postSaleFile(file: any, companyUUID: string): Promise<ApiResponse> {
  let response = null
  const url = `${getBaseApi()}/api/sale_files`
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

/**
 * Sale file versions for one company (AR grid). GET /api/companies/{companyId}/sale_files_versions
 */
export async function saleFilesVersionsByCompanyAPIReadAll(companyId: string): Promise<ApiResponse> {
  let response = null
  const url = `${getBaseApi()}/api/companies/${companyId}/sale_files_versions`
  try {
    response = await axios.get(url)
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

/**
 * Sale file versions for all companies (AR grid). GET /api/companies/sale_files_versions
 */
export async function saleFilesVersionsAPIReadAll(): Promise<ApiResponse> {
  let response = null
  const url = `${getBaseApi()}/api/companies/sale_files_versions`
  try {
    response = await axios.get(url)
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

/**
 * Recalculate a sale file version. POST /api/sale_file_versions/{uuid}/recalculate
 *
 * @param uuid sale file version uuid
 */
export async function recalculateSaleFileVersion(uuid: string): Promise<ApiResponse> {
  let response = null
  const url = `${getBaseApi()}/api/sale_file_versions/${uuid}/recalculate`
  try {
    response = await axios.post(url, {})
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

/**
 * Delete a sale file version. DELETE /api/sale_file_versions/{uuid} (AB#20871)
 *
 * The monolith asks AR to claim the version and answers 200 once AR has; the version reads
 * `deleteClaimed` in the grid until AR's worker has removed it. A 409 carries AR's reason (a parse or
 * a calculation still owns the version), a 502 that AR could not be asked.
 *
 * @param uuid sale file version uuid
 */
export async function deleteSaleFileVersion(uuid: string): Promise<ApiResponse> {
  let response = null
  const url = `${getBaseApi()}/api/sale_file_versions/${uuid}`
  try {
    response = await axios.delete(url)
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

/**
 * Which adjustments file a call is about. The value is the URL segment itself, because these two
 * differ in nothing else: same envelope, same three outcome states, same 202 on upload.
 *
 * **Two files rather than one with two sheets** because their grains differ — Peer Group & Buyer
 * Standard is one row per sale line, Credit Rating is one row per buyer/parent — so AR keeps them
 * as separate exports, separate queues and separate outcome records, and the Admin Console shows
 * them as separate columns (UC-SET-07 AB#19711; UC-SET-08 AB#19911).
 */
export const ADJUSTMENTS_KIND_STRATEGY = 'strategy-adjustments'
export const ADJUSTMENTS_KIND_CREDIT_RATING = 'credit-rating-adjustments'

export type AdjustmentsKind = typeof ADJUSTMENTS_KIND_STRATEGY | typeof ADJUSTMENTS_KIND_CREDIT_RATING

/** What the adjustments download adds to the standard answer: the server's own name and type. */
export interface AdjustmentsDownload extends ApiResponse {
  /** Filename from Content-Disposition, when the server sent one. */
  fileName?: string
  /** Content-Type as served, so the saved Blob carries a type the OS can associate. */
  contentType?: string
}

/**
 * An adjustments export for one sale file version, whichever file it is.
 *
 * The monolith proxies AR's export and streams the bytes back unchanged, so unlike the payables
 * sibling — which receives JSON and builds the CSV in the browser — there is nothing to convert
 * here: the file's shape is AR's to decide. Read as an arraybuffer for exactly that reason, which
 * is also why the same reader serves a spreadsheet (strategy) and a BOM-prefixed CSV (credit
 * rating) without caring which arrived.
 *
 * **Returns more than `giveAnswer` does, deliberately.** That helper exposes only
 * `success`/`code`/`data` and drops the response headers, so the filename and content type the
 * proxy carefully sets were invisible to the caller — every download then landed under a
 * browser-generated name with no extension, which the administrator cannot reopen to edit and
 * upload back. Surfaced here rather than by widening `giveAnswer`, which every other caller in the
 * app would have inherited. `Content-Disposition` is readable cross-origin because the API lists it
 * in `expose_headers`; it can still be absent, so the caller needs a fallback.
 */
export async function downloadAdjustments(
  saleFileVersionUuid: string,
  kind: AdjustmentsKind
): Promise<AdjustmentsDownload> {
  let response = null
  const url = `${getBaseApi()}/api/sale_file_versions/${saleFileVersionUuid}/${kind}`
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

  return {
    ...giveAnswer(response),
    fileName: readContentDispositionFilename(response?.headers),
    contentType: response?.headers?.['content-type'] ?? response?.headers?.['Content-Type']
  }
}

/** One row, or one cell of one, that AR could not honour — carried whole so it can be found. */
export interface AdjustmentsRejection {
  lineNumber: number
  /** Null when the row carried no key at all, which is itself the reason it failed. */
  sourceUniqueId: string | null
  reason: string
}

/** AR's report on a processed file. Shaped by AR, not by this application — see the fetch below. */
export interface AdjustmentsReport {
  objectKey: string
  uploadedByEmail: string | null
  /** `Applied` or `Rejected`. Applied is NOT "nothing went wrong" — see `rejections`. */
  status: string
  rowsMatched: number
  valuesWritten: number
  valuesCleared: number
  valuesUnchanged: number
  rejections: AdjustmentsRejection[]
  completedAt: string
}

/** The three answers AR gives, kept apart because two of them read alike and are not. */
export const ADJUSTMENTS_OUTCOME_REPORTED = 'reported'
export const ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET = 'noUploadYet'
export const ADJUSTMENTS_OUTCOME_VERSION_UNKNOWN = 'versionUnknownToReceivables'

export interface AdjustmentsOutcome extends ApiResponse {
  state?: string
  report?: AdjustmentsReport | null
}

/**
 * What became of the last adjustments file of one kind uploaded against one sale file version.
 *
 * **The half of UC-SET-07 that was missing.** The upload answers 202 and the caller is told the
 * file was accepted, never whether it applied — AR records that and, until this call, served it to
 * nobody.
 *
 * **Three states, and the caller must not merge two of them.** `noUploadYet` means AR knows this
 * version and nobody has sent a file; `versionUnknownToReceivables` means AR has never heard of the
 * version, which is a finding about the sale file rather than an absence of adjustments. Rendering
 * both as an empty cell would hide the second behind a state that reads as normal.
 *
 * A failed conversation is none of the three: the proxy answers 502 with AR's own reason, so
 * `success` is false and `state` is absent. That case must not be drawn as "nothing uploaded".
 *
 * **The two kinds keep separate records.** Asking the credit-rating route about a version whose
 * only upload was a Peer Group file answers `noUploadYet`, deliberately — reporting the other
 * file's result would tell an administrator their ratings applied when no rating file was sent.
 */
export async function fetchAdjustmentsOutcome(
  saleFileVersionUuid: string,
  kind: AdjustmentsKind
): Promise<AdjustmentsOutcome> {
  let response = null
  const url = `${getBaseApi()}/api/sale_file_versions/${saleFileVersionUuid}/${kind}/outcome`
  try {
    response = await axios.get(url)
  } catch (e: any) {
    response = e.response
  }

  const answer = giveAnswer(response)

  // `giveAnswer` hands back the response body untouched, and the monolith's body is the envelope
  // `{ result, message, data, error }` — so the payload this call cares about sits one level deeper.
  // Reading `answer.data.state` finds the envelope's own keys instead and yields `undefined` for
  // every answer, including the good ones, which is how a working endpoint reached the user as a
  // failure. Named rather than inlined so the nesting is legible.
  const payload = answer?.data?.data

  return {
    ...answer,
    state: payload?.state,
    report: payload?.report ?? null
  }
}

/**
 * Uploads an edited adjustments file of one kind against one sale file version.
 *
 * Answers 202: the monolith stores the file in the AR bucket and publishes the event, and what
 * happened to the adjustments is AR's to report. Callers must not tell the user the figures landed.
 */
export async function uploadAdjustments(file: any, saleFileVersionUuid: string, kind: AdjustmentsKind): Promise<ApiResponse> {
  let response = null
  const url = `${getBaseApi()}/api/sale_file_versions/${saleFileVersionUuid}/${kind}`
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
