// types/posthog.d.ts
import '@vue/runtime-core'

declare module 'posthog-js' {
  interface CustomEventProperties {
    component?: string
    action: string
    metadata?: Record<string, unknown>
  }
}