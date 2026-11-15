<template>
  <div class="admin-layout">
    <!-- <AdminSidebar v-model:active="activeSidebarItem" /> -->

    <div class="admin-main">
      <div class="admin-content">
        <div class="admin-inner">
        <div class="page-head">
          <div class="super-admin-banner">
            <ShieldSvg />
            Super Admin · global (all companies)
          </div>
          <h1 class="page-title">Setup</h1>
          <div class="head-actions">
            <button v-if="ingestionLogsEnabled && isGlobalPlatformAdmin" class="btn-back" @click="router.push({ name: 'ingestion-logs' })">Ingestion logs</button>
            <button class="btn-back" @click="router.push('/')">← Back</button>
            <button class="btn-logout" @click="logout">Logout</button>
          </div>
        </div>

        <div class="admin-tabs">
          <button
            class="admin-tab"
            :class="{ active: adminTab === 'negotiation' }"
            @click="adminTab = 'negotiation'"
          >
            Negotiation Agent
          </button>
          <button
            class="admin-tab"
            :class="{ active: adminTab === 'support' }"
            @click="adminTab = 'support'"
          >
            Support Agent
          </button>
        </div>

        <!-- Negotiation Agent tab (existing) -->
        <div v-show="adminTab === 'negotiation'">
          <template v-if="loading">
            <SectionCardSkeleton :rows="3" />
            <SectionCardSkeleton :rows="4" />
            <SectionCardSkeleton :rows="3" />
            <SectionCardSkeleton :rows="2" />
          </template>
          <template v-else>
            <DocumentsSection :documents="kbDocuments" @changed="refreshDocuments" />
            <GoalTogglesSection
              :strategy-toggles="strategyToggles"
              :tenant-rows="tenantRows"
              @change="(s) => { pendingStrategies = s }"
              @save-tenant="saveTenantStrategies"
            />
            <TonesSection
              :open="sections.tones"
              :tones="tones"
              :tone-mappings="toneMappings"
              @toggle="sections.tones = !sections.tones"
              @update-tone="updateToneEnabled"
              @update-mapping="updateToneMapping"
            />
            <CompanyPromptsSection
              :open="sections.prompts"
              :prompts="prompts"
              :promptCount="prompts.length"
              @toggle="sections.prompts = !sections.prompts"
              @add="addPromptRow"
              @update-draft="updatePromptDraft"
              @edit-prompt="editPrompt"
              @save-prompt="savePrompt"
              @cancel-prompt="cancelPrompt"
              @delete-prompt="deletePrompt"
            />

            <SetupActionFooter :saved="false" :saving="tonesSaving" button-label="Save" @save="saveSettings" />
          </template>
        </div>

        <!-- Support Agent tab (new, isolated): Videos | Documents sub-tabs -->
        <div v-show="adminTab === 'support'">
          <div class="subtabs">
            <button
              class="subtab"
              :class="{ 'is-active': supportSubTab === 'videos' }"
              @click="supportSubTab = 'videos'"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M16 10l6-3v10l-6-3" /></svg>
              Videos
              <span class="subtab__count" :class="{ 'is-active': supportSubTab === 'videos' }">{{ videoCount }}</span>
            </button>
            <button
              class="subtab"
              :class="{ 'is-active': supportSubTab === 'documents' }"
              @click="supportSubTab = 'documents'"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v4h4" /></svg>
              Documents
              <span class="subtab__count" :class="{ 'is-active': supportSubTab === 'documents' }">{{ docCount }}</span>
            </button>
          </div>

          <!-- Both stay mounted (single-root wrapper so v-show works on the fragment
               sections) — counts stay live and switching is instant. -->
          <div v-show="supportSubTab === 'videos'">
            <SupportVideosSection @count="videoCount = $event" />
          </div>
          <div v-show="supportSubTab === 'documents'">
            <SupportDocumentsSection @count="docCount = $event" />
          </div>
        </div>

        <footer class="admin-footer">
          <span>© Calculum, Inc. All Rights Reserved   Version: 1.96.0 - 20260515</span>
          <div class="footer-links">
            <a href="#">Term of Service</a>
            <a href="#">Manage Cookies</a>
            <a href="#">Privacy Policy</a>
          </div>
        </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
