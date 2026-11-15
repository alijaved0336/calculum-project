import { router } from '@/router'

export const route = (name: string, params?: any) => {
  if (params) {
    router.push({ name, params })
    return
  }
  router.push({ name })
}
