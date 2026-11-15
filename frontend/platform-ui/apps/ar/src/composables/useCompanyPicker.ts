import { ref } from 'vue'
import { fetchSwitchableCompanies, switchActiveCompany, type SwitchableCompany } from '@/api'

/**
 * What the picker does once a company is actually selected: whatever the screen has loaded belongs
 * to the previous company and has to be fetched again. Passed in rather than reached for, so this
 * composable owns the state machine and nothing about the navbar's stores or its data loading.
 */
export interface CompanyPickerOptions {
  onSwitched: (company: SwitchableCompany) => void | Promise<void>
}

/**
 * The receivables company picker (UC-ENT-19).
 *
 * <b>The order is the whole thing.</b> The control used to update local state and reload data the
 * moment the selection changed, which was correct while the session's company could not move: there
 * was one company and nothing to move it to. Now the server owns the active company, so the switch
 * has to land BEFORE anything reloads — a reload racing a session that has not moved refills the
 * screens from the OLD company and reads as the switch having silently failed.
 *
 * <b>And the server owns the preselection.</b> `context.companyUuid` used to be restored from
 * `localStorage` on mount. That value could not disagree with the session while a user had one
 * company; with two it can, and the disagreement is invisible — the control renders company B while
 * every request is scoped to A. The session's own answer wins, and the browser no longer keeps a
 * second opinion.
 */
export function useCompanyPicker({ onSwitched }: CompanyPickerOptions) {
  const companies = ref<SwitchableCompany[]>([])

  /**
   * The company the control shows, which is the one the SESSION is in. Empty when there is nothing
   * to select.
   *
   * <b>Bind it one-way — `:model-value` plus `@update:model-value="select"` — and never with
   * `v-model`.</b> Two-way binding moves the control the instant it is clicked, ahead of the
   * server, so a refused switch has to be undone by writing the old value back, which re-enters
   * the same handler. One-way, the control moves when the switch lands and simply never moves when
   * it does not, and this ref stays a statement about the session rather than about the pointer.
   */
  const selected = ref('')

  /**
   * A refusal to show beside the control, as an i18n key rather than a sentence: 403 when the
   * company stopped being usable between the list being drawn and the click, 409 while the session
   * is being written to, anything else for the rest.
   */
  const error = ref<string | null>(null)

  const isSwitching = ref(false)

  async function load(): Promise<void> {
    try {
      const answer = await fetchSwitchableCompanies()
      companies.value = answer.companies

      // The server's answer, even when it names a company that is not in the list: that happens
      // when the session's own company has lost MODULE_AR, and showing it selected-but-absent is
      // more honest than silently moving the user somewhere they did not ask to be.
      selected.value = answer.activeCompanyUuid ?? ''
      error.value = null
    } catch {
      // Cleared rather than left, so a failed refresh cannot leave a list on screen that a click
      // would then act on. The message is what tells the user why the control is empty.
      companies.value = []
      selected.value = ''
      error.value = 'arMatch.navbar.companiesUnavailable'
    }
  }

  async function select(uuid: string): Promise<void> {
    if (isSwitching.value) {
      // Raised in review of this pull request, and it is a race with three separate ways to lose,
      // not merely a duplicate request. The second call captures `previous` before the first has
      // landed, so a refusal puts the control back to a company nobody was in. Whichever response
      // resolves last wins here, which need not be the order the server applied them. And the
      // first `onSwitched` reload runs against a session the second switch has already moved,
      // refilling the screen from a company the session has left — which is the exact failure this
      // composable reorders its calls to prevent, arriving by another door.
      //
      // Dropped rather than queued: the user's last click is the one they mean, and queueing would
      // walk them through the intermediate company on the way to it. `isSwitching` also disables
      // the control, so this guard is the second line rather than the only one.
      return
    }

    if (uuid === selected.value) {
      // The dropdown re-emits its current value on mount and on re-render. The endpoint answers it
      // harmlessly — a switch to where you already are is a 204 — but a request per render is
      // still a request per render.
      return
    }

    const company = companies.value.find((candidate) => candidate.uuid === uuid)

    if (company === undefined) {
      return
    }

    const previous = selected.value
    isSwitching.value = true

    // The flag covers the RELOAD as well as the request, and that is the wider half of the window
    // rather than a tidiness. A switch is one round trip; the reload behind it fetches several, so
    // releasing the guard when the PUT answers leaves the longer gap open — and a selection
    // accepted in it moves the session under a reload that is still filling the screen for the
    // company it just left.
    try {
      try {
        await switchActiveCompany(uuid)
      } catch (switchError) {
        // Put the control back where the session actually is. Leaving it on the company the user
        // clicked would be the picker asserting a scope the server refused to give it.
        selected.value = previous
        error.value = messageFor(switchError)
        return
      }

      selected.value = uuid
      error.value = null

      await onSwitched(company)
    } finally {
      isSwitching.value = false
    }
  }

  return { companies, selected, error, isSwitching, load, select }
}

function messageFor(switchError: unknown): string {
  // Named for the rule Sonar enforces on catch parameters (typescript:S7718), which allows a
  // descriptive name as long as it ends in Error -- so the meaning survives the convention.
  const status = (switchError as { status?: number })?.status

  if (status === 403 || status === 404) {
    // Both mean "not available to you", and deliberately read the same to the user: the 404 exists
    // so the API does not confirm that a company it will not serve exists at all, and a message
    // distinguishing them here would give back exactly what the status code withholds.
    return 'arMatch.navbar.companyUnavailable'
  }

  if (status === 409) {
    return 'arMatch.navbar.companySwitchBusy'
  }

  return 'arMatch.navbar.companySwitchFailed'
}