// import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import DocumentsSection from '@/components/admin/DocumentsSection.vue'
import SupportVideosSection from '@/components/support/admin/SupportVideosSection.vue'
import SupportDocumentsSection from '@/components/support/admin/SupportDocumentsSection.vue'
import GoalTogglesSection from '@/components/admin/GoalTogglesSection.vue'
import TonesSection from '@/components/setup/TonesSection.vue'
import CompanyPromptsSection from '@/components/setup/CompanyPromptsSection.vue'
import SetupActionFooter from '@/components/setup/SetupActionFooter.vue'
import { ShieldSvg } from '@/components/admin/icons'
import { settingsApi } from '@/api/settings.api'
import type { KbDocument, StrategyToggle, TenantStrategy } from '@/api/settings.api'
import type { PromptRow, ToneMapping, ToneSetting } from '@/types/setup'
import { useToast } from '@/composables/useToast'
import SectionCardSkeleton from '@/components/common/SectionCardSkeleton.vue'

const { showToast } = useToast()

const router = useRouter()
const authStore = useAuthStore()
const isGlobalPlatformAdmin = computed(() => authStore.role === 'global_platform_admin')
const ingestionLogsEnabled = import.meta.env.VITE_INGESTION_LOGS_ENABLED === 'true'

// Admin page tabs: Negotiation Agent (existing) | Support Agent (new)
const adminTab = ref<'negotiation' | 'support'>('negotiation')
// Support Agent sub-tabs: Videos | Documents (shown one at a time, with live counts).
const supportSubTab = ref<'videos' | 'documents'>('videos')
const videoCount = ref(0)
const docCount = ref(0)

function logout() {
  authStore.logout()
  router.replace({ name: 'login' })
}

const TONE_META: Record<string, { title: string; color: string; description: string }> = {
  collaborative: {
    title: 'Collaborative',
    color: 'oklch(0.64 0.13 165)',
    description: 'Partnership-first. Frames the extension as a mutual win and invites the supplier to co-create the terms.',
  },
  assertive: {
    title: 'Assertive',
    color: 'oklch(0.64 0.13 35)',
    description: "Direct and confident. States the buyer's position clearly and anchors firmly to benchmark data.",
  },
  methodical: {
    title: 'Methodical',
    color: 'oklch(0.64 0.13 250)',
    description: 'Structured and evidence-led. Walks through the rationale step by step with supporting figures.',
  },
}

const STRATEGY_LABEL: Record<string, string> = {
  term_extension: 'Term Extension',
  term_extension_scf: 'Term Extension + SCF',
}

function initials(name: string | null): string {
  if (!name) return '—'
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const sections = reactive({ tones: true, prompts: true })
const tones = reactive<ToneSetting[]>([])
const toneMappings = reactive<ToneMapping[]>([])
const prompts = reactive<PromptRow[]>([])
const strategyToggles = ref<StrategyToggle[]>([])
const kbDocuments = ref<KbDocument[]>([])
const tenantRows = ref<TenantStrategy[]>([])
let pendingStrategies: string[] = []
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await settingsApi.get()

    // Always show all 3 tones; enabled state comes from effectiveTones
    const effectiveSet = new Set(data.effectiveTones)
    tones.splice(0, tones.length, ...Object.entries(TONE_META).map(([id, meta]) => ({
      id, title: meta.title, description: meta.description, color: meta.color, enabled: effectiveSet.has(id), locked: false,
    })))

    // Tone mappings from strategyToneMap
    toneMappings.splice(0, toneMappings.length, ...Object.entries(data.strategyToneMap ?? {}).map(([strategy, tone]) => ({
      goal: STRATEGY_LABEL[strategy] ?? strategy,
      tone: TONE_META[tone]?.title ?? tone,
    })))

    // Prompts from promptInstructions
    prompts.splice(0, prompts.length, ...Object.entries(data.promptInstructions ?? {}).map(([, p], i) => ({
      id: i + 1,
      instruction: p.prompt,
      enabled: p.isEnabled,
      flag: p.isConflicted ? 'Conflicted with global prompt' : undefined,
      author: p.author ?? '—',
      initials: initials(p.author),
      created: formatDate(p.createdAt),
    })))

    strategyToggles.value = data.strategyToggles
    pendingStrategies = data.strategyToggles.filter((t) => t.enabled).map((t) => t.strategy)
    kbDocuments.value = data.kbDocuments
  } catch (err) {
    console.error('Failed to load settings', err)
  }

  try {
    const { data } = await settingsApi.getTenants()
    tenantRows.value = data.tenants
  } catch (err) {
    console.error('Failed to load tenant strategies', err)
  }

  loading.value = false
})

