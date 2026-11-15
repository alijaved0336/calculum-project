import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type TenantMembership } from '@/api/auth.api'

const STORAGE_KEY = 'calculum_auth'

type JwtPayload = {
  exp?: number
  sub?: string
  role?: string
  tenant_id?: string
}

interface StoredAuthState {
  loginToken: string
  userId: string | null
  email: string
  scope: string
  tenantId: string | null
  role: string | null
  memberships: TenantMembership[]
  selectedTenantId: string | null
  selectedTenantUuid: string | null
}

function resolveStoredSelectedTenantId(state: StoredAuthState): string | null {
  return (
    state.selectedTenantId ??
    state.tenantId ??
    (state.memberships.length === 1 ? state.memberships[0]?.tenantId ?? null : null)
  )
}

function resolveStoredRole(state: StoredAuthState): string | null {
  return state.role ?? (state.memberships.length === 1 ? state.memberships[0]?.role ?? null : null)
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return atob(padded)
  } catch {
    return null
  }
}

function readTokenPayload(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length < 2) return null

  const payload = decodeBase64Url(parts[1])
  if (!payload) return null

  try {
    return JSON.parse(payload) as JwtPayload
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const payload = readTokenPayload(token)
  if (!payload?.exp) return true
  return payload.exp * 1000 <= Date.now()
}

function readStoredAuth(): StoredAuthState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredAuthState
    if (isTokenExpired(parsed.loginToken)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return {
      ...parsed,
      tenantId: parsed.tenantId ?? resolveStoredSelectedTenantId(parsed),
      role: resolveStoredRole(parsed),
      selectedTenantId: resolveStoredSelectedTenantId(parsed),
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const stored = readStoredAuth()

  const loginToken = ref<string | null>(stored?.loginToken ?? null)
  const sessionToken = ref<string | null>(null)
  const userId = ref<string | null>(stored?.userId ?? null)
  const email = ref<string | null>(stored?.email ?? null)
  const scope = ref<string | null>(stored?.scope ?? null)
  const tenantId = ref<string | null>(stored?.tenantId ?? null)
  const role = ref<string | null>(stored?.role ?? null)
  const memberships = ref<TenantMembership[]>(stored?.memberships ?? [])
  const selectedTenantId = ref<string | null>(stored?.selectedTenantId ?? null)
  const selectedTenantUuid = ref<string | null>(stored?.selectedTenantUuid ?? null)

  const isAuthenticated = computed(() =>
    !!loginToken.value && !isTokenExpired(loginToken.value),
  )
  const accessToken = computed(() => sessionToken.value ?? loginToken.value)
  const activeMembership = computed(
    () => memberships.value.find((membership) => membership.tenantId === selectedTenantId.value) ?? null,
  )

  function persist() {
    if (!loginToken.value || !email.value || !scope.value) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        loginToken: loginToken.value,
        userId: userId.value,
        email: email.value,
        scope: scope.value,
        tenantId: tenantId.value,
        role: role.value,
        memberships: memberships.value,
        selectedTenantId: selectedTenantId.value,
        selectedTenantUuid: selectedTenantUuid.value,
      } satisfies StoredAuthState),
    )
  }

  function init() {
    if (loginToken.value && isTokenExpired(loginToken.value)) {
      logout()
      return
    }
    persist()
  }

  async function login(payload: { email: string; password: string }) {
    const { data } = await authApi.login({
      email: payload.email,
      password: payload.password,
    })

    // Decode fields that the backend embeds in the JWT rather than the response body.
    const jwt = readTokenPayload(data.access_token)

    const normalizedMemberships: TenantMembership[] = (data.tenant_memberships ?? []).map((m) => ({
      tenantId: m.tenant_id,
      tenantName: '',
      userId: jwt?.sub ?? '',
      role: m.role,
    }))
    const primaryMembership = normalizedMemberships.length === 1 ? normalizedMemberships[0] : null

    loginToken.value = data.access_token
    sessionToken.value = null
    userId.value = jwt?.sub ?? null
    email.value = payload.email
    // scope is required by persist(); fall back to role so it is always truthy after login.
    scope.value = jwt?.role ?? primaryMembership?.role ?? null
    tenantId.value = jwt?.tenant_id ?? primaryMembership?.tenantId ?? null
    role.value = jwt?.role ?? primaryMembership?.role ?? null
    memberships.value = normalizedMemberships
    selectedTenantId.value =
      jwt?.tenant_id ?? (normalizedMemberships.length === 1 ? normalizedMemberships[0]?.tenantId ?? null : null)
    persist()
  }

  async function refresh(): Promise<string> {
    if (!loginToken.value) throw new Error('No active login session')
    if (isTokenExpired(loginToken.value)) {
      logout()
      throw new Error('Login session expired')
    }
    return loginToken.value
  }

  function setSessionToken(token: string | null) {
    sessionToken.value = token
  }

  function selectTenant(tenantId: string, tenantUuid?: string | null) {
    selectedTenantId.value = tenantId
    selectedTenantUuid.value = tenantUuid ?? null
    sessionToken.value = null
    persist()
  }

  function clearSession() {
    sessionToken.value = null
  }

  function logout() {
    loginToken.value = null
    sessionToken.value = null
    userId.value = null
    email.value = null
    scope.value = null
    tenantId.value = null
    role.value = null
    memberships.value = []
    selectedTenantId.value = null
    selectedTenantUuid.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    accessToken,
    loginToken,
    sessionToken,
    userId,
    email,
    scope,
    tenantId,
    role,
    memberships,
    selectedTenantId,
    selectedTenantUuid,
    activeMembership,
    isAuthenticated,
    init,
    login,
    refresh,
    setSessionToken,
    selectTenant,
    clearSession,
    logout,
  }
})
