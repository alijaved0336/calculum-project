# SCF Feature - Cambios en Frontend para Tabs de Spends

## 📋 Resumen

Se actualizó el frontend para que el badge "Currently on SCF" muestre el valor correcto cuando se hace clic en un spend individual en los tabs del Entity Card.

---

## 🎯 Problema Identificado

**Situación anterior:**
- El badge siempre mostraba el valor de `entityDetails.onSCF` (valor del supplier general)
- No cambiaba cuando se seleccionaba un spend individual

**Situación requerida:**
- Cuando se selecciona un spend individual en los tabs, el badge debe mostrar el `onSCF` de ese spend específico
- Cada spend puede tener su propio valor de `onSCF` independiente del supplier

---

## ✅ Cambios Realizados

### 1. Tipos Actualizados

**Archivo:** `src/types/index.ts`

**Cambio:** Agregado `onSCF` y `scfAccepted` a la interfaz `SpendProgramConfigByProviderAPIResponse`

```typescript
export interface SpendProgramConfigByProviderAPIResponse {
  alias: string | null;
  approach: string | null;
  // ... otros campos ...
  team: string | null;
  onSCF?: boolean | null; // ← NUEVO
  scfAccepted?: boolean | null; // ← NUEVO
}
```

**Impacto:**
- La interfaz `TabsData` hereda de `SpendProgramConfigByProviderAPIResponse`
- Ahora todos los tabs tienen acceso a `onSCF` y `scfAccepted`

---

### 2. Lógica del Badge Actualizada

**Archivo:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Cambio:** Modificado el `computed` de `onSCF` para usar el valor del spend seleccionado

**Antes:**
```typescript
const onSCF = computed(() => {
  return props.entityDetails?.onSCF ?? null
})
```

**Después:**
```typescript
const onSCF = computed(() => {
  // Si un spend específico está seleccionado (no "All Spends"), usar su onSCF
  if (tabsDataTabSelected.value && selectedTabIndex.value > 0) {
    return tabsDataTabSelected.value.onSCF ?? null
  }
  // De lo contrario, usar el onSCF del supplier desde entityDetails
  return props.entityDetails?.onSCF ?? null
})
```

**Lógica:**
1. Si `selectedTabIndex > 0` (no es el tab "All Spends")
2. Y existe `tabsDataTabSelected.value` (hay un tab seleccionado)
3. Entonces usar `tabsDataTabSelected.value.onSCF`
4. Caso contrario, usar `props.entityDetails?.onSCF`

---

## 🔄 Flujo de Datos Actualizado

### Escenario 1: Usuario Abre Entity Card

```
1. Usuario hace clic en supplier
   ↓
2. Frontend carga Entity Card
   ↓
3. Tab "All Spends" seleccionado por defecto (index 0)
   ↓
4. onSCF computed retorna: props.entityDetails?.onSCF
   ↓
5. Badge muestra valor del supplier general
```

### Escenario 2: Usuario Hace Clic en Spend Individual

```
1. Usuario hace clic en tab de spend (index > 0)
   ↓
2. selectedTabIndex cambia a índice del tab
   ↓
3. tabsDataTabSelected se actualiza con datos del spend
   ↓
4. onSCF computed detecta selectedTabIndex > 0
   ↓
5. onSCF computed retorna: tabsDataTabSelected.value.onSCF
   ↓
6. Badge muestra valor del spend específico
```

### Escenario 3: Usuario Regresa a "All Spends"

```
1. Usuario hace clic en tab "All Spends" (index 0)
   ↓
2. selectedTabIndex cambia a 0
   ↓
3. onSCF computed detecta selectedTabIndex === 0
   ↓
4. onSCF computed retorna: props.entityDetails?.onSCF
   ↓
5. Badge muestra valor del supplier general
```

---

## 📊 Ejemplo de Datos

### Supplier General
```json
{
  "supplierName": "Acme Corp",
  "onSCF": true,  // ← Supplier usa SCF
  ...
}
```

