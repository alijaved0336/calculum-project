# Reset Feedback Survey (Admin Action) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin action to reset a user's feedback survey state (`lastFeedbackSurveyAt`, `lastFeedbackSurveyResponse` → `null`) so the monthly feedback modal becomes eligible again, surfaced in the admin UserDrawer Profile tab.

**Architecture:** Two new endpoints in the existing `AdminUserB2CController` (Back-End repo, Symfony): a GET to read the current feedback state (the drawer's user object doesn't carry these fields) and a POST to reset it. Front-End (Vue 3, monorepo `apps/ap`) adds two wrappers in `useUserDrawer.ts` and a "Feedback Survey" section in `DrawerTabProfile.vue` with a confirm dialog, mirroring the DangerZone pattern.

**Tech Stack:** Symfony 6/7 + Doctrine (Back-End, PHPUnit 10 + Mockery), Vue 3 `<script setup>` + axios (Front-End), vue-i18n keys in `packages/design-system/src/locales/languages/{en,es}.json`.

**Spec:** `docs/superpowers/specs/2026-07-21-reset-feedback-survey-design.md`

## Global Constraints

- Both repos are already on branch `feature/reset-feedback-survey`.
- Back-End repo root: `d:\Calculum\code\Back-End`. Front-End repo root: `d:\Calculum\code\Front-End`.
- Route naming convention: `/api/admin/user/{userUuid}/<kebab-action>`, route name `admin_user_<snake_action>`.
- Security is class-level on `AdminUserB2CController` (`ROLE_ADMIN` or `ROLE_SALES`) — do NOT add per-method guards.
- Entity getters return sentinels when null: `getLastFeedbackSurveyAt()` → `new DateTime('@0')` (epoch), `getLastFeedbackSurveyResponse()` → `''`. The GET endpoint must normalize sentinels to `null` in its JSON.
- i18n: every user-visible string in the Vue component goes through `$t('adminBackend.drawer.profile.*')`; add keys to BOTH `en.json` and `es.json`.
- Known limitation (documented in spec, mention in confirm dialog copy): the user's browser keeps a local fallback (`lastInteractionMonth`); if they interacted this calendar month in that browser, the modal reappears there next month.

---

### Task 1: Back-End — GET + POST feedback-survey endpoints in AdminUserB2CController

**Files:**
- Modify: `d:\Calculum\code\Back-End\src\Controller\AdminUserB2CController.php` (insert new section after `setAccountStatus`, around line 227, before `// ── Audit Logs`)
- Test: `d:\Calculum\code\Back-End\tests\Unit\Controller\AdminUserB2CControllerTest.php` (append tests before the private helpers at the bottom)

**Interfaces:**
- Consumes: existing `findUserOrFail(EntityManagerInterface $em, string $userUuid): User|JsonResponse` (line 589), `User::setLastFeedbackSurveyAt(?DateTime)`, `User::setLastFeedbackSurveyResponse(?string)`, `User::getLastFeedbackSurveyAt(): DateTime` (epoch sentinel), `User::getLastFeedbackSurveyResponse(): string` ('' sentinel), `User::getUuid()`.
- Produces:
  - `GET /api/admin/user/{userUuid}/feedback-survey` → 200 `{ "lastFeedbackSurveyAt": string(ISO8601)|null, "lastFeedbackSurveyResponse": "accept"|"decline"|null }`, or 404 `{ "error": "User not found" }`.
  - `POST /api/admin/user/{userUuid}/reset-feedback-survey` → 200 `{ "uuid": string, "lastFeedbackSurveyAt": null, "lastFeedbackSurveyResponse": null }`, or 404.

- [ ] **Step 1: Write the failing tests**

