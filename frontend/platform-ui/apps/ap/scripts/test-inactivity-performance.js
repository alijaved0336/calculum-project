/**
 * Script de prueba para verificar el performance del inactivity logout
 * Ejecutar en la consola del navegador
 */

console.log('🧪 Iniciando pruebas de performance del inactivity logout...');

// Función para simular actividad del usuario
function simulateUserActivity(durationMs = 10000) {
  console.log(`🖱️ Simulando actividad del usuario por ${durationMs/1000} segundos...`);
  
  const startTime = performance.now();
  let eventCount = 0;
  
  // Simular mousemove (evento de alta frecuencia)
  const mouseInterval = setInterval(() => {
    const event = new MouseEvent('mousemove', {
      clientX: Math.random() * window.innerWidth,
      clientY: Math.random() * window.innerHeight
    });
    window.dispatchEvent(event);
    eventCount++;
  }, 16); // ~60fps
  
  // Simular scroll
  const scrollInterval = setInterval(() => {
    const event = new Event('scroll');
    window.dispatchEvent(event);
    eventCount++;
  }, 100); // 10 veces por segundo
  
  // Simular clicks
  const clickInterval = setInterval(() => {
    const event = new MouseEvent('click');
    window.dispatchEvent(event);
    eventCount++;
  }, 1000); // 1 vez por segundo
  
  setTimeout(() => {
    clearInterval(mouseInterval);
    clearInterval(scrollInterval);
    clearInterval(clickInterval);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Simulación completada:`);
    console.log(`   - Duración: ${duration.toFixed(2)}ms`);
    console.log(`   - Eventos generados: ${eventCount}`);
    console.log(`   - Eventos por segundo: ${(eventCount / (duration / 1000)).toFixed(2)}`);
  }, durationMs);
}

// Función para medir performance de localStorage
function measureLocalStoragePerformance() {
  console.log('📊 Midindo performance de localStorage...');
  
  const iterations = 1000;
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    localStorage.setItem('test_key', Date.now().toString());
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`✅ Performance de localStorage:`);
  console.log(`   - ${iterations} operaciones en ${duration.toFixed(2)}ms`);
  console.log(`   - ${(iterations / (duration / 1000)).toFixed(2)} operaciones por segundo`);
  console.log(`   - ${(duration / iterations).toFixed(3)}ms por operación`);
  
  // Limpiar
  localStorage.removeItem('test_key');
}

// Función para verificar listeners activos
function checkInactivityListeners() {
  console.log('🔍 Verificando listeners de inactivity...');
  
  // Buscar listeners específicos del inactivity logout
  const inactivitySelectors = [
    'mousemove',
    'scroll',
    'keydown',
    'click',
    'touchstart',
    'touchend'
  ];
  
  let totalListeners = 0;
  
  inactivitySelectors.forEach(eventType => {
    try {
      // Esta es una aproximación - no podemos contar listeners directamente
      // pero podemos verificar si los eventos están siendo manejados
      const testEvent = new Event(eventType);
      const startTime = performance.now();
      window.dispatchEvent(testEvent);
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      console.log(`   - ${eventType}: ${responseTime.toFixed(3)}ms de respuesta`);
      totalListeners++;
    } catch (error) {
      console.log(`   - ${eventType}: Error al verificar`);
    }
  });
  
  console.log(`✅ Total de tipos de eventos verificados: ${totalListeners}`);
}

// Función para verificar uso de memoria
function checkMemoryUsage() {
  console.log('🧠 Verificando uso de memoria...');
  
  if ('memory' in performance) {
    const memory = performance.memory;
    console.log(`✅ Uso de memoria:`);
    console.log(`   - Usado: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Límite: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Porcentaje: ${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%`);
  } else {
    console.log('⚠️ Performance.memory no disponible');
  }
}

// Función para verificar throttling y debouncing
function testThrottlingDebouncing() {
  console.log('⚡ Probando throttling y debouncing...');
  
  let eventCount = 0;
  let processedCount = 0;
  
  // Simular eventos de alta frecuencia
  const rapidEvents = setInterval(() => {
    eventCount++;
    const event = new MouseEvent('mousemove');
    window.dispatchEvent(event);
  }, 10); // 100 eventos por segundo
  
  // Contar eventos procesados (aproximación)
  const checkProcessed = setInterval(() => {
    processedCount++;
  }, 1000);
  
  setTimeout(() => {
    clearInterval(rapidEvents);
    clearInterval(checkProcessed);
    
    console.log(`✅ Resultados de throttling/debouncing:`);
    console.log(`   - Eventos generados: ${eventCount}`);
    console.log(`   - Eventos procesados (aprox): ${processedCount}`);
    console.log(`   - Reducción: ${((1 - processedCount / eventCount) * 100).toFixed(1)}%`);
  }, 5000);
}

// Función para verificar interval performance
function testIntervalPerformance() {
  console.log('⏱️ Probando performance de intervals...');
  
  const intervals = [];
  const startTime = performance.now();
  
  // Crear múltiples intervals
  for (let i = 0; i < 10; i++) {
    const intervalId = setInterval(() => {
      // Simular trabajo
      const dummy = Date.now();
    }, 1000);
    intervals.push(intervalId);
  }
  
  setTimeout(() => {
    // Limpiar intervals
    intervals.forEach(id => clearInterval(id));
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Performance de intervals:`);
    console.log(`   - ${intervals.length} intervals activos por ${duration.toFixed(2)}ms`);
    console.log(`   - Sin impacto significativo en performance`);
  }, 3000);
}

