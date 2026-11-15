/**
 * Shared mounting for the Setup sections (AB#20702): every section injects the Setup lock and the
 * unsaved-changes registry that `SetupView` provides, so specs mount them under a small host that
 * provides both, with the real en messages.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref, type Component } from 'vue'
import { createI18n } from 'vue-i18n'
import { messages } from '@ada/design-system/locales/index'
import { provideSetupLock, type SetupLock } from '@/modules/setup/composables/useSetupLock'
import { provideSetupSections, type SetupSections } from '@/modules/setup/composables/useSetupSections'

export const i18n = () => createI18n({ messages, locale: 'en', fallbackLocale: 'en', legacy: false, warnHtmlMessage: false })

export interface SetupHost {
  wrapper: VueWrapper
  lock: SetupLock
  sections: SetupSections
}

export function mountInSetup(section: Component, versionId: number | null = 73, props: Record<string, unknown> = {}): SetupHost {
  const handles = {} as { lock: SetupLock; sections: SetupSections }
  const Host = defineComponent({
    setup() {
      handles.lock = provideSetupLock(ref(versionId))
      handles.sections = provideSetupSections()
      return () => h(section, props)
    },
  })
  const wrapper = mount(Host, { attachTo: document.body, global: { plugins: [i18n()] } })
  return { wrapper, ...handles }
}
