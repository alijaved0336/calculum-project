<!-- src/modules/adminBackend/components/drawer/DrawerTabIdentity.vue -->
<template>
<div class="identity-tab">
  <div class="loading-center" v-if="loading">
    <div class="spinner"></div>
  </div>
  <div class="error-banner" v-else-if="error">Could not load identity data.
    <button class="btn-link" @click="load">Try again</button>
  </div>
  <template v-else>
    <div class="section-title">Federated Identity</div>
    <div class="identity-block">
      <div class="identity-issuer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6b7280;">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>{{ profile?.issuerDomain ?? '—' }}
      </div>
      <div class="identity-type">SSO — Federated identity provider</div>
    </div>
    <div class="section-title">Identities</div>
    <div class="empty-text" v-if="!profile?.identities?.length">No identity data available.</div>
    <div class="identity-block" v-for="id in (profile?.identities ?? [])" :key="id.issuerAssignedId">
      <div class="identity-detail"><strong>Sign-in type:</strong> {{ id.signInType }}</div>
      <div class="identity-detail"><strong>Issuer:</strong> {{ id.issuer }}</div>
      <div class="identity-detail"><strong>Issuer ID:</strong> {{ id.issuerAssignedId }}</div>
    </div>
  </template>
</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUserDrawer, type B2CProfile } from '@/composables/useUserDrawer'

const props = defineProps<{ user: { userUuid: string } }>()
const { fetchB2CProfile } = useUserDrawer()
const loading = ref(false)
const error = ref(false)
const profile = ref<B2CProfile | null>(null)

async function load() {
  const uuid = props.user.userUuid || (props.user as any).uuid
  if (!uuid) return
  loading.value = true; error.value = false
  try { profile.value = await fetchB2CProfile(uuid) }
  catch { error.value = true }
  finally { loading.value = false }
}

watch(() => props.user, () => {
  profile.value = null
  load()
}, { immediate: true })
</script>

<style scoped>
.identity-tab {
  font-size: 1rem;
}
.section-title {
  font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;
}
.identity-block {
  background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 12px 14px; margin-bottom: 8px;
}
.identity-issuer {
  font-weight: 700; color: #111827; 
  display: flex; align-items: center; gap: 6px;
}
.identity-type { color: #6b7280; margin-top: 3px; }
.identity-detail { color: #374151; margin-top: 6px; }
.identity-detail strong { color: #111827; }
.empty-text { color: #9ca3af; }
.loading-center { text-align: center; padding: 16px 0; }
.spinner {
  display: inline-block; width: 14px; height: 14px; border: 2px solid #e5e7eb;
  border-top-color: #ff2c4f; border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-banner {
  padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; color: #dc2626; display: flex; align-items: center; gap: 8px;
}
.btn-link { background: none; border: none; color: #ff2c4f; cursor: pointer; padding: 0; text-decoration: underline; }
</style>