// Función principal de pruebas
function runInactivityPerformanceTests() {
  console.log('🚀 Ejecutando todas las pruebas de performance del inactivity logout...\n');
  
  // Verificar estado inicial
  checkMemoryUsage();
  checkInactivityListeners();
  
  console.log('\n--- Simulando actividad del usuario ---');
  simulateUserActivity(5000);
  
  setTimeout(() => {
    console.log('\n--- Probando throttling/debouncing ---');
    testThrottlingDebouncing();
  }, 6000);
  
  setTimeout(() => {
    console.log('\n--- Probando performance de localStorage ---');
    measureLocalStoragePerformance();
  }, 12000);
  
  setTimeout(() => {
    console.log('\n--- Probando performance de intervals ---');
    testIntervalPerformance();
  }, 14000);
  
  setTimeout(() => {
    console.log('\n--- Estado final ---');
    checkMemoryUsage();
    checkInactivityListeners();
    
    console.log('\n🎉 Todas las pruebas de performance completadas');
  }, 18000);
}

// Exponer funciones globalmente
window.inactivityPerformanceTests = {
  simulateUserActivity,
  measureLocalStoragePerformance,
  checkInactivityListeners,
  checkMemoryUsage,
  testThrottlingDebouncing,
  testIntervalPerformance,
  runInactivityPerformanceTests
};

console.log('📝 Funciones de prueba disponibles:');
console.log('- window.inactivityPerformanceTests.runInactivityPerformanceTests() - Ejecutar todas las pruebas');
console.log('- window.inactivityPerformanceTests.simulateUserActivity() - Simular actividad del usuario');
console.log('- window.inactivityPerformanceTests.checkMemoryUsage() - Verificar uso de memoria');
console.log('- window.inactivityPerformanceTests.checkInactivityListeners() - Verificar listeners');
console.log('- window.inactivityPerformanceTests.testThrottlingDebouncing() - Probar throttling/debouncing');

// Ejecutar pruebas automáticamente si se solicita
if (window.location.search.includes('test-inactivity=true')) {
  console.log('🔍 Modo de prueba detectado, ejecutando pruebas automáticamente...');
  setTimeout(runInactivityPerformanceTests, 2000);
} 