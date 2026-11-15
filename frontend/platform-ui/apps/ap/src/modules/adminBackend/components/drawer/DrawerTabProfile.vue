<!-- src/modules/adminBackend/components/drawer/DrawerTabProfile.vue -->
<template>
<div class="profile-tab">
  <div class="status-banner" v-if="identityType === 'pending'">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b; flex-shrink: 0;">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg><span>{{ $t('adminBackend.drawer.profile.pendingBanner') }}</span>
  </div>
  <div class="section-title">{{ $t('adminBackend.drawer.profile.personalInformation') }}</div>
  <div class="form-group">
    <label class="form-label">{{ $t('adminBackend.drawer.profile.email') }}</label>
    <div class="email-display">{{ user.userEmail }}</div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label">{{ $t('adminBackend.drawer.profile.firstName') }}</label>
      <input class="form-input" type="text" v-model="firstName" :disabled="isPending"/>
    </div>
    <div class="form-group">
      <label class="form-label">{{ $t('adminBackend.drawer.profile.lastName') }}</label>
      <input class="form-input" type="text" v-model="lastName" :disabled="isPending"/>
    </div>
  </div>
  <template v-if="identityType === 'pending'">
    <div class="section-title mt-4">{{ $t('adminBackend.drawer.profile.invitationDetails') }}</div>
    <div class="form-group">
      <label class="form-label">{{ $t('adminBackend.drawer.profile.invitationLink') }}</label>
      <div class="invite-link-row">
        <div class="invite-link-value">{{ invitationLink ?? (loadingLink ? 'Loading…' : '—') }}</div>
        <button class="btn-copy" @click="copyLink" :disabled="!invitationLink">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>{{ copyLabel }}
        </button>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">{{ $t('adminBackend.drawer.profile.issuedOn') }}</label>
        <div class="field-display">{{ issuedOn }}</div>
      </div>
      <div class="form-group">
        <label class="form-label">{{ $t('adminBackend.drawer.profile.expiresOn') }}</label>
        <div class="field-display">{{ expiresOn }}<span class="expiring-badge" v-if="isExpiringSoon">{{ $t('adminBackend.drawer.profile.expiringSoon') }}</span></div>
      </div>
    </div>
    <div class="form-group" v-if="invitedByName">
      <label class="form-label">{{ $t('adminBackend.drawer.profile.invitedBy') }}</label>
      <div class="field-display">{{ invitedByName }}</div>
    </div>
    <div class="invitation-actions">
      <button class="btn-invitation" @click="resendInvite" :disabled="resending || extending || revoking"><span class="spinner" v-if="resending"></span>
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>{{ $t('adminBackend.drawer.profile.resendInvitation') }}
      </button>
      <button class="btn-invitation" @click="extendInvite" :disabled="resending || extending || revoking"><span class="spinner" v-if="extending"></span>
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>{{ $t('adminBackend.drawer.profile.extendInvitation') }}
      </button>
      <button class="btn-invitation btn-invitation--danger" @click="revokeInvite" :disabled="resending || extending || revoking"><span class="spinner" v-if="revoking"></span>
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>{{ $t('adminBackend.drawer.profile.revokeInvitation') }}
      </button>
    </div>
    <div class="alert-success" v-if="resendSuccess">{{ resendSuccess }}</div>
  </template>
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
          <div class="alert-error" v-if="feedbackError">{{ feedbackError }}</div>
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
  <div class="form-actions form-actions--separated" v-if="!isPending">
    <button class="btn-save" :disabled="saving" @click="save"><span class="spinner" v-if="saving"></span>{{ $t('global.save') }}</button>
    <button class="btn-cancel" @click="resetForm">{{ $t('global.cancel') }}</button>
  </div>
  <div class="alert-error" v-if="errorMessage">{{ errorMessage }}</div>
  <div class="alert-success" v-if="successMessage">{{ successMessage }}</div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from '@/utils/axios'
