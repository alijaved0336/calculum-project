<template>
<div class="activity-log-item simple-activity">
  <div class="activity-bullet"></div>
  <div class="activity-inline-content" :class="{ 'activity-inline-content--collapsed': !contentExpanded }" @click="contentExpanded = !contentExpanded">
    <template v-if="showFullTranslatedMessage"><span class="activity-user">{{ displayName }}</span><span class="activity-separator">{{ ' — ' }}</span>
      <template v-if="showActionLabelWithMessage && actionLabel"><span class="activity-action">{{ actionLabel }}</span><span class="activity-separator">{{ ' · ' }}</span></template><span class="activity-message" v-if="displayMessageHtml" v-html="displayMessageHtml"></span>
    </template>
    <template v-else><span class="activity-user">{{ displayName }}</span><span class="activity-separator">{{ ' — ' }}</span><span class="activity-action" v-if="actionLabel">{{ actionLabel + ' ' }}</span>
      <template v-if="isStatusChange && hasStatusFromTo"><span>{{ ' ' + $t('home.entityCard.activityLog.from') + ' ' }}</span><span class="status-pill" :style="{ backgroundColor: getStatusColor(oldStatusCode) }" :title="getStatusLabel(oldStatusCode)"></span><span>{{ ' ' + getStatusLabel(oldStatusCode) + ' ' }}</span><span>{{ $t('home.entityCard.activityLog.to') + ' ' }}</span><span class="status-pill" :style="{ backgroundColor: getStatusColor(newStatusCode) }" :title="getStatusLabel(newStatusCode)"></span><span>{{ ' ' + getStatusLabel(newStatusCode) }}</span><span v-if="statusChangeAffectedLabel">{{ ' ' + statusChangeAffectedLabel }}</span></template>
      <template v-else><span class="activity-message" v-if="displayMessage" v-html="displayMessageHtml"></span></template>
    </template>
  </div>
  <div class="activity-time">{{ displayTime }}</div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref } from 'vue';
import { formatActivityRelativeDate, formatISODateToUS } from '@/utils/FormatData';
import { useI18n } from 'vue-i18n';
import { UserActionsInLogs } from '@/modules/home/types';

/** Metadata from backend: scope, occurredAt, newValue?, affected_spends?, affected_suppliers?, field?, from?, to?, oldStatus?, newStatus?, summary?, actionBy?
 *  For agreed_term_change: termsWithoutCashDiscount, termsWithCashDiscount?, cashDiscount?, agreedDateOfChange?, nextReviewDate? */
interface LogMetadata {
  scope?: string;
  occurredAt?: string;
  newValue?: string;
  affected_spends?: Array<{ uuid: string; name?: string }>;
  affected_suppliers?: Array<{ uuid: string; name?: string }>;
  field?: string;
  from?: string;
  to?: string;
  oldStatus?: string;
  newStatus?: string;
  summary?: string;
  actionBy?: UserActionsInLogs;
  termsWithoutCashDiscount?: number;
  termsWithCashDiscount?: number;
  cashDiscount?: number;
  agreedDateOfChange?: string;
  nextReviewDate?: string;
  forecastScopeTotals?: {
    volumeSum?: number;
    forecastVolumeBeforeSum?: number;
    forecastVolumeAfterSum?: number;
    forecastVolumeDeltaSum?: number;
  };
}

export interface LogActivity {
  uuid?: string;
  '@id'?: string;
  created?: string;
  sourceType: string;
  action: string;
  metadata?: LogMetadata;
  user?: UserActionsInLogs;
}

const STATUS_COLOR_MAP: Record<string, string> = {
  analyzed: '#5d6b98',
  planned: '#0ba5ec',
  contacted: '#15b79e',
  agreed: '#c3b5fd',
  agreedExtended: '#7839ee',
};

/** Maps backend scope (any case) to i18n key (lowercase). */
function getScopeKey(scope?: string): 'total' | 'partial' {
  const raw = (scope ?? '').toLowerCase();
  return raw === 'partial' ? 'partial' : 'total';
}

/** Maps backend sourceType (snake_case, any case) to i18n key (camelCase). */
function getSourceTypeKey(sourceType: string | undefined): string | null {
  const raw = (sourceType ?? '').toLowerCase();
  switch (raw) {
    case 'status_change':
      return 'statusChange';
    case 'target_change':
      return 'targetChange';
    case 'agreed_term_change':
      return 'agreedTermChange';
    case 'plan_phase_change':
      return 'planPhaseChange';
    case 'spend_volume_forecast_change':
      return 'spendVolumeForecastChange';
    case 'manageteam':
    case 'manage_team':
      return 'manageTeam';
    case 'commodity':
      return 'commodity';
    case 'columnnumber':
    case 'custom_column':
      return 'customColumn';
    default:
      return null;
  }
}

