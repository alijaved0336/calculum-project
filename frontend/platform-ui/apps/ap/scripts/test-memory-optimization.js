/**
 * Script de prueba para verificar las optimizaciones de memoria
 * Ejecutar en la consola del navegador después de cargar la aplicación
 */

console.log('🧪 Iniciando pruebas de optimización de memoria...');

// Función para simular múltiples cambios de compañía
async function testCompanyChanges() {
  console.log('📊 Estado inicial de memoria:');
  if (window.memoryMonitor) {
    const initialStats = window.memoryMonitor.getMemoryStats();
    console.log(initialStats);
  }

  // Simular 5 cambios de compañía
  for (let i = 1; i <= 5; i++) {
    console.log(`\n🔄 Simulando cambio de compañía ${i}/5...`);
    
    // Simular limpieza antes del cambio
    if (window.cleanupBeforeCompanyChange) {
      window.cleanupBeforeCompanyChange();
    }
    
    // Esperar un poco para simular el cambio
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simular limpieza después del cambio
    if (window.cleanupAfterCompanyChange) {
      window.cleanupAfterCompanyChange();
    }
    
    // Verificar memoria
    if (window.memoryMonitor) {
      const stats = window.memoryMonitor.getMemoryStats();
      console.log(`📊 Memoria después del cambio ${i}:`, stats);
    }
  }
  
  console.log('\n✅ Pruebas completadas');
  
  // Verificar si hay fugas
  if (window.checkMemoryLeaks) {
    const leakCheck = window.checkMemoryLeaks();
    console.log('🔍 Verificación de fugas:', leakCheck);
  }
}

// Función para probar limpieza manual
function testManualCleanup() {
  console.log('🧹 Probando limpieza manual...');
  
  if (window.cleanupMemory) {
    window.cleanupMemory();
    console.log('✅ Limpieza segura ejecutada');
  }
  
  if (window.memoryMonitor) {
    const stats = window.memoryMonitor.getMemoryStats();
    console.log('📊 Memoria después de limpieza manual:', stats);
  }
}

// Función para mostrar estadísticas detalladas
function showDetailedStats() {
  console.log('📈 Estadísticas detalladas de memoria:');
  
  if (window.memoryMonitor) {
    const stats = window.memoryMonitor.getMemoryStats();
    const history = window.memoryMonitor.getMemoryHistory();
    const status = window.memoryMonitor.getStatus();
    
    console.log('📊 Estadísticas actuales:', stats);
    console.log('📋 Estado del monitor:', status);
    console.log('📜 Historial (últimos 10):', history.slice(-10));
  }
}

// Función para forzar garbage collection
function forceGC() {
  console.log('🗑️ Forzando garbage collection...');
  
  if (window.gc) {
    window.gc();
    console.log('✅ Garbage collection ejecutada');
  } else {
    console.log('⚠️ Garbage collection no disponible (ejecutar con --expose-gc)');
  }
}

// Función para limpiar cache de Apollo
function clearApolloCache() {
  console.log('🧹 Limpiando cache de Apollo...');
  
  if (window.__APOLLO_CLIENT__) {
    try {
      window.__APOLLO_CLIENT__.clearStore();
      console.log('✅ Cache de Apollo limpiado');
    } catch (error) {
      console.error('❌ Error limpiando cache de Apollo:', error);
    }
  } else {
    console.log('⚠️ Apollo Client no encontrado');
  }
}

// Función para verificar session cookies
async function verifySessionCookies() {
  console.log('🍪 Verificando session cookies...');
  
  if (window.verifySessionCookies) {
    const result = window.verifySessionCookies();
    console.log('✅ Verificación de cookies:', result);
  }
  
  if (window.verifyAuthentication) {
    try {
      const authResult = await window.verifyAuthentication();
      console.log('🔐 Verificación de autenticación:', authResult);
    } catch (error) {
      console.error('❌ Error verificando autenticación:', error);
    }
  }
}

// Función para verificar configuraciones de grids
function verifyGridConfigurations() {
  console.log('🔍 Verificando configuraciones de grids...');
  
  if (window.verifyGridConfigurations) {
    const result = window.verifyGridConfigurations();
    console.log('✅ Verificación de configuraciones:', result);
    return result;
  } else {
    console.log('⚠️ Función verifyGridConfigurations no disponible');
    return null;
  }
}

// Función para limpiar listeners y watchers
function cleanupListeners() {
  console.log('🎧 Limpiando listeners y watchers...');
  
  if (window.cleanupAllListeners) {
    const result = window.cleanupAllListeners();
    console.log('✅ Limpieza de listeners completada:', result);
    return result;
  } else {
    console.log('⚠️ Función cleanupAllListeners no disponible');
    return null;
  }
}

// Función para verificar listeners activos
function checkActiveListeners() {
  console.log('🔍 Verificando listeners activos...');
  
  if (window.checkActiveListeners) {
    const result = window.checkActiveListeners();
    console.log('✅ Estado de listeners activos:', result);
    return result;
  } else {
    console.log('⚠️ Función checkActiveListeners no disponible');
    return null;
  }
}

// Función principal de pruebas
async function runAllTests() {
  console.log('🚀 Ejecutando todas las pruebas de optimización...\n');
  
  // Mostrar estadísticas iniciales
  showDetailedStats();
  
  // Probar limpieza manual
  testManualCleanup();
  
  // Probar cambios de compañía
  await testCompanyChanges();
  
  // Forzar garbage collection
  forceGC();
  
  // Limpiar cache de Apollo
  clearApolloCache();
  
  // Verificar cookies y autenticación
  await verifySessionCookies();
  
  // Verificar configuraciones de grids
  verifyGridConfigurations();
  
  // Limpiar listeners y watchers
  cleanupListeners();
  
  // Verificar listeners activos
  checkActiveListeners();
  
  // Mostrar estadísticas finales
  console.log('\n📊 Estadísticas finales:');
  showDetailedStats();
  
  console.log('\n🎉 Todas las pruebas completadas');
}

// Exponer funciones globalmente para uso manual
window.testMemoryOptimization = {
  testCompanyChanges,
  testManualCleanup,
  showDetailedStats,
  forceGC,
  clearApolloCache,
  verifySessionCookies,
  verifyGridConfigurations,
  cleanupListeners,
  checkActiveListeners,
  runAllTests
};

console.log('📝 Funciones de prueba disponibles:');
console.log('- window.testMemoryOptimization.runAllTests() - Ejecutar todas las pruebas');
console.log('- window.testMemoryOptimization.testCompanyChanges() - Probar cambios de compañía');
console.log('- window.testMemoryOptimization.testManualCleanup() - Probar limpieza manual');
console.log('- window.testMemoryOptimization.showDetailedStats() - Mostrar estadísticas');
console.log('- window.testMemoryOptimization.forceGC() - Forzar garbage collection');
console.log('- window.testMemoryOptimization.clearApolloCache() - Limpiar cache de Apollo');
console.log('- window.testMemoryOptimization.verifySessionCookies() - Verificar cookies');
console.log('- window.testMemoryOptimization.verifyGridConfigurations() - Verificar configuraciones de grids');
console.log('- window.testMemoryOptimization.cleanupListeners() - Limpiar listeners y watchers');
console.log('- window.testMemoryOptimization.checkActiveListeners() - Verificar listeners activos');

// Ejecutar pruebas automáticamente si se solicita
if (window.location.search.includes('test-memory=true')) {
  console.log('🔍 Modo de prueba detectado, ejecutando pruebas automáticamente...');
  setTimeout(runAllTests, 2000);
} 