import { getBaseApi } from '@/utils/getBaseApi'
import { useUserDrawer, type FeedbackSurveyState } from '@/composables/useUserDrawer'

const props = defineProps<{
  user: {
    userUuid: string
    userEmail: string
    userFirstName: string
    userLastName: string
    userAzureId: string | null
    identityProvider: string | null
    invitationToken: string | null
    tokenExpiration: string | null
    azureLastInvitationDate?: string | null
    invitedByName?: string | null
    id?: number
  }
}>()
const emit = defineEmits<{ (e: 'updated', user: unknown): void }>()

const { t } = useI18n()

const { fetchInvitationLink, resendInvitation, extendInvitation, revokeInvitation: revokeInvitationApi, fetchFeedbackSurvey, resetFeedbackSurvey } = useUserDrawer()

const firstName = ref(props.user.userFirstName)
const lastName = ref(props.user.userLastName)
const saving = ref(false)
const loadingLink = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const invitationLink = ref<string | null>(null)
const resending = ref(false)
const extending = ref(false)
const revoking = ref(false)
const resendSuccess = ref<string | null>(null)
const feedbackState = ref<FeedbackSurveyState | null>(null)
const loadingFeedback = ref(false)
const resettingFeedback = ref(false)
const showFeedbackConfirm = ref(false)
const feedbackSuccess = ref<string | null>(null)
const feedbackError = ref<string | null>(null)

const identityType = computed(() => {
  if (!props.user.userAzureId) return 'pending'
  return !props.user.identityProvider || props.user.identityProvider === 'local' ? 'local' : 'sso'
})

const isPending = computed(() => identityType.value === 'pending')

const localTokenExpiration = ref(props.user.tokenExpiration)
const localIssuedDate = ref(props.user.azureLastInvitationDate)

const issuedOn = computed(() => {
  if (localIssuedDate.value) {
    return new Date(localIssuedDate.value).toLocaleDateString()
  }
  if (localTokenExpiration.value) {
    const expDate = new Date(localTokenExpiration.value)
    const issued = new Date(expDate.getTime() - 15 * 86400000)
    return issued.toLocaleDateString()
  }
  return '—'
})

const expiresOn = computed(() =>
  localTokenExpiration.value ? new Date(localTokenExpiration.value).toLocaleDateString() : '—'
)

const isExpiringSoon = computed(() => {
  if (!localTokenExpiration.value) return false
  return (new Date(localTokenExpiration.value).getTime() - Date.now()) / 86400000 <= 14
})

const invitedByName = computed(() => props.user.invitedByName ?? null)

async function loadInvitationLink() {
  const uuid = props.user?.userUuid || (props.user as any)?.uuid
  if (identityType.value !== 'pending' || !uuid) return
  loadingLink.value = true
  try {
    const res = await fetchInvitationLink(uuid)
    invitationLink.value = res.invitationLink
  } catch { invitationLink.value = null }
  finally { loadingLink.value = false }
}

const copyLabel = ref('Copy')

function copyLink() {
  if (!invitationLink.value) return
  navigator.clipboard.writeText(invitationLink.value)
  copyLabel.value = 'Copied!'
  setTimeout(() => { copyLabel.value = 'Copy' }, 2000)
}

async function resendInvite() {
  const rawId = props.user.id || (props.user as any).userCompanyId
  const id = typeof rawId === 'string' ? Number.parseInt(rawId.replaceAll(/\D/g, ''), 10) || rawId : rawId
  if (!id) { errorMessage.value = 'User company ID not available.'; return }
  resending.value = true
  resendSuccess.value = null
  errorMessage.value = null
  try {
    const { failed } = await resendInvitation([id])
    if (failed.length === 0) {
      localIssuedDate.value = new Date().toISOString()
      // Estimate new expiration (15 days from now)
      localTokenExpiration.value = new Date(Date.now() + 15 * 86400000).toISOString()
      invitationLink.value = null
      await loadInvitationLink()
      resendSuccess.value = 'Invitation email resent successfully.'
    } else {
      errorMessage.value = 'Could not resend invitation. Please try again.'
    }
  } catch {
    errorMessage.value = 'Could not resend invitation. Please try again.'
  } finally {
    resending.value = false
  }
}

