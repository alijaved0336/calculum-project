<template>
<CalculumModal :size="'xlg'" :showClose="true" :title="supplierName" :isPdfModal="true" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="background-gray" :class="isExportingToPdf ? '' : 'pdf-content show-scroll'" ref="contentToExport"><span class="text-2xl font-medium text-gray-700 mb-2" v-if="isExportingToPdf">{{ supplierName }}</span>
      <AnalyzedSupplierContentToExport :object-content="dataSupplier" :supplierName="supplierName" :editionMode="false" :isExportingToPdf="isExportingToPdf"></AnalyzedSupplierContentToExport>
    </div>
    <div class="row mt-2 mb-2">
      <div class="col-12 d-flex container-buttons">
        <button class="btn outline-secondary-btn font-md" @click="$emit('close')" style="z-index: 1; width: fit-content; margin-right: 10px;"><span>{{$t('button.cancel')}} </span></button>
        <button class="btn btn-primary font-md" @click="exportToPDF" style="z-index: 1; width: fit-content;"><span>{{ 'Export to PDF' }}</span></button>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script>
import { defineComponent, ref, reactive } from 'vue';
import { drawDOM, exportPDF } from '@progress/kendo-drawing';
import AnalyzedSupplierContentToExport from '@/modules/valueProposition/componentes/analyzedSipplier/AnalyzedSupplierContentToExport.vue';
import CalculumModal from "@/modules/components/CalculumModal.vue";

export default defineComponent({
name: 'EntityExportPDF',
components: {
    AnalyzedSupplierContentToExport,
    CalculumModal
},
props: {
    supplierName: {
        type: String,
        required: true
    },
    dataSupplier: {
        type: Object,
        required: true
    }
},
emits: ['close'],
setup(props, { emit }) {
    
    const contentToExport = ref(null);
    const isExportingToPdf = ref(false);

    const pdfOptions = reactive({
        paperSize: "auto",
        margin: { top: "0.5cm", left: "0.5cm", right: "0.5cm", bottom: "0.5cm" },
        scale: 0.5,
        repeatHeaders: false
        
    });

    const downloadPDF = (dataURI, filename) => {
    const link = document.createElement('a');
    link.href = dataURI;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    };

    // PDF Export Constants
    // ZOOM_COMPENSATION: Factor to counteract global 0.67 zoom (1 / 0.67 ≈ 1.4925)
    // MIN_PDF_WIDTH: Minimum width in pixels to ensure PDF renders correctly on small screens
    const ZOOM_COMPENSATION = 1.4925;
    const MIN_PDF_WIDTH = 1200;

    const exportToPDF = async () => {
    let cloneContainer = null;
    try {
        isExportingToPdf.value = true;
        const element = contentToExport.value;
        
        if (!element) {
        throw new Error('Element not found');
        }
        
        // Create hidden container with zoom compensation
        // Use a minimum width to ensure PDF is not cut off on small screens
        const elementWidth = element.offsetWidth;
        const exportWidth = Math.max(elementWidth, MIN_PDF_WIDTH);
        
        cloneContainer = document.createElement('div');
        cloneContainer.style.cssText = `
            position: fixed;
            left: -99999px;
            top: 0;
            zoom: ${ZOOM_COMPENSATION};
            width: ${exportWidth}px;
        `;
        
        // Clone element for PDF export
        const clone = element.cloneNode(true);
        
        // Remove height restrictions and overflow from clone to capture full content
        clone.style.height = 'auto';
        clone.style.maxHeight = 'none';
        clone.style.overflow = 'visible';
        clone.classList.remove('pdf-content');
        
        cloneContainer.appendChild(clone);
        document.body.appendChild(cloneContainer);
        
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const chartPDFOptions = {
            ...pdfOptions,            
            css: true,
            avoidLinks: true
        };
        
        const group = await drawDOM(clone, {        
            paperSize: "auto",
            margin: chartPDFOptions.margin,
            css: true,
            avoidLinks: true,
            waitForImages: true,
            waitForFonts: true
        });
        
        const dataURI = await exportPDF(group, chartPDFOptions);
        
        const filename = `${props.supplierName}.pdf`;
        
        downloadPDF(dataURI, filename);
        isExportingToPdf.value = false;
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
    } finally {
        // Clean up clone container
        if (cloneContainer && cloneContainer.parentNode) {
            cloneContainer.parentNode.removeChild(cloneContainer);
        }
    }
    };


    const chartPDFOptions = reactive({

    });

    return {
    contentToExport,
    pdfOptions,
    chartPDFOptions,
    downloadPDF,
    exportToPDF,    
    isExportingToPdf
    };
}
});
</script>

<style scoped lang="scss">
@import '@/resources/assets/styles/variables/_dimensions.scss';

.pdf-content {
    height: calc(100vh * #{$zoom-compensation} - 200px);
    overflow-y: auto;
    overflow-x: hidden;
}

.background-gray {
    padding: 10px; 
    background: #f2f4f7;
    border-radius: 8px;
}
</style>