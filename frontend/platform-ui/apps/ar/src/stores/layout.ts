import { defineStore } from 'pinia'

interface LayoutState {
  isSessionValidated: boolean
}

/**
 * Tracks whether Navbar's onMounted session check has completed successfully.
 * LayoutView gates SidebarUser and the routed page content on this flag.
 */
export const useLayoutStore = defineStore('ar-layout', {
  state: (): LayoutState => ({
    isSessionValidated: false,
  }),
  actions: {
    setSessionValidated(value: boolean) {
      this.isSessionValidated = value
    },
    /** Sign-out (UC-ENT-09): the gate must not still read validated for a session that just ended. */
    clear() {
      this.isSessionValidated = false
    },
  },
})
