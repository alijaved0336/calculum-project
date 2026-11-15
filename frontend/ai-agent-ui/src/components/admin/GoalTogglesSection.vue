<template>
  <SetupSectionCard
    title="Goal Toggles"
    hint="Enable or disable the negotiation goals available to the agent."
    description="Control which negotiation goals the agent can pursue. Phase 1 ships with two goals. A disabled goal disappears from the agent (chat) view entirely — globally, or for the specific companies you block below."
  >
    <div class="goal-grid">
      <div v-for="goal in goals" :key="goal.id" class="goal-card">
        <div class="goal-card-top">
          <div class="goal-title-row">
            <span class="dot" :style="{ background: goal.dotColor }" />
            <span class="goal-title">{{ goal.title }}</span>
          </div>
          <ToggleSwitch
            :model-value="goal.enabled"
            title="Enable this goal globally"
            @update:model-value="(value) => onGoalToggle(goal, value)"
          />
        </div>
        <p class="goal-desc">{{ goal.description }}</p>
      </div>
    </div>

    <div class="sub-header">
      <span class="sub-title">Per-company availability</span>
      <span class="sub-desc">Block a goal for specific companies — e.g. those without an SCF agreement.</span>
    </div>

    <div class="table-wrap">
      <table class="company-table">
        <thead>
          <tr>
            <th class="col-company">COMPANY</th>
            <th class="col-toggle">TERM EXTENSION</th>
            <th class="col-toggle">TERM EXTENSION + SCF</th>
            <th class="col-toggle">VIEW DATA INPUTS</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in companyRows" :key="row.tenantUuid">
            <td class="company-name">{{ row.company }}</td>
            <td>
              <ToggleSwitch
                v-model="row.termExtension"
                :disabled="!isTermExtensionEnabled"
                title="Toggle Term Extension for this company"
                @update:model-value="onTenantToggle(row)"
              />
            </td>
            <td>
              <ToggleSwitch
                v-model="row.termExtensionScf"
                :disabled="!isTermExtensionScfEnabled"
                title="Toggle Term Extension + SCF for this company"
                @update:model-value="onTenantToggle(row)"
              />
            </td>
            <td>
              <ToggleSwitch
                v-model="row.viewDataInputs"
                title="Allow this tenant's users to view Data Inputs"
                @update:model-value="onTenantToggle(row)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </SetupSectionCard>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import SetupSectionCard from '@/components/admin/SetupSectionCard.vue'
import ToggleSwitch from '@/components/admin/ToggleSwitch.vue'
import type { StrategyToggle, TenantStrategy } from '@/api/settings.api'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  strategyToggles: StrategyToggle[]
  tenantRows?: TenantStrategy[]
}>()

const emit = defineEmits<{
  change: [strategies: string[]]
  saveTenant: [tenantUuid: string, strategies: string[], viewDataInputs: boolean]
}>()

const STRATEGY_META: Record<string, { dotColor: string; title: string; description: string }> = {
  term_extension: {
    dotColor: 'var(--green)',
    title: 'Term Extension',
    description: 'Negotiate longer payment terms, anchored on average days paid and industry benchmark data.',
  },
  term_extension_scf: {
    dotColor: '#3B82F6',
    title: 'Term Extension + SCF',
    description: 'Pair a term extension with a Supply Chain Finance early-pay option to keep the supplier cash-neutral.',
  },
}

const goals = reactive<{ id: string; dotColor: string; title: string; description: string; enabled: boolean }[]>([])

watch(
  () => props.strategyToggles,
  (toggles) => {
    goals.splice(0)
    toggles.forEach((t) => {
      const meta = STRATEGY_META[t.strategy] ?? { dotColor: '#888', title: t.strategy, description: '' }
      goals.push({ id: t.strategy, dotColor: meta.dotColor, title: meta.title, description: meta.description, enabled: t.enabled })
    })
  },
  { immediate: true },
)

interface CompanyRow {
  tenantUuid: string
  company: string
  termExtension: boolean
  termExtensionScf: boolean
  viewDataInputs: boolean
}

const companyRows = reactive<CompanyRow[]>([])

watch(
  () => props.tenantRows,
  (tenants) => {
    companyRows.splice(0)
    if (!tenants?.length) return
    tenants.forEach((t) => {
      companyRows.push({
        tenantUuid: t.tenantUuid,
        company: t.tenantName,
        termExtension: t.globalStrategy.includes('term_extension'),
        termExtensionScf: t.globalStrategy.includes('term_extension_scf'),
        // Default deny until the settings API supplies this permission.
        viewDataInputs: t.viewDataInputs ?? false,
      })
    })
  },
  { immediate: true },
)

const isTermExtensionEnabled = computed(() => goals.find((g) => g.id === 'term_extension')?.enabled ?? true)
const isTermExtensionScfEnabled = computed(() => goals.find((g) => g.id === 'term_extension_scf')?.enabled ?? true)

const { showToast } = useToast()
const enabledGoalCount = computed(() => goals.filter((g) => g.enabled).length)

function onGoalToggle(goal: { enabled: boolean }, value: boolean) {
  if (!value && enabledGoalCount.value <= 1) {
    showToast('At least one goal must be enabled', 'error')
    return
  }
  goal.enabled = value
  emit('change', goals.filter((g) => g.enabled).map((g) => g.id))
}

function onTenantToggle(row: CompanyRow) {
  const strategies: string[] = []
  if (row.termExtension) strategies.push('term_extension')
  if (row.termExtensionScf) strategies.push('term_extension_scf')
  emit('saveTenant', row.tenantUuid, strategies, row.viewDataInputs)
}

</script>

<style scoped>
.goal-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 720px) {
  .goal-grid {
    grid-template-columns: 1fr;
  }
}

.goal-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 16px;
  background: #fff;
}

.goal-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.goal-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.goal-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.goal-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  margin: 10px 0 0;
}

.sub-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 22px 0 14px;
}

.sub-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
}

.sub-desc {
  font-size: 12.5px;
  color: var(--muted);
}

.table-wrap {
  overflow-x: auto;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.company-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.col-company { width: auto; }
.col-toggle  { width: 180px; text-align: center; }

.company-table thead th {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 8px 16px;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
  text-align: left;
}

.company-table thead th.col-toggle { text-align: center; }

.company-table tbody td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line-2);
  vertical-align: middle;
  color: var(--ink-2);
  text-align: left;
  background: #fff;
}

.company-table tbody td:not(.company-name) { text-align: center; }

.company-name {
  font-weight: 600;
  color: var(--ink);
}

.scf-note {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scf-note span {
  font-size: 12px;
  color: var(--muted-2);
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--orange);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: 0.01em;
}

.primary-btn:hover {
  background: var(--orange-600);
}

.primary-btn :deep(.ico) {
  width: 13px;
  height: 13px;
}
</style>
