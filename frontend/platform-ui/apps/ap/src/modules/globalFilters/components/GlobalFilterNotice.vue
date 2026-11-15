<template>
<div v-if="isVisible" class="global-filter-notice" :class="`global-filter-notice--${variant}`">
  <span class="notice-icon">ⓘ</span>
  <span class="notice-text">
    {{ message }}
    <span v-if="showFilterLabels && filterChips.length > 0" class="notice-filter-pills">
      <!-- Same applied-filter pills as the filters bar (MainLayoutFilters), each removable on its own. -->
      <span
        v-for="chip in filterChips"
        :key="chip.field"
        class="d-flex align-items-center justify-content-center gap-1 filter-applied-badge"
        data-testid="global-filter-notice-pill"
      >
        <span class="d-flex align-items-center mr-1 text-nowrap text-sm notice-pill-label">
          <span
            :class="getClassesByLevel(chip.level)"
            class="d-flex align-items-center justify-content-center mr-1 w-4 h-4 rounded-lg"
          >
            <span class="mx-auto text-xxxs font-semibold">{{ filtersAppliedGetFormattedLevel(chip.level) }}</span>
          </span>
          <span class="mr-1 text-capitalize">{{ getFieldName(chip.fieldLabel) }}</span>
          <span class="text-capitalize font-medium">{{ chip.valueLabel }}</span>
        </span>

        <svg
          class="fill-current notice-pill-remove"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill=""
          data-testid="global-filter-notice-pill-remove"
          @click="removeFilterField(chip.field)"
        >
          <path
            d="M1 8C1 4.13437 4.13437 1 8 1C11.8656 1 15 4.13437 15 8C15 11.8656 11.8656 15 8 15C4.13437 15 1 11.8656 1 8ZM10.5844 12L12 10.5844L9.41562 8L12 5.41563L10.5844 4L8 6.58437L5.41563 4L4 5.41563L6.58437 8L4 10.5844L5.41563 12L8 9.41562L10.5844 12Z"
            fill=""
          />
        </svg>
      </span>
    </span>
  </span>
  <button v-if="showRemove" class="notice-remove-btn" type="button" data-testid="global-filter-notice-remove" @click="$emit('remove')">{{ $t('globalFilters.notice.removeFilter') }}</button>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import type { Field } from '@/types'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import {
  filtersAppliedGetFormattedLevel,
  getActiveGlobalFilterChips,
  getClassesByLevel,
  getFieldName,
  hasActiveGlobalFilter,
} from '@/utils/globalFiltersUtils'
// Direct import, not the `@/utils` barrel: the barrel reaches the routing tree and
// cycles back into itself, which leaves the util namespaces undefined while a view
// module evaluates (and breaks this component's tests at collection time).
import StringUtils from '@/utils/StringUtils'

/**
 * Inline notice shown only while a global filter is active (US-17561).
 *
 * Renders nothing when no filter is applied, which is what makes AC-09 hold for
 * every consumer at once instead of each panel re-checking the store.
 *
 * Consumers supply the message so the wording stays specific to the panel:
 * the bot panels explain their advice uses the complete unfiltered dataset,
 * the entity card identifies the active filter, and the corporate tree explains
 * that non-matching suppliers are disabled.
 */
export default defineComponent({
  name: 'GlobalFilterNotice',
  props: {
    /** Notice copy, already translated by the consumer. */
    message: { type: String, required: true },
    /** Shows the active filters as removable pills, like the filters bar. */
    showFilterLabels: { type: Boolean, default: false },
    /** Shows the "Remove filter" action; the consumer decides what clearing means. */
    showRemove: { type: Boolean, default: false },
    /** Visual tone: `info` for context notices, `warning` for filter-scope warnings. */
    variant: { type: String, default: 'info' },
  },
  emits: ['remove'],
  setup() {
    const globalFiltersStore = useGlobalFiltersStore()

    const isVisible = computed(() =>
      hasActiveGlobalFilter(globalFiltersStore.getFiltersApplied),
    )

    // Field titles follow the filters-applied badges (MainLayoutFilters), which
    // fall back to the camelCase-to-readable form of the raw field name.
    const filterChips = computed(() =>
      getActiveGlobalFilterChips(globalFiltersStore.getFiltersApplied, (field) =>
        StringUtils.transformFromCamelCaseToReadable(field),
      ),
    )

    // ponytail: the store write is the same one useGlobalFilters().globalFiltersAppliedRemoveFiltersFieldGroup
    // does, inlined so this notice does not pull that composable's whole dependency
    // tree (user, program, company, home store) into every panel that shows it.
    // The consumers already watch filtersApplied, so the reload happens through
    // the same path as a removal from the filters bar.
    function removeFilterField(field: Field): void {
      const applied = globalFiltersStore.getFiltersApplied

      globalFiltersStore.setFiltersApplied({
        filters: applied.filters.filter((group) => group.field !== field),
        logic: applied.logic,
      })
    }

    return {
      filterChips,
      filtersAppliedGetFormattedLevel,
      getClassesByLevel,
      getFieldName,
      isVisible,
      removeFilterField,
    }
  },
})
</script>

<style lang="scss" scoped>
.global-filter-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;

  &--info {
    background-color: #eef4fb;
    border: 1px solid #c5d9ef;
    color: #23486d;
  }

  &--warning {
    background-color: #fff8e1;
    border: 1px solid #f5c842;
    color: #6b5200;
  }

  .notice-icon {
    flex-shrink: 0;
    font-size: 14px;
  }

  .notice-text {
    flex: 1;
  }

  // Pills wrap under the copy instead of scrolling: unlike the filters bar this
  // notice has no fixed width to fight for.
  .notice-filter-pills {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    vertical-align: middle;
  }

  // The bar makes the whole badge clickable (it reopens the panel); here only the
  // remove icon does something.
  .notice-pill-label {
    cursor: default;
  }

  .notice-pill-remove {
    cursor: pointer;
  }

  .notice-remove-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    color: #0066cc;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    font-size: inherit;

    &:hover {
      color: #004499;
    }
  }
}
</style>
