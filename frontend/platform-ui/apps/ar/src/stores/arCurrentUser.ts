import { defineStore } from 'pinia'
import { canExport, FEATURE_DOWNLOAD_EXCEL, FEATURE_DOWNLOAD_EXCEL_MATCH } from '@/utils/exportPermission'

export interface LoggedUser {
  email: string
  idps: string
  authenticationSource: string
  sessionExpiresAt: number
  /** The caller's effective roles for the active company (`/api/session/info`). Absent: none. */
  roles?: readonly string[]
}

interface ArCurrentUserState {
  user: LoggedUser | null
}

export const useArCurrentUserStore = defineStore('ar-current-user', {
  state: (): ArCurrentUserState => ({
    user: null,
  }),
  getters: {
    hasRole: (state) => (role: string): boolean => state.user?.roles?.includes(role) === true,
    /** Derived from the session's roles; a UI convenience - the export routes enforce it again. */
    canExportLists: (state): boolean => canExport(state.user?.roles, FEATURE_DOWNLOAD_EXCEL),
    canExportMatch: (state): boolean => canExport(state.user?.roles, FEATURE_DOWNLOAD_EXCEL_MATCH),
  },
  actions: {
    setUser(user: LoggedUser | null) {
      this.user = user
    },
    /** Sign-out (UC-ENT-09): the previous user's identity must not still be readable if the same
     * browser signs in again as somebody else. */
    clear() {
      this.user = null
    },
  },
})
