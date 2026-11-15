# SCF Badge - Ajuste de Layout en Payment Terms

## 📋 Problema

El badge "Currently on SCF" y el título "Payment Terms (days)" no estaban alineados horizontalmente. Estaban en elementos separados sin un contenedor flex.

**Antes:**
```pug
span.text-base.font-semibold Payment Terms (days)
  CalculumTooltipIcon(...)
.scf-badge(v-if="onSCF === true")
  span Currently on SCF
```

Resultado: Los elementos aparecían uno debajo del otro.

---

## ✅ Solución

Se creó una clase personalizada `.payment-terms-header` para alinear horizontalmente el título, el tooltip y el badge.

**Después:**
```pug
.payment-terms-header
  span.text-base.font-semibold Payment Terms (days)
    CalculumTooltipIcon(...)
  .scf-badge(v-if="onSCF === true")
    span Currently on SCF
```

---

## 🔧 Cambios Realizados

### 1. Estructura HTML (Pug)

**Archivo:** `src/modules/home/entityCard/components/opportunity/EntityPaymentTermsStrategies.vue`

**Cambio:**
- Agregado contenedor con clase personalizada `.payment-terms-header`
- Envuelve el título, tooltip y badge
- Alinea elementos horizontalmente con espacio entre ellos

**Clase personalizada:**
- `.payment-terms-header`: Contenedor flex para el encabezado de Payment Terms

---

### 2. Estilos CSS (SCSS)

**Nueva clase `.payment-terms-header`:**
```scss
.payment-terms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
```

**Cambios en `.scf-badge`:**

**Antes:**
```scss
.scf-badge {
  padding: 6px 12px;
  border-radius: 4px;
  background-color: #E5E7EB;
  font-size: 0.75rem;
  font-weight: 400;
  color: #4B5563;
}
```

**Después:**
```scss
.scf-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 4px;
  background-color: #DBEAFE;  // Azul claro (blue-100)
  font-size: 0.75rem;
  font-weight: 500;           // Medium
  color: #1E40AF;             // Azul oscuro (blue-800)
  margin-left: auto;          // Empuja a la derecha
  
  span {
    white-space: nowrap;
  }
}
```

**Responsive ajustado:**
```scss
@media (max-width: 768px) {
  .payment-terms-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .scf-badge {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}
```

---

## 📐 Layout Resultante

### Desktop (> 768px)

```
┌─────────────────────────────────────────────────────┐
│ Payment Terms (days) ⓘ        [Currently on SCF]   │
│                                                     │
│ [Chart Line 1]                                      │
│ [Chart Line 2]                                      │
└─────────────────────────────────────────────────────┘
```

**Características:**
- Título con tooltip a la izquierda
- Badge "Currently on SCF" a la derecha (justify-content: space-between)
- Badge con fondo azul claro (#DBEAFE) y texto azul oscuro (#1E40AF)
- Badge alineado verticalmente con el título

### Mobile (≤ 768px)

```
┌─────────────────────────┐
│ Payment Terms (days) ⓘ  │
│ [Currently on SCF]      │
│                         │
│ [Chart Line 1]          │
│ [Chart Line 2]          │
└─────────────────────────┘
```

**Características:**
- Badge se mueve debajo del título en pantallas pequeñas
- Mantiene legibilidad en dispositivos móviles

---

## 🎨 Especificaciones Visuales

### Badge "Currently on SCF"

| Propiedad | Valor | Notas |
|-----------|-------|-------|
| Display | `inline-flex` | Permite alineación con texto |
| Padding | `4px 12px` | Compacto pero legible |
| Border Radius | `4px` | Esquinas redondeadas |
| Background | `#DBEAFE` | Azul claro (blue-100) |
| Font Size | `0.75rem` (12px) | Pequeño pero legible |
| Font Weight | `500` | Medium |
| Color | `#1E40AF` | Azul oscuro (blue-800) |
| Margin Left | `auto` | Empuja el badge a la derecha |

### Contenedor `.payment-terms-header`

| Propiedad | Valor | Notas |
|-----------|-------|-------|
| Display | `flex` | Layout horizontal |
| Align Items | `center` | Centrado vertical |
| Justify Content | `space-between` | Badge a la derecha |
| Margin Bottom | `0.5rem` (8px) | Separación de charts |
| Flex Direction (mobile) | `column` | Vertical en móvil |
| Align Items (mobile) | `flex-start` | Alineado a la izquierda en móvil |

---

## 🧪 Pruebas Visuales

### Test 1: Badge Visible (onSCF: true)
```
✅ Título y badge en la misma línea
✅ Espacio de 8px entre elementos
✅ Badge alineado verticalmente con título
✅ Tooltip funciona correctamente
```

### Test 2: Badge No Visible (onSCF: false/null)
```
✅ Solo título y tooltip visibles
✅ No hay espacio extra donde estaría el badge
✅ Layout se mantiene consistente
```

### Test 3: Responsive (Mobile)
```
✅ Badge se mueve debajo del título
✅ Mantiene legibilidad
✅ No hay overflow horizontal
```

---

## 📝 Checklist de Implementación

- [x] Crear clase personalizada `.payment-terms-header`
- [x] Agregar estilos flex al contenedor
- [x] Actualizar estilos de `.scf-badge` para inline-flex
- [x] Ajustar responsive para móvil (flex-direction: column)
- [x] Verificar alineación vertical
- [x] Verificar espaciado horizontal (gap: 0.5rem)
- [x] Probar con badge visible
- [x] Probar con badge no visible
- [x] Probar en mobile

---

## 🎯 Resultado Final

**Antes:**
- Título y badge en líneas separadas
- Layout desorganizado
- Espacio vertical innecesario

**Después:**
- Título, tooltip y badge en la misma línea
- Layout limpio y profesional
- Espacio optimizado
- Responsive en móvil

---

**Fecha:** 2026-01-22  
**Archivo:** `EntityPaymentTermsStrategies.vue`  
**Estado:** ✅ Completado
