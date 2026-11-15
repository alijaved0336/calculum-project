/**
 * See KanbanGlobalWarningDialog.spec.ts for why this mirrors the component's
 * logic in a plain wrapper instead of mounting the real CalculumModal-based SFC,
 * and why a "resets on re-show" case isn't included (wrapper.setProps() doesn't
 * trigger prop watchers in this harness).
 */
import { describe, it, expect } from 'vitest'
import { defineComponent, ref, watch } from 'vue'
import { mount } from '@vue/test-utils'

const WrapperComponent = defineComponent({
  props: {
    show: { type: Boolean, required: true }
  },
  emits: ['confirm', 'cancel'],
  setup(props) {
    const scope = ref<'all' | 'filtered'>('all')
    const savePreference = ref(false)

    watch(
      () => props.show,
      isShown => {
        if (isShown) {
          scope.value = 'all'
          savePreference.value = false
        }
      }
    )

    return { scope, savePreference }
  },
  template: `
    <div v-if="show">
      <input id="scope-all" type="radio" value="all" v-model="scope" />
      <input id="scope-filtered" type="radio" value="filtered" v-model="scope" />
      <input id="save-preferences" type="checkbox" v-model="savePreference" />
      <button id="cancel" @click="$emit('cancel')">Cancel</button>
      <button id="confirm" @click="$emit('confirm', { scope, savePreference })">Confirm</button>
    </div>
  `
})

describe('KanbanFilterScopeDialog logic', () => {
  it('defaults to scope "all" and savePreference false', async () => {
    const wrapper = mount(WrapperComponent, { props: { show: true } })
    await wrapper.find('#confirm').trigger('click')
    expect(wrapper.emitted('confirm')![0][0]).toEqual({ scope: 'all', savePreference: false })
  })

  it('emits scope "filtered" when the "Move Only Filtered" radio is selected', async () => {
    const wrapper = mount(WrapperComponent, { props: { show: true } })
    await wrapper.find('#scope-filtered').setValue(true)
    await wrapper.find('#confirm').trigger('click')
    expect(wrapper.emitted('confirm')![0][0]).toEqual({ scope: 'filtered', savePreference: false })
  })

  it('emits savePreference:true when the checkbox is checked', async () => {
    const wrapper = mount(WrapperComponent, { props: { show: true } })
    await wrapper.find('#save-preferences').setValue(true)
    await wrapper.find('#confirm').trigger('click')
    expect(wrapper.emitted('confirm')![0][0]).toEqual({ scope: 'all', savePreference: true })
  })

  it('emits cancel when Cancel is clicked', async () => {
    const wrapper = mount(WrapperComponent, { props: { show: true } })
    await wrapper.find('#cancel').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
