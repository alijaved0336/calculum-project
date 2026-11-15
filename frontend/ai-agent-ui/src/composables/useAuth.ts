import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'

export function useAuth() {
  const store = useAuthStore()
  const { isAuthenticated, email, scope, tenantId, role, memberships, selectedTenantId, activeMembership } = storeToRefs(store)

  return {
    isAuthenticated,
    email,
    scope,
    tenantId,
    role,
    memberships,
    selectedTenantId,
    activeMembership,
    login: store.login,
    selectTenant: store.selectTenant,
    clearSession: store.clearSession,
    logout: store.logout,
  }
}
