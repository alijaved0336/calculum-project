<template>
  <td class="company-ui-group-name-cell">
    <template v-if="items.length === 0">
      <span class="company-ui-group-name-cell__empty">-</span>
    </template>
    <div v-else class="company-ui-group-name-cell__badges d-flex flex-wrap gap-2 align-items-center">
      <span
        v-for="(label, index) in items"
        :key="index"
        class="tags-card tags-card-number country-text include-mix-blend"
      >
        {{ label }}
      </span>
    </div>
  </td>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { getNestedValue } from '@progress/kendo-vue-grid'

function parseCommaSeparated(value: unknown): string[] {
  if (value == null) return []
  const str = typeof value === 'string' ? value : String(value)
  const trimmed = str.trim()
  if (trimmed === '') return []
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

export default defineComponent({
  name: 'CompanyUiGroupNameColumn',
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
  },
  setup(props) {
    const items = computed(() => {
      const value = getNestedValue(props.field, props.dataItem)
      return parseCommaSeparated(value)
    })

    return {
      items,
    }
  },
})
</script>

<style scoped>
.company-ui-group-name-cell {
  vertical-align: middle;
}

.company-ui-group-name-cell__empty {
  color: var(--kendo-color-subtle, #6c757d);
}

.company-ui-group-name-cell__badges {
  padding: 0.25rem 0;
  min-height: 2rem;
}

.company-ui-group-name-cell__badge {
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 400;
  border: 1px solid #64b5f6;
  display: inline-block;
  color: #1565c0;
  background-color: #e3f2fd;
}
</style>
