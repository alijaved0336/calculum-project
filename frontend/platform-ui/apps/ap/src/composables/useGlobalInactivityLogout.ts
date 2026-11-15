// useGlobalInactivityLogout.ts - OPTIMIZADO PARA PERFORMANCE

import { onMounted, onUnmounted, ref } from 'vue'
import { getFlowToLogout } from "@/utils/CookieSessionsFns"

const ACTIVITY_KEY = 'lastUserActivity'
const FORCE_LOGOUT_KEY = 'forceLogoutTimestamp'

// Configuración de performance
const THROTTLE_DELAY = 1000 // 1 segundo entre actualizaciones
const CHECK_INTERVAL = 30000 // 30 segundos en lugar de 10
const DEBOUNCE_DELAY = 500 // 500ms para debounce

export function useGlobalInactivityLogout(timeoutMs = 12 * 60 * 60 * 1000) {
  const lastUpdateTime = ref(0)
  const isUpdating = ref(false)
  const intervalId = ref<number | null>(null)
  const storageListener = ref<((event: StorageEvent) => void) | null>(null)
  const visibilityListener = ref<(() => void) | null>(null)
  const eventListeners = ref<Array<{ event: string; handler: (e: Event) => void }>>([])

  // Throttled update function para evitar actualizaciones excesivas
  const throttledUpdateActivity = () => {
    const now = Date.now()
    if (now - lastUpdateTime.value < THROTTLE_DELAY || isUpdating.value) {
      return
    }
    
    isUpdating.value = true
    lastUpdateTime.value = now
    
    try {
      localStorage.setItem(ACTIVITY_KEY, now.toString())      
    } catch (error) {      
    } finally {
      isUpdating.value = false
    }
  }

  // Debounced update para eventos de alta frecuencia
  let debounceTimer: number | null = null
  const debouncedUpdateActivity = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = window.setTimeout(() => {
      throttledUpdateActivity()
      debounceTimer = null
    }, DEBOUNCE_DELAY)
  }

  // Optimized check function con cache
  let lastCheckTime = 0
  const checkInactivity = () => {
    const now = Date.now()
    
    // Evitar checks muy frecuentes
    if (now - lastCheckTime < CHECK_INTERVAL) {
      return
    }
    
    lastCheckTime = now
    
    try {
      const lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0', 10)
      if (now - lastActivity > timeoutMs) {
        if (import.meta.env.DEV) console.log('** Inactivity detected, forcing logout...')
        localStorage.setItem(FORCE_LOGOUT_KEY, now.toString())
        getFlowToLogout()
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('** Error checking inactivity:', error)
    }
  }

  // Optimized storage change handler
  const onStorageChange = (event: StorageEvent) => {
    if (event.key === FORCE_LOGOUT_KEY) {
      if (import.meta.env.DEV) console.log('** Logout sync from other tab..')
      
      if (document.hidden) {
        // Solo agregar listener si no existe
        if (!visibilityListener.value) {
          visibilityListener.value = onVisibilityChange
          document.addEventListener("visibilitychange", visibilityListener.value)
        }
      } else {        
        window.location.reload()
      }
    }
  }

  const onVisibilityChange = () => {
    if (!document.hidden) {
      // Limpiar listener
      if (visibilityListener.value) {
        document.removeEventListener("visibilitychange", visibilityListener.value)
        visibilityListener.value = null
      }
      
      window.location.reload()
    }
  }

  // Event handlers optimizados por tipo
  const createEventHandlers = () => {
    const handlers = [
      // Eventos de alta frecuencia - usar debounce
      { event: 'mousemove', handler: debouncedUpdateActivity },
      { event: 'scroll', handler: debouncedUpdateActivity },
      
      // Eventos de baja frecuencia - usar throttle directo
      { event: 'keydown', handler: throttledUpdateActivity },
      { event: 'click', handler: throttledUpdateActivity },
      
      // Eventos adicionales de actividad
      { event: 'touchstart', handler: throttledUpdateActivity },
      { event: 'touchend', handler: throttledUpdateActivity }
    ]

    // Agregar listeners con manejo de errores
    handlers.forEach(({ event, handler }) => {
      try {
        window.addEventListener(event, handler, { passive: true }) // passive para mejor performance
        eventListeners.value.push({ event, handler })        
      } catch (error) {
        if (import.meta.env.DEV) console.error(`** Error adding ${event} listener:`, error)
      }
    })
  }

  // Cleanup optimizado
  const cleanup = () => {
    // Limpiar interval
    if (intervalId.value) {
      clearInterval(intervalId.value)
      intervalId.value = null
    }

    // Limpiar debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    // Limpiar event listeners
    eventListeners.value.forEach(({ event, handler }) => {
      try {
        window.removeEventListener(event, handler)        
      } catch (error) {
        if (import.meta.env.DEV) console.error(`** Error removing ${event} listener:`, error)
      }
    })
    eventListeners.value = []

    // Limpiar storage listener
    if (storageListener.value) {
      window.removeEventListener('storage', storageListener.value)
      storageListener.value = null
    }

    // Limpiar visibility listener
    if (visibilityListener.value) {
      document.removeEventListener("visibilitychange", visibilityListener.value)
      visibilityListener.value = null
    }
  }

  // Inicialización optimizada
  const initialize = () => {
    try {
      // Actualizar actividad inicial
      throttledUpdateActivity()
      
      // Crear event handlers optimizados
      createEventHandlers()
      
      // Agregar storage listener
      storageListener.value = onStorageChange
      window.addEventListener('storage', storageListener.value)
      
      // Configurar interval menos frecuente
      intervalId.value = window.setInterval(checkInactivity, CHECK_INTERVAL)
    } catch (error) {
      if (import.meta.env.DEV) console.error('** Error initializing inactivity logout:', error)
    }
  }

  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    cleanup()
  })

  // Exponer funciones para testing y debugging
  return {
    updateActivity: throttledUpdateActivity,
    checkInactivity,
    cleanup,
    getStats: () => ({
      lastUpdateTime: lastUpdateTime.value,
      isUpdating: isUpdating.value,
      activeListeners: eventListeners.value.length,
      intervalActive: !!intervalId.value
    })
  }
}
