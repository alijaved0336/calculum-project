# SCF Feature - APIs del Backend que Deben Retornar `onSCF`

## 📋 Resumen Ejecutivo

El frontend espera el campo `onSCF` (boolean | null) en las siguientes APIs para mostrar el badge "Currently on SCF" en diferentes contextos.

---

## 🎯 APIs Requeridas

### 1. ✅ GET Entity Card Supplier Detail
**Endpoint:**
```
GET /api/entity-card/supplier/{companyId}/detail
```

**Uso:** Cuando se abre un Entity Card de un supplier

**Response Requerida:**
```json
{
  "supplierName": "Acme Corp",
  "supplierDomain": "acme.com",
  "supplierCountry": "United States",
  "volume": 1000000,
  "onSCF": true,           // ← REQUERIDO
  "scfAccepted": true,     // ← REQUERIDO
  ...
}
```

**Componente que lo usa:**
- `EntityCardNegotiation.vue` → `EntityPaymentTermsStrategies.vue`
- Badge aparece en Payment Terms card del Entity Card

---

### 2. ✅ GET Entity Spends (Para Tabs de Spends)
**Endpoint:**
```
GET /api/entity-card/entity/{companyId}/{programId}/spends
```

**Uso:** Cuando se hace clic en un spend individual en los tabs del Entity Card

**Response Requerida (cada spend en el array):**
```json
[
  {
    "@id": "/api/analyze/spends/123",
    "uuid": "abc-123",
    "name": "Spend Name",
    "volume": 500000,
    "onSCF": true,           // ← REQUERIDO para cada spend
    "scfAccepted": true,     // ← REQUERIDO para cada spend
    ...
  },
  ...
]
```

**Componente que lo usa:**
- `EntityCardNegotiation.vue` → Tabs de spends
- Cuando se hace clic en un spend, se carga su información
- Badge debe aparecer en Payment Terms si `onSCF: true`

**Importante:**
- Cada spend individual debe tener su propio valor de `onSCF`
- El badge aparece/desaparece según el spend seleccionado

---

### 3. ✅ GET Supplier Grids (Analyze, Categorize, Plan)
**Endpoints:**
```
GET /api/analyze/spends
GET /api/categorize/spends
GET /api/plan/spends
```

**Uso:** Grids de suppliers en módulos Analyze, Categorize, Plan

**Response Requerida (cada spend en el array):**
```json
[
  {
    "@id": "/api/analyze/spends/123",
    "uuid": "abc-123",
    "name": "Supplier Name",
    "country": "United States",
    "volume": 1000000,
    "capturedCashDiscounts": 50000,
    "cashDiscounts": 2.5,
    "onSCF": true,           // ← REQUERIDO
    "scfAccepted": true,     // ← REQUERIDO
    ...
  },
  ...
]
```

**Componente que lo usa:**
- Grids de Kendo en módulos Analyze, Categorize, Plan
- Columna "Using SCF" muestra "Yes"/"No" según `onSCF`

---

### 4. ✅ GET Spend New Terms (Agreed Terms)
**Endpoint:**
```
GET /api/entity-card/spend-new-terms/{id}
```

**Uso:** Cuando se abre el dialog "Agreed Payment Terms" con términos existentes

**Response Requerida:**
```json
{
  "@id": "/api/analyze/spend-new-terms/1",
  "termsWithoutCashDiscount": 60,
  "termsWithCashDiscount": 30,
  "cashDiscount": 2.0,
  "agreedDateOfChange": "2026-01-21",
  "nextReviewDate": "2026-10-18",
  "vcardAccepted": false,
  "scfAccepted": true,     // ← REQUERIDO
  "feedbackRating": 5,
  ...
}
```

**Componente que lo usa:**
- `ModalResults.vue` (Agreed Payment Terms dialog)
- Toggle "SCF Accepted" se inicializa con este valor

---

### 5. ✅ POST/PATCH Spend New Terms (Guardar Agreed Terms)
**Endpoints:**
```
POST /api/entity-card/spend-new-terms
PATCH /api/entity-card/spend-new-terms/{id}
```

**Uso:** Cuando se guarda/actualiza agreed payment terms

**Request Body (debe aceptar):**
```json
{
  "spendId": "/api/analyze/spends/123",
  "termsWithoutCashDiscount": 60,
  "termsWithCashDiscount": 30,
  "cashDiscount": 2.0,
  "agreedDateOfChange": "2026-01-21",
  "nextReviewDate": "2026-10-18",
  "vcardAccepted": false,
  "scfAccepted": true,     // ← DEBE ACEPTAR Y GUARDAR
  "additionalFeedback": "Good terms"
}
```