async function refreshDocuments() {
  try {
    const { data } = await settingsApi.get()
    kbDocuments.value = data.kbDocuments
  } catch (err) {
    console.error('Failed to refresh documents', err)
    showToast('Failed to refresh documents', 'error')
  }
}

// Reverse-lookup maps: display title → API key
const STRATEGY_BY_TITLE = Object.fromEntries(
  Object.entries(STRATEGY_LABEL).map(([k, v]) => [v, k]),
)
const TONE_BY_TITLE = Object.fromEntries(
  Object.entries(TONE_META).map(([k, v]) => [v.title, k]),
)

const tonesSaving = ref(false)

async function saveTenantStrategies(tenantUuid: string, strategies: string[], viewDataInputs: boolean) {
  const tenant = tenantRows.value.find((t) => t.tenantUuid === tenantUuid)
  if (!tenant) return
  try {
    await settingsApi.patchTenant(tenantUuid, {
      tenantUuid,
      tenantName: tenant.tenantName,
      globalStrategy: strategies,
      viewDataInputs,
    })
    showToast(`${tenant.tenantName} settings saved`)
  } catch (e) {
    console.error('Failed to save tenant strategies', e)
    showToast(`Failed to save ${tenant.tenantName} settings`, 'error')
  }
}

function updateToneEnabled(id: string, enabled: boolean) {
  const tone = tones.find((t) => t.id === id)
  if (tone && !tone.locked) tone.enabled = enabled
}

function updateToneMapping(goal: string, tone: string) {
  const mapping = toneMappings.find((m) => m.goal === goal)
  if (mapping) mapping.tone = tone
}

async function saveSettings() {
  tonesSaving.value = true
  try {
    await settingsApi.patch({
      strategies: pendingStrategies,
      tones: tones.filter((t) => t.enabled).map((t) => t.id),
      strategyToneMap: Object.fromEntries(
        toneMappings.map((m) => [
          STRATEGY_BY_TITLE[m.goal] ?? m.goal.toLowerCase().replace(/\s+/g, '_'),
          TONE_BY_TITLE[m.tone] ?? m.tone.toLowerCase(),
        ]),
      ),
      promptInstructions: buildPromptsPatch(),
    })
    showToast('Settings saved')
  } catch (e) {
    console.error('Failed to save settings', e)
    showToast('Failed to save settings', 'error')
  } finally {
    tonesSaving.value = false
  }
}

function buildPromptsPatch() {
  return Object.fromEntries(
    prompts
      .filter((p) => !p.isNew && !p.isEditing && p.instruction)
      .map((p, i) => [String(i), { prompt: p.instruction!, isEnabled: p.enabled ?? true, isConflicted: !!p.flag }]),
  )
}


function addPromptRow() {
  const editing = prompts.find((p) => p.isEditing)
  if (editing) cancelPrompt(editing.id)
  const nextId = Math.max(...prompts.map((p) => p.id), 0) + 1
  prompts.push({ id: nextId, author: 'M. Schwartz', initials: 'MS', created: 'Jun 12, 2026', isEditing: true, isNew: true, draftInstruction: '' })
  nextTick(() => {
    document.querySelector<HTMLTextAreaElement>(`.pt-input[data-id="${nextId}"]`)?.focus()
  })
}

