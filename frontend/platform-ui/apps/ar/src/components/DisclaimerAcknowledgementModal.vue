<template>
<CustomDialog
  :visible="isOpen"
  :title="t('arDisclaimer.title')"
  :close-icon="false"
  :close-on-overlay-click="false"
  :width="480"
  icon="information"
>
  <div class="disclaimer-modal__content">
    <BodyText
      id="disclaimer-modal-summary"
      variant="sm"
      class="disclaimer-modal__summary"
    >
      {{ t('arDisclaimer.summary') }}
    </BodyText>

    <CustomButton
      class="disclaimer-modal__accordion-trigger"
      :class="{ 'disclaimer-modal__accordion-trigger--open': showFullDisclaimer }"
      variant="plain"
      :text="t('arDisclaimer.readFullDisclaimer')"
      icon="icon-arrow-down"
      icon-position="end"
      :aria-expanded="showFullDisclaimer"
      aria-controls="disclaimer-modal-full-text"
      @click="showFullDisclaimer = !showFullDisclaimer"
    />

    <div
      v-show="showFullDisclaimer"
      id="disclaimer-modal-full-text"
      class="disclaimer-modal__full-text"
    >
      <BodyText variant="sm" weight="bold">{{ t('arDisclaimer.legalHeading') }}</BodyText>
      <BodyText variant="sm">{{ t('arDisclaimer.paragraph1') }}</BodyText>
      <BodyText variant="sm">{{ t('arDisclaimer.paragraph2') }}</BodyText>
    </div>

    <!-- The whole box is clickable, not just the small square - onBoxClick only toggles for a
         click that landed outside the input/label pair, which already toggle themselves
         natively and would otherwise double-toggle. -->
    <div
      class="disclaimer-modal__checkbox-box"
      :class="{ 'disclaimer-modal__checkbox-box--checked': acknowledged }"
      @click="onCheckboxBoxClick"
    >
      <CheckBox
        v-model="acknowledged"
        :label="t('arDisclaimer.checkboxLabel')"
        aria-describedby="disclaimer-modal-summary"
      />
    </div>

    <BodyText v-if="!acknowledged" variant="xs" class="disclaimer-modal__helper">
      {{ t('arDisclaimer.helperText') }}
    </BodyText>

    <BodyText v-if="acknowledgeFailed" variant="sm" class="disclaimer-modal__error">
      {{ t('arDisclaimer.errorMessage') }}
    </BodyText>
  </div>

  <template #actions>
    <CustomButton
      class="disclaimer-modal__continue-btn"
      :text="t('arDisclaimer.continueButton')"
      variant="accent"
      :disabled="!acknowledged || acknowledging"
      @click="onContinue"
    />
  </template>
</CustomDialog>
</template>

<script setup lang="ts">
/**
 * UC-UI-22: a mandatory, non-dismissible disclaimer modal shown once per user, ever, at their
 * first login. Mounted once at the app root (`App.vue`), alongside `CustomerCardModal` - not
 * route-gated, since Opportunity is already the app's default landing view, so a user who owes
 * this modal is there anyway right after signing in.
 *
 * **"Non-dismissible" is enforced by NOT wiring `CustomDialog`'s own close events, not by trusting
 * its `closeIcon`/`closeOnOverlayClick` props alone.** Read `CustomDialog`'s own source
 * (`packages/design-system/src/components/primitives/custom-dialog/Index.vue`): its Kendo `Dialog`
 * forwards an Escape-key close through `@close` unconditionally - `closeOnOverlayClick` only gates
 * `onOverlayClick`, a separate handler. `visible` is a fully parent-controlled prop, so as long as
 * nothing here listens for `update:visible`/`close` and reacts to it, no path Kendo or this wrapper
 * expose can actually close the dialog - only `onContinue` below (after a successful POST) does.
 * Design review (24 Sep 2026) asked for a "Go back" button and a close icon; both were dropped
 * rather than wired to anything, since neither has a real destination on a mandatory first-login
 * screen and either would reopen the AC-02 "cannot dismiss without acknowledging" gap.
 *
 * API-23 (`GET`/`POST /api/disclaimer-acknowledgement`) already existed and shipped before this
 * story - see `@/api/disclaimerAcknowledgement.ts`.
 */
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BodyText, CheckBox, CustomButton, CustomDialog } from '@ada/design-system'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'
import { acknowledgeDisclaimer, fetchDisclaimerAcknowledgementStatus } from '@/api/disclaimerAcknowledgement'

const { t } = useI18n({ useScope: 'global' })
const currentUserStore = useArCurrentUserStore()

const isOpen = ref(false)
const acknowledged = ref(false)
const acknowledging = ref(false)
const acknowledgeFailed = ref(false)
const showFullDisclaimer = ref(false)

/** Fires on every transition of `arCurrentUserStore.user` from no user to a real one - i.e. right
 * after `Navbar.vue`'s own session-validation flow calls `setUser`. Checking earlier would hit the
 * endpoint before a session exists (401). Keying off `previousUser` rather than a "checked once"
 * flag does two things: a later `setUser` replacing an existing user object (e.g. a refreshed
 * `sessionExpiresAt`) does not re-ask - a re-check whose GET failed would otherwise re-open the
 * modal via the fail-closed branch below for a user who already acknowledged it - and a sign-out
 * (`clear()`) followed by another sign-in re-arms it, so a second user in the same SPA session is
 * still checked.
 *
 * `flush: 'sync'` (review, PR 14956): Vue's default flush batches every synchronous mutation of
 * the watched source within one tick into a single callback carrying only the NET change - a
 * `clear()` immediately followed by `setUser(next)` with no `await` between them (a plausible
 * defensive pattern in a future SPA sign-in handler) would otherwise deliver `(next, <previous
 * user>)` straight through, skipping the null in between and defeating the re-arm this watch
 * exists for. `flush: 'sync'` makes each mutation its own callback instead. */
