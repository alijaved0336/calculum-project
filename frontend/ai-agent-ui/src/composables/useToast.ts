import { reactive } from 'vue'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning'
}

const toasts = reactive<Toast[]>([])
let nextId = 0

export function useToast() {
  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success', duration = 3000) {
    const id = ++nextId
    toasts.push({ id, message, type })
    setTimeout(() => {
      const index = toasts.findIndex((t) => t.id === id)
      if (index !== -1) toasts.splice(index, 1)
    }, duration)
  }

  return { toasts, showToast }
}