**Response (debe retornar):**
```json
{
  "@id": "/api/analyze/spend-new-terms/1",
  "termsWithoutCashDiscount": 60,
  "scfAccepted": true,     // ← DEBE RETORNAR el valor guardado
  ...
}
```

---

## 🔄 Flujo de Datos Completo

### Escenario 1: Abrir Entity Card de Supplier

```
1. Usuario hace clic en supplier
   ↓
2. Frontend llama: GET /api/entity-card/supplier/{id}/detail
   ↓
3. Backend retorna: { ..., onSCF: true, scfAccepted: true }
   ↓
4. Frontend muestra badge "Currently on SCF" en Payment Terms card
```

### Escenario 2: Hacer Clic en Spend Individual

```
1. Usuario abre Entity Card de supplier
   ↓
2. Usuario hace clic en tab de spends
   ↓
3. Frontend llama: GET /api/entity-card/entity/{companyId}/{programId}/spends
   ↓
4. Backend retorna array de spends, cada uno con onSCF
   ↓
5. Usuario hace clic en un spend específico
   ↓
6. Frontend usa el onSCF de ese spend
   ↓
7. Badge aparece/desaparece según onSCF del spend seleccionado
```

### Escenario 3: Ver Grid de Suppliers

```
1. Usuario navega a Analyze/Categorize/Plan
   ↓
2. Frontend llama: GET /api/analyze/spends (o categorize/plan)
   ↓
3. Backend retorna array con onSCF en cada spend
   ↓
4. Frontend muestra columna "Using SCF" con "Yes"/"No"
```

### Escenario 4: Guardar Agreed Terms

```
1. Usuario abre dialog "Agreed Payment Terms"
   ↓
2. Usuario activa toggle "SCF Accepted"
   ↓
3. Usuario hace clic en "Save"
   ↓
4. Frontend envía: POST /api/entity-card/spend-new-terms
   con { ..., scfAccepted: true }
   ↓
5. Backend guarda scfAccepted en base de datos
   ↓
6. Backend retorna: { ..., scfAccepted: true }
   ↓
7. Frontend confirma guardado exitoso
```

---

## 📊 Tabla Resumen de APIs

| API | Método | Campo Requerido | Uso |
|-----|--------|----------------|-----|
| `/api/entity-card/supplier/{id}/detail` | GET | `onSCF`, `scfAccepted` | Entity Card supplier |
| `/api/entity-card/entity/{id}/{id}/spends` | GET | `onSCF`, `scfAccepted` | Tabs de spends |
| `/api/analyze/spends` | GET | `onSCF`, `scfAccepted` | Grid Analyze |
| `/api/categorize/spends` | GET | `onSCF`, `scfAccepted` | Grid Categorize |
| `/api/plan/spends` | GET | `onSCF`, `scfAccepted` | Grid Plan |
| `/api/entity-card/spend-new-terms/{id}` | GET | `scfAccepted` | Cargar agreed terms |
| `/api/entity-card/spend-new-terms` | POST | `scfAccepted` | Crear agreed terms |
| `/api/entity-card/spend-new-terms/{id}` | PATCH | `scfAccepted` | Actualizar agreed terms |

---

## ⚠️ Consideraciones Importantes

### 1. Valor de `onSCF` por Spend vs Supplier

**Pregunta:** ¿El valor de `onSCF` es por supplier o por spend?

**Respuesta:** Depende del origen de datos:
- Si viene del **spend file**, cada spend puede tener su propio valor
- Si es una característica del **supplier**, todos los spends del mismo supplier tendrían el mismo valor

**Recomendación:**
- Usar el valor del spend file cuando esté disponible
- Si no hay valor específico por spend, heredar del supplier

### 2. Consistencia de Datos

**Importante:**
- `onSCF` debe ser consistente entre:
  - Entity card detail
  - Spends del mismo supplier
  - Grids de suppliers

**Ejemplo:**
```json
// Entity Card Detail
{ "supplierName": "Acme", "onSCF": true }

// Spend del mismo supplier
{ "name": "Acme", "onSCF": true }  // ← Debe coincidir
```

### 3. Valores Null vs False

**Diferencia:**
- `null`: No hay información disponible
- `false`: Explícitamente NO usa SCF
- `true`: Explícitamente SÍ usa SCF

**Frontend maneja los 3 casos:**
- `null` → Badge NO aparece
- `false` → Badge NO aparece
- `true` → Badge SÍ aparece

