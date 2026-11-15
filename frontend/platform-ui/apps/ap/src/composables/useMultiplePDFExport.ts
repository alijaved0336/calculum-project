import { ref, createApp, App as VueApp, nextTick } from 'vue';
import { drawDOM, exportPDF } from '@progress/kendo-drawing';
// @ts-ignore - jszip uses CommonJS export = syntax, TypeScript has issues resolving it
import JSZip from 'jszip';
import { createI18n } from 'vue-i18n';
import { messages, defaultLocale } from '@ada/design-system/locales/index';
import pinia from '@/services/pinia/index';
import router from '@/services/router/index';
import { DefaultApolloClient } from '@vue/apollo-composable';
import { apolloClient } from '@/services/graphql/apolloClient';
import AnalyzedSupplierContentToExport from '@/modules/valueProposition/componentes/analyzedSipplier/AnalyzedSupplierContentToExport.vue';
import { useToast } from 'vue-toastification';
import { useBackgroundProcesses } from '@/composables/useBackgroundProcesses';

export interface SupplierExportData {
  supplierUuid: string;
  supplierName: string;
  dataSupplier: any;
}

export interface ExportProgress {
  current: number;
  total: number;
  currentSupplier: string;
  status: 'idle' | 'fetching' | 'generating' | 'compressing' | 'completed' | 'error';
}

/**
 * Composable to export multiple supplier PDFs and compress them into a ZIP
 * Uses a hidden container to avoid rendering multiple times in the visible DOM
 * 
 * IMPORTANT: This composable uses a singleton pattern to share state between components
 */

// Shared state (singleton) - outside the function so it's shared
const progress = ref<ExportProgress>({
  current: 0,
  total: 0,
  currentSupplier: '',
  status: 'idle'
});

const errors = ref<Array<{ supplierName: string; error: string }>>([]);
const isExporting = ref(false);
const isCancelled = ref(false);
const isMinimized = ref(false);

// Mapa de contenedores por proceso: processId -> { container, vueApp }
const processContainers = new Map<string, {
  container: HTMLDivElement;
  vueApp: VueApp | null;
}>();

// Map of active processes: processId -> cancelFn (shared)
const activeProcesses = new Map<string, () => void>();

/**
 * Initializes the hidden container outside the viewport for a specific process
 * We use absolute position outside the viewport but without visibility: hidden
 * so the browser can render correctly
 * Each process has its own container to avoid collisions
 */
