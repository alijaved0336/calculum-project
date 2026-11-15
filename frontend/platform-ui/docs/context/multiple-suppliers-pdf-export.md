# Multiple Suppliers PDF Export - Functionality

## Overview

This functionality allows exporting multiple suppliers in PDF format and compressing them into a ZIP file. It uses a hidden container outside the viewport to generate PDFs without affecting the visible UI, and dynamically mounts the `AnalyzedSupplierContentToExport` component for each supplier.

## Main Files

### 1. `src/composables/useMultiplePDFExport.ts`

**Purpose:** Composable that encapsulates all logic for generating multiple PDFs and compressing them into a ZIP.

**Exported Interfaces:**
- `SupplierExportData`: Defines the data structure required for each supplier
  ```typescript
  {
    supplierUuid: string;
    supplierName: string;
    dataSupplier: any; // Complete supplier data
  }
  ```
- `ExportProgress`: Defines the export progress state
  ```typescript
  {
    current: number;          // Current supplier
    total: number;            // Total suppliers
    currentSupplier: string;  // Current supplier name
    status: 'idle' | 'fetching' | 'generating' | 'compressing' | 'completed' | 'error';
  }
  ```

**Main Functionality:**

1. **`createHiddenContainer(processId)`**: Creates a hidden DOM container outside the viewport (position `-200%` to the left, `opacity: 0`) with dimensions of `297mm x 210mm` (horizontal A4) for a specific process. Each process has its own container identified by `processId` to prevent collisions when multiple processes run concurrently. This container allows the browser to properly render the component without being visible to the user.

2. **`generateSinglePDF(supplierName, dataSupplier, processId)`**: 
   - Cleans the hidden container
   - Creates a wrapper with the supplier name as title
   - Dynamically mounts a Vue instance with the `AnalyzedSupplierContentToExport` component
   - Configures all necessary plugins (Pinia, Router, i18n, Apollo Client)
   - Waits for multiple `nextTick()` and `requestAnimationFrame()` to ensure complete rendering
   - Verifies that content is rendered before generating the PDF
   - Waits for all images to load
   - Generates the PDF using `@progress/kendo-drawing` (`drawDOM` and `exportPDF`)
   - Converts the resulting `dataURI` to `Blob` using manual base64 conversion (avoids CSP violations)
   - Cleans the container before continuing

3. **`exportMultipleSuppliersToZip(suppliers[])`**:
   - Iterates over each supplier sequentially
   - For each supplier:
     - Updates progress
     - Uses `dataSupplier` directly if available (avoids API calls)
     - Generates the PDF by calling `generateSinglePDF()`
     - Adds the PDF to the `JSZip` object with a sanitized filename
     - Handles individual errors without stopping the entire process
   - Generates the ZIP with all created PDFs
   - Automatically downloads the ZIP with name `entities-pdf-export-YYYY-MM-DD.zip`
   - Updates final progress state
   - Shows toast notifications on completion:
     - Success toast when all PDFs are exported successfully
     - Warning toast when some PDFs failed (includes count of successful exports)
     - Error toast when the entire export process fails
     - Info toast when the export is cancelled
   - Notifications are shown even if the modal is closed (background export support)

4. **`cancelExport()`**: Sets the cancellation flag to stop the export process gracefully

5. **`cleanup()`**: Cleans all resources (unmounts Vue instance and removes container from DOM)

**PDF Properties:**
- Container: `297mm` width (horizontal A4 page)
- Options: `paperSize: "auto"`, `scale: 0.5`, `margin: 0.5cm` on all sides
- Uses `chartPDFOptions` with `css: true` and `avoidLinks: true`
- `drawDOM` with `waitForImages: true` and `waitForFonts: true`

**Composable Return:**
```typescript
{
  progress: Ref<ExportProgress>,      // Reactive progress state
  errors: Ref<Array<{...}>>,          // List of errors during export
  isExporting: Ref<boolean>,          // Export in progress flag
  exportMultipleSuppliersToZip: Function, // Main export function
  cancelExport: Function,             // Cancel export function
  cleanup: Function                    // Cleanup function
}
```

---

### 2. `src/modules/home/entityCard/pdf/MultipleSuppliersExportPDF.vue`

**Purpose:** Modal component that displays the list of selected suppliers for export and initiates the export process. The component does NOT display progress - all progress is shown in `BackgroundExportProgress.vue`.

**Props:**
- `suppliers: SupplierExportData[]`: Array of suppliers to export
- `levelOfGrid: string`: Level of grid for translation keys

**Emits:**
- `close`: Emitted when the user closes the modal
- `export-complete`: Emitted when export finishes (successfully or with error)
  ```typescript
  {
    success: boolean;
    total?: number;
    error?: string;
  }
  ```

**Functionality:**

1. **Supplier List Management:**
   - Maintains a local copy of `suppliers` in `suppliersToExport`
   - Watches `props.suppliers` to automatically reset when new suppliers are provided
   - Allows removing suppliers from the list before exporting (`removeSupplier()`)

2. **Export Initiation:**
   - When user clicks "Export to ZIP", the component:
     - Saves the suppliers list to a local variable
     - Resets `suppliersToExport` to allow immediate new exports
     - Closes the modal immediately
     - Shows an info toast notification
     - Starts the export process in the background (asynchronously)
   - The export process is managed by `useMultiplePDFExport` composable and progress is displayed in `BackgroundExportProgress.vue`

3. **Multiple Concurrent Exports:**
   - The component resets after each export is initiated, allowing users to send multiple export batches
   - Each export is tracked independently in `BackgroundExportProgress.vue` via `useBackgroundProcesses`

4. **Cleanup:**
   - Calls `cleanup()` from composable in `onUnmounted` to release resources