---

## 🧪 Cómo Verificar

### Test 1: Entity Card Supplier
```bash
# Request
curl GET /api/entity-card/supplier/123/detail

# Verificar response incluye:
{
  "onSCF": true,
  "scfAccepted": true
}
```

### Test 2: Entity Spends
```bash
# Request
curl GET /api/entity-card/entity/123/456/spends

# Verificar cada spend incluye:
[
  {
    "onSCF": true,
    "scfAccepted": true
  }
]
```

### Test 3: Grids
```bash
# Request
curl GET /api/analyze/spends

# Verificar cada spend incluye:
[
  {
    "onSCF": true,
    "scfAccepted": true
  }
]
```

### Test 4: Guardar y Verificar
```bash
# 1. Guardar
curl POST /api/entity-card/spend-new-terms \
  -d '{"scfAccepted": true, ...}'

# 2. Verificar
curl GET /api/entity-card/spend-new-terms/123

# Response debe incluir:
{
  "scfAccepted": true
}
```

---

## 📝 Checklist de Implementación Backend

### Fase 1: GET APIs (Lectura)
- [ ] GET entity-card/supplier/{id}/detail retorna `onSCF` y `scfAccepted`
- [ ] GET entity-card/entity/{id}/{id}/spends retorna `onSCF` y `scfAccepted` en cada spend
- [ ] GET analyze/spends retorna `onSCF` y `scfAccepted` en cada spend
- [ ] GET categorize/spends retorna `onSCF` y `scfAccepted` en cada spend
- [ ] GET plan/spends retorna `onSCF` y `scfAccepted` en cada spend
- [ ] GET entity-card/spend-new-terms/{id} retorna `scfAccepted`

### Fase 2: POST/PATCH APIs (Escritura)
- [ ] POST entity-card/spend-new-terms acepta `scfAccepted`
- [ ] PATCH entity-card/spend-new-terms/{id} acepta `scfAccepted`
- [ ] Valor de `scfAccepted` se guarda correctamente en BD
- [ ] Response retorna el valor guardado

### Fase 3: Verificación
- [ ] Test 1: Entity Card muestra badge correctamente
- [ ] Test 2: Click en spend individual muestra badge
- [ ] Test 3: Grids muestran columna "Using SCF"
- [ ] Test 4: Toggle guarda y persiste correctamente

---

## 🎯 Resumen

**APIs Críticas (2):**
1. ✅ `GET /api/entity-card/supplier/{id}/detail` - Entity Card
2. ✅ `GET /api/entity-card/entity/{id}/{id}/spends` - Tabs de spends

**APIs de Grids (3):**
3. ✅ `GET /api/analyze/spends`
4. ✅ `GET /api/categorize/spends`
5. ✅ `GET /api/plan/spends`

**APIs de Agreed Terms (3):**
6. ✅ `GET /api/entity-card/spend-new-terms/{id}`
7. ✅ `POST /api/entity-card/spend-new-terms`
8. ✅ `PATCH /api/entity-card/spend-new-terms/{id}`

**Total: 8 APIs** que deben retornar/aceptar campos SCF

---

## 🔧 Cambios en Frontend (2026-01-22)

### Tipos Actualizados

**`SpendProgramConfigByProviderAPIResponse`** ahora incluye:
```typescript
export interface SpendProgramConfigByProviderAPIResponse {
  // ... campos existentes ...
  onSCF?: boolean | null; // SCF feature
  scfAccepted?: boolean | null; // SCF feature
}
```

### Lógica de Badge Actualizada

El badge "Currently on SCF" ahora muestra el valor correcto según el contexto:

1. **Cuando se ve el supplier general** (tab "All Spends" o index 0):
   - Usa `entityDetails.onSCF` (valor del supplier)

2. **Cuando se selecciona un spend individual** (tabs de spends):
   - Usa `tabsDataTabSelected.onSCF` (valor del spend específico)
   - Cada spend puede tener su propio valor de `onSCF`

**Código implementado:**
```typescript
const onSCF = computed(() => {
  // Si un spend específico está seleccionado, usar su onSCF
  if (tabsDataTabSelected.value && selectedTabIndex.value > 0) {
    return tabsDataTabSelected.value.onSCF ?? null
  }
  // De lo contrario, usar el onSCF del supplier
  return props.entityDetails?.onSCF ?? null
})
```

---

**Fecha:** 2026-01-22  
**Estado:** Documentación Completa de APIs Requeridas  
**Frontend:** ✅ Actualizado y Listo - Esperando Backend
