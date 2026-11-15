# Análisis: Por qué `data.listSpend` no incluye `onSCF`

## Pregunta
¿Por qué en `data.listSpend` no viene también el campo `onSCF`?

## Respuesta

### Fuente de Datos de `data.listSpend`

El array `data.listSpend` en `EntityCardNegotiation.vue` **NO** viene de la API de Entity Card, sino del módulo de **Analyze**.

#### Flujo de Datos:

1. **Componente:** `EntityCardNegotiation.vue` (línea 2735)
   ```typescript
   analyzeStore.getSpendsbySupplier(params);
   ```

2. **Store:** `src/stores/analyze.ts` (línea 728)
   ```typescript
   const response = await AnalyzeApi.getSpendsbySupplier(supplierUUID, programUUID, disabled, level)
   ```

3. **API Call:** `src/modules/home/analyze/api/index.ts` (líneas 449-468)
   ```typescript
   export async function getSpendsbySupplier(
     supplierUUID: string,
     programUUID: string,
     disabled: boolean,
     level: string | null,
   ): Promise<ApiResponse> {
     let response = null
     const url = getBaseApi() + '/api/analyze/get_spends_by_program_and_provider'
     const params = {
       supplierUUID: supplierUUID,
       programUUID: programUUID,
       disabled: disabled,
       level: level,
       currencyRate: useAppStore().getCurrencyAmount,
     }
     
     response = await axios.post(url, params, {})
     // ...
   }
   ```

4. **Endpoint Backend:** `/api/analyze/get_spends_by_program_and_provider`

### Diferencia con la API de Entity Card

Existen **DOS APIs diferentes** que devuelven datos de spends:

| Característica | API de Analyze | API de Entity Card |
|----------------|----------------|-------------------|
| **Endpoint** | `/api/analyze/get_spends_by_program_and_provider` | `/api/entity-card/entity/{uuid}/{configUuid}/spends` |
| **Método** | POST | GET |
| **Uso** | Grid de spends en Entity Card Negotiation | No se usa actualmente en este componente |
| **Incluye `onSCF`** | ❌ NO | ✅ Probablemente SÍ |
| **Propósito** | Datos para análisis y grid | Datos específicos de entity card |

### Por qué NO incluye `onSCF`

El campo `onSCF` no está incluido en la respuesta de `/api/analyze/get_spends_by_program_and_provider` porque:

1. **Propósito diferente:** Esta API está diseñada para el módulo de Analyze, que se enfoca en análisis de programas y proveedores, no en características específicas de SCF (Supply Chain Finance).

2. **Scope del endpoint:** El endpoint de Analyze devuelve información relacionada con:
   - Harmonization groups
   - Financing groups
   - Payment terms
   - Spend volumes
   - Provider/Buyer information
   - Program assignments

3. **Información de SCF:** Los datos de SCF (como `onSCF` y `scfAccepted`) son específicos del contexto de Entity Card y vienen de:
   - `/api/entity-card/entity/{uuid}/detail` (entity-level)
   - `/api/entity-card/entity/{uuid}/{configUuid}/spends` (spend-level, si se implementa)

### Solución Actual

Por esta razón, en el código actual (líneas 3454-3478 de `EntityCardNegotiation.vue`), el computed `onSCF` tiene la siguiente lógica:

```typescript
const onSCF = computed(() => {
  if (tabsDataTabSelected.value && selectedTabIndex.value > 0) {
    // 1. Intenta obtener de tabsData (viene de otra API)
    if (tabsDataTabSelected.value.onSCF !== null && tabsDataTabSelected.value.onSCF !== undefined) {
      return tabsDataTabSelected.value.onSCF
    }
    
    // 2. Intenta buscar en listSpend (NO FUNCIONARÁ porque no incluye onSCF)
    const selectedSpendUUID = tabsDataTabSelected.value.spendUUID
    if (selectedSpendUUID && data.listSpend && data.listSpend.length > 0) {
      const matchingSpend = data.listSpend.find(
        (spend: any) => spend.spendUUID === selectedSpendUUID
      )
      if (matchingSpend && matchingSpend.onSCF !== null && matchingSpend.onSCF !== undefined) {
        return matchingSpend.onSCF // ❌ Nunca encontrará onSCF aquí
      }
    }
    
    return null
  }
  
  return props.entityDetails?.onSCF ?? null
})
```

### Recomendaciones

Si se necesita que `data.listSpend` incluya `onSCF`, hay dos opciones:

#### Opción 1: Modificar el Backend (Recomendado)
Agregar el campo `onSCF` a la respuesta del endpoint `/api/analyze/get_spends_by_program_and_provider`.

**Pros:**
- Solución limpia y centralizada
- Todos los componentes que usen esta API tendrán acceso a `onSCF`
- Mantiene la consistencia de datos

**Contras:**
- Requiere cambios en el backend
- Puede afectar otros módulos que usen esta API

#### Opción 2: Usar API de Entity Card
Cambiar la llamada para usar `/api/entity-card/entity/{uuid}/{configUuid}/spends` en lugar de la API de Analyze.

**Pros:**
- Probablemente ya incluye `onSCF`
- Datos más específicos para Entity Card

**Contras:**
- Puede no incluir todos los campos necesarios para el grid
- Requiere refactorización del código
- Puede afectar el rendimiento si se necesitan múltiples llamadas

#### Opción 3: Mantener Lógica Actual (Actual)
Usar `tabsData` (que viene de `/api/analyze/get-spend-program-configs-by-provider`) para obtener `onSCF`.

**Pros:**
- No requiere cambios en el backend
- Ya está implementado

**Contras:**
- La búsqueda en `listSpend` nunca encontrará `onSCF` (código muerto)
- Depende de que `tabsData` tenga el valor

## Conclusión

`data.listSpend` no incluye `onSCF` porque viene de un endpoint diferente (`/api/analyze/get_spends_by_program_and_provider`) que está diseñado para el módulo de Analyze y no incluye información específica de SCF.

La solución actual depende de `tabsData` para obtener `onSCF`, y la búsqueda en `listSpend` es código que nunca encontrará el valor (a menos que el backend agregue este campo al endpoint de Analyze).