/** Maps backend action (any case) to i18n key (lowercase). */
function getActionKey(action: string | undefined): string | null {
  const a = (action ?? '').toLowerCase();
  if (!a) return null;
  switch (a) {
    case 'changed':
      return 'changed';
    case 'created':
      return 'created';
    case 'updated':
      return 'updated';
    case 'deleted':
      return 'deleted';
    case 'added':
      return 'added';
    case 'removed':
      return 'removed';
    default:
      return null;
  }
}

function formatAffected(list?: Array<{ uuid: string; name?: string }>): string {
  if (!list || !list.length) return '';
  const names = list.map((s) => s.name || s.uuid).slice(0, 3);
  return names.join(', ') + (list.length > 3 ? '…' : '');
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function getStatusColor(code: string | undefined): string {
  if (!code) return '#9ca3af';
  return STATUS_COLOR_MAP[code] ?? '#9ca3af';
}

function formatNumeric(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  return `${sign}${formatted}%`;
}

/** Maps "sourceType:action" (both lowercased) to the i18n suffix under activityLog. */
const ACTION_LABEL_KEYS: Record<string, string> = {
  'target_change:created':      'targetCreated',
  'target_change:updated':      'targetUpdated',
  'target_change:deleted':      'targetDeleted',
  'agreed_term_change:created': 'agreedTermsCreated',
  'agreed_term_change:updated': 'agreedTermsUpdated',
  'agreed_term_change:deleted': 'agreedTermsDeleted',
  // plan_phase_change: backend may send created/updated/deleted; map to UI verbs
  'plan_phase_change:added':    'planPhaseAdded',
  'plan_phase_change:created':  'planPhaseAdded',
  'plan_phase_change:removed':  'planPhaseRemoved',
  'plan_phase_change:deleted':  'planPhaseRemoved',
  'plan_phase_change:changed':  'planPhaseChanged',
  'plan_phase_change:updated':  'planPhaseChanged',
  'manageteam:updated':         'manageTeamUpdated',
  'manage_team:updated':        'manageTeamUpdated',
  'manageteam:deleted':         'manageTeamDeleted',
  'manage_team:deleted':        'manageTeamDeleted',
  'commodity:updated':          'commodityUpdated',
  'commodity:deleted':          'commodityDeleted',
  'columnnumber:updated':       'customColumnUpdated',
  'custom_column:updated':      'customColumnUpdated',
  'columnnumber:deleted':       'customColumnDeleted',
  'custom_column:deleted':      'customColumnDeleted',
};

export default defineComponent({
  name: 'ActivityLogBubble',

  props: {
    activity: {
      type: Object as PropType<LogActivity>,
      required: true,
    },
    /** Entity context: supplier or parent, used to pick the right translation branch. */
    entityLevel: {
      type: String as PropType<'supplier' | 'parent'>,
      default: 'supplier',
    },
  },

  setup(props) {
    const { t } = useI18n({ useScope: 'global' });
    const contentExpanded = ref(false);
    const metadata = computed(() => props.activity.metadata ?? {});
    const oldStatusCode = computed(
      () => metadata.value.from ?? metadata.value.oldStatus
    );
    const newStatusCode = computed(
      () => metadata.value.to ?? metadata.value.newStatus
    );
    const hasStatusFromTo = computed(
      () =>
        (oldStatusCode.value != null && oldStatusCode.value !== '') ||
        (newStatusCode.value != null && newStatusCode.value !== '')
    );
    const statusChangeAffectedLabel = computed(() => {
      if (!isStatusChange.value) return '';
      const scope = getScopeKey(metadata.value.scope);
      if (scope !== 'partial') return '';

      if (props.entityLevel === 'parent') {
        const affected = formatAffected(metadata.value.affected_suppliers);
        return affected ? `Affected: ${affected}.` : '';
      }

      const affected = formatAffected(metadata.value.affected_spends);
      return affected ? `Affected: ${affected}.` : '';
    });

    const displayName = computed(() => {
      const u = props.activity.user ?? metadata.value.actionBy;
      if (!u) return t('home.entityCard.activityLog.system');
      return typeof u === 'object' && 'fullName' in u && u.fullName
        ? String(u.fullName).trim()
        : '';
    });

    const displayTime = computed(() =>
      formatActivityRelativeDate(props.activity.created)
    );

    const isStatusChange = computed(
      () => props.activity.sourceType === 'status_change'
    );

    const actionLabel = computed(() => {
      const a = (props.activity.action ?? '').toLowerCase();
      const st = (props.activity.sourceType ?? '').toLowerCase();
      if (st === 'status_change') return t('home.entityCard.activityLog.changedStatus');
      const labelKey = ACTION_LABEL_KEYS[`${st}:${a}`];
      if (labelKey) return t(`home.entityCard.activityLog.${labelKey}`);
      return metadata.value.summary ?? t('home.entityCard.activityLog.updated');
    });

    function renderStatusWithDotHtml(code: string | undefined): string {
      if (!code) return '';
      const color = getStatusColor(code);
      const label = getStatusLabel(code) || code;
      const safeColor = escapeHtml(color);
      const safeLabel = escapeHtml(label);
      return `<span class="activity-inline-status-dot" style="background-color: ${safeColor};"></span> ${safeLabel}`;
    }

    /** Resolves message from translations (entity + sourceType + action + scope); returns message, optional HTML, and whether it came from our keys. */
    const activityDisplay = computed(() => {
      if (isStatusChange.value && hasStatusFromTo.value) {
        return { message: '', messageHtml: '', useFullMessage: false };
      }

      const m = metadata.value;

      // 1) Summary from backend has highest priority
      if (m.summary) {
        return { message: m.summary, messageHtml: escapeHtml(m.summary), useFullMessage: true };
      }

      // 2) Resolve structured message from translations: entity from context (prop), scope from metadata
      const typeKey = getSourceTypeKey(props.activity.sourceType);
      let actionKey = getActionKey(props.activity.action);

      if (typeKey && actionKey) {
        // Backward-compatible guard:
        // some target clear events may arrive as "updated" without newValue/to.
        // In that case, render as deleted to avoid "set to " empty messages.
        if (
          typeKey === 'targetChange' &&
          actionKey === 'updated' &&
          (m.newValue == null || String(m.newValue).trim() === '') &&
          (m.to == null || String(m.to).trim() === '')
        ) {
          actionKey = 'deleted';
        }

        // Backward-compatible guard:
        // backend may store plan/phase actions as created/updated/deleted; our i18n keys use added/updated/removed.
        if (typeKey === 'planPhaseChange') {
          if (actionKey === 'created') actionKey = 'added';
          if (actionKey === 'deleted') actionKey = 'removed';
          if (actionKey === 'changed') actionKey = 'updated';
        }

        const entityKey = props.entityLevel; // supplier | parent from context (card we're viewing)
        const scopeKey = getScopeKey(m.scope); // TOTAL/PARTIAL from metadata; default total

        // Activity messages live under adminBackend.dataChange.activities.messages
        const baseKey = `adminBackend.dataChange.activities.messages.${entityKey}.${typeKey}.${actionKey}.${scopeKey}`;

        const params: Record<string, unknown> = {
          oldStatus: m.oldStatus ?? m.from ?? '',
          newStatus: m.newStatus ?? m.to ?? m.newValue ?? '',
          currentStatus: m.to ?? m.newStatus ?? m.newValue ?? '',
          newTarget: m.newValue ?? m.to ?? '',
          phaseName: m.field ?? m.newValue ?? '',
          affected_spends: formatAffected(m.affected_spends),
          affected_suppliers: formatAffected(m.affected_suppliers),
        };

        if (typeKey === 'statusChange') {
          const oldCode = (m.oldStatus ?? m.from) as string | undefined;
          const newCode = (m.newStatus ?? m.to ?? m.newValue) as string | undefined;
          const currentCode = (m.to ?? m.newStatus ?? m.newValue) as string | undefined;
          params.oldStatus = renderStatusWithDotHtml(oldCode);
          params.newStatus = renderStatusWithDotHtml(newCode);
          params.currentStatus = renderStatusWithDotHtml(currentCode);
        }

        if (typeKey === 'manageTeam' || typeKey === 'commodity' || typeKey === 'customColumn') {
          params.newValue = m.newValue ?? '';
        }

        if (typeKey === 'agreedTermChange') {
          const termsDays = m.termsWithoutCashDiscount ?? m.newValue ?? '';
          const agreedDate = formatISODateToUS(m.agreedDateOfChange) || '';
          const nextReview = formatISODateToUS(m.nextReviewDate) || '';
          const hasCashDiscount = m.termsWithCashDiscount != null && m.cashDiscount != null;
          const optionalCashDiscountLine = hasCashDiscount
            ? ` With cash discount: <strong>${escapeHtml(String(m.termsWithCashDiscount))}</strong> days (<strong>${escapeHtml(String(m.cashDiscount))}%</strong> discount).`
            : '';
          params.termsWithoutCashDiscount = termsDays;
          params.agreedDateOfChange = agreedDate;
          params.nextReviewDate = nextReview;
          params.optionalCashDiscountLine = optionalCashDiscountLine;
        }

        if (typeKey === 'spendVolumeForecastChange') {
          const totals = m.forecastScopeTotals ?? {};
          const originalVolume = Number(totals.volumeSum ?? 0);
          const forecastVolume = Number(totals.forecastVolumeAfterSum ?? 0);
          const diffAbs = forecastVolume - originalVolume;
          const impactPct = originalVolume !== 0 ? (diffAbs / originalVolume) * 100 : 0;

          params.volumeSum = formatNumeric(originalVolume);
          params.forecastVolumeAfterSum = formatNumeric(forecastVolume);
          params.forecastVsVolumeDiff = formatNumeric(diffAbs);
          params.forecastVsVolumeImpactPct = formatSignedPercent(impactPct);
        }

        const translated = t(baseKey, params) as string;
        if (translated && translated !== baseKey) {
          return { message: translated, messageHtml: translated, useFullMessage: true };
        }
      }

      // 3) Legacy fallbacks: newValue or compact affected lists
      if (m.newValue) {
        return { message: m.newValue, messageHtml: escapeHtml(m.newValue), useFullMessage: false };
      }

      const parts: string[] = [];
      const affectedSpendsStr = formatAffected(m.affected_spends);
      if (affectedSpendsStr) parts.push(affectedSpendsStr);
      const affectedSuppliersStr = formatAffected(m.affected_suppliers);
      if (affectedSuppliersStr) parts.push(affectedSuppliersStr);

      const message = parts.length ? parts.join('; ') : '';
      return {
        message,
        messageHtml: message ? escapeHtml(message) : '',
        useFullMessage: false,
      };
    });

    const displayMessage = computed(() => activityDisplay.value.message);
    const displayMessageHtml = computed(() => activityDisplay.value.messageHtml);
    const showFullTranslatedMessage = computed(() => activityDisplay.value.useFullMessage);

    const showActionLabelWithMessage = computed(() => {
      const st = (props.activity.sourceType ?? '').toLowerCase();
      return st === 'manageteam' || st === 'manage_team' || st === 'commodity' || st === 'columnnumber' || st === 'custom_column';
    });

    function getStatusLabel(code: string | undefined): string {
      if (!code) return '';
      return t(`global.negotiationStatusStatuses.${code}`) || code;
    }

    return {
      metadata,
      contentExpanded,
      oldStatusCode,
      newStatusCode,
      hasStatusFromTo,
      statusChangeAffectedLabel,
      displayName,
      displayTime,
      isStatusChange,
      actionLabel,
      displayMessage,
      displayMessageHtml,
      showFullTranslatedMessage,
      showActionLabelWithMessage,
      getStatusColor,
      getStatusLabel,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/_colors";

.activity-log-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 20px;
  font-size: 13px;
  line-height: 1.5;
  color: $color-gray-600;

  &:hover {
    background-color: $color-gray-50;
  }
}

.activity-bullet {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  margin-top: 6px;
  background-color: $color-gray-400;
  border-radius: 50%;
}

.activity-inline-content {
  flex: 1;
  min-width: 0;
  cursor: pointer;

  &--collapsed {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.activity-user {
  font-weight: 600;
  color: $color-gray-900;
}

.activity-action {
  color: $color-gray-700;
}

.activity-separator {
  color: $color-gray-500;
  white-space: pre;
}

.activity-message {
  :deep(strong) {
    font-weight: 700;
    color: $color-gray-900;
  }
}

:deep(.activity-inline-status-dot) {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-left: 3px;
}

.activity-time {
  flex-shrink: 0;
  font-size: 12px;
  color: $color-gray-400;
  white-space: nowrap;
}

.status-pill {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin: 0 4px;
  vertical-align: middle;
}
</style>