function editPrompt(id: number) {
  const editing = prompts.find((p) => p.isEditing)
  if (editing) { if (editing.id === id) return; cancelPrompt(editing.id) }
  const prompt = prompts.find((p) => p.id === id)
  if (!prompt?.instruction) return
  prompt.isEditing = true
  prompt.draftInstruction = prompt.instruction
  prompt.originalInstruction = prompt.instruction
  nextTick(() => { document.querySelector<HTMLTextAreaElement>(`.pt-input[data-id="${id}"]`)?.focus() })
}

function updatePromptDraft(id: number, value: string) {
  const prompt = prompts.find((p) => p.id === id)
  if (prompt) prompt.draftInstruction = value
}

function savePrompt(id: number) {
  const prompt = prompts.find((p) => p.id === id)
  const instruction = prompt?.draftInstruction?.trim()
  if (!prompt || !instruction) return
  prompt.instruction = instruction
  delete prompt.isEditing; delete prompt.isNew; delete prompt.draftInstruction; delete prompt.originalInstruction
}

function cancelPrompt(id: number) {
  const index = prompts.findIndex((p) => p.id === id)
  if (index === -1) return
  const prompt = prompts[index]
  if (prompt.isNew) { prompts.splice(index, 1); return }
  prompt.instruction = prompt.originalInstruction ?? prompt.instruction
  delete prompt.isEditing; delete prompt.draftInstruction; delete prompt.originalInstruction
}

function deletePrompt(id: number) {
  const index = prompts.findIndex((p) => p.id === id)
  if (index !== -1) { prompts.splice(index, 1) }
}
</script>

<style scoped>
.admin-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 8px;
}
.admin-tab {
  appearance: none;
  background: none;
  border: none;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.admin-tab:hover {
  color: var(--ink);
}
.admin-tab.active {
  color: #6366f1;
  border-bottom-color: #6366f1;
}

/* Support Agent sub-tabs: Videos | Documents segmented control */
.subtabs {
  display: inline-grid;
  grid-template-columns: auto auto;
  gap: 4px;
  background: #eceef0;
  border-radius: 11px;
  padding: 4px;
  margin: 4px 0 18px;
}
.subtab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  color: var(--muted, #5b6470);
}
.subtab.is-active {
  background: #fff;
  color: #6366f1;
  box-shadow: 0 1px 4px rgba(15, 20, 25, 0.08);
}
.subtab__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: #e0e3e6;
  color: var(--muted, #5b6470);
}
.subtab__count.is-active {
  background: #eef2ff;
  color: #6366f1;
}

.admin-layout {
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(22, 163, 148, 0.08), transparent 24%),
    #f6f7fb;
}

.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-content {
  flex: 1;
  background: transparent;
}

.admin-inner {
  max-width: 1500px;
  margin: 0 auto;
  padding: 42px 36px 48px;
}

.super-admin-banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--orange);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 999px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-back {
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-back:hover { background: #f3f4f6; }

.btn-logout {
  border: 1px solid #fecaca;
  border-radius: 999px;
  background: #fff1f2;
  color: #b91c1c;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-logout:hover { opacity: 0.85; }

.super-admin-banner :deep(.ico) {
  width: 14px;
  height: 14px;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.setup-tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 24px;
  overflow-x: auto;
}

.setup-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 2px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  white-space: nowrap;
}

.setup-tab:hover {
  color: var(--ink-2);
}

.setup-tab.on {
  color: var(--ink);
  font-weight: 700;
  border-bottom-color: var(--ink);
}

.placeholder-panel {
  background: #fff;
  border: 1px dashed var(--line);
  border-radius: 12px;
  padding: 48px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.admin-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--muted-2);
}

.footer-links {
  display: flex;
  gap: 18px;
}

.footer-links a {
  color: var(--muted-2);
  text-decoration: none;
}

.footer-links a:hover {
  color: var(--ink-2);
  text-decoration: underline;
}
</style>