async function extendInvite() {
  const uuid = props.user.userUuid || (props.user as any).uuid
  if (!uuid) { errorMessage.value = 'User UUID not available.'; return }
  extending.value = true
  resendSuccess.value = null
  errorMessage.value = null
  try {
    const result = await extendInvitation(uuid)
    localTokenExpiration.value = result.newExpiration
    localIssuedDate.value = new Date().toISOString()
    invitationLink.value = null
    await loadInvitationLink()
    resendSuccess.value = `Invitation extended. New expiration: ${new Date(result.newExpiration).toLocaleDateString()}`
    emit('updated', props.user)
  } catch {
    errorMessage.value = 'Could not extend invitation. Please try again.'
  } finally {
    extending.value = false
  }
}

async function revokeInvite() {
  const uuid = props.user.userUuid || (props.user as any).uuid
  if (!uuid) { errorMessage.value = 'User UUID not available.'; return }
  revoking.value = true
  resendSuccess.value = null
  errorMessage.value = null
  try {
    await revokeInvitationApi(uuid)
    localTokenExpiration.value = null
    localIssuedDate.value = null
    invitationLink.value = null
    resendSuccess.value = 'Invitation revoked successfully.'
    emit('updated', props.user)
  } catch {
    errorMessage.value = 'Could not revoke invitation. Please try again.'
  } finally {
    revoking.value = false
  }
}

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

function resetForm() {
  firstName.value = props.user.userFirstName
  lastName.value = props.user.userLastName
  errorMessage.value = null
  successMessage.value = null
}

async function save() {
  const uuid = props.user.userUuid || (props.user as any).uuid
  if (!uuid) { errorMessage.value = 'User UUID not available.'; return }
  saving.value = true; errorMessage.value = null; successMessage.value = null
  try {
    await axios.patch(`${getBaseApi()}/api/users/${uuid}`, {
      firstName: firstName.value,
      lastName: lastName.value,
    }, {
      headers: { 'Content-Type': 'application/merge-patch+json' },
    })
    errorMessage.value = null
    successMessage.value = 'Profile updated.'
    emit('updated', { ...props.user, userFirstName: firstName.value, userLastName: lastName.value })
  } catch (err) {
    console.error('Profile save error:', err)
    errorMessage.value = 'Could not save changes. Please try again.'
  } finally { saving.value = false }
}

watch(() => props.user, () => {
  firstName.value = props.user?.userFirstName ?? ''
  lastName.value = props.user?.userLastName ?? ''
  saving.value = false
  resending.value = false
  extending.value = false
  revoking.value = false
  errorMessage.value = null
  successMessage.value = null
  resendSuccess.value = null
  localTokenExpiration.value = props.user?.tokenExpiration ?? null
  localIssuedDate.value = props.user?.azureLastInvitationDate ?? null
  invitationLink.value = null
  copyLabel.value = 'Copy'
  loadInvitationLink()
  feedbackState.value = null
  loadingFeedback.value = false
  resettingFeedback.value = false
  showFeedbackConfirm.value = false
  feedbackSuccess.value = null
  feedbackError.value = null
  loadFeedbackSurvey()
}, { immediate: true })
</script>

