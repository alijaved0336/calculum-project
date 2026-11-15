# Opción 2: Usar API de Entity Card para obtener `onSCF`

## Problema Actual
- `tabsData` NO tiene `onSCF`
- `listSpend` NO tiene `onSCF` (viene de API de Analyze)
- Necesitamos obtener `onSCF` de alguna fuente

## Solución: Llamar a la API de Entity Card

### API Disponible
Ya existe una función en el API de Entity Card:

**Archivo:** `src/modules/home/entityCard/api/index.ts` (líneas 368-391)

```typescript
/**
 * Retrieves spends by supplier for a given company and program.
 * Route: /api/entity-card/entity/{companyId}/{programId}/spends
 */
export async function getSpendsBySupplier(
  companyId: string,
  programId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + 
              (programId ? ('/' + removeIRI(programId)) : '') + '/spends'

  try {
    response = await axios.get(url, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Spend by Supplier')
}
```

### Implementación

#### Paso 1: Agregar nuevo estado en `EntityCardNegotiation.vue`

```typescript
// En la interfaz EntityCardNegotiation (alrededor de línea 1048)
interface EntityCardNegotiation {
  // ... otros campos existentes ...
  listSpend: [],
  listSpendEntityCard: [], // NUEVO: Para almacenar spends de Entity Card API
  columnsGrid: getGridColumns(),
  // ... resto de campos ...
}

// En el reactive data (alrededor de línea 1048)
const data = reactive<EntityCardNegotiation>({
  // ... otros campos ...
  listSpend: [],
  listSpendEntityCard: [], // NUEVO
  columnsGrid: getGridColumns(),
  // ...
});
```

#### Paso 2: Crear función para llamar a la API de Entity Card

```typescript
// Agregar después de la función retrieveAllSpends (alrededor de línea 2737)

/**
 * Retrieve spends from Entity Card API (includes onSCF field)
 * This is used to get SCF-related information that's not available in Analyze API
 */
function retrieveSpendsFromEntityCardAPI() {
  try {
    const params = {
      companyId: props.companyId,
      programId: props.programUuid,
      callbackSuccess: (callbackSuccessData: any) => {
        // Store the response with onSCF field
        data.listSpendEntityCard = callbackSuccessData;
        console.log('Entity Card Spends with onSCF:', data.listSpendEntityCard);
      },
      callbackError: (callbackErrorData: unknown) => {
        if (DEBUG) {
          console.error("** Error on getSpendsBySupplier from Entity Card: ", callbackErrorData);
        }
      },
    };

    entityCardStore.getSpendsBySupplier(params);
  } catch (error) {
    if (DEBUG) {
      console.error("** Error retrieving Entity Card spends: ", error);
    }
  }
}
```

#### Paso 3: Llamar a la función cuando se carga el componente

```typescript
// En el watch de tabsDataTabSelected (alrededor de línea 1375)
watch(tabsDataTabSelected, () => {
  // ... código existente ...
  
  // NUEVO: Llamar a la API de Entity Card para obtener onSCF
  if (selectedTabIndex.value > 0) {
    retrieveSpendsFromEntityCardAPI();
  }
  
  // ... resto del código ...
});

// También llamar en onMounted si es necesario
onMounted(() => {
  // ... código existente ...
  
  // NUEVO: Cargar datos de Entity Card API
  if (selectedTabIndex.value > 0) {
    retrieveSpendsFromEntityCardAPI();
  }
});
```

#### Paso 4: Actualizar el computed `onSCF` para usar `listSpendEntityCard`

```typescript
// Reemplazar el computed onSCF actual (líneas 3454-3478)
const onSCF = computed(() => {
  // If a specific spend tab is selected (not "All Spends")
  if (tabsDataTabSelected.value && selectedTabIndex.value > 0) {
    // Search in listSpendEntityCard (from Entity Card API) for matching spendUUID
    const selectedSpendUUID = tabsDataTabSelected.value.spendUUID
    
    if (selectedSpendUUID && data.listSpendEntityCard && data.listSpendEntityCard.length > 0) {
      const matchingSpend = data.listSpendEntityCard.find(
        (spend: any) => spend.spendUUID === selectedSpendUUID
      )
      
      if (matchingSpend && matchingSpend.onSCF !== null && matchingSpend.onSCF !== undefined) {
        console.log('Found onSCF in Entity Card API:', matchingSpend.onSCF);
        return matchingSpend.onSCF
      }
    }
    
    return null
  }
  
  // Otherwise, use the supplier-level onSCF from entityDetails
  return props.entityDetails?.onSCF ?? null
})
```

### Resumen de Cambios

#### Archivos a Modificar:

1. **`src/modules/home/entityCard/views/EntityCardNegotiation.vue`**
   - Agregar `listSpendEntityCard: []` al estado
   - Crear función `retrieveSpendsFromEntityCardAPI()`
   - Llamar a la función en `watch(tabsDataTabSelected)` y `onMounted`
   - Actualizar computed `onSCF` para buscar en `listSpendEntityCard`

#### Ventajas de esta Solución:

✅ **Usa API específica de Entity Card** que probablemente incluye `onSCF`
✅ **No requiere cambios en backend** (si la API ya devuelve `onSCF`)
✅ **Mantiene separación de concerns**: 
   - `listSpend` → Para el grid (API de Analyze)
   - `listSpendEntityCard` → Para información de SCF (API de Entity Card)
✅ **Fácil de implementar** - usa funciones ya existentes

#### Desventajas:

⚠️ **Llamada adicional al backend** (puede afectar performance)
⚠️ **Duplicación de datos** (algunos datos estarán en ambos arrays)
⚠️ **Necesita validar** que la API de Entity Card devuelva todos los campos necesarios

### Alternativa Optimizada

Si la performance es una preocupación, se puede hacer la llamada solo cuando sea necesario:

```typescript
const onSCF = computed(() => {
  if (tabsDataTabSelected.value && selectedTabIndex.value > 0) {
    const selectedSpendUUID = tabsDataTabSelected.value.spendUUID
    
    // Solo hacer la llamada si no tenemos los datos
    if (data.listSpendEntityCard.length === 0) {
      retrieveSpendsFromEntityCardAPI();
    }
    
    // Buscar en los datos cargados
    if (selectedSpendUUID && data.listSpendEntityCard.length > 0) {
      const matchingSpend = data.listSpendEntityCard.find(
        (spend: any) => spend.spendUUID === selectedSpendUUID
      )
      
      if (matchingSpend?.onSCF !== null && matchingSpend?.onSCF !== undefined) {
        return matchingSpend.onSCF
      }
    }
    
    return null
  }
  
  return props.entityDetails?.onSCF ?? null
})
```

### Verificación Necesaria

Antes de implementar, **verificar en el backend** que el endpoint `/api/entity-card/entity/{companyId}/{programId}/spends` devuelva el campo `onSCF` en su respuesta.

Si no lo devuelve, será necesario agregarlo en el backend primero (Opción 1).
