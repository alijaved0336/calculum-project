import axios from '@/utils/axios'
import { getBaseApi } from '@/utils/getBaseApi'
import { MAX_EMAILS_PER_BATCH } from '@/modules/adminBackend/views/composables/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface B2CProfile {
  type: 'local' | 'sso' | 'pending'
  issuerDomain: string | null
  identities: Array<{ signInType: string; issuer: string; issuerAssignedId: string }>
  lastPasswordChangeDateTime: string | null
}

export interface MfaMethod {
  id: string
  type: 'softwareOath' | 'phone'
  label: string
}

export interface AuditLogEntry {
  activityDateTime: string
  result: 'success' | 'failure'
  ipAddress: string | null
  location: string | null
  category: string
  activityDisplayName: string
}

export interface InvitationLinkResponse {
  invitationLink: string
  invitationToken: string
}

export interface UserCompanyAccess {
  companyUuid: string
  companyName: string
  groupName: string | null
  roles: string[]
  enabled: boolean
}

export interface FeedbackSurveyState {
  lastFeedbackSurveyAt: string | null
  lastFeedbackSurveyResponse: 'accept' | 'decline' | null
}

// ── API Functions ─────────────────────────────────────────────────────────────

async function fetchB2CProfile(userUuid: string): Promise<B2CProfile> {
  const { data } = await axios.get<B2CProfile>(`${getBaseApi()}/api/admin/user/${userUuid}/b2c-profile`)
  return data
}

async function fetchMfaMethods(userUuid: string): Promise<MfaMethod[]> {
  const { data } = await axios.get<MfaMethod[]>(`${getBaseApi()}/api/admin/user/${userUuid}/mfa-methods`)
  return data
}

async function removeMfaMethod(
  userUuid: string,
  type: 'softwareOath' | 'phone',
  methodId: string
): Promise<void> {
  await axios.delete(`${getBaseApi()}/api/admin/user/${userUuid}/mfa-methods/${type}/${methodId}`)
}

async function fetchAuditLogs(userUuid: string): Promise<AuditLogEntry[]> {
  const { data } = await axios.get<AuditLogEntry[]>(`${getBaseApi()}/api/admin/user/${userUuid}/audit-logs`)
  return data
}

async function fetchInvitationLink(userUuid: string): Promise<InvitationLinkResponse> {
  const { data } = await axios.get<InvitationLinkResponse>(`${getBaseApi()}/api/admin/user/${userUuid}/invitation-link`)
  return data
}

async function extendInvitation(userUuid: string, days?: number): Promise<{ extended: number; newExpiration: string }> {
  const { data } = await axios.post(`${getBaseApi()}/api/admin/user/${userUuid}/extend-invitation`, days ? { days } : {})
  return data
}

async function revokeInvitation(userUuid: string): Promise<void> {
  await axios.post(`${getBaseApi()}/api/admin/user/${userUuid}/revoke-invitation`)
}

async function deleteUser(userUuid: string): Promise<void> {
  await axios.delete(`${getBaseApi()}/api/admin/user/${userUuid}`)
}

async function removeFromPlatform(userUuid: string): Promise<void> {
  await axios.delete(`${getBaseApi()}/api/admin/user/${userUuid}/remove-from-platform`)
}

async function setAccountEnabled(userUuid: string, enabled: boolean): Promise<void> {
  await axios.patch(`${getBaseApi()}/api/admin/user/${userUuid}/account-status`, { enabled })
}

async function forcePasswordReset(userUuid: string): Promise<void> {
  await axios.post(`${getBaseApi()}/api/admin/user/${userUuid}/force-password-reset`)
}

async function invalidateSessions(userUuid: string): Promise<void> {
  await axios.post(`${getBaseApi()}/api/admin/user/${userUuid}/invalidate-sessions`)
}

async function fetchFeedbackSurvey(userUuid: string): Promise<FeedbackSurveyState> {
  const { data } = await axios.get<FeedbackSurveyState>(`${getBaseApi()}/api/admin/user/${userUuid}/feedback-survey`)
  return data
}

async function resetFeedbackSurvey(userUuid: string): Promise<void> {
  await axios.post(`${getBaseApi()}/api/admin/user/${userUuid}/reset-feedback-survey`)
}

/** Resend invitation email — calls existing GET endpoint once per userCompanyId. */
async function resendInvitation(userCompanyIds: number[]): Promise<{ succeeded: number[]; failed: number[] }> {
  const succeeded: number[] = []
  const failed: number[] = []
  for (const id of userCompanyIds) {
    try {
      await axios.get(`${getBaseApi()}/api/admin/user/resend_invitation/${id}`)
      succeeded.push(id)
    } catch {
      failed.push(id)
    }
  }
  return { succeeded, failed }
}

async function fetchUserCompanies(userUuid: string): Promise<UserCompanyAccess[]> {
  const { data } = await axios.get<UserCompanyAccess[]>(`${getBaseApi()}/api/admin/user/${userUuid}/companies`)
  return data
}

async function updateUserRoles(userUuid: string, companyUuid: string, roles: string[]): Promise<void> {
  await axios.patch(`${getBaseApi()}/api/admin/user_companies/update-roles`, { userUuid, companyUuid, roles })
}

async function updateUserGeneralRoles(userUuid: string, roles: string[]): Promise<void> {
  await axios.put(`${getBaseApi()}/api/users/${userUuid}/roles`, { roles })
}

async function removeFromCompany(userUuid: string, companyUuid: string): Promise<void> {
  await axios.post(`${getBaseApi()}/api/admin/user_companies/remove`, { userUuid, companyUuid })
}

async function grantCompanyAccess(email: string, companyUuid: string, roles: string[]): Promise<void> {
  // Defensive guard: backend rejects > MAX_EMAILS_PER_BATCH with 400. Today this composable
  // sends a single email, but guard against future signature changes that batch invitees.
  const emails = email.split(',').map(e => e.trim()).filter(Boolean)
  if (emails.length > MAX_EMAILS_PER_BATCH) {
    throw new Error(`Cannot grant access to more than ${MAX_EMAILS_PER_BATCH} emails per request (received ${emails.length}).`)
  }
  await axios.post(`${getBaseApi()}/api/admin/user_companies/create_user_account`, {
    user: { email: emails, language: 'en' },
    roles,
    company: `/api/companies/${companyUuid}`,
  })
}

async function resetIdentityProvider(userUuid: string, companyUuid: string): Promise<void> {
  await axios.post(`${getBaseApi()}/api/admin/user/${userUuid}/company/${companyUuid}/reset-identity-provider`)
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useUserDrawer() {
  return {
    fetchB2CProfile,
    fetchUserCompanies,
    fetchMfaMethods,
    removeMfaMethod,
    fetchAuditLogs,
    fetchInvitationLink,
    extendInvitation,
    revokeInvitation,
    deleteUser,
    removeFromPlatform,
    setAccountEnabled,
    forcePasswordReset,
    invalidateSessions,
    fetchFeedbackSurvey,
    resetFeedbackSurvey,
    resendInvitation,
    updateUserRoles,
    updateUserGeneralRoles,
    removeFromCompany,
    grantCompanyAccess,
    resetIdentityProvider,
  }
}
