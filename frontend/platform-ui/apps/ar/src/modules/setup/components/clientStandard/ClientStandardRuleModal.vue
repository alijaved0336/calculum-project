<template>
<CustomDialog :visible="true" :title="t('arSetup.clientStandard.rule.title')" :width="420" stacked-actions data-test="cs-rule-modal" @close="$emit('close')">
  <div class="rule">
    <CustomSelect
      :model-value="option?.label ?? null"
      :data-items="fieldLabels"
      :label="t('arSetup.clientStandard.rule.field')"
      :default-item="t('arSetup.clientStandard.rule.field')"
      data-test="rule-field"
      @update:model-value="onFieldLabel"
    />

    <CustomTabs
      v-if="option?.levels?.length"
      :items="levelTabs"
      :model-value="level_ ?? ''"
      appearance="segmented"
      data-test="rule-level"
      @update:model-value="level_ = $event as RuleLevel"
    />

    <template v-if="option?.type === 'list'">
      <TextInput v-model="search" :placeholder="t('arSetup.common.search')" data-test="rule-search" />
      <ul class="rule__values" data-test="rule-values">
        <li v-for="value in visibleValues" :key="value.key" class="rule__value">
          <span>{{ value.value }}</span>
          <CheckBox :model-value="multi.includes(value.key)" :aria-label="value.value" @update:model-value="toggleValue(value.key, $event)" />
        </li>
      </ul>
    </template>

    <CustomSelect
      v-else-if="option?.type === 'bool'"
      :model-value="boolLabel"
      :data-items="boolLabels"
      :label="t('arSetup.clientStandard.rule.value')"
      :default-item="t('arSetup.clientStandard.rule.value')"
      data-test="rule-bool"
      @update:model-value="onBoolLabel"
    />

    <template v-else-if="option">
      <CustomTabs
        v-if="option.supportsTop"
        :items="modeTabs"
        :model-value="mode"
        appearance="segmented"
        data-test="rule-mode"
        @update:model-value="mode = $event as 'condition' | 'top'"
      />

      <template v-if="mode === 'top'">
        <CustomSelect
          :model-value="topLabel"
          :data-items="topLabels"
          :label="t('arSetup.clientStandard.rule.top')"
          @update:model-value="onTopLabel"
        />
        <TextInput v-model="topValue" type="number" :placeholder="t('arSetup.clientStandard.rule.enterNumericalValues')" data-test="rule-top-value" />
      </template>

      <template v-else>
        <CustomSelect
          :model-value="operatorLabel(filterOne.operator)"
          :data-items="operatorLabels"
          :label="t('arSetup.clientStandard.rule.chooseCondition')"
          :default-item="t('arSetup.clientStandard.rule.enterCondition')"
          data-test="rule-op1"
          @update:model-value="filterOne.operator = operatorFromLabel($event)"
        />
        <TextInput
          v-if="needsValue(filterOne)"
          v-model="filterOne.value"
          :type="option.type === 'number' ? 'number' : 'text'"
          :label="valueLabel"
          :placeholder="valuePlaceholder"
          data-test="rule-value1"
        />
        <CustomSelect
          :model-value="conditionLabel"
          :data-items="conditionLabels"
          :label="t('arSetup.clientStandard.rule.chooseCondition')"
          data-test="rule-logic"
          @update:model-value="onConditionLabel"
        />
        <CustomSelect
          :model-value="operatorLabel(filterTwo.operator)"
          :data-items="operatorLabels"
          :label="t('arSetup.clientStandard.rule.chooseCondition')"
          :default-item="t('arSetup.clientStandard.rule.enterCondition')"
          data-test="rule-op2"
          @update:model-value="filterTwo.operator = operatorFromLabel($event)"
        />
        <TextInput
          v-if="needsValue(filterTwo)"
          v-model="filterTwo.value"
          :type="option.type === 'number' ? 'number' : 'text'"
          :label="valueLabel"
          :placeholder="valuePlaceholder"
          data-test="rule-value2"
        />
      </template>
    </template>

    <div v-if="error" class="rule__error" data-test="rule-error">{{ t(error) }}</div>
  </div>
  <template #actions>
    <CustomButton :text="rule ? t('arSetup.clientStandard.rule.update') : t('arSetup.common.save')" variant="accent" data-test="rule-save" @click="submit" />
    <CustomButton :text="t('arSetup.common.clear')" data-test="rule-clear" @click="clear" />
  </template>
</CustomDialog>
</template>

<script lang="ts">
import { computed, defineComponent, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckBox, CustomButton, CustomDialog, CustomSelect, CustomTabs, TextInput } from '@ada/design-system'
import type { ClientStandardRule, RuleFilter, RuleLevel, RuleOperator, RuleOption } from '../../api'
import { NO_VALUE_OPERATORS, convertRuleMoney, displayToUsd, usdToDisplay } from '../../utils/clientStandardRules'

