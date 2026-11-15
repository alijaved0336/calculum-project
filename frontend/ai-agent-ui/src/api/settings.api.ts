import client from './services/negotiation.client'

export interface StrategyToggle {
  strategy: string
  enabled: boolean
  locked: boolean
  available: boolean
  tone: string
  lockReason: string | null
}

export interface PromptInstruction {
  prompt: string
  isEnabled: boolean
  isConflicted: boolean
  author: string | null
  createdAt: string | null
}

export interface SettingsResponse {
  tenantUuid: string | null
  tenantName: string | null
  tones: string[] | null
  globalTones: string[] | null
  strategies: string[] | null
  globalStrategy: string[] | null
  strategyToneMap: Record<string, string> | null
  promptInstructions: Record<string, PromptInstruction> | null
  effectiveStrategies: string[]
  effectiveTones: string[]
  strategyToggles: StrategyToggle[]
  kbDocuments: KbDocument[]
}

export interface KbDocument {
  uuid: string
  filename: string
  fileType: string
  status: string
  isAlreadyUploaded: boolean
  chunkCount: number
  uploadedBy: string | null
  updatedAt: string | null
}

export interface SettingsPatchRequest {
  strategies?: string[]
  tones?: string[]
  strategyToneMap?: Record<string, string>
  promptInstructions?: Record<string, { prompt: string; isEnabled: boolean; isConflicted: boolean }>
}

export interface TenantStrategy {
  tenantUuid: string
  tenantName: string
  globalStrategy: string[]
  /** Allows tenant users to open response Data Inputs. Global admins and tenant admins always can. */
  viewDataInputs?: boolean
}

export interface TenantSettingsPatchRequest {
  tenantUuid: string
  tenantName: string
  globalStrategy: string[]
  viewDataInputs: boolean
}

export interface TenantsSettingsResponse {
  globalStrategies: string[]
  tenants: TenantStrategy[]
}

export const settingsApi = {
  get: (tenantUuid?: string | null) =>
    client.get<SettingsResponse>('/settings', {
      params: tenantUuid ? { tenant_uuid: tenantUuid } : undefined,
    }),
  patch: (body: SettingsPatchRequest, tenantUuid?: string | null) =>
    client.patch<SettingsResponse>('/settings', body, {
      params: tenantUuid ? { tenant_uuid: tenantUuid } : undefined,
    }),
  getTenants: () =>
    client.get<TenantsSettingsResponse>('/settings/tenants'),
  patchTenant: (tenantUuid: string, body: TenantSettingsPatchRequest) =>
    client.patch<TenantStrategy>(`/settings/tenants/${tenantUuid}`, body),
}