watch(
  () => currentUserStore.user,
  async (user, previousUser) => {
    if (!user || previousUser) return
    // A fresh check cycle for a NEW user must not inherit the previous user's answers - otherwise
    // user B's modal can open already ticked/enabled (or stuck on user A's leftover error text)
    // from state this component never resets on its own.
    acknowledged.value = false
    acknowledgeFailed.value = false
    showFullDisclaimer.value = false
    try {
      const status = await fetchDisclaimerAcknowledgementStatus()
      isOpen.value = status.owed
    } catch {
      // Fails closed, not open: a status-check failure (401 racing session validation, 5xx,
      // network blip) must never be indistinguishable from `owed: false` for a mandatory legal
      // disclaimer - show the modal anyway rather than silently let the user in unrecorded for
      // the rest of the session. `acknowledgeDisclaimer` is idempotent, so a user who in fact
      // already acknowledged just triggers one extra no-op POST and the modal closes normally.
      isOpen.value = true
    }
  },
  { immediate: true, flush: 'sync' },
)

/** Extends the checkbox's click target from the small square to the whole surrounding box.
 * A click that landed on the native input or its label already toggled `acknowledged` on its
 * own (that's how a `<label>`/its `for` association works) - toggling again here would cancel
 * it back out, so those two targets are excluded rather than handled twice. */
function onCheckboxBoxClick(event: MouseEvent): void {
  const target = event.target as HTMLElement
  if (target.closest('input, label')) return
  acknowledged.value = !acknowledged.value
}

async function onContinue(): Promise<void> {
  if (!acknowledged.value || acknowledging.value) return

  acknowledging.value = true
  acknowledgeFailed.value = false
  try {
    await acknowledgeDisclaimer()
    isOpen.value = false
  } catch {
    // EF-1: the record call failed - stay open rather than letting the user into the platform
    // with an unrecorded acknowledgment.
    acknowledgeFailed.value = true
  } finally {
    acknowledging.value = false
  }
}
</script>

<style scoped>
.disclaimer-modal__content {
  width: 100%;

  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.disclaimer-modal__summary {
  color: var(--color-text-2);
}

.disclaimer-modal__accordion-trigger.custom-button {
  align-self: flex-start;
  padding: 0;
  color: var(--accent);
}

.disclaimer-modal__accordion-trigger :deep(.custom-button__icon) {
  color: var(--accent);
  transition: transform 0.15s ease;
}

.disclaimer-modal__accordion-trigger--open :deep(.custom-button__icon) {
  transform: rotate(180deg);
}

.disclaimer-modal__full-text {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.disclaimer-modal__checkbox-box {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  background: var(--bg-surface-subtle-1);
  border: 1px solid var(--border-color-default);
  border-radius: var(--border-radius-2);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

/* Kendo's own checkbox+label row is a nowrap flex row sized to its unwrapped content width by
   default - as a flex item here it ignores this box's own width and overflows instead of
   wrapping. flex + min-width: 0 lets it shrink to the available width so the label wraps. */
.disclaimer-modal__checkbox-box :deep(.k-checkbox-wrap) {
  flex: 1;
  min-width: 0;
  gap: 0.625rem;
}

/* AR's legacy `./kendo-ui/calculum-theme` still styles checked/focused checkboxes in its own red
   (Kendo compiles that theme's `$primary`, `#ff2c4f`, into the checkmark's tick as a baked
   `background-image` data URI with a hardcoded `stroke='black'` - not `currentColor`, so it can't
   be recolored via the `color` property - plus a red focus box-shadow glow). Both leak through at
   the same selector specificity as the design system's own `kendo-inputs.scss` override and win on
   import order, so they need a locally-scoped, higher-specificity override here rather than a
   change to that shared legacy stylesheet, which other checkboxes across AR still rely on. */
.disclaimer-modal__checkbox-box :deep(.k-checkbox:checked),
.disclaimer-modal__checkbox-box :deep(.k-checkbox.k-checked) {
  border-color: var(--accent-2);
  background-color: var(--accent-2);
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3e%3cpath fill='none' stroke='white' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M6 10l3 3l6-6'/%3e%3c/svg%3e");
}

.disclaimer-modal__checkbox-box :deep(.k-checkbox:focus),
.disclaimer-modal__checkbox-box :deep(.k-checkbox.k-focus) {
  box-shadow: none;
}

/* Keeps the legal-adjacent label from growing the box past 2 lines regardless of locale/copy
   length - a hard clamp on top of `checkboxLabel`'s own copy already being sized to fit. */
.disclaimer-modal__checkbox-box :deep(.k-checkbox-label) {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.disclaimer-modal__checkbox-box--checked {
  border-color: var(--accent);
}

.disclaimer-modal__helper {
  color: var(--color-text-3);
}

.disclaimer-modal__error {
  color: var(--color-danger, #dc2626);
}
</style>