interface EditableFilter {
  /** Null until a condition is chosen (the select shows "Enter a condition"). */
  operator: RuleOperator | null
  value: string | number | null
}

/**
 * AB#20760: "Condition Settings" as the client's redesign draws it - Choose Field, the level tabs
 * (Sale Lines / Buyers / Parents) for leveled fields, then either a searchable checklist (list
 * fields) or two Choose Condition + value blocks joined by AND/OR, always shown as in Figma (the second
 * one counts only once its condition is chosen), or Yes/No for a bool field (SME: one `eq` filter,
 * #20759); Sales Volume adds a Top Rank tab (Top N / Top %,
 * #20760). Save and Clear stacked below. Money values are edited in the
 * selected currency and emitted in USD (AC-06); Top values are never converted.
 */
export default defineComponent({
  name: 'ClientStandardRuleModal',
  components: { CheckBox, CustomButton, CustomDialog, CustomSelect, CustomTabs, TextInput },
  props: {
    options: { type: Array as PropType<RuleOption[]>, required: true },
    /** The rule to edit (stored, USD), or null for a new one. */
    rule: { type: Object as PropType<ClientStandardRule | null>, default: null },
    rate: { type: Number, required: true },
    currencyCode: { type: String, required: true },
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const { t } = useI18n({ useScope: 'global' })
    const findOption = (fieldKey: string) => props.options.find((candidate) => candidate.field === fieldKey)

    const initial = props.rule ? convertRuleMoney(props.rule, findOption(props.rule.field), (usd) => usdToDisplay(usd, props.rate)) : null
    const field = ref(initial?.field ?? '')
    const level_ = ref<RuleLevel | undefined>(initial?.level)
    const multi = ref<string[]>(initial?.multi ? [...initial.multi] : [])
    const search = ref('')
    const mode = ref<'condition' | 'top'>(initial?.top ? 'top' : 'condition')
    const topType = ref<'topN' | 'topP'>(initial?.top?.type ?? 'topN')
    const topValue = ref<string | number>(initial?.top?.value ?? '')
    const filterOne = ref<EditableFilter>({ operator: initial?.filterOne?.operator ?? null, value: initial?.filterOne?.value ?? null })
    const condition = ref<'and' | 'or'>(initial?.condition ?? 'and')
    const filterTwo = ref<EditableFilter>({ operator: initial?.filterTwo?.operator ?? null, value: initial?.filterTwo?.value ?? null })
    const boolValue = ref<string | null>(initial?.filterOne?.value === undefined || initial.filterOne.value === null ? null : String(initial.filterOne.value))
    const error = ref<string | null>(null)

    const option = computed(() => findOption(field.value))
    const fieldLabels = computed(() => props.options.map((candidate) => candidate.label))
    const levelTabs = computed(() =>
      (option.value?.levels ?? []).map((level) => ({ id: level, label: t(`arSetup.clientStandard.rule.levelTabs.${level}`) })))
    const modeTabs = computed(() => [
      { id: 'condition', label: t('arSetup.clientStandard.rule.modes.condition') },
      { id: 'top', label: t('arSetup.clientStandard.rule.modes.top') },
    ])
    const visibleValues = computed(() => {
      const query = search.value.trim().toLowerCase()
      const values = option.value?.values ?? []
      return query ? values.filter((value) => value.value.toLowerCase().includes(query)) : values
    })

    const operatorText = (operator: RuleOperator) => t(`arSetup.clientStandard.rule.operators.${operator}`)
    const operatorLabel = (operator: RuleOperator | null) => (operator ? operatorText(operator) : null)
    const operatorLabels = computed(() => (option.value?.operators ?? []).map(operatorText))
    const operatorFromLabel = (label: string) =>
      (option.value?.operators ?? []).find((operator) => operatorText(operator) === label) ?? null
    const needsValue = (filter: EditableFilter) => filter.operator !== null && !NO_VALUE_OPERATORS.has(filter.operator)

    const conditionLabels = computed(() => [t('arSetup.clientStandard.rule.and'), t('arSetup.clientStandard.rule.or')])
    const conditionLabel = computed(() => t(`arSetup.clientStandard.rule.${condition.value}`))
    function onConditionLabel(label: string): void {
      condition.value = conditionLabels.value.indexOf(label) === 1 ? 'or' : 'and'
    }

    const topLabels = computed(() => [t('arSetup.clientStandard.rule.topN'), t('arSetup.clientStandard.rule.topP')])
    const topLabel = computed(() => t(`arSetup.clientStandard.rule.${topType.value}`))
    function onTopLabel(label: string): void {
      topType.value = topLabels.value.indexOf(label) === 1 ? 'topP' : 'topN'
    }

    const boolLabels = computed(() => (option.value?.values ?? []).map((value) => value.value))
    const boolLabel = computed(() => option.value?.values?.find((value) => value.key === boolValue.value)?.value ?? null)
    function onBoolLabel(label: string): void {
      boolValue.value = option.value?.values?.find((value) => value.value === label)?.key ?? null
    }

    const valueLabel = computed(() => {
      if (option.value?.type !== 'number') return t('arSetup.clientStandard.rule.textValue')
      const label = t('arSetup.clientStandard.rule.numericalValues')
      return option.value.isMoney ? `${label} (${props.currencyCode})` : label
    })
    const valuePlaceholder = computed(() => option.value?.type === 'number'
      ? t('arSetup.clientStandard.rule.enterNumericalValues')
      : t('arSetup.clientStandard.rule.enterText'))

    function resetFor(next: RuleOption | undefined): void {
      level_.value = next?.levels?.[0]
      multi.value = []
      search.value = ''
      mode.value = 'condition'
      topValue.value = ''
      filterOne.value = { operator: null, value: null }
      condition.value = 'and'
      filterTwo.value = { operator: null, value: null }
      boolValue.value = null
      error.value = null
    }

    function onFieldLabel(label: string): void {
      field.value = props.options.find((candidate) => candidate.label === label)?.field ?? ''
      resetFor(option.value)
    }

    function toggleValue(key: string, checked: boolean): void {
      multi.value = checked ? [...multi.value, key] : multi.value.filter((value) => value !== key)
    }

    function clear(): void {
      resetFor(option.value)
    }

    const hasValue = (filter: EditableFilter) =>
      filter.operator !== null && (!needsValue(filter) || (filter.value !== null && filter.value !== ''))
    /** The second block is optional: it counts once a condition or a value is entered in it. */
    const usesSecond = () => filterTwo.value.operator !== null || (filterTwo.value.value !== null && filterTwo.value.value !== '')

    function toFilter(filter: EditableFilter): RuleFilter {
      const operator = filter.operator as RuleOperator
      if (NO_VALUE_OPERATORS.has(operator)) return { operator }
      return { operator, value: option.value?.type === 'number' ? Number(filter.value) : filter.value }
    }

    function topError(value: number): string | null {
      if (topType.value === 'topN' && !(Number.isInteger(value) && value >= 1)) return 'arSetup.clientStandard.rule.topNRange'
      if (topType.value === 'topP' && !(value > 0 && value <= 100)) return 'arSetup.clientStandard.rule.topPRange'
      return null
    }

    function submit(): void {
      const current = option.value
      error.value = null
      if (!current) {
        error.value = 'arSetup.clientStandard.rule.required'
        return
      }
      const result: ClientStandardRule = { field: current.field }
      if (level_.value) result.level = level_.value

      if (current.type === 'list') {
        if (multi.value.length === 0) {
          error.value = 'arSetup.clientStandard.rule.required'
          return
        }
        result.multi = [...multi.value]
        emit('save', result)
        return
      }

      if (current.type === 'bool') {
        if (boolValue.value === null) {
          error.value = 'arSetup.clientStandard.rule.required'
          return
        }
        result.filterOne = { operator: 'eq', value: boolValue.value }
        emit('save', result)
        return
      }

      if (mode.value === 'top') {
        const value = Number(topValue.value)
        error.value = topError(value)
        if (error.value) return
        result.top = { type: topType.value, value }
        if (initial?.top?.order) result.top.order = initial.top.order
        emit('save', result)
        return
      }

      if (!hasValue(filterOne.value) || (usesSecond() && !hasValue(filterTwo.value))) {
        error.value = 'arSetup.clientStandard.rule.required'
        return
      }
      result.filterOne = toFilter(filterOne.value)
      if (usesSecond()) {
        result.condition = condition.value
        result.filterTwo = toFilter(filterTwo.value)
      }
      emit('save', convertRuleMoney(result, current, (shown) => displayToUsd(shown, props.rate)))
    }

    return {
      t, needsValue, level_, multi, search, mode, topValue, filterOne, condition, filterTwo, error, option,
      fieldLabels, levelTabs, modeTabs, visibleValues, operatorLabel, operatorLabels, operatorFromLabel,
      conditionLabels, conditionLabel, onConditionLabel, boolLabels, boolLabel, onBoolLabel, topLabels, topLabel, onTopLabel, valueLabel,
      valuePlaceholder, onFieldLabel, toggleValue, clear, submit,
    }
  },
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.rule {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rule__values {
  display: flex;
  flex-direction: column;
  max-height: 14rem;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.rule__value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.25rem;
  font-weight: 500;
  color: $color-gray-700;
}

.rule__error {
  font-size: 0.75rem;
  color: $color-error-600;
}
</style>
