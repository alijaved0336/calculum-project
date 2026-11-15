# AB#19912 — Scenario delete control (Front-End) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The trash icon on a scenario card in the Entity Card calculator is rendered only when the current user is allowed to delete that scenario (its creator, or an admin), and the E2E test that covers scenario deletion runs again.

**Architecture:** `ScenariosCards.vue` reads the user store and derives `canDelete` from the scenario's `createdBy` and the caller's identity / admin flag; the trash control gets a `v-if`. The card's duplicated `id="close-scenarios-card"` (AB#19914, same component) becomes a class so several cards can coexist. A component spec mounts the **real** `ScenariosCards.vue` (not a stub copy) and the Playwright test drops its `test.skip`.

**Tech Stack:** Vue 3 (Options API `defineComponent` + `setup`), Pinia setup-store (`useUserStore`), vitest 3 + `@vue/test-utils` via `tests/Helpers/mountWithProviders.ts`, Playwright.

**Spec:** Azure DevOps bug [AB#19912](https://dev.azure.com/calculum/ADA/_workitems/edit/19912) (Repro Steps is the spec; the "trash control is offered to every user" paragraph and Expected Result 1 are this repo's half). Bug [AB#19914](https://dev.azure.com/calculum/ADA/_workitems/edit/19914) (duplicated `#close-scenarios-card`) is folded in because it is the same four lines of template and the E2E locator depends on it. Back-End companion plan: `web-app/docs/superpowers/plans/2026-09-08-ab19912-calculated-scenario-ownership.md`.

## Global Constraints

- All work under `apps/ap/` of `D:\repos\code\frontend`. Always run git with `git -C D:/repos/code/frontend ...` (the Bash cwd resets between turns).
- Branch `fix/19912-scenario-delete-control` off `master`. Never commit on `master`.
- Commit messages in English, prefix `fix(AB#19912): ...` (the 19914 commit uses `fix(AB#19914): ...`). No AI attribution.
- Component specs must mount the real SFC. A spec that tests a local stub copy of the template is the mirror-test anti-pattern and stays green when the component breaks.
- `vi.mock('@/utils', () => ({...}))` must return a **plain object**; an `await import` inside that factory deadlocks vitest in this repo.
- Kendo `Tooltip` is mocked the way `tests/Component/EntityCardPendingApprovalBadge.spec.ts:65-75` does it.
- The server rule (Back-End plan) is: creator, or `ROLE_ADMIN` / `ROLE_COMPANY_ADMIN` in the caller's tenant, or super admin. `useUserStore().isAdmin` already covers `ROLE_ADMIN || ROLE_COMPANY_ADMIN || isSuperAdmin`, so the FE mirrors the server with `isAdmin || isCreator`.
- CHANGELOG: before opening the PR, **ask the developer** whether to add a `bugfix` line under `### 2026-09-08`. Never add it unasked.

---

## File Structure

| File | Responsibility |
|---|---|
| Modify `apps/ap/src/modules/home/entityCard/components/ScenariosCards.vue` | Own the "may I delete this card" decision; render the trash only then; unique per-card hook for the control. |
| Create `apps/ap/tests/Component/ScenariosCardsDeleteControl.spec.ts` | Mount the real card with a seeded user store; assert visibility and the emitted event in the four cases. |
| Modify `apps/ap/e2e/tests/z-last-tests/04-sf/calcTypeInputsProfits.spec.ts:637-745` | Un-skip the scenario deletion test, drop the BLOCKED evidence block, use the new locator. |

---

### Task 1: Branch

- [ ] **Step 1: Confirm clean tree**

Run: `git -C D:/repos/code/frontend status --short && git -C D:/repos/code/frontend branch --show-current`
Expected: empty, `master`.

- [ ] **Step 2: Create the branch**

```bash
git -C D:/repos/code/frontend fetch origin master
git -C D:/repos/code/frontend checkout -b fix/19912-scenario-delete-control origin/master
```

---

### Task 2: `canDelete` on `ScenariosCards.vue` (TDD)

**Files:**
- Modify: `apps/ap/src/modules/home/entityCard/components/ScenariosCards.vue` (template line 4, script imports and `setup`)
- Test: `apps/ap/tests/Component/ScenariosCardsDeleteControl.spec.ts`

**Interfaces:**
- Consumes: `useUserStore()` from `@/stores/user` exposing `actualUser` (a `UserSession | null` with `'@id'`, `roles`, `isSuperAdmin`) and the computed `isAdmin`. The scenario prop `scenarios: CalculatedScenario` whose `createdBy` is either a `User` object with `'@id'` or, if the serializer ever collapses it, an IRI string.
- Produces: the trash `<i>` is rendered iff `canDelete` is true; it keeps emitting `deleteScenario` with `scenarios['@id']`. The control carries class `close-scenarios-card` (Task 3 changes the id; this task only adds the `v-if`).

- [ ] **Step 1: Write the failing spec**

Create `apps/ap/tests/Component/ScenariosCardsDeleteControl.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import ScenariosCards from '@/modules/home/entityCard/components/ScenariosCards.vue'
import { useUserStore } from '@/stores/user'

// AB#19912 — the trash icon on a scenario card was rendered for everybody while the API only let
// admins delete, so a regular user saw a control that answered 403. The card now shows it only to
// the scenario's creator or to an admin, which is the rule the Back-End enforces.
//
// Mounts the real ScenariosCards.vue: a stub copy of the v-if would stay green when the component
// changes.

vi.mock('@progress/kendo-vue-tooltip', async () => {
  const { h } = await import('vue')
  return {
    Tooltip: {
      name: 'Tooltip',
      setup(_props: unknown, { slots }: any) {
        return () => h('span', slots.default?.())
      },
    },
  }
})

vi.mock('@/modules/components/CalculumClose.vue', async () => {
  const { h } = await import('vue')
  return { default: { name: 'CalculumClose', render: () => h('span') } }
})

// The `@/utils` barrel reaches the router and every view; resolve it with a plain object.
vi.mock('@/utils', () => ({
  StringUtils: {
    formatBigNumbers: (value: number) => String(value),
    removeIRI: (value: string) => String(value).split('/').pop() ?? '',
    isNullUndefinedOrEmpty: (value: unknown) => value === null || value === undefined || value === '',
  },
}))

const OWNER_IRI = '/api/users/1001'
const OTHER_IRI = '/api/users/1002'

function scenario(createdBy: unknown) {
  return {
    '@id': '/api/calculated_scenarios/f5b45dfc-ba5f-45a1-82ea-6c6d1f51787d',
    '@type': 'CalculatedScenario',
    createdBy,
    name: 'E2E scenario',
    changeInTerms: 10,
    priceChange: -1,
    calculationType: 'none',
    calculatedData: { data: { buyer: { economicProfit: 1234 } } },
  }
}

function sessionUser(iri: string, roles: string[]) {
  return { '@id': iri, roles, isSuperAdmin: false }
}

function mountCard(scenarios: unknown, user: unknown) {
  const wrapper = mountWithProviders(ScenariosCards, { props: { scenarios } })
  // mountWithProviders activates a fresh Pinia before mounting; seed the store the card reads.
  const store = useUserStore()
  store.actualUser = user as any
  return wrapper
}

describe('ScenariosCards — delete control (AB#19912)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the trash to the scenario creator and emits deleteScenario with the card @id', async () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), sessionUser(OWNER_IRI, ['ROLE_USER']))
    await wrapper.vm.$nextTick()

    const trash = wrapper.find('.close-scenarios-card i')
    expect(trash.exists()).toBe(true)

    await trash.trigger('click')
    expect(wrapper.emitted('deleteScenario')).toEqual([
      ['/api/calculated_scenarios/f5b45dfc-ba5f-45a1-82ea-6c6d1f51787d'],
    ])
  })

  it('hides the trash from a same-company user who did not create the scenario', async () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), sessionUser(OTHER_IRI, ['ROLE_USER']))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.close-scenarios-card').exists()).toBe(false)
  })

  it('shows the trash to a company admin who did not create the scenario', async () => {
    const wrapper = mountCard(
      scenario({ '@id': OWNER_IRI }),
      sessionUser(OTHER_IRI, ['ROLE_USER', 'ROLE_COMPANY_ADMIN'])
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.close-scenarios-card').exists()).toBe(true)
  })

  it('accepts createdBy collapsed to an IRI string', async () => {
    const wrapper = mountCard(scenario(OWNER_IRI), sessionUser(OWNER_IRI, ['ROLE_USER']))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.close-scenarios-card').exists()).toBe(true)
  })

  it('hides the trash when there is no session user at all', async () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), null)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.close-scenarios-card').exists()).toBe(false)
  })

  it('still renders the card body for a user who may not delete', async () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), sessionUser(OTHER_IRI, ['ROLE_USER']))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('E2E scenario')
  })
})
```

Note on the store seed: `useUserStore` is a setup store, so `store.actualUser = ...` writes through to the underlying ref. `mountWithProviders` calls `setActivePinia(createPinia())` before `mount`, so calling `useUserStore()` right after `mount` returns the same instance the component holds. If the assertions in the "shows" cases fail with the trash absent, move the `useUserStore()` call **before** `mountWithProviders` by building the Pinia yourself: `const pinia = createPinia(); setActivePinia(pinia); useUserStore().actualUser = user; mountWithProviders(ScenariosCards, { props, global: { plugins: [pinia] } })` — `mountWithProviders` will then create a second Pinia; in that case pass `global.plugins` and check the helper picks yours up, or use `mount` from `@vue/test-utils` directly with `global: { plugins: [pinia], mocks: { $t: (k: string) => k } }`.

- [ ] **Step 2: Run the spec to verify it fails**

Run: `cd D:/repos/code/frontend/apps/ap && npx vitest run tests/Component/ScenariosCardsDeleteControl.spec.ts`
Expected: FAIL — the "hides" cases fail because the trash is currently rendered unconditionally (and `.close-scenarios-card` does not exist yet, so the "shows" cases fail too).

- [ ] **Step 3: Implement `canDelete` in the component**

In `apps/ap/src/modules/home/entityCard/components/ScenariosCards.vue`:

Replace template line 4:

```html
    <div class="delete-scenarios close-button" id="close-scenarios-card">     <i class="fa-solid fa-trash-can text-sm" @click="$emit('deleteScenario', scenarios['@id'])" :title="'Remove the Scenario'"></i></div>
```

with:

```html
    <div v-if="canDelete" class="delete-scenarios close-button close-scenarios-card" id="close-scenarios-card"><i class="fa-solid fa-trash-can text-sm" @click="$emit('deleteScenario', scenarios['@id'])" :title="'Remove the Scenario'"></i></div>
```

(The `id` stays for now; Task 3 removes it.)

In the `<script>` block add the store import after the `StringUtils` import:

```ts
import { useUserStore } from '@/stores/user'
```

Inside `setup(props, { emit })`, before `const getScenarioName`, add:

```ts
    const userStore = useUserStore()

    // AB#19912. The API lets the creator or an admin delete a scenario; anyone else got a 403
    // behind a trash icon that looked available. createdBy is normally an object carrying '@id',
    // but the serializer may collapse it to the IRI string, so both shapes are accepted.
    const creatorIri = computed<string | null>(() => {
      const createdBy: unknown = props.scenarios.createdBy
      if (typeof createdBy === 'string') return createdBy
      if (createdBy && typeof createdBy === 'object' && '@id' in createdBy) {
        return String((createdBy as { '@id': unknown })['@id'])
      }
      return null
    })

    const canDelete = computed(() => {
      const me = userStore.actualUser
      if (!me) return false
      if (userStore.isAdmin) return true
      return creatorIri.value !== null && creatorIri.value === me['@id']
    })
```

And add `canDelete,` to the returned object at the bottom of `setup` (next to `getScenarioName`).

- [ ] **Step 4: Run the spec to verify it passes**

Run: `cd D:/repos/code/frontend/apps/ap && npx vitest run tests/Component/ScenariosCardsDeleteControl.spec.ts`
Expected: 6 passed.

- [ ] **Step 5: Type-check and lint the touched files**

Run: `cd D:/repos/code/frontend/apps/ap && npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -i "ScenariosCards" ; npx eslint src/modules/home/entityCard/components/ScenariosCards.vue tests/Component/ScenariosCardsDeleteControl.spec.ts`
Expected: no lines mentioning `ScenariosCards` from `vue-tsc`, and eslint exits 0. (If the repo's type-check script is named differently, use the `package.json` script that runs `vue-tsc`.)

- [ ] **Step 6: Commit**

```bash
git -C D:/repos/code/frontend add apps/ap/src/modules/home/entityCard/components/ScenariosCards.vue apps/ap/tests/Component/ScenariosCardsDeleteControl.spec.ts
git -C D:/repos/code/frontend commit -m "fix(AB#19912): show the scenario trash icon only to its creator or an admin"
```

---

### Task 3: Unique delete hook per card (AB#19914)

**Files:**
- Modify: `apps/ap/src/modules/home/entityCard/components/ScenariosCards.vue` (template line 4)
- Modify: `apps/ap/tests/Component/ScenariosCardsDeleteControl.spec.ts` (one extra assertion)

**Interfaces:**
- Produces: no `id="close-scenarios-card"` anywhere; the control is addressed by class `close-scenarios-card`. Task 4's Playwright locator depends on this.

- [ ] **Step 1: Add the failing assertion**

Append to the spec's `describe` block:

```ts
  it('does not carry the shared id that duplicated across cards (AB#19914)', async () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), sessionUser(OWNER_IRI, ['ROLE_USER']))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('#close-scenarios-card').exists()).toBe(false)
    expect(wrapper.find('.close-scenarios-card').exists()).toBe(true)
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd D:/repos/code/frontend/apps/ap && npx vitest run tests/Component/ScenariosCardsDeleteControl.spec.ts`
Expected: 1 failed (the `#close-scenarios-card` still exists).

- [ ] **Step 3: Remove the id**

In `ScenariosCards.vue` template line 4, delete ` id="close-scenarios-card"` so the line reads:

```html
    <div v-if="canDelete" class="delete-scenarios close-button close-scenarios-card"><i class="fa-solid fa-trash-can text-sm" @click="$emit('deleteScenario', scenarios['@id'])" :title="'Remove the Scenario'"></i></div>
```

Then check nothing else in the app targets the id:

Run: `grep -rn "close-scenarios-card" D:/repos/code/frontend/apps/ap/src`
Expected: only the class occurrence in `ScenariosCards.vue` (if a stylesheet uses `#close-scenarios-card`, change that selector to `.close-scenarios-card`).

- [ ] **Step 4: Run the spec**

Run: `cd D:/repos/code/frontend/apps/ap && npx vitest run tests/Component/ScenariosCardsDeleteControl.spec.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git -C D:/repos/code/frontend add apps/ap/src/modules/home/entityCard/components/ScenariosCards.vue apps/ap/tests/Component/ScenariosCardsDeleteControl.spec.ts
git -C D:/repos/code/frontend commit -m "fix(AB#19914): address the scenario delete control by class instead of a duplicated id"
```

---

### Task 4: Un-skip the E2E scenario deletion test

**Files:**
- Modify: `apps/ap/e2e/tests/z-last-tests/04-sf/calcTypeInputsProfits.spec.ts:637-745`

**Interfaces:**
- Consumes: class `close-scenarios-card` (Task 3). Requires the Back-End PR deployed to DEV (owner DELETE → 204) for the test to pass against `dev-app.hello-ada.com`.

- [ ] **Step 1: Replace the BLOCKED comment and un-skip**

Delete lines 637-674 (the comment block that starts `// BLOCKED - PRODUCT QUESTION - kept skipped on purpose (2026-09-01).` and ends `// card - is bug 19914.`) and replace them with:

```ts
  // Recovered with AB#19912 (Back-End: the scenario's creator may delete it; Front-End: the trash
  // icon is shown only to the creator or an admin) and AB#19914 (the control is addressed by class,
  // one id per page is no longer duplicated per card). The fixture account E2E_AUTH_USERNAME_SF_1
  // is a regular user and deletes only the scenarios this run created.
```

Change line 675:

```ts
  test.skip("The Scenarios saving and deletion works @flaky @us-12343 @tc-12375", async () => {
```

to:

```ts
  test("The Scenarios saving and deletion works @flaky @us-12343 @tc-12375", async () => {
```

- [ ] **Step 2: Update the locator**

Line 739 currently reads:

```ts
        card.locator("#close-scenarios-card").click(),
```

Change it to:

```ts
        card.locator(".close-scenarios-card").click(),
```

- [ ] **Step 3: Type-check the spec**

Run: `cd D:/repos/code/frontend/apps/ap && npx tsc --noEmit -p e2e/tsconfig.json 2>&1 | grep calcTypeInputsProfits`
Expected: no output. (If `e2e/tsconfig.json` does not exist, use the tsconfig the Playwright config points at.)

- [ ] **Step 4: Run the spec against DEV once the Back-End is deployed**

Run: `cd D:/repos/code/frontend/apps/ap && npx playwright test e2e/tests/z-last-tests/04-sf/calcTypeInputsProfits.spec.ts -g "Scenarios saving and deletion"`
Expected: 1 passed, and the console line `Scenarios already saved for this entity: N` is followed by the panel returning to `N` cards.

If the Back-End is **not** yet in DEV, the DELETE still answers 403 and the test fails on `toHaveCount(0)`. Do not re-skip it; note in the PR that it goes green with the Back-End PR and merge them together.

- [ ] **Step 5: Clean the six orphan cards in the DEV fixture**

Once the Back-End is in DEV, log in to `dev-app.hello-ada.com` as `E2E_AUTH_USERNAME_SF_SUPER`, open Company_SF → Pagero_VCard.xlsx (Ver. 1) → Suppliers → Axtone S.A. → Payment Terms vs Price, show scenarios, and delete `Scenario 1` … `Scenario 6`. Record the resulting `GET /api/calculated_scenarios?config.uuid=16b9aca0-c60c-4ff1-a89c-363a75f6f95e&level=supplier` count in the WI comment.

- [ ] **Step 6: Commit**

```bash
git -C D:/repos/code/frontend add apps/ap/e2e/tests/z-last-tests/04-sf/calcTypeInputsProfits.spec.ts
git -C D:/repos/code/frontend commit -m "test(AB#19912): run the scenario deletion E2E again"
```

---

### Task 5: Full check and hand off

- [ ] **Step 1: Run the component suite**

Run: `cd D:/repos/code/frontend/apps/ap && npx vitest run tests/Component`
Expected: all passed (compare with the count on `master` if anything unrelated fails, and report it rather than fixing it here).

- [ ] **Step 2: Diff review**

Run: `git -C D:/repos/code/frontend diff master...HEAD --stat`
Expected: exactly `ScenariosCards.vue`, `ScenariosCardsDeleteControl.spec.ts`, `calcTypeInputsProfits.spec.ts`.

- [ ] **Step 3: Ask the developer the pre-PR questions**

1. CHANGELOG entry? Proposed under `### 2026-09-08`: ``- `bugfix` — The Entity Card scenario trash icon is shown only to the scenario's creator or an admin, matching the API rule; the control no longer duplicates an id per card (AB#19912, AB#19914).``
2. Go-ahead to open the PR against `master`, linked to work items 19912 and 19914.

- [ ] **Step 4: Push and open the PR via the Azure DevOps MCP**

Title: `fix(AB#19912): show the scenario delete control only to who may delete`. Description in English; reference the Back-End PR and state that the E2E turns green only with both deployed.

---

## Self-Review

**Spec coverage.** WI "trash control is offered to every user" → Task 2. WI expected result "the delete control is only rendered when the action is actually permitted" → Task 2 (`isAdmin || creator`, mirrors the server rule in the Back-End plan). E2E left skipped with leaking scenarios → Task 4 (un-skip + fixture cleanup). AB#19914 duplicated id → Task 3. Server enforcement → Back-End plan, referenced.

**Placeholder scan.** The only conditional instruction is the Pinia seeding fallback in Task 2 Step 1, which names the exact alternative code.

**Type consistency.** Class `close-scenarios-card` is introduced in Task 2 Step 3, asserted in Task 2/3 specs, and used by the Playwright locator in Task 4 Step 2. `canDelete` is the single computed name in template, `setup` return and spec comments.