### Spends del Supplier
```json
[
  {
    "alias": "Spend Line 1",
    "spendUUID": "abc-123",
    "onSCF": true,  // ← Este spend usa SCF
    ...
  },
  {
    "alias": "Spend Line 2",
    "spendUUID": "def-456",
    "onSCF": false,  // ← Este spend NO usa SCF
    ...
  },
  {
    "alias": "Spend Line 3",
    "spendUUID": "ghi-789",
    "onSCF": null,  // ← No hay información para este spend
    ...
  }
]
```

### Comportamiento del Badge

| Tab Seleccionado | Valor `onSCF` | Badge Visible |
|------------------|---------------|---------------|
| All Spends (index 0) | `true` (supplier) | ✅ Sí |
| Spend Line 1 | `true` | ✅ Sí |
| Spend Line 2 | `false` | ❌ No |
| Spend Line 3 | `null` | ❌ No |

---

## ⚠️ Consideraciones Importantes

### 1. Consistencia de Datos

**Pregunta:** ¿Puede un spend tener `onSCF: false` si el supplier tiene `onSCF: true`?

**Respuesta:** Sí, es posible. Depende del modelo de negocio:
- **Opción A:** SCF es por supplier → todos los spends heredan el mismo valor
- **Opción B:** SCF es por spend → cada spend puede tener su propio valor

**Recomendación Backend:**
- Si el spend file tiene valor específico por spend → usar ese valor
- Si no hay valor por spend → heredar del supplier
- Si no hay valor en ninguno → retornar `null`

### 2. Valores Null

**Importante:** El frontend maneja correctamente los 3 estados:
- `true` → Badge visible
- `false` → Badge NO visible
- `null` → Badge NO visible

### 3. Performance

**Nota:** El `computed` de `onSCF` se recalcula automáticamente cuando:
- Cambia `selectedTabIndex`
- Cambia `tabsDataTabSelected`
- Cambia `props.entityDetails`

No hay impacto en performance porque son cambios reactivos de Vue.

---

## 🧪 Cómo Probar

### Test 1: Badge en Supplier General

```
1. Abrir Entity Card de supplier con onSCF: true
2. Verificar que badge "Currently on SCF" aparece
3. Tab "All Spends" debe estar seleccionado
```

### Test 2: Badge en Spend Individual con SCF

```
1. Abrir Entity Card
2. Hacer clic en tab de spend con onSCF: true
3. Verificar que badge "Currently on SCF" aparece
```

### Test 3: Badge Desaparece en Spend sin SCF

```
1. Abrir Entity Card
2. Hacer clic en tab de spend con onSCF: false
3. Verificar que badge NO aparece
```

### Test 4: Badge Cambia al Cambiar Tabs

```
1. Abrir Entity Card
2. Hacer clic en spend con onSCF: true → badge aparece
3. Hacer clic en spend con onSCF: false → badge desaparece
4. Hacer clic en "All Spends" → badge usa valor del supplier
```

---

## 📝 Checklist de Implementación

### Frontend ✅
- [x] Agregar `onSCF` y `scfAccepted` a `SpendProgramConfigByProviderAPIResponse`
- [x] Actualizar lógica de `onSCF` computed en `EntityCardNegotiation.vue`
- [x] Documentar cambios en `scf-backend-api-summary.md`
- [x] Crear documento de cambios `scf-frontend-changes-tabs.md`

### Backend ⏳
- [ ] GET `/api/entity-card/entity/{id}/{id}/spends` retorna `onSCF` en cada spend
- [ ] Verificar que cada spend tiene su propio valor de `onSCF`
- [ ] Probar que badge cambia correctamente al cambiar tabs

---

## 🎯 Resumen Ejecutivo

### ¿Qué se cambió?
- Tipos: Agregado `onSCF` y `scfAccepted` a spends
- Lógica: Badge ahora usa el valor del spend seleccionado

### ¿Por qué?
- Cada spend puede tener su propio valor de `onSCF`
- El badge debe reflejar el estado del spend individual, no solo del supplier

### ¿Qué necesita el backend?
- API `/api/entity-card/entity/{id}/{id}/spends` debe retornar `onSCF` en cada spend
- Cada spend debe tener su valor independiente (o heredar del supplier si no hay valor específico)

---

**Fecha:** 2026-01-22  
**Autor:** AI Assistant  
**Estado:** ✅ Frontend Actualizado - Esperando Backend
