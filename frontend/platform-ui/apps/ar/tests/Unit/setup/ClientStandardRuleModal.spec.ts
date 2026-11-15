import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { MOCK_RULE_OPTIONS } from '@/modules/setup/api/clientStandardGroups.mock'
import type { ClientStandardRule } from '@/modules/setup/api'
import ClientStandardRuleModal from '@/modules/setup/components/clientStandard/ClientStandardRuleModal.vue'
import { i18n } from './setupTestHarness'

// The design-system selects/tabs are Kendo widgets; these stand-ins keep the same props/events.
const stubs = {
  CustomDialog: { props: ['visible', 'title'], template: '<div><slot /><slot name="actions" /></div>' },
  CustomSelect: {
    props: ['modelValue', 'dataItems', 'label', 'defaultItem'],
    emits: ['update:modelValue'],
    template: '<select class="select" :data-label="label" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in dataItems" :key="item" :value="item">{{ item }}</option></select>',
  },
  CustomTabs: {
    props: ['items', 'modelValue'],
    emits: ['update:modelValue'],
    template: '<div class="tabs"><button v-for="item in items" :key="item.id" type="button" :class="\'tab-\' + item.id" @click="$emit(\'update:modelValue\', item.id)">{{ item.label }}</button></div>',
  },
  TextInput: {
    props: ['modelValue', 'type', 'label', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<input class="text" :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  CheckBox: {
    props: ['modelValue', 'ariaLabel'],
    emits: ['update:modelValue'],
    template: '<input type="checkbox" class="check" :aria-label="ariaLabel" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
  CustomButton: { props: ['text'], emits: ['click'], template: '<button type="button" class="button" @click="$emit(\'click\')">{{ text }}</button>' },
}

function mountModal(rule: ClientStandardRule | null = null, rate = 0.9) {
  return mount(ClientStandardRuleModal, {
    props: { options: MOCK_RULE_OPTIONS, rule, rate, currencyCode: 'EUR' },
    global: { plugins: [i18n()], stubs },
  })
}

const saved = (wrapper: ReturnType<typeof mountModal>) => wrapper.emitted('save')?.[0]?.[0] as ClientStandardRule | undefined
const save = (wrapper: ReturnType<typeof mountModal>) => wrapper.find('[data-test="rule-save"]').trigger('click')
const chooseField = (wrapper: ReturnType<typeof mountModal>, label: string) => wrapper.find('[data-test="rule-field"]').setValue(label)

/** AB#20760: the "Condition Settings" rule builder. */
describe('ClientStandardRuleModal', () => {
  it('asks for a field and a value before saving', async () => {
    const wrapper = mountModal()
    await save(wrapper)
    expect(wrapper.find('[data-test="rule-error"]').text()).toBe('Choose a field and a value.')
    expect(saved(wrapper)).toBeUndefined()
  })

  it('saves the picked values of a list field', async () => {
    const wrapper = mountModal()
    await chooseField(wrapper, 'Buyer')
    await wrapper.find('[aria-label="Pagero Inc"]').setValue(true)
    await wrapper.find('[aria-label="Globex"]').setValue(true)
    await save(wrapper)
    expect(saved(wrapper)).toEqual({ field: 'BUYER', multi: ['101', '104'] })
  })

  it('saves SME (a bool field) as one "is equal to" filter at its level, and reopens with the answer picked (#20759)', async () => {
    const wrapper = mountModal()
    await chooseField(wrapper, 'SME')
    await save(wrapper)
    expect(saved(wrapper)).toBeUndefined()
    await wrapper.find('.tab-parent').trigger('click')
    await wrapper.find('[data-test="rule-bool"]').setValue('No')
    await save(wrapper)
    expect(saved(wrapper)).toEqual({ field: 'SME', level: 'parent', filterOne: { operator: 'eq', value: 'false' } })

    const reopened = mountModal({ field: 'SME', level: 'buyer', filterOne: { operator: 'eq', value: 'true' } })
    await save(reopened)
    expect(saved(reopened)).toEqual({ field: 'SME', level: 'buyer', filterOne: { operator: 'eq', value: 'true' } })
  })

  it('saves a money condition in USD with its level and an AND second filter (AC-06: 1,000,000 EUR at 0.9)', async () => {
    const wrapper = mountModal()
    await chooseField(wrapper, 'Sales Volume')
    await wrapper.find('.tab-buyer').trigger('click')
    const [op1] = wrapper.findAll('[data-test="rule-op1"]')
    await op1.setValue('is greater than')
    await wrapper.find('[data-test="rule-value1"]').setValue('1000000')
    await wrapper.find('[data-test="rule-logic"]').setValue('AND')
    const selects = wrapper.findAll('select.select')
    await selects[selects.length - 1].setValue('is less than')
    const texts = wrapper.findAll('input.text')
    await texts[texts.length - 1].setValue('2000000')
    await save(wrapper)
    expect(saved(wrapper)).toEqual({
      field: 'SALES_VOLUME', level: 'buyer',
      filterOne: { operator: 'gt', value: 1_111_111.11 },
      condition: 'and',
      filterTwo: { operator: 'lt', value: 2_222_222.22 },
    })
  })

  it('always shows the second condition (no None), and saves a single condition while it stays empty', async () => {
    const wrapper = mountModal()
    await chooseField(wrapper, 'Avg. Days Paid')
    expect(wrapper.find('[data-test="rule-op2"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="rule-logic"]').findAll('option').map((option) => option.text())).toEqual(['AND', 'OR'])
    await wrapper.find('[data-test="rule-op1"]').setValue('is greater than')
    await wrapper.find('[data-test="rule-value1"]').setValue('30')
    await save(wrapper)
    expect(saved(wrapper)).toEqual({ field: 'ACTUAL_PAYMENT_TERMS', level: 'saleLine', filterOne: { operator: 'gt', value: 30 } })
  })

  it('refuses a second condition chosen without its value', async () => {
    const wrapper = mountModal()
    await chooseField(wrapper, 'Avg. Days Paid')
    await wrapper.find('[data-test="rule-op1"]').setValue('is greater than')
    await wrapper.find('[data-test="rule-value1"]').setValue('30')
    await wrapper.find('[data-test="rule-op2"]').setValue('is less than')
    await save(wrapper)
    expect(wrapper.find('[data-test="rule-error"]').text()).toBe('Choose a field and a value.')
    expect(saved(wrapper)).toBeUndefined()
  })

  it('saves Top N as is (never converted), and refuses a Top % above 100', async () => {
    const wrapper = mountModal()
    await chooseField(wrapper, 'Sales Volume')
    await wrapper.find('.tab-top').trigger('click')
    await wrapper.find('[data-test="rule-top-value"]').setValue('10')
    await save(wrapper)
    expect(saved(wrapper)).toMatchObject({ field: 'SALES_VOLUME', top: { type: 'topN', value: 10 } })

    const percent = mountModal()
    await chooseField(percent, 'Sales Volume')
    await percent.find('.tab-top').trigger('click')
    await percent.findAll('select.select').find((select) => select.attributes('data-label') === 'Top rank')!.setValue('Top %')
    await percent.find('[data-test="rule-top-value"]').setValue('120')
    await save(percent)
    expect(percent.find('[data-test="rule-error"]').text()).toBe('Enter a number greater than 0 and up to 100.')
  })

  it('keeps the stored order of a Top rule reopened and saved untouched', async () => {
    const wrapper = mountModal({ field: 'SALES_VOLUME', level: 'buyer', top: { type: 'topP', value: 20, order: 'ASC' } })
    await save(wrapper)
    expect(saved(wrapper)).toEqual({ field: 'SALES_VOLUME', level: 'buyer', top: { type: 'topP', value: 20, order: 'ASC' } })
  })

  it('shows a stored USD amount in the selected currency and keeps it when saved untouched', async () => {
    const stored: ClientStandardRule = { field: 'SALES_VOLUME', level: 'buyer', filterOne: { operator: 'lt', value: 100_000 } }
    const wrapper = mountModal(stored, 0.9)
    expect((wrapper.find('[data-test="rule-value1"]').element as HTMLInputElement).value).toBe('90000')
    await save(wrapper)
    expect(saved(wrapper)?.filterOne).toEqual({ operator: 'lt', value: 100_000 })
  })
})
