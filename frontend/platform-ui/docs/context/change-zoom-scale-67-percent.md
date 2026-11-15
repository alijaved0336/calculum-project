# Change: Scale UI to 67% with CSS Zoom

## Date
2026-01-08

## Problem
The default 100% zoom of the ADA platform displayed objects too large. The Client Success team was suggesting clients to zoom out to 67% in the browser.

## Implemented Solution

### 1. Global Variables
Compensation variables were defined in `src/resources/assets/styles/variables/_dimensions.scss`:

```scss
// Global zoom compensation
$zoom-compensation: 1.4925;  // 1 / 0.67 - to fix position
$zoom-content-reset: 0.67;   // counter-zoom to restore content size
```

### 2. Global Zoom
Added `zoom: 0.67` to the `html` element in `src/resources/assets/styles/base/_fonts.scss`:

```scss
html {
  font-family: "Inter", "system-ui", sans-serif;
  zoom: 0.67; /* Global scale to 67% */
}
```

### 3. Modal Compensation
Modals and overlays using `position: fixed` with `100vh`/`100vw` require compensation because zoom affects how these units are calculated.

**Compensation factor**: `1 / 0.67 ≈ 1.4925`

Affected files:
- `src/modules/components/CalculumModal.vue` (generic modal)
- `src/modules/components/CalculumFullScreen.vue` (fullscreen modal)
- `src/modules/home/entityCard/components/modals/ModalEntity.vue` (entity modal)

```scss
// Import global variables
@import '@/resources/assets/styles/variables/_dimensions.scss';

.calculum-modal {
  height: calc(100vh * #{$zoom-compensation});
  width: calc(100vw * #{$zoom-compensation});
}

.calculum-modal-content-custom {
  max-height: calc(100vh * #{$zoom-compensation} - 2%);
  width: calc(96vw * #{$zoom-compensation}); // in media queries
}
```

### 4. Tooltip and Popover Compensation

Bootstrap tooltips and popovers calculate their position based on viewport coordinates, but zoom affects where they appear visually. The solution is to apply an inverse zoom.

File: `src/resources/assets/styles/layout/_general.scss`
(Variables are imported from `_dimensions.scss` via `_app.scss`)

```scss
.tooltip {
  position: fixed !important;
  zoom: $zoom-compensation;
  
  .tooltip-inner {
    zoom: $zoom-content-reset;
  }
}

.popover {
  zoom: $zoom-compensation;
  
  .popover-body, .popover-header {
    zoom: $zoom-content-reset;
  }
}

// Kendo UI elements
.k-animation-container {
  zoom: $zoom-compensation;
  
  > * {
    zoom: $zoom-content-reset;
  }
}
```

### 5. PDF Export Compensation

When exporting to PDF using Kendo Drawing (`drawDOM` / `exportPDF`), the global zoom affects how content is captured. The solution is to use a **hidden clone container** with inverse zoom compensation.

#### Single PDF Export
File: `src/modules/home/entityCard/pdf/EntityExportPDF.vue`

```javascript
const exportToPDF = async () => {
  // Create hidden container with zoom compensation
  cloneContainer = document.createElement('div');
  cloneContainer.style.cssText = `
    position: fixed;
    left: -99999px;
    top: 0;
    zoom: 1.4925;  // Compensate for global zoom (1 / 0.67)
    width: ${element.offsetWidth}px;
  `;
  
  // Clone element for PDF export
  const clone = element.cloneNode(true);
  cloneContainer.appendChild(clone);
  document.body.appendChild(cloneContainer);
  
  // Export from the clone (not the visible element)
  const group = await drawDOM(clone, { ... });
  const dataURI = await exportPDF(group, options);
  
  // Clean up clone container
  cloneContainer.parentNode.removeChild(cloneContainer);
};
```

#### Multiple PDF Export (ZIP)
File: `src/composables/useMultiplePDFExport.ts`

```javascript
function createHiddenContainer(processId: string): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -200%;
    top: 0;
    width: 297mm;
    min-height: 210mm;
    opacity: 0;
    pointer-events: none;
    z-index: -9999;
    overflow: hidden;
    zoom: 1.4925;  // Compensate for global zoom (1 / 0.67)
  `;
  document.body.appendChild(container);
  return container;
}
```

**Key points:**
- The container is positioned off-screen so the user doesn't see any UI changes
- `zoom: 1.4925` compensates the global `zoom: 0.67` from the `<html>` element
- The PDF is generated from the clone/hidden container, not the visible element
- The container is cleaned up after export completes

## Other Components That May Need Adjustment

If other modals or overlays present similar issues, apply the same pattern:

1. Import variables: `@import '@/resources/assets/styles/variables/_dimensions.scss';`
2. Multiply `vh`/`vw` values by the factor: `calc(100vh * #{$zoom-compensation})`

### Components to review if issues arise:
- Other modals in `src/modules/modal/`
- Global tooltips
- Dropdowns with fixed position
- Sidebars with `position: fixed`
- Other PDF export components (apply hidden clone with `zoom: 1.4925`)

## Compatibility

- **Chrome**: ✅ Supported
- **Edge**: ✅ Supported  
- **Safari**: ✅ Supported
- **Firefox**: ✅ Supported (since v126)

## Rollback

To revert, remove:
1. The `zoom: 0.67;` line from `_fonts.scss`
2. The `$zoom-compensation` compensations from affected modals
3. The `zoom: 1.4925` from PDF export containers in:
   - `src/modules/home/entityCard/pdf/EntityExportPDF.vue`
   - `src/composables/useMultiplePDFExport.ts`
