<template>
  <main class="setup-page">
    <div class="setup-topbar">
      <button class="btn-back" @click="router.push('/')">← Back</button>
      <button class="btn-logout" @click="logout">Logout</button>
    </div>
    <div class="setup-main">
      <template v-if="loading">
        <SectionCardSkeleton :rows="3" />
        <SectionCardSkeleton :rows="3" />
        <SectionCardSkeleton :rows="2" />
      </template>
      <template v-else>
        <GoalTogglesSection
          :open="sections.goals"
          :goals="goals"
          @toggle="toggleSection('goals')"
          @update-goal="updateGoalEnabled"
        />

        <TonesSection
          :open="sections.tones"
          :tones="tones"
          :toneMappings="toneMappings"
          @toggle="toggleSection('tones')"
          @update-tone="updateToneEnabled"
          @update-mapping="updateToneMapping"
        />

        <CompanyPromptsSection
          :open="sections.prompts"
          :prompts="prompts"
          :promptCount="promptCount"
          @toggle="toggleSection('prompts')"
          @add="addPromptRow"
          @update-draft="updatePromptDraft"
          @edit-prompt="editPrompt"
          @save-prompt="savePrompt"
          @cancel-prompt="cancelPrompt"
          @delete-prompt="deletePrompt"
          @toggle-prompt="togglePromptEnabled"
        />

        <div class="save-footer-gap">
          <SetupActionFooter
            :saved="false"
            :saving="saving"
            button-label="Save"
            @save="saveAll"
          />
        </div>
      </template>

      <SetupFooter />
    </div>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import GoalTogglesSection from "@/components/setup/GoalTogglesSection.vue";
import TonesSection from "@/components/setup/TonesSection.vue";
import CompanyPromptsSection from "@/components/setup/CompanyPromptsSection.vue";
import SetupActionFooter from "@/components/setup/SetupActionFooter.vue";
import SetupFooter from "@/components/setup/SetupFooter.vue";
import { settingsApi } from "@/api/settings.api";
import type { SettingsResponse, SettingsPatchRequest } from "@/api/settings.api";
import { authApi } from "@/api/auth.api";
import { useToast } from "@/composables/useToast";
import SectionCardSkeleton from "@/components/common/SectionCardSkeleton.vue";

const { showToast } = useToast();
import type {
  GoalSetting,
  PromptRow,
  SetupSection,
  ToneMapping,
  ToneSetting,
} from "@/types/setup";

const STRATEGY_META: Record<string, { title: string; description: string; color: string }> = {
  term_extension: {
    title: "Term Extension",
    description: "Negotiate longer payment terms, anchored on average days paid and industry benchmark data.",
    color: "#31b57d",
  },
  term_extension_scf: {
    title: "Term Extension + SCF",
    description: "Pair a term extension with a Supply Chain Finance early-pay option to keep the supplier cash-neutral.",
    color: "#9dc9f5",
  },
};

const TONE_META: Record<string, { title: string; description: string; color: string }> = {
  collaborative: {
    title: "Collaborative",
    description: "Partnership-first. Frames the extension as a mutual win and invites the supplier to co-create the terms.",
    color: "oklch(0.64 0.13 165)",
  },
  assertive: {
    title: "Assertive",
    description: "Direct and confident. States the buyer's position clearly and anchors firmly to benchmark data.",
    color: "oklch(0.64 0.13 35)",
  },
  methodical: {
    title: "Methodical",
    description: "Structured and evidence-led. Walks through the rationale step by step with supporting figures.",
    color: "oklch(0.64 0.13 250)",
  },
};