---

### 3. Integration in `EntityCardOverview.vue`

**Location:** `src/modules/home/entityCard/views/EntityCardOverview.vue`

**How it integrates:**

1. **Imports:**
   ```typescript
   import MultipleSuppliersExportPDF from "@/modules/home/entityCard/pdf/MultipleSuppliersExportPDF.vue";
   import { SupplierExportData } from '@/composables/useMultiplePDFExport';
   import { demoData, demoData2, demoData3 } from '../data/demo';
   ```

2. **Component in Template:**
   ```pug
   MultipleSuppliersExportPDF(
     v-if="showMultipleExportModal"
     :suppliers="suppliersForExport"
     @close="closeMultipleExportModal"
     @export-complete="handleMultipleExportComplete"
   )
   ```

3. **Reactive State:**
   - `showMultipleExportModal: boolean`: Controls modal visibility
   - `suppliersForExport: SupplierExportData[]`: Array of suppliers to export

4. **`openMultipleExportModal()` Function:**
   - Uses data from `demo.ts` to create test suppliers
   - Creates `SupplierExportData` objects with `id`, `supplierName` and `dataSupplier`
   - Assigns to `suppliersForExport.value`
   - Shows the modal (`showMultipleExportModal = true`)

5. **`handleMultipleExportComplete()` Function:**
   - Receives export results
   - Shows success or error notifications
   - Closes the modal

6. **Access Button:**
   - "Export multiple suppliers" button that calls `openMultipleExportModal()`

---

## Complete Flow

1. User clicks "Export multiple suppliers"
2. `openMultipleExportModal()` executes and loads suppliers from `demo.ts`
3. `MultipleSuppliersExportPDF` modal is shown with supplier list
4. User can remove suppliers from list or confirm export
5. User clicks "Export to ZIP"
6. `exportMultipleSuppliersToZip()` from composable is called
7. For each supplier:
   - Mounts `AnalyzedSupplierContentToExport` in hidden container
   - Waits for complete rendering
   - Generates PDF
   - Adds to ZIP
8. Final ZIP is generated and automatically downloaded
9. Success/error notification is shown

---

## Technical Considerations

1. **Offscreen Rendering:** The hidden container uses `opacity: 0` instead of `visibility: hidden` to allow the browser to properly render content before generating the PDF.

2. **Multiple Waits:** Multiple `nextTick()`, `requestAnimationFrame()` and `setTimeout()` are used to ensure Vue has completely rendered all subcomponents before capturing the DOM.

3. **Error Handling:** If generating an individual PDF fails, the process continues with the next suppliers. Errors are accumulated and shown at the end.

4. **Resource Cleanup:** Resources (Vue instance and container) are always cleaned after each PDF and when the component is unmounted.

5. **Consistent Properties:** PDF options are identical to `EntityExportPDF.vue` to maintain visual consistency.

6. **Filename Sanitization:** Filenames are sanitized by removing invalid characters and limiting length.

7. **Content Security Policy (CSP) Compliance:** The `dataURI` to `Blob` conversion uses manual base64 decoding with `atob()` instead of `fetch()` to avoid CSP violations in production environments. This ensures the export works correctly on servers with strict CSP policies.

8. **Background Export Support:** The export process runs entirely in the background. When the user clicks "Export to ZIP", the modal closes immediately and the export starts. Progress is displayed in `BackgroundExportProgress.vue`, which shows all active export processes in a single modal window. Toast notifications are used to inform users of export status (success, warning, error, cancellation) even when the modal is not visible.

9. **Multiple Concurrent Exports:** Users can initiate multiple export processes. Each export is tracked independently in `BackgroundExportProgress.vue` via the `useBackgroundProcesses` composable. The `MultipleSuppliersExportPDF.vue` component resets after each export is initiated, allowing users to send new batches immediately. All processes are displayed in a single modal window (`BackgroundExportProgress.vue`), with each process showing its title, status, progress bar (if running), and a simple "Cancel" button (only for running processes).

10. **Per-Process Container Isolation:** To prevent file name collisions when multiple processes run concurrently, each export process has its own hidden DOM container and Vue instance identified by `processId`. This ensures that when two processes generate PDFs with the same name (e.g., `supplier_1.pdf`), they don't interfere with each other. The system uses a `processContainers` Map to store containers per `processId`, replacing the previous singleton pattern. Containers are properly cleaned up when processes complete to prevent memory leaks.

---

## Dependencies

- `@progress/kendo-drawing`: For `drawDOM` and `exportPDF`
- `jszip`: For creating the ZIP file
- `vue-i18n`: For internationalization in dynamic components
- `pinia`: State store
- `vue-router`: Router for dynamic components
- `@vue/apollo-composable`: GraphQL client

---

## Future Usage

When integrating with real API data:
- Replace `demo.ts` usage with API calls
- Implement `fetchSupplierData()` to obtain supplier data when not available in `dataSupplier`
- Integrate with supplier selection from grid or list

---

## Bug Fixes and Improvements

### Sentry Error Fix: Promise executor functions should not be async (typescript:S6544)

**Issue:** The `generateSinglePDF` function was using an anti-pattern where an `async` function was wrapping code in a `new Promise(async (resolve, reject) => {...})`. This is problematic because:
- `async` functions already return a Promise automatically
- Using `async` in a Promise executor can cause error handling issues
- It's an unnecessary wrapper that adds complexity

**Solution:** Removed the `new Promise` wrapper and converted the function to use `async/await` directly:
- Changed `resolve(blob)` to `return blob`
- Changed `reject(error)` to `throw error`
- Maintained the same error handling and cleanup logic
- The function signature and return type remain unchanged

**Date:** Fixed in response to Sentry error report