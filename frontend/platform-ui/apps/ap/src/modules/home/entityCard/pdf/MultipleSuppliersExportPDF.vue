<template>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('global.exportPDF' + levelOfGrid)" :capitalizeTitle="false" @close="handleClose">
  <template v-slot:modalContent>
    <div>
      <!-- Information message-->
      <div class="alert alert-info mb-3" v-if="suppliersToExport.length > 0">
        <p class="mb-0">{{  `${suppliersToExport.length} item(s) selected for export`    }} </p>
      </div>
      <!-- List of suppliers to export-->
      <div class="suppliers-list mb-3" v-if="suppliersToExport.length > 0">
        <div class="d-flex flex-wrap">
          <div class="d-flex align-items-center mb-2" v-for="(supplier, index) in suppliersToExport" :key="index">
            <div class="d-flex align-items-center justify-content-between badge_container mr-4 no-hover">
              <div class="d-flex align-items-center">
                <Tooltip class="ellipsis" :open-delay="100" :anchor-element="'target'" :position="'top'"> <span class="field_title mr-2" :title="supplier.supplierName">{{ supplier.supplierName }}</span></Tooltip>
              </div>
              <iconClose class="remove_icon_badge_container ml-2 cursor-pointer" @click="removeSupplier(supplier.supplierUuid)"></iconClose>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row mt-3">
      <div class="col-12 d-flex container-buttons justify-content-end">
        <button class="btn outline-secondary-btn font-md" @click="handleClose" style="z-index: 1; width: fit-content; margin-right: 10px;"><span>{{ $t('button.cancel') }}</span></button>
        <button class="btn btn-primary font-md" @click="handleExport" style="z-index: 1; width: fit-content;" :disabled="suppliersToExport.length === 0"><span>{{ $t('button.exportPDFtoZIP') }}</span></button>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref, onUnmounted, nextTick, watch } from 'vue';
import { useMultiplePDFExport, type SupplierExportData } from '@/composables/useMultiplePDFExport';
import CalculumModal from "@/modules/components/CalculumModal.vue";
import iconClose from '@/resources/assets/images/icons/iconClose.vue'
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useToast } from "vue-toastification";
export default defineComponent({
  name: 'MultipleSuppliersExportPDF',
  components: {
    CalculumModal,
    iconClose,
    Tooltip
  },
  props: {
    suppliers: {
      type: Array as () => SupplierExportData[],
      required: true,
      default: () => []
    },
    levelOfGrid: {
      type: String,
      required: true,
      default: ''
    }
  },
  emits: ['close', 'export-complete'],
  setup(props, { emit }) {
    const suppliersToExport = ref<SupplierExportData[]>([...props.suppliers]);
    
    const { 
      exportMultipleSuppliersToZip,
      cleanup 
    } = useMultiplePDFExport();
    const toast = useToast();

    // Watch props.suppliers to reset suppliersToExport when new suppliers are provided
    // This ensures the component resets when a new batch is sent
    watch(
      () => props.suppliers,
      (newSuppliers) => {
        suppliersToExport.value = [...newSuppliers];
      },
      { deep: true, immediate: true }
    );

    const removeSupplier = (supplierUuid: string) => {
      suppliersToExport.value = suppliersToExport.value.filter(
        s => s.supplierUuid !== supplierUuid
      );
    };

    const handleExport = async () => {
      if (suppliersToExport.value.length === 0) {
        return;
      }

      // Guardar los suppliers antes de cerrar el modal
      const suppliers = [...suppliersToExport.value];

      // Reset suppliersToExport to allow new exports immediately
      // This ensures the component is ready for a new batch
      suppliersToExport.value = [];

      // Close modal immediately when export starts - the Background Processes modal will appear automatically
      emit('close');
      
      // Wait for next tick to ensure the modal closes before starting the export
      await nextTick();
      
      // Pequeño delay adicional para asegurar que el modal se haya cerrado completamente
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // toast.info('Export started. You can continue working while the export runs in the background.');

      // Start export in background (don't await, let it run asynchronously)
      exportMultipleSuppliersToZip(suppliers)
        .then(() => {
          emit('export-complete', {
            success: true,
            total: suppliers.length
          });
          if (import.meta.env.DEV) console.log('Export completed successfully');
        })
        .catch((error: any) => {          
          if (import.meta.env.DEV) console.error('Error exporting suppliers:', error);
          emit('export-complete', {
            success: false,
            error: error?.message || 'Unknown error'
          });
        });
    };

    const handleClose = () => {
      // Simply close the modal - exports run in background and are managed by BackgroundMultiProcess
      emit('close');      
    };

    // Clean up resources on unmount
    onUnmounted(() => {
      cleanup();
    });

    return {
      suppliersToExport,
      removeSupplier,
      handleExport,
      handleClose
    };
  }
});
</script>

<style scoped>
.suppliers-list {
  max-height: 300px;
  overflow-y: auto;
}

.container-buttons {
  gap: 10px;
}
</style>

