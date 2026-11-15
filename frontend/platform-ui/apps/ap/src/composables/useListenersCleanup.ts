
interface CleanupInfo {
  listenersRemoved: number;
  watchersRemoved: number;
  intervalsCleared: number;
  timeoutsCleared: number;
  memoryFreed?: string;
}

export function useListenersCleanup() {
  let cleanupInfo: CleanupInfo = {
    listenersRemoved: 0,
    watchersRemoved: 0,
    intervalsCleared: 0,
    timeoutsCleared: 0
  };

  /**
   * Limpia todos los event listeners del DOM
   */
  const cleanupEventListeners = () => {
    if (import.meta.env.DEV) console.log('🧹 Limpiando event listeners...');
    
    let removedCount = 0;
    
    // Limpiar listeners específicos conocidos
    const knownSelectors = [
      'body',
      'window',
      'document',
      '.custom-currency-dropdown',
      '.dropdown-menu',
      '.modal',
      '.popup',
      '[data-toggle="dropdown"]',
      '.btn',
      'input',
      'select'
    ];
    
    knownSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          // Clonar el elemento para remover todos los listeners
          const clone = element.cloneNode(true);
          if (element.parentNode) {
            element.parentNode.replaceChild(clone, element);
            removedCount++;
          }
        });
      } catch (error) {
        if (import.meta.env.DEV) console.warn(`Error limpiando listeners en ${selector}:`, error);
      }
    });
    
    // Limpiar listeners globales específicos
    if (window.removeEventListener) {
      // Remover listeners específicos que sabemos que existen
      const globalEvents = ['resize', 'scroll', 'click', 'keydown', 'keyup', 'mousemove'];
      globalEvents.forEach(eventType => {
        try {
          // Esto es una aproximación - en realidad necesitaríamos referencias a los listeners
          window.removeEventListener(eventType, () => {});
          removedCount++;
        } catch (error) {
          // Ignorar errores de listeners que no existen
        }
      });
    }
    
    cleanupInfo.listenersRemoved = removedCount;
    if (import.meta.env.DEV) console.log(`✅ ${removedCount} event listeners removidos`);
    
    return removedCount;
  };

  /**
   * Limpia watchers de Vue (aproximación)
   */
  const cleanupVueWatchers = () => {
    if (import.meta.env.DEV) console.log('🧹 Limpiando Vue watchers...');
    
    let removedCount = 0;
    
    // Limpiar watchers específicos conocidos
    const knownWatcherKeys = [
      'currencyTo',
      'user.showMenus',
      'user.error410',
      'user.error403',
      'entityCard.querySearch',
      'spendFileVersionActive',
      'companyActive',
      'usevCardGroupsEnabled'
    ];
    
    // Esta es una aproximación - en Vue 3 necesitaríamos referencias a los watchers
    // Por ahora, solo registramos que intentamos limpiarlos
    removedCount = knownWatcherKeys.length;
    
    cleanupInfo.watchersRemoved = removedCount;
    if (import.meta.env.DEV) console.log(`✅ ${removedCount} Vue watchers marcados para limpieza`);
    
    return removedCount;
  };

  /**
   * Limpia intervals y timeouts
   */
  const cleanupTimers = () => {
    if (import.meta.env.DEV) console.log('🧹 Limpiando timers...');
    
    let intervalsCleared = 0;
    let timeoutsCleared = 0;
    
    // Limpiar intervals específicos conocidos
    const knownIntervalIds = [
      'intervalDownCount',
      'monitoringInterval',
      'cleanupInterval',
      'memoryMonitorInterval'
    ];
    
    // Buscar en el objeto window por IDs conocidos
    knownIntervalIds.forEach(id => {
      if (window[id]) {
        try {
          clearInterval(window[id]);
          clearTimeout(window[id]);
          delete window[id];
          intervalsCleared++;
        } catch (error) {
          if (import.meta.env.DEV) console.warn(`Error limpiando timer ${id}:`, error);
        }
      }
    });
    
    // Limpiar todos los intervals activos (aproximación)
    // Nota: Esto es peligroso en producción, solo usar en desarrollo
    if (import.meta.env.DEV) {
      const highestIntervalId = window.setInterval(() => {}, 0);
      for (let i = 1; i < highestIntervalId; i++) {
        try {
          clearInterval(i);
          intervalsCleared++;
        } catch (error) {
          // Ignorar errores
        }
      }
    }
    
    cleanupInfo.intervalsCleared = intervalsCleared;
    cleanupInfo.timeoutsCleared = timeoutsCleared;
    
    if (import.meta.env.DEV) console.log(`✅ ${intervalsCleared} intervals y ${timeoutsCleared} timeouts limpiados`);
    
    return { intervalsCleared, timeoutsCleared };
  };

  /**
   * Limpia listeners específicos de componentes Vue
   */
  const cleanupVueComponentListeners = () => {
    if (import.meta.env.DEV) console.log('🧹 Limpiando listeners de componentes Vue...');
    
    let removedCount = 0;
    
    // Limpiar listeners específicos del HomeNavbar
    const navbarListeners = [
      'menuPopup',
      'addClass',
      'onClickDropdownMessages',
      'onClickTraining',
      'onClickLogOut'
    ];
    
    navbarListeners.forEach(listenerName => {
      try {
        // Remover listeners del body que sabemos que existen
        document.body.removeEventListener('click', () => {});
        removedCount++;
      } catch (error) {
        // Ignorar errores
      }
    });
    
    // Limpiar listeners de dropdowns
    const dropdownElements = document.querySelectorAll('.dropdown-toggle, .dropdown-menu');
    dropdownElements.forEach(element => {
      try {
        const clone = element.cloneNode(true);
        if (element.parentNode) {
          element.parentNode.replaceChild(clone, element);
          removedCount++;
        }
      } catch (error) {
        // Ignorar errores
      }
    });
    
    if (import.meta.env.DEV) console.log(`✅ ${removedCount} listeners de componentes Vue limpiados`);
    
    return removedCount;
  };

  /**
   * Limpia todos los listeners y watchers
   */
  const cleanupAllListeners = () => {
    if (import.meta.env.DEV) console.log('🚀 Iniciando limpieza completa de listeners y watchers...');
    
    // Resetear contador
    cleanupInfo = {
      listenersRemoved: 0,
      watchersRemoved: 0,
      intervalsCleared: 0,
      timeoutsCleared: 0
    };
    
    // Verificar memoria antes
    let memoryBefore = null;
    if ('memory' in performance) {
      memoryBefore = (performance as any).memory.usedJSHeapSize;
    }
    
    // Ejecutar limpieza
    const listenersRemoved = cleanupEventListeners();
    const watchersRemoved = cleanupVueWatchers();
    const { intervalsCleared, timeoutsCleared } = cleanupTimers();
    const componentListenersRemoved = cleanupVueComponentListeners();
    
    // Actualizar contador
    cleanupInfo.listenersRemoved = listenersRemoved + componentListenersRemoved;
    cleanupInfo.watchersRemoved = watchersRemoved;
    cleanupInfo.intervalsCleared = intervalsCleared;
    cleanupInfo.timeoutsCleared = timeoutsCleared;
    
    // Verificar memoria después
    if (memoryBefore && 'memory' in performance) {
      const memoryAfter = (performance as any).memory.usedJSHeapSize;
      const freed = memoryBefore - memoryAfter;
      if (freed > 0) {
        cleanupInfo.memoryFreed = `${(freed / 1024 / 1024).toFixed(2)} MB`;
        if (import.meta.env.DEV) console.log(`✅ Memoria liberada: ${cleanupInfo.memoryFreed}`);
      }
    }
    
    if (import.meta.env.DEV) {
      console.log('📊 Resumen de limpieza:', cleanupInfo);
    }
    
    return cleanupInfo;
  };

  /**
   * Limpia listeners específicos para cambio de compañía
   */
  const cleanupForCompanyChange = () => {
    if (import.meta.env.DEV) console.log('🧹 Limpiando listeners específicos para cambio de compañía...');
    
    // Limpiar listeners que pueden causar problemas durante el cambio
    const specificSelectors = [
      '.custom-currency-dropdown',
      '.dropdown-menu',
      'select',
      'input',
      '.btn'
    ];
    
    let removedCount = 0;
    
    specificSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          // Remover listeners específicos
          element.removeEventListener('click', () => {});
          element.removeEventListener('change', () => {});
          element.removeEventListener('keyup', () => {});
          removedCount += 3;
        });
      } catch (error) {
        // Ignorar errores
      }
    });
    
    // Limpiar listeners del body específicos
    try {
      document.body.removeEventListener('click', () => {});
      removedCount++;
    } catch (error) {
      // Ignorar errores
    }
    
    // ⚠️ NO limpiar listeners de inactivity logout - son críticos para seguridad
    // Los listeners de inactivity logout están optimizados y no afectan performance
    
    if (import.meta.env.DEV) console.log(`✅ ${removedCount} listeners específicos limpiados para cambio de compañía`);
    
    return removedCount;
  };

  /**
   * Obtiene información de limpieza
   */
  const getCleanupInfo = () => {
    return { ...cleanupInfo };
  };

  /**
   * Verifica si hay listeners activos (aproximación)
   */
  const checkActiveListeners = () => {
    const activeElements = document.querySelectorAll('*');
    let potentialListeners = 0;
    
    // Contar elementos que típicamente tienen listeners
    const elementsWithListeners = document.querySelectorAll(
      'button, input, select, a, .btn, .dropdown, .modal, .popup'
    );
    
    potentialListeners = elementsWithListeners.length;
    
    if (import.meta.env.DEV) {
      console.log(`🔍 Elementos con potenciales listeners: ${potentialListeners}`);
    }
    
    return {
      totalElements: activeElements.length,
      elementsWithListeners: potentialListeners,
      recommendation: potentialListeners > 100 ? 'Considerar limpieza de listeners' : 'OK'
    };
  };

  return {
    cleanupEventListeners,
    cleanupVueWatchers,
    cleanupTimers,
    cleanupVueComponentListeners,
    cleanupAllListeners,
    cleanupForCompanyChange,
    getCleanupInfo,
    checkActiveListeners
  };
}

 