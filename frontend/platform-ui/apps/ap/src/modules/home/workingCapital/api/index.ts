import axios from '@/utils/axios'
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { getBaseApi } from '@/utils/getBaseApi'
import { USE_MOCK, MOCK_VERSIONS_RESPONSE, MOCK_COMPARE_RESPONSE, MOCK_EXPORT_LOG_RESPONSE } from './mock'

export async function fetchWorkingCapitalVersions(): Promise<ApiResponse> {
  if (USE_MOCK) return MOCK_VERSIONS_RESPONSE

  let response = null
  const url = getBaseApi() + '/api/working-capital/versions'

  try {
    response = await axios.get(url)
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'GET Working Capital Versions')
}

export async function fetchWorkingCapitalComparison(
  baseVersionUuid: string,
  minDays?: number,
  toVersion?: string,
): Promise<ApiResponse> {
  if (USE_MOCK) return MOCK_COMPARE_RESPONSE

  let response = null
  const url = getBaseApi() + '/api/working-capital/compare'
  const params: Record<string, string | number> = { baseVersion: baseVersionUuid }
  if (minDays !== undefined) params.minDays = minDays
  if (toVersion !== undefined) params.toVersion = toVersion

  try {
    response = await axios.get(url, { params })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'GET Working Capital Compare')
}

/**
 * Audit-logs a Working Capital export (AC-08; Excel format from WI#20545 AC-14).
 * Fire-and-forget from the caller's perspective — the file is already generated
 * client-side by the time this is called, so a failure here must never block or
 * error out the export.
 */
export async function postWorkingCapitalExportLog(
  baseVersionUuid?: string,
  currency?: string,
  format: 'pdf' | 'excel' = 'pdf',
): Promise<ApiResponse> {
  if (USE_MOCK) return MOCK_EXPORT_LOG_RESPONSE

  let response = null
  const url = getBaseApi() + '/api/working-capital/export-log'
  const body: Record<string, string> = { format }
  if (baseVersionUuid !== undefined) body.baseVersionUuid = baseVersionUuid
  if (currency !== undefined) body.currency = currency

  try {
    response = await axios.post(url, body)
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'POST Working Capital Export Log')
}
