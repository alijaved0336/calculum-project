import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

// Module-level state shared across ALL service clients — prevents concurrent refresh races
// when multiple services receive a 401 simultaneously.
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

export function createClient(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  })

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const store = useAuthStore()
    if (store.accessToken) {
      config.headers.Authorization = `Bearer ${store.accessToken}`
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  })

  instance.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      if (error.response?.status !== 401 || original._retry) {
        return Promise.reject(error)
      }

      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(instance(original))
          })
        })
      }

      isRefreshing = true
      const store = useAuthStore()

      try {
        const newToken = await store.refresh()
        refreshQueue.forEach((cb) => cb(newToken))
        refreshQueue = []
        original.headers.Authorization = `Bearer ${newToken}`
        return instance(original)
      } catch {
        store.logout()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    },
  )

  return instance
}
