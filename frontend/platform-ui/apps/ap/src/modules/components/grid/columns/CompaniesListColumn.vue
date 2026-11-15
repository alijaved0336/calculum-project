<template>
  <td class="companies-list-cell">
    <template v-if="displayValue != null && displayValue !== ''">
      <span class="companies-list-cell__text text-secondary">
        {{ visibleText }}
      </span>
      <span class="companies-list-cell__actions d-inline-flex align-items-center gap-1">
        <button
          v-if="remainingCount > 0"
          type="button"
          class="companies-list-cell__more-btn"
          :title="remainingTooltipText"
          @click="onShowMore"
        >
          +{{ remainingCount }} more
        </button>
        <span v-else class="companies-list-cell__spacer" />        
      </span>
    </template>
    <span v-else class="companies-list-cell__empty"> {{ $t('global.noCompanies') }}  </span>
    <span
      class="companies-list-cell__edit-icon cursor-pointer"
      :title="$t('global.edit')"
      @click="onEdit"
    >
      <i class="fa-solid fa-pencil text-sm" aria-hidden="true" />
    </span>
  </td>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { getNestedValue } from '@progress/kendo-vue-grid'
import { translate } from '@/utils/translation'

const DEFAULT_VISIBLE = 2

// Role conversion is only used in buildListFromRolesByCompany (filter + translateRole).
// What is rendered is visibleText = first N lines of the already-formatted list.

// Do not show this role. Backend may send "ROLE_USER" (→ role_user) or "rol_user"
const HIDDEN_ROLE_NORMALIZED = new Set(['rol_user', 'role_user','role_company_admin','role_partner'])

function shouldHideRole(role: string): boolean {
  return HIDDEN_ROLE_NORMALIZED.has(String(role).trim().toLowerCase())
}

function translateRole(role: string): string {
  const r = String(role).trim()
  if (r === 'ROLE_COMPANY_ADMIN') return translate.t('global.users.adminUser')
  if (r === 'ROLE_PARTNER') return translate.t('global.users.partner')
  return r
}

/** Returns list of "CompanyName (role1, role2)" without ROLE_USER */
function buildListFromRolesByCompany(rolesByCompany: Record<string, { roles?: string[]; companyName?: string }> | null | undefined): string[] {
  if (!rolesByCompany || typeof rolesByCompany !== 'object') return []
  return Object.values(rolesByCompany)
    .map((entry) => {
      const name = String(entry?.companyName ?? '').trim()
      const roles = (entry?.roles ?? [])
        .filter((r) => !shouldHideRole(r))
        .map(translateRole)
      return roles.length === 0 ? name : `${name} (${roles.join(', ')})`
    })
    .filter((line) => line !== '')
}

/** Converts field value to array of strings for display (fallback when rolesByCompany not used) */
function toDisplayList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item
      if (item != null && typeof item === 'object') {
        const o = item as Record<string, unknown>
        return String(o.companyName ?? o.name ?? item)
      }
      return String(item)
    })
  }
  if (value != null && value !== '') return [String(value)]
  return []
}

export default defineComponent({
  name: 'CompaniesListColumn',
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
    initialVisible: { type: Number, default: DEFAULT_VISIBLE }
  },
  emits: ['edit-user-company', 'show-more-user-company'],
  setup(props, { emit }) {
    const displayValue = computed(() => getNestedValue(props.field, props.dataItem))

    // Step 1: build the list of lines ready to display.
    // Each line = "CompanyName (role1, role2)". Roles are filtered (no ROLE_USER) and translated here.
    const list = computed(() => {
      const rolesByCompany = (props.dataItem as Record<string, unknown>)?.rolesByCompany
      const fromRoles = buildListFromRolesByCompany(rolesByCompany as Record<string, { roles?: string[]; companyName?: string }> | undefined)
      if (fromRoles.length > 0) return fromRoles
      return toDisplayList(displayValue.value)
    })

    // Step 2: what is rendered in the cell = first N lines of that list, joined by ", "
    const visibleText = computed(() => {
      const n = props.initialVisible
      return list.value.slice(0, n).join(', ')
    })

    // Rest of the list: how many remain and the "+N more" button tooltip
    const remainingCount = computed(() =>
      Math.max(0, list.value.length - props.initialVisible)
    )

    const remainingTooltipText = computed(() =>
      list.value.slice(props.initialVisible).join('\n')
    )

    function onEdit() {
      emit('edit-user-company', props.dataItem)
    }

    function onShowMore() {
      emit('show-more-user-company', props.dataItem)
    }

    return {
      displayValue,
      visibleText,
      remainingCount,
      remainingTooltipText,
      onEdit,
      onShowMore
    }
  }
})
</script>

<style lang="scss" scoped>



.companies-list-cell {
  vertical-align: middle;
  padding: 8px 12px;

  &__text {
    font-size: 0.875rem;
    line-height: 1.4;
    color: #495057;
    word-break: break-word;
  }

  &__actions {
    min-height: 24px;
  }

  &__more-btn {
    padding: 2px 8px;
    font-size: 0.8125rem;
    color: #495057;
    background-color: #f1f3f5;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
  }

  &__more-btn:hover {
    background-color: #e9ecef;
  }

  &__spacer {
    display: inline-block;
    min-width: 4px;
  }

  &__edit-icon:hover {
    color: #212529;
  }

  &__edit-icon {
    color: #495057;
    font-size: 0.875rem;
    padding: 2px 4px;
  }

  &__empty {
    color: #6c757d;
  }
}
</style>