<style scoped>
.profile-tab {
  font-size: 1rem;
}
.status-banner {
  background: #fffbeb; border: 1px solid #fde047; border-radius: 8px;
  padding: 10px 12px; margin-bottom: 14px; color: #713f12;
  display: flex; gap: 8px; align-items: flex-start;
}
.section-title {
  font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;
}
.invitation-actions {
  display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;
}
.btn-invitation {
  background: #fff; color: #374151; border: 1px solid #d1d5db; border-radius: 6px;
  padding: 7px 12px; font-weight: 500; cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
}
.btn-invitation:hover { background: #f9fafb; border-color: #9ca3af; }
.btn-invitation:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-invitation--danger { color: #dc2626; border-color: #fecaca; }
.btn-invitation--danger:hover { background: #fef2f2; border-color: #f87171; }
.form-group { margin-bottom: 10px; }
.form-label { font-weight: 600; color: #374151; margin-bottom: 3px; display: block; }
input.form-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 7px 10px;
  line-height: 1.4;
  height: auto;
  color: #111827;
  outline: none;
  background: #fff;
  box-sizing: border-box;
  font-family: inherit;
}
input.form-input:focus { border-color: #ff2c4f; box-shadow: 0 0 0 2px #ffdfe4; }
input.form-input:disabled { background: #f9fafb; color: #6b7280; cursor: not-allowed; }
.form-row { display: flex; gap: 8px; }
.form-row .form-group { flex: 1; }
.email-display {
  padding: 7px 10px; background: #f9fafb; border: 1px solid #e5e7eb;
  border-radius: 6px; color: #6b7280;
}
.field-display {
  padding: 7px 10px; background: #f9fafb; border: 1px solid #e5e7eb;
  border-radius: 6px; color: #374151;
}
.invite-link-row {
  display: flex; gap: 8px; align-items: center;
}
.invite-link-value {
  flex: 1; padding: 7px 10px; background: #f9fafb; border: 1px solid #e5e7eb;
  border-radius: 6px; color: #374151; font-family: monospace;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.btn-copy {
  border: 1px solid #e5e7eb; border-radius: 6px; background: #fff;
  color: #374151; white-space: nowrap; flex-shrink: 0;
  display: flex; gap: 5px; align-items: center; padding: 6px 10px; cursor: pointer;
}
.btn-copy:hover { border-color: #10b981; color: #10b981; }
.expiring-badge {
  background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px;
  padding: 1px 5px; margin-left: 4px; font-weight: 500; color: #dc2626;
}
.form-actions { display: flex; gap: 8px; margin-top: 14px; }
.form-actions--separated { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
.form-actions button {
  flex: 1; border-radius: 6px; padding: 8px; 
  line-height: 1.4; box-sizing: border-box; font-family: inherit;
  cursor: pointer; text-align: center;
}
.btn-save {
  background: #ff2c4f; color: #fff; border: 1px solid #ff2c4f; font-weight: 600;
}
.btn-save:hover { background: #e02343; border-color: #e02343; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel {
  background: #fff; color: #374151; border: 1px solid #d1d5db; font-weight: 500;
}
.btn-cancel:hover { background: #f9fafb; }
.spinner {
  display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 6px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.alert-error {
  margin-top: 12px; padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; color: #dc2626;
}
.alert-success {
  margin-top: 12px; padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0;
  border-radius: 6px; color: #166534;
}
.feedback-row { display: flex; gap: 8px; align-items: center; }
.feedback-status { flex: 1; }
.feedback-answer {
  border-radius: 4px; padding: 1px 6px; margin-left: 6px; font-weight: 500;
}
.feedback-answer--accept { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
.feedback-answer--decline { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.confirm-dialog {
  background: #fff; border-radius: 12px; padding: 28px 28px 22px;
  max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.confirm-dialog h3 { font-weight: 700; color: #111827; text-align: center; margin-bottom: 8px; }
.confirm-dialog p { color: #6b7280; text-align: center; line-height: 1.6; margin-bottom: 22px; }
.confirm-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
.confirm-dialog-actions .btn-cancel,
.confirm-dialog-actions .btn-save { flex: 0 0 auto; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.overlay-fade-enter-active, .overlay-fade-leave-active { transition: opacity 0.15s; }
.overlay-fade-enter-from, .overlay-fade-leave-to { opacity: 0; }
</style>