Append to `tests/Unit/Controller/AdminUserB2CControllerTest.php` (before the private helper methods at the end of the class; the file already has `$this->userRepo`, `$this->em`, `$this->controller`, `createUser()`, `decodeResponse()`, `assertResponseJson()` — reuse them; check `createUser()`'s actual signature in the file and adapt the calls if it differs):

```php
    // ── Feedback Survey ──────────────────────────────────────────────────────

    public function testGetFeedbackSurveyReturns404WhenUserNotFound(): void
    {
        $this->userRepo->shouldReceive('findOneBy')
            ->with(['uuid' => 'non-existent-uuid'])
            ->andReturn(null);

        $response = $this->controller->getFeedbackSurvey('non-existent-uuid', $this->em);

        $this->assertSame(Response::HTTP_NOT_FOUND, $response->getStatusCode());
        $this->assertResponseJson($response, ['error' => 'User not found']);
    }

    public function testGetFeedbackSurveyNormalizesSentinelsToNull(): void
    {
        // A user who never answered: entity getters return epoch / '' sentinels
        $user = $this->createUser(azureId: null);
        $this->userRepo->shouldReceive('findOneBy')->andReturn($user);

        $response = $this->controller->getFeedbackSurvey('some-uuid', $this->em);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $data = $this->decodeResponse($response);
        $this->assertNull($data['lastFeedbackSurveyAt']);
        $this->assertNull($data['lastFeedbackSurveyResponse']);
    }

    public function testGetFeedbackSurveyReturnsStoredValues(): void
    {
        $user = $this->createUser(azureId: null);
        $user->setLastFeedbackSurveyAt(new \DateTime('2026-07-01T10:00:00+00:00'));
        $user->setLastFeedbackSurveyResponse('accept');
        $this->userRepo->shouldReceive('findOneBy')->andReturn($user);

        $response = $this->controller->getFeedbackSurvey('some-uuid', $this->em);

        $data = $this->decodeResponse($response);
        $this->assertSame('accept', $data['lastFeedbackSurveyResponse']);
        $this->assertStringStartsWith('2026-07-01', $data['lastFeedbackSurveyAt']);
    }

    public function testResetFeedbackSurveyReturns404WhenUserNotFound(): void
    {
        $this->userRepo->shouldReceive('findOneBy')
            ->with(['uuid' => 'non-existent-uuid'])
            ->andReturn(null);

        $response = $this->controller->resetFeedbackSurvey('non-existent-uuid', $this->em);

        $this->assertSame(Response::HTTP_NOT_FOUND, $response->getStatusCode());
    }

    public function testResetFeedbackSurveyNullsBothFieldsAndFlushes(): void
    {
        $user = $this->createUser(azureId: null);
        $user->setLastFeedbackSurveyAt(new \DateTime('2026-07-01T10:00:00+00:00'));
        $user->setLastFeedbackSurveyResponse('decline');
        $this->userRepo->shouldReceive('findOneBy')->andReturn($user);
        $this->em->shouldReceive('flush')->once();

        $response = $this->controller->resetFeedbackSurvey('some-uuid', $this->em);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        // Entity getters return sentinels after reset
        $this->assertSame(0, $user->getLastFeedbackSurveyAt()->getTimestamp());
        $this->assertSame('', $user->getLastFeedbackSurveyResponse());
        $data = $this->decodeResponse($response);
        $this->assertNull($data['lastFeedbackSurveyAt']);
        $this->assertNull($data['lastFeedbackSurveyResponse']);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `d:\Calculum\code\Back-End`): `php bin/phpunit tests/Unit/Controller/AdminUserB2CControllerTest.php --filter FeedbackSurvey`
Expected: FAIL/ERROR — `Call to undefined method ...::getFeedbackSurvey()`.

- [ ] **Step 3: Implement the endpoints**

In `src/Controller/AdminUserB2CController.php`, insert after the `setAccountStatus` method (after line 226, before the `// ── Audit Logs` section):

```php
    // ── Feedback Survey ───────────────────────────────────────────────────────

    #[Route(
        path: '/api/admin/user/{userUuid}/feedback-survey',
        name: 'admin_user_feedback_survey',
        requirements: ['userUuid' => self::UUID_REGEX],
        methods: ['GET']
    )]
    public function getFeedbackSurvey(string $userUuid, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->findUserOrFail($em, $userUuid);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $at = $user->getLastFeedbackSurveyAt();
        $response = $user->getLastFeedbackSurveyResponse();

        return new JsonResponse([
            'lastFeedbackSurveyAt'       => $at->getTimestamp() === 0 ? null : $at->format(\DateTimeInterface::ATOM),
            'lastFeedbackSurveyResponse' => $response === '' ? null : $response,
        ]);
    }

    #[Route(
        path: '/api/admin/user/{userUuid}/reset-feedback-survey',
        name: 'admin_user_reset_feedback_survey',
        requirements: ['userUuid' => self::UUID_REGEX],
        methods: ['POST']
    )]
    public function resetFeedbackSurvey(string $userUuid, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->findUserOrFail($em, $userUuid);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $user->setLastFeedbackSurveyAt(null);
        $user->setLastFeedbackSurveyResponse(null);
        $em->flush();

        return new JsonResponse([
            'uuid'                       => $user->getUuid(),
            'lastFeedbackSurveyAt'       => null,
            'lastFeedbackSurveyResponse' => null,
        ]);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `php bin/phpunit tests/Unit/Controller/AdminUserB2CControllerTest.php`
Expected: all tests in the file PASS (the 5 new ones plus all pre-existing ones).

- [ ] **Step 5: Commit (Back-End repo)**

```bash
git -C "d:\Calculum\code\Back-End" add src/Controller/AdminUserB2CController.php tests/Unit/Controller/AdminUserB2CControllerTest.php
git -C "d:\Calculum\code\Back-End" commit -m "feat(admin): feedback-survey read + reset endpoints for user drawer

```

---

### Task 2: Front-End — API wrappers in useUserDrawer.ts

**Files:**
- Modify: `d:\Calculum\code\Front-End\apps\ap\src\composables\useUserDrawer.ts`

**Interfaces:**
- Consumes: Task 1 endpoints (`GET .../feedback-survey`, `POST .../reset-feedback-survey`), existing `axios` + `getBaseApi()` helpers in the same file.
- Produces (used by Task 3):
  - `interface FeedbackSurveyState { lastFeedbackSurveyAt: string | null; lastFeedbackSurveyResponse: 'accept' | 'decline' | null }`
  - `fetchFeedbackSurvey(userUuid: string): Promise<FeedbackSurveyState>`
  - `resetFeedbackSurvey(userUuid: string): Promise<void>`
  - Both exported from the `useUserDrawer()` return object; `FeedbackSurveyState` exported as a type.

No unit-test infrastructure exists for this composable (its functions are thin axios wrappers, none are tested); follow the existing pattern — no new test file.

- [ ] **Step 1: Add the type**

In `apps/ap/src/composables/useUserDrawer.ts`, after the `UserCompanyAccess` interface (line 40), add:

```typescript
export interface FeedbackSurveyState {
  lastFeedbackSurveyAt: string | null
  lastFeedbackSurveyResponse: 'accept' | 'decline' | null
}
```

- [ ] **Step 2: Add the API functions**

After the `invalidateSessions` function (line 99), add:

```typescript
async function fetchFeedbackSurvey(userUuid: string): Promise<FeedbackSurveyState> {
  const { data } = await axios.get<FeedbackSurveyState>(`${getBaseApi()}/api/admin/user/${userUuid}/feedback-survey`)
  return data
}

async function resetFeedbackSurvey(userUuid: string): Promise<void> {
  await axios.post(`${getBaseApi()}/api/admin/user/${userUuid}/reset-feedback-survey`)
}
```

- [ ] **Step 3: Export from the composable**

In the `useUserDrawer()` return object (lines 154-174), add both entries after `invalidateSessions,`:

```typescript
    fetchFeedbackSurvey,
    resetFeedbackSurvey,
```

- [ ] **Step 4: Type-check**

Run (from `d:\Calculum\code\Front-End`): `pnpm --filter ap type-check` (if that script doesn't exist, use the repo's existing type-check/lint script from `apps/ap/package.json`).
Expected: no new errors.

- [ ] **Step 5: Commit (Front-End repo)**

```bash
git -C "d:\Calculum\code\Front-End" add apps/ap/src/composables/useUserDrawer.ts
git -C "d:\Calculum\code\Front-End" commit -m "feat(admin): feedback-survey fetch/reset wrappers in useUserDrawer

```

---

### Task 3: Front-End — i18n keys for the Feedback Survey section

**Files:**
- Modify: `d:\Calculum\code\Front-End\packages\design-system\src\locales\languages\en.json` (inside `adminBackend.drawer.profile`, lines 1202-1230)
- Modify: `d:\Calculum\code\Front-End\packages\design-system\src\locales\languages\es.json` (same path — find the matching `"profile"` block under `adminBackend.drawer`)

**Interfaces:**
- Produces (consumed by Task 4 via `$t()`): the 11 keys below under `adminBackend.drawer.profile`.

- [ ] **Step 1: Add English keys**

In `en.json`, inside the `adminBackend.drawer.profile` object (after `"errorUserCompanyId": "User company ID not available."`, adding a comma to that line), add:

```json
        "feedbackSurvey": "Feedback Survey",
        "feedbackLastResponse": "Last response",
        "feedbackAnswerAccept": "Accepted",
        "feedbackAnswerDecline": "Declined",
        "feedbackNeverAnswered": "Never answered",
        "feedbackReset": "Reset",
        "feedbackConfirmTitle": "Reset feedback survey?",
        "feedbackConfirmMessage": "This will make the feedback survey eligible again for {name}. Note: if they already interacted this month in their browser, it will reappear there next month.",
        "feedbackConfirmButton": "Yes, reset",
        "feedbackResetSuccess": "Feedback survey reset.",
        "feedbackResetError": "Could not reset feedback survey. Please try again."
```

- [ ] **Step 2: Add Spanish keys**

In `es.json`, in the same `adminBackend.drawer.profile` object, add:

```json
        "feedbackSurvey": "Encuesta de feedback",
        "feedbackLastResponse": "Última respuesta",
        "feedbackAnswerAccept": "Aceptó",
        "feedbackAnswerDecline": "Rechazó",
        "feedbackNeverAnswered": "Nunca respondió",
        "feedbackReset": "Resetear",
        "feedbackConfirmTitle": "¿Resetear la encuesta de feedback?",
        "feedbackConfirmMessage": "La encuesta de feedback volverá a ser elegible para {name}. Nota: si ya interactuó este mes en su navegador, reaparecerá allí el mes próximo.",
        "feedbackConfirmButton": "Sí, resetear",
        "feedbackResetSuccess": "Encuesta de feedback reseteada.",
        "feedbackResetError": "No se pudo resetear la encuesta de feedback. Inténtalo de nuevo."
```

- [ ] **Step 3: Validate JSON**

Run (from `d:\Calculum\code\Front-End`):
`node -e "JSON.parse(require('fs').readFileSync('packages/design-system/src/locales/languages/en.json','utf8')); JSON.parse(require('fs').readFileSync('packages/design-system/src/locales/languages/es.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit (Front-End repo)**

```bash
git -C "d:\Calculum\code\Front-End" add packages/design-system/src/locales/languages/en.json packages/design-system/src/locales/languages/es.json
git -C "d:\Calculum\code\Front-End" commit -m "feat(admin): i18n keys for feedback-survey reset in user drawer

```

---

### Task 4: Front-End — Feedback Survey section in DrawerTabProfile.vue

**Files:**
- Modify: `d:\Calculum\code\Front-End\apps\ap\src\modules\adminBackend\components\drawer\DrawerTabProfile.vue`

**Interfaces:**
- Consumes: `fetchFeedbackSurvey(userUuid): Promise<FeedbackSurveyState>`, `resetFeedbackSurvey(userUuid): Promise<void>`, type `FeedbackSurveyState` (Task 2); i18n keys `adminBackend.drawer.profile.feedback*` (Task 3); existing `props.user.userUuid` and the `identityType`/`isPending` computed already in the component.
- Produces: UI only — no exports.

Behavior:
- Section shows only for non-pending users (`v-if="!isPending"`) — pending users never saw the modal.
- On drawer open / user change, fetch state; while loading show `…`; on fetch error show `—` (non-blocking, no error banner for the read).
- Display: "Last response: {date} — Accepted/Declined" or "Never answered".
- Reset button disabled while `feedbackState` is null (not yet loaded) or when already never-answered.
- Confirm dialog (teleport overlay, same pattern as DangerZone) → on confirm call `resetFeedbackSurvey`, then set local state to nulls (no refetch needed), show success message; on failure show error message.

- [ ] **Step 1: Add template section**

In the `<template>` of `DrawerTabProfile.vue`, insert right before `<div class="form-actions" v-if="!isPending">` (line 77):

```html
  <template v-if="!isPending">
    <div class="section-title mt-4">{{ $t('adminBackend.drawer.profile.feedbackSurvey') }}</div>
    <div class="form-group">
      <div class="feedback-row">
        <div class="field-display feedback-status">
          <template v-if="loadingFeedback">…</template>
          <template v-else-if="!feedbackState">—</template>
          <template v-else-if="feedbackState.lastFeedbackSurveyAt">
            {{ $t('adminBackend.drawer.profile.feedbackLastResponse') }}:
            {{ new Date(feedbackState.lastFeedbackSurveyAt).toLocaleDateString() }}
            <span class="feedback-answer" :class="feedbackState.lastFeedbackSurveyResponse === 'accept' ? 'feedback-answer--accept' : 'feedback-answer--decline'">
              {{ feedbackState.lastFeedbackSurveyResponse === 'accept'
                ? $t('adminBackend.drawer.profile.feedbackAnswerAccept')
                : $t('adminBackend.drawer.profile.feedbackAnswerDecline') }}
            </span>
          </template>
          <template v-else>{{ $t('adminBackend.drawer.profile.feedbackNeverAnswered') }}</template>
        </div>
        <button
          class="btn-invitation"
          @click="showFeedbackConfirm = true"
          :disabled="resettingFeedback || loadingFeedback || !feedbackState || !feedbackState.lastFeedbackSurveyAt"
        >
          <span class="spinner" v-if="resettingFeedback"></span>{{ $t('adminBackend.drawer.profile.feedbackReset') }}
        </button>
      </div>
    </div>
    <div class="alert-success" v-if="feedbackSuccess">{{ feedbackSuccess }}</div>
    <div class="alert-error" v-if="feedbackError">{{ feedbackError }}</div>
  </template>
  <teleport to="body">
    <transition name="overlay-fade">
      <div class="confirm-overlay" v-if="showFeedbackConfirm" @click.self="showFeedbackConfirm = false">
        <div class="confirm-dialog">
          <h3>{{ $t('adminBackend.drawer.profile.feedbackConfirmTitle') }}</h3>
          <p>{{ $t('adminBackend.drawer.profile.feedbackConfirmMessage', { name: `${user.userFirstName} ${user.userLastName}` }) }}</p>
          <div class="confirm-dialog-actions">
            <button class="btn-cancel" @click="showFeedbackConfirm = false">{{ $t('global.cancel') }}</button>
            <button class="btn-save" @click="confirmFeedbackReset" :disabled="resettingFeedback">
              <span class="spinner" v-if="resettingFeedback"></span>{{ $t('adminBackend.drawer.profile.feedbackConfirmButton') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
```

Note: `DrawerTabDangerZone.vue` defines `.confirm-overlay` / `.confirm-dialog` / `.overlay-fade` styles in its own scoped block — scoped styles do NOT leak between components, so this component needs its own copies (Step 3).

- [ ] **Step 2: Add script logic**

In the `<script setup>` block:

Extend the composable destructuring (line 109) to:

```typescript
const { fetchInvitationLink, resendInvitation, extendInvitation, revokeInvitation: revokeInvitationApi, fetchFeedbackSurvey, resetFeedbackSurvey } = useUserDrawer()
```

Add the import of the type next to the existing composable import:

```typescript
import { useUserDrawer, type FeedbackSurveyState } from '@/composables/useUserDrawer'
```

(replacing the existing `import { useUserDrawer } from '@/composables/useUserDrawer'` line)

Add state refs (after `resendSuccess`, line 121):

```typescript
const feedbackState = ref<FeedbackSurveyState | null>(null)
const loadingFeedback = ref(false)
const resettingFeedback = ref(false)
const showFeedbackConfirm = ref(false)
const feedbackSuccess = ref<string | null>(null)
const feedbackError = ref<string | null>(null)
```

Add functions (after `revokeInvite`):

```typescript
async function loadFeedbackSurvey() {
  const uuid = props.user?.userUuid || (props.user as any)?.uuid
  if (isPending.value || !uuid) return
  loadingFeedback.value = true
  try {
    feedbackState.value = await fetchFeedbackSurvey(uuid)
  } catch {
    feedbackState.value = null
  } finally {
    loadingFeedback.value = false
  }
}

async function confirmFeedbackReset() {
  const uuid = props.user.userUuid || (props.user as any).uuid
  if (!uuid) { feedbackError.value = t('adminBackend.drawer.profile.errorUuid'); return }
  resettingFeedback.value = true
  feedbackSuccess.value = null
  feedbackError.value = null
  try {
    await resetFeedbackSurvey(uuid)
    feedbackState.value = { lastFeedbackSurveyAt: null, lastFeedbackSurveyResponse: null }
    showFeedbackConfirm.value = false
    feedbackSuccess.value = t('adminBackend.drawer.profile.feedbackResetSuccess')
  } catch {
    feedbackError.value = t('adminBackend.drawer.profile.feedbackResetError')
  } finally {
    resettingFeedback.value = false
  }
}
```

The component template uses `$t` but the script needs `t`: add at the top of the script (with the other imports):

```typescript
import { useI18n } from 'vue-i18n'
```

and after the props/emit declarations:

```typescript
const { t } = useI18n()
```

(If the repo re-exports `useI18n` from a local util — check how sibling components in `modules/adminBackend` import it and match that; if no sibling uses `useI18n` in script, hardcoding the two message strings in English like the rest of this component's script messages — e.g. `'Could not save changes. Please try again.'` at line 266 — is the pattern-consistent fallback. Prefer whichever pattern the component already uses: this component currently hardcodes English strings in script. Use hardcoded strings to stay consistent:)

```typescript
// pattern-consistent alternative (no useI18n needed):
feedbackError.value = 'User UUID not available.'
feedbackSuccess.value = 'Feedback survey reset.'
feedbackError.value = 'Could not reset feedback survey. Please try again.'
```

Extend the existing `watch(() => props.user, ...)` (line 270) — add before `loadInvitationLink()`:

```typescript
  feedbackState.value = null
  loadingFeedback.value = false
  resettingFeedback.value = false
  showFeedbackConfirm.value = false
  feedbackSuccess.value = null
  feedbackError.value = null
  loadFeedbackSurvey()
```

- [ ] **Step 3: Add styles**

Append to the `<style scoped>` block:

```css
.feedback-row { display: flex; gap: 8px; align-items: center; }
.feedback-status { flex: 1; }
.feedback-answer {
  border-radius: 4px; padding: 1px 6px; margin-left: 6px; font-weight: 500;
}
.feedback-answer--accept { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
.feedback-answer--decline { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(17, 24, 39, 0.5);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.confirm-dialog {
  background: #fff; border-radius: 10px; padding: 20px; width: 380px; max-width: 90vw;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
.confirm-dialog h3 { margin: 0 0 8px; color: #111827; }
.confirm-dialog p { margin: 0 0 16px; color: #4b5563; }
.confirm-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
.confirm-dialog-actions .btn-cancel,
.confirm-dialog-actions .btn-save { flex: 0 0 auto; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.overlay-fade-enter-active, .overlay-fade-leave-active { transition: opacity 0.15s ease; }
.overlay-fade-enter-from, .overlay-fade-leave-to { opacity: 0; }
```

(Before writing, compare against the actual `.confirm-*`/`.overlay-fade` styles in `DrawerTabDangerZone.vue`'s style block below line 160 and copy those verbatim instead, so both dialogs look identical.)

- [ ] **Step 4: Type-check / build**

Run (from `d:\Calculum\code\Front-End`): `pnpm --filter ap type-check` (or the repo's existing script).
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Run the app (per repo's usual dev command), open Admin → Users → click a user → Profile tab:
- Active user who answered: shows date + Accepted/Declined badge, Reset enabled.
- Click Reset → confirm dialog with the browser-cache caveat → confirm → success message, state flips to "Never answered", button disables.
- Pending user: no Feedback Survey section.

- [ ] **Step 6: Commit (Front-End repo)**

```bash
git -C "d:\Calculum\code\Front-End" add apps/ap/src/modules/adminBackend/components/drawer/DrawerTabProfile.vue
git -C "d:\Calculum\code\Front-End" commit -m "feat(admin): feedback-survey status + reset in user drawer Profile tab

```