function createHiddenContainer(processId: string): HTMLDivElement {
  // If a container already exists for this process, return it
  const existing = processContainers.get(processId);
  if (existing) {
    return existing.container;
  }

  // Create new container for this process
  const container = document.createElement('div');
  container.id = `hidden-pdf-export-container-${processId}`;
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
    zoom: 1.4925;
  `;
  container.className = 'background-gray';
  document.body.appendChild(container);

  // Save in the process map
  processContainers.set(processId, {
    container,
    vueApp: null
  });

  return container;
}

/**
 * Cleans the hidden container of a specific process
 */
function cleanupHiddenContainer(processId: string) {
  const processData = processContainers.get(processId);
  if (!processData) {
    return;
  }

  if (processData.vueApp) {
    processData.vueApp.unmount();
    processData.vueApp = null;
  }

  if (processData.container) {
    processData.container.innerHTML = '';
  }
}

/**
 * Cleans and completely removes the container of a process
 */
function removeProcessContainer(processId: string) {
  const processData = processContainers.get(processId);
  if (!processData) {
    return;
  }

  // Clean Vue app
  if (processData.vueApp) {
    processData.vueApp.unmount();
    processData.vueApp = null;
  }

  // Remove from DOM
  if (processData.container && processData.container.parentNode) {
    processData.container.parentNode.removeChild(processData.container);
  }

  // Remove from map
  processContainers.delete(processId);
}

/**
 * Waits for all images inside an element to load
 */
function waitForImages(element: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check cancellation immediately
    if (isCancelled.value) {
      reject(new Error('Export cancelled by user'));
      return;
    }

    const images = element.querySelectorAll('img');
    if (images.length === 0) {
      resolve();
      return;
    }

    let loadedCount = 0;
    const totalImages = images.length;

    // Set up periodic cancellation check
    const cancellationCheckInterval = setInterval(() => {
      if (isCancelled.value) {
        clearInterval(cancellationCheckInterval);
        reject(new Error('Export cancelled by user'));
      }
    }, 100); // Check every 100ms

    const checkComplete = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        clearInterval(cancellationCheckInterval);
        resolve();
      }
    };

    images.forEach((img) => {
      if (img.complete) {
        checkComplete();
      } else {
        img.onload = checkComplete;
        img.onerror = checkComplete; // Continue even if image fails
      }
    });
  });
}

/**
 * Get the supplier data from the API
 * Note: This function is not used currently because we are working with demoData
 */
async function fetchSupplierData(
  supplierUuid: string,
  supplierName: string
): Promise<any> {
  // For now, this function is not used because we are working with demoData
  // which already contains all necessary information
  throw new Error('fetchSupplierData not implemented - using demoData');
}

export function useMultiplePDFExport() {
  const toast = useToast();
  const { addProcess, updateProcess } = useBackgroundProcesses();

  /**
   * Generates a PDF for a supplier using the process's hidden container
   */
  async function generateSinglePDF(
    supplierName: string,
    dataSupplier: any,
    processId: string
  ): Promise<Blob | null> {
    try {
      // Ensure the container exists for this process
      const container = createHiddenContainer(processId);
      const processData = processContainers.get(processId)!;

      // Clear previous content
      container.innerHTML = '';
      if (processData.vueApp) {
        processData.vueApp.unmount();
        processData.vueApp = null;
      }

      // Create wrapper for content
      const wrapper = document.createElement('div');
      wrapper.className = 'background-gray pdf-export-wrapper';
      wrapper.style.cssText = `
        padding: 10px;
        background: #f2f4f7;
        border-radius: 8px;
        width: 100%;
      `;

      // Create title
      const title = document.createElement('span');
      title.className = 'text-2xl font-medium text-gray-700 mb-2';
      title.textContent = supplierName;
      title.style.cssText = `
        font-size: 1.5rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
        display: block;
      `;
      wrapper.appendChild(title);

      // Create container for component
      const componentWrapper = document.createElement('div');
      componentWrapper.id = `pdf-content-${Date.now()}`;
      wrapper.appendChild(componentWrapper);
      container.appendChild(wrapper);

      // Create Vue instance with component
      const i18n = createI18n({
        messages,
        locale: defaultLocale,
        fallbackLocale: defaultLocale,
        legacy: false,
        globalInjection: true,
      });

      const vueApp = createApp(AnalyzedSupplierContentToExport, {
        objectContent: dataSupplier,
        supplierName: supplierName,
        editionMode: false,
        isExportingToPdf: true
      });

      vueApp.use(pinia);
      vueApp.use(router);
      vueApp.use(i18n);
      vueApp.provide(DefaultApolloClient, apolloClient);
      vueApp.mount(componentWrapper);
      
      // Save Vue instance in process map
      processData.vueApp = vueApp;
      if (import.meta.env.DEV) console.log('Vue component mounted for:', supplierName, 'process:', processId);

      // Wait for multiple Vue ticks to ensure complete rendering
      await nextTick();
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }
      await nextTick();
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }
      await nextTick();
      if (import.meta.env.DEV) console.log('NextTicks completed for:', supplierName);
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // Wait for browser to paint content
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (import.meta.env.DEV) console.log('RequestAnimationFrame completed for:', supplierName);
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // Wait additional time for Vue to render all subcomponents
      await new Promise(resolve => setTimeout(resolve, 500));
      if (import.meta.env.DEV) console.log('Initial wait completed for:', supplierName);
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }
      
      // Verify component has content
      const componentContent = componentWrapper.querySelector('.content-editor');
      if (!componentContent) {
        console.warn('Component does not have content yet, waiting for more time...');
        await new Promise(resolve => setTimeout(resolve, 500));
        if (isCancelled.value) {
          throw new Error('Export cancelled by user');
        }
      }
      
      // Wait for images to load
      await waitForImages(wrapper);
      if (import.meta.env.DEV) console.log('Images loaded for:', supplierName);
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // Wait additional time after loading images
      await new Promise(resolve => setTimeout(resolve, 300));
      if (import.meta.env.DEV) console.log('Final wait completed for:', supplierName);
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // Final verification: ensure content is rendered
      const finalCheck = componentWrapper.querySelector('.content-editor');
      const contentHeight = wrapper.offsetHeight || wrapper.scrollHeight;
      if (import.meta.env.DEV) console.log('Final verification - Content found:', !!finalCheck, 'Height:', contentHeight);
      
      if (!finalCheck || contentHeight < 50) {
        console.warn('The content does not seem to be rendered completely, waiting for more time...');
        await new Promise(resolve => setTimeout(resolve, 500));
        if (isCancelled.value) {
          throw new Error('Export cancelled by user');
        }
      }

      // Check cancellation before generating PDF
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // Generate PDF from the hidden container
      if (import.meta.env.DEV) console.log('Starting generation of PDF for:', supplierName);
      // Base PDF options (same as EntityExportPDF.vue)
      const pdfOptions = {
        paperSize: "auto",
        margin: { top: "0.5cm", left: "0.5cm", right: "0.5cm", bottom: "0.5cm" },
        scale: 0.5,
        repeatHeaders: false
      };
      
      // Options for drawDOM and exportPDF (same as EntityExportPDF.vue)
      const chartPDFOptions = {
        ...pdfOptions,
        css: true,
        avoidLinks: true
      };

      // Check cancellation before drawDOM
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // drawDOM with the same options as EntityExportPDF.vue
      const group = await drawDOM(wrapper, {
        paperSize: "auto",
        margin: pdfOptions.margin,
        css: true,
        avoidLinks: true,
        waitForImages: true,
        waitForFonts: true
      } as any);

      // Check cancellation after drawDOM
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // exportPDF with chartPDFOptions (same as EntityExportPDF.vue)
      const dataURI = await exportPDF(group, chartPDFOptions);
      if (import.meta.env.DEV) console.log('[PDF Export] PDF dataURI generated for:', supplierName, 'Length:', dataURI?.length || 0);
      if (import.meta.env.DEV) console.log('[PDF Export] DataURI starts with:', dataURI?.substring(0, 50) || 'undefined');
      if (import.meta.env.DEV) console.log('[PDF Export] DataURI type:', typeof dataURI);
      
      // Check cancellation after exportPDF
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // Check cancellation before converting to Blob
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // Convert dataURI to Blob using manual conversion (avoids CSP violations)
      // IMPORTANT: We NEVER use fetch() here to avoid CSP violations
      let blob: Blob;
      try {
        // Validate dataURI exists and is a string
        if (!dataURI || typeof dataURI !== 'string') {
          console.error('[PDF Export] Invalid dataURI type:', typeof dataURI, 'Value:', dataURI);
          throw new Error(`Invalid dataURI: ${typeof dataURI} - ${dataURI}`);
        }

        if (dataURI.startsWith('data:')) {
          if (import.meta.env.DEV) console.log('[PDF Export] Converting dataURI to Blob using manual conversion (NO FETCH) for:', supplierName);
          
          // Extract base64 data from dataURI
          // Format: data:application/pdf;base64,<base64-data>
          const base64Match = dataURI.match(/^data:([^;]+);base64,(.+)$/);
          if (!base64Match || !base64Match[2]) {
            console.error('[PDF Export] Invalid dataURI format. First 100 chars:', dataURI.substring(0, 100));
            throw new Error('Invalid dataURI format - cannot extract base64 data');
          }
          
          const mimeType = base64Match[1] || 'application/pdf';
          const base64Data = base64Match[2];
          
          if (import.meta.env.DEV) console.log('[PDF Export] MIME type:', mimeType, 'Base64 length:', base64Data.length);
          
          // Convert base64 to binary using atob (NO FETCH - avoids CSP)
          let binaryString: string;
          try {
            binaryString = atob(base64Data);
            if (import.meta.env.DEV) console.log('[PDF Export] Base64 decoded successfully, binary length:', binaryString.length);
          } catch (atobError) {
            console.error('[PDF Export] Error in atob conversion:', atobError);
            throw new Error(`Failed to decode base64: ${atobError}`);
          }
          
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Create Blob from binary data (NO FETCH - direct creation)
          blob = new Blob([bytes], { type: mimeType });
          
          if (import.meta.env.DEV) console.log('[PDF Export] Blob created successfully (manual conversion, NO FETCH) for:', supplierName, 'Size:', blob.size, 'bytes, Type:', blob.type);
        } else if (dataURI.startsWith('blob:')) {
          // For blob URLs, we cannot use fetch due to CSP - this should not happen with exportPDF
          if (import.meta.env.DEV) console.error('[PDF Export] Received blob URL instead of dataURI - this should not happen');
          throw new Error('Blob URL received - cannot convert due to CSP restrictions. exportPDF should return dataURI.');
        } else {
          if (import.meta.env.DEV) console.error('[PDF Export] Unsupported dataURI format. First 100 chars:', dataURI.substring(0, 100));
          throw new Error(`Unsupported dataURI format: ${dataURI.substring(0, 50)}...`);
        }
      } catch (blobError: any) {
        if (import.meta.env.DEV) console.error('[PDF Export] Error converting dataURI to Blob for:', supplierName);
        if (import.meta.env.DEV) console.error('[PDF Export] Error details:', blobError);
        if (import.meta.env.DEV) console.error('[PDF Export] Error message:', blobError?.message);
        if (import.meta.env.DEV) console.error('[PDF Export] Error stack:', blobError?.stack);
        if (import.meta.env.DEV) console.error('[PDF Export] DataURI type:', typeof dataURI);
        if (import.meta.env.DEV) console.error('[PDF Export] DataURI preview:', dataURI?.substring(0, 100));
        throw blobError;
      }

      // Final cancellation check before returning
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // Clean up (only content, not the complete container)
      cleanupHiddenContainer(processId);

      return blob;
    } catch (error) {
      cleanupHiddenContainer(processId);
      throw error;
    }
  }

  /**
   * Cancel the export process
   */
  function cancelExport(processId?: string) {
    isCancelled.value = true;
    isMinimized.value = false;
    if (processId) {
      updateProcess(processId, { status: 'cancelled' });
      activeProcesses.delete(processId);
    } else {
      // Cancel all active processes
      activeProcesses.forEach((cancelFn, id) => {
        updateProcess(id, { status: 'cancelled' });
        cancelFn();
      });
      activeProcesses.clear();
    }
    if (import.meta.env.DEV) console.log('Export cancelled by user');
  }

  /**
   * Set the minimized state (when user clicks "Minimize to Background")
   */
  function setMinimized(value: boolean) {
    isMinimized.value = value;
  }

  /**
   * Export multiple suppliers to PDF and compress them in a ZIP
   */
  async function exportMultipleSuppliersToZip(
    suppliers: SupplierExportData[]
  ): Promise<void> {
    if (suppliers.length === 0) {
      throw new Error('There are no suppliers to export');
    }

    // Reset all state completely before starting new export
    isExporting.value = false; // Reset first to hide previous progress bar
    isCancelled.value = false;
    isMinimized.value = false;
    errors.value = [];
    progress.value = {
      current: 0,
      total: 0,
      currentSupplier: '',
      status: 'idle'
    };

    // Wait a tick to ensure previous state is cleared
    await nextTick();

    // Now set up new export state
    isCancelled.value = false;
    isMinimized.value = true; // Set minimized to true automatically so BackgroundMultiProcess shows immediately
    isExporting.value = true;
    progress.value = {
      current: 0,
      total: suppliers.length,
      currentSupplier: '',
      status: 'idle'
    };

    // Register process in background process queue
    const currentProcessId = addProcess(
      'Exporting PDF',
      'PDF_EXPORT',
      suppliers.length,
      true, // cancelable
      () => {
        // Cancellation function specific to this process
        isCancelled.value = true;
        updateProcess(currentProcessId, { status: 'cancelled' });
        activeProcesses.delete(currentProcessId);
      }
    );
    
    // Save cancellation function
    activeProcesses.set(currentProcessId, () => {
      isCancelled.value = true;
    });

    const zip = new JSZip();
    // Track used file names to handle duplicates
    const usedFileNames = new Map<string, number>();

    try {
      for (let i = 0; i < suppliers.length; i++) {
        // Check if export was cancelled
        if (isCancelled.value) {
          if (import.meta.env.DEV) console.log('Export cancelled, stopping generation');
          progress.value.status = 'idle';
          throw new Error('Export cancelled by user');
        }

        const supplier = suppliers[i];
        
        progress.value = {
          current: i + 1,
          total: suppliers.length,
          currentSupplier: supplier.supplierName,
          status: 'fetching'
        };

        // Update progress in process queue
        if (currentProcessId) {
          updateProcess(currentProcessId, {
            progress: {
              current: i + 1,
              total: suppliers.length,
              statusText: `Processing ${supplier.supplierName}...`
            }
          });
        }

        try {
          // Get supplier data (use dataSupplier if available, otherwise get it from the API)
          let supplierData = supplier.dataSupplier;
          
          if (!supplierData) {
            // Check cancellation before API call
            if (isCancelled.value) {
              throw new Error('Export cancelled by user');
            }
            progress.value.status = 'fetching';
            supplierData = await fetchSupplierData(
              supplier.supplierUuid,
              supplier.supplierName
            );
          }

          // Check cancellation before generating PDF
          if (isCancelled.value) {
            throw new Error('Export cancelled by user');
          }

          // Generate PDF
          progress.value.status = 'generating';
          if (currentProcessId) {
            updateProcess(currentProcessId, {
              progress: {
                current: i + 1,
                total: suppliers.length,
                statusText: `Generating PDF for ${supplier.supplierName}...`
              }
            });
          }
          if (import.meta.env.DEV) console.log(`Generating PDF for: ${supplier.supplierName}`);
          const pdfBlob = await generateSinglePDF(
            supplier.supplierName,
            supplierData,
            currentProcessId
          );

          // Check cancellation after PDF generation
          if (isCancelled.value) {
            throw new Error('Export cancelled by user');
          }

          if (import.meta.env.DEV) console.log(`PDF generated for ${supplier.supplierName}:`, pdfBlob ? `Blob of ${pdfBlob.size} bytes` : 'null/undefined');

          if (pdfBlob && pdfBlob instanceof Blob) {
            // Clean the supplier name for the file (remove invalid characters)
            const sanitizedBaseName = supplier.supplierName
              .replace(/[<>:"/\\|?*]/g, '_')
              .replace(/\s+/g, '_')
              .substring(0, 100); // Limit length

            // Handle duplicate file names by adding a suffix
            let fileName = `${sanitizedBaseName}.pdf`;
            if (usedFileNames.has(sanitizedBaseName)) {
              const count = (usedFileNames.get(sanitizedBaseName) || 0) + 1;
              usedFileNames.set(sanitizedBaseName, count);
              fileName = `${sanitizedBaseName}_${count}.pdf`;
              if (import.meta.env.DEV) console.log(`Duplicate name detected, using: ${fileName}`);
            } else {
              usedFileNames.set(sanitizedBaseName, 0);
            }

            zip.file(fileName, pdfBlob);
            if (import.meta.env.DEV) console.log(`PDF added to ZIP: ${fileName}`);
          } else {
            const errorMsg = `Could not generate the PDF for ${supplier.supplierName} - the blob is ${pdfBlob}`;
            if (import.meta.env.DEV) console.error(errorMsg);
            errors.value.push({
              supplierName: supplier.supplierName,
              error: errorMsg
            });
          }
        } catch (error: any) {
          // If cancelled, re-throw to stop the entire process
          if (isCancelled.value || error?.message === 'Export cancelled by user') {
            throw error;
          }
          
          const errorMessage = error?.message || 'Unknown error';
          if (import.meta.env.DEV) console.error(`Error complete when exporting ${supplier.supplierName}:`, error);
          if (import.meta.env.DEV) console.error('Stack trace:', error?.stack);
          errors.value.push({
            supplierName: supplier.supplierName,
            error: errorMessage
          });
          // Continue with the next supplier
        }
      }

      // Check cancellation before generating ZIP
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // Verify that there are files in the ZIP before generating it
      const fileCount = Object.keys(zip.files).length;
      if (import.meta.env.DEV) console.log(`Total files in ZIP: ${fileCount}`);
      
      if (fileCount === 0) {
        throw new Error('No PDFs were generated to include in the ZIP');
      }

      // Generate ZIP
      progress.value.status = 'compressing';
      if (currentProcessId) {
        updateProcess(currentProcessId, {
          progress: {
            current: suppliers.length,
            total: suppliers.length,
            statusText: 'Compressing ZIP file...'
          }
        });
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      if (import.meta.env.DEV) console.log(`ZIP generated: ${zipBlob.size} bytes with ${fileCount} file(s)`);

      // Check cancellation before downloading
      if (isCancelled.value) {
        throw new Error('Export cancelled by user');
      }

      // Download ZIP
      const link = document.createElement('a');
      const url = URL.createObjectURL(zipBlob);
      link.href = url;
      
      const date = new Date().toISOString().split('T')[0];
      link.download = `entities-pdf-export-${date}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      progress.value.status = 'completed';
      
      // Mark process as completed in queue
      if (currentProcessId) {
        const successCount = suppliers.length - errors.value.length;
        updateProcess(currentProcessId, {
          status: 'completed',
          progress: {
            current: suppliers.length,
            total: suppliers.length,
            statusText: errors.value.length === 0 
              ? `Completed: ${successCount} PDF(s) exported`
              : `Completed with ${errors.value.length} error(s)`
          }
        });
      }
      
      // Show success notification (even if modal is closed)
      const successCount = suppliers.length - errors.value.length;
      if (errors.value.length === 0) {
        toast.success(`Export completed successfully! ${successCount} PDF(s) exported and downloaded.`);
      } else {
        toast.warning(`Export completed with ${errors.value.length} error(s). ${successCount} PDF(s) exported successfully.`);
      }
    } catch (error: any) {
      // If cancelled, don't show error status, just reset
      if (isCancelled.value || error?.message === 'Export cancelled by user') {
        progress.value.status = 'idle';
        if (currentProcessId) {
          updateProcess(currentProcessId, {
            status: 'cancelled',
            progress: {
              current: progress.value.current,
              total: progress.value.total,
              statusText: 'Cancelled by user'
            }
          });
        }
        if (import.meta.env.DEV) console.log('Export cancelled, resetting state');        
      } else {
        progress.value.status = 'error';
        if (currentProcessId) {
          const errorMessage = error?.message || 'Unknown error occurred during export';
          updateProcess(currentProcessId, {
            status: 'failed',
            error: errorMessage,
            progress: {
              current: progress.value.current,
              total: progress.value.total,
              statusText: 'Failed'
            }
          });
        }
        if (import.meta.env.DEV) console.error('Error in exportMultipleSuppliersToZip:', error);
        if (import.meta.env.DEV) console.error('Accumulated errors:', errors.value);
        
        // Show error notification (even if modal is closed)
        const errorMessage = error?.message || 'Unknown error occurred during export';
        toast.error(`Export failed: ${errorMessage}`);
        
        throw error;
      }
    } finally {
      // Clean up current process container
      if (currentProcessId) {
        removeProcessContainer(currentProcessId);
        activeProcesses.delete(currentProcessId);
      }
      isExporting.value = false;
      // Reset cancellation flag and minimized state for next export
      isCancelled.value = false;
      isMinimized.value = false;
    }
  }

  /**
   * Clean up resources when unmounting
   * Cleans all active process containers
   */
  function cleanup() {
    // Clean all process containers
    processContainers.forEach((processData, processId) => {
      removeProcessContainer(processId);
    });
    processContainers.clear();
  }

  return {
    progress,
    errors,
    isExporting,
    isMinimized,
    exportMultipleSuppliersToZip,
    cancelExport,
    setMinimized,
    cleanup
  };
}