function strategyTitle(s: string): string {
  return STRATEGY_META[s]?.title ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toneTitle(t: string): string {
  return TONE_META[t]?.title ?? (t.charAt(0).toUpperCase() + t.slice(1));
}

function initials(name: string | null): string {
  if (!name) return '—'
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const router = useRouter()
const authStore = useAuthStore()

function logout() {
  authStore.logout()
  router.replace({ name: 'login' })
}

const sections = reactive({
  goals: true,
  tones: true,
  prompts: true,
});

const tenantUuid = computed(() => authStore.selectedTenantUuid);
const goals = reactive<GoalSetting[]>([]);
const tones = reactive<ToneSetting[]>([]);
const toneMappings = reactive<ToneMapping[]>([]);
const prompts = reactive<PromptRow[]>([]);

function applySettings(data: SettingsResponse) {
  goals.splice(0);
  for (const toggle of data.strategyToggles) {
    const meta = STRATEGY_META[toggle.strategy];
    goals.push({
      id: toggle.strategy,
      title: meta?.title ?? strategyTitle(toggle.strategy),
      description: meta?.description ?? "",
      color: meta?.color ?? "#888",
      enabled: toggle.enabled,
      locked: toggle.locked || !toggle.available,
    });
  }

  const globalTonesSet = new Set(data.globalTones ?? [])
  tones.splice(0);
  for (const [toneId, meta] of Object.entries(TONE_META)) {
    tones.push({
      id: toneId,
      title: meta.title,
      description: meta.description,
      color: meta.color,
      enabled: data.effectiveTones.includes(toneId),
      locked: !globalTonesSet.has(toneId),
    });
  }

  toneMappings.splice(0);
  for (const [strategyId, toneId] of Object.entries(data.strategyToneMap ?? {})) {
    toneMappings.push({
      goal: strategyTitle(strategyId),
      tone: toneTitle(toneId),
    });
  }

  const enabledToneTitles = tones.filter((t) => t.enabled).map((t) => t.title);
  if (enabledToneTitles.length) {
    for (const mapping of toneMappings) {
      if (mapping.tone && !enabledToneTitles.includes(mapping.tone)) {
        mapping.tone = enabledToneTitles[0];
      }
    }
  }

  prompts.splice(0);
  for (const [key, instruction] of Object.entries(data.promptInstructions ?? {})) {
    prompts.push({
      id: parseInt(key) + 1,
      instruction: instruction.prompt,
      author: instruction.author ?? "—",
      initials: initials(instruction.author),
      created: formatDate(instruction.createdAt),
      enabled: instruction.isEnabled,
      flag: instruction.isConflicted ? "Superseded by a global prompt" : undefined,
    });
  }
}

const loading = ref(true);

onMounted(async () => {
  try {
    if (!authStore.selectedTenantUuid && authStore.selectedTenantId) {
      const { data } = await authApi.listTenants();
      const match = data.tenants.find((t) => t.tenantId === authStore.selectedTenantId);
      if (match) {
        authStore.selectTenant(authStore.selectedTenantId, match.tenantUuid);
      }
    }
    const res = await settingsApi.get(tenantUuid.value);
    applySettings(res.data);
  } catch (e) {
    console.error("Failed to load settings", e);
  }
  loading.value = false;
});

function toggleSection(section: SetupSection) {
  sections[section] = !sections[section];
}

function buildPatch(): SettingsPatchRequest {
  return {
    strategies: goals.filter((g) => g.enabled && !g.locked).map((g) => g.id),
    tones: tones.filter((t) => t.enabled).map((t) => t.id),
    strategyToneMap: Object.fromEntries(
      toneMappings.map((m) => [
        goals.find((g) => g.title === m.goal)?.id ?? m.goal.toLowerCase().replace(/\s+/g, "_"),
        tones.find((t) => t.title === m.tone)?.id ?? m.tone.toLowerCase(),
      ])
    ),
    promptInstructions: Object.fromEntries(
      prompts
        .filter((p) => !p.isNew && !p.isEditing && p.instruction)
        .map((p, i) => [
          String(i),
          { prompt: p.instruction!, isEnabled: p.enabled ?? true, isConflicted: !!p.flag },
        ])
    ),
  };
}

const saving = ref(false);

async function saveAll() {
  saving.value = true;
  try {
    const res = await settingsApi.patch(buildPatch(), tenantUuid.value);
    applySettings(res.data);
    showToast('Settings saved');
  } catch (e) {
    console.error("Failed to save settings", e);
    showToast('Failed to save settings', 'error');
  } finally {
    saving.value = false;
  }
}

function updateGoalEnabled(id: string, enabled: boolean) {
  const goal = goals.find((item) => item.id === id);
  if (goal && !goal.locked) {
    goal.enabled = enabled;
  }
}

function updateToneEnabled(id: string, enabled: boolean) {
  const tone = tones.find((item) => item.id === id);
  if (tone && !tone.locked) {
    tone.enabled = enabled;
  }
}

function updateToneMapping(goal: string, tone: string) {
  const mapping = toneMappings.find((item) => item.goal === goal);
  if (mapping) {
    mapping.tone = tone;
  }
}


const promptCount = computed(() => prompts.length);

function addPromptRow() {
  const editingPrompt = prompts.find((prompt) => prompt.isEditing);

  if (editingPrompt) {
    cancelPrompt(editingPrompt.id);
  }

  const nextId = Math.max(...prompts.map((prompt) => prompt.id), 0) + 1;

  prompts.push({
    id: nextId,
    author: "",
    initials: "",
    created: "",
    isEditing: true,
    isNew: true,
    draftInstruction: "",
  });

  focusPromptInput(nextId);
}

function editPrompt(id: number) {
  const editingPrompt = prompts.find((prompt) => prompt.isEditing);

  if (editingPrompt) {
    if (editingPrompt.id === id) {
      return;
    }

    cancelPrompt(editingPrompt.id);
  }

  const prompt = prompts.find((item) => item.id === id);

  if (!prompt || !prompt.instruction) {
    return;
  }

  prompt.isEditing = true;
  prompt.draftInstruction = prompt.instruction;
  prompt.originalInstruction = prompt.instruction;
  focusPromptInput(id);
}

function savePrompt(id: number) {
  const prompt = prompts.find((item) => item.id === id);
  const instruction = prompt?.draftInstruction?.trim();

  if (!prompt || !instruction) {
    return;
  }

  prompt.instruction = instruction;
  delete prompt.isEditing;
  delete prompt.isNew;
  delete prompt.draftInstruction;
  delete prompt.originalInstruction;
}

function updatePromptDraft(id: number, value: string) {
  const prompt = prompts.find((item) => item.id === id);
  if (prompt) {
    prompt.draftInstruction = value;
  }
}

function cancelPrompt(id: number) {
  const index = prompts.findIndex((prompt) => prompt.id === id);

  if (index === -1) {
    return;
  }

  const prompt = prompts[index];

  if (prompt.isNew) {
    prompts.splice(index, 1);
    return;
  }

  prompt.instruction = prompt.originalInstruction ?? prompt.instruction;
  delete prompt.isEditing;
  delete prompt.draftInstruction;
  delete prompt.originalInstruction;
}

function togglePromptEnabled(id: number) {
  const prompt = prompts.find((item) => item.id === id);
  if (prompt) {
    prompt.enabled = !prompt.enabled;
  }
}

function deletePrompt(id: number) {
  const index = prompts.findIndex((prompt) => prompt.id === id);

  if (index !== -1) {
    prompts.splice(index, 1);
  }
}

function focusPromptInput(id: number) {
  nextTick(() => {
    const input = document.querySelector<HTMLTextAreaElement>(`.pt-input[data-id="${id}"]`);
    input?.focus();
  });
}

</script>

<style>
.setup-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(22, 163, 148, 0.08), transparent 24%),
    #f6f7fb;
  color: #122033;
}

.setup-topbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 36px 0;
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

.setup-main {
  max-width: 1500px;
  margin: 0 auto;
  padding: 42px 36px 48px;
}

.save-footer-gap {
  margin-bottom: 16px;
}

@media (max-width: 760px) {
  .setup-main {
    padding: 24px 18px 40px;
  }
}
</style>
