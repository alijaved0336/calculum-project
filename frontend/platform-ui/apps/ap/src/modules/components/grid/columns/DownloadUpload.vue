<!--
  The download/upload pair for one adjustments file, shared by the payables columns and by AR's two.

  **The `extra` slot is how AR adds its result action without this component learning about AR**
  (AB#20259). That action reaches an endpoint only Receivables serves, so it stays at the call site;
  what belongs here is the cell it is rendered in, because "download, upload, and what happened" is
  one decision about one file and the payables columns have no third thing to show.
-->
<template>
<td :class=" 'download-upload-' + behavior">
  <div class="row">
    <div class="col-12 d-flex aling-items-center">
      <div v-if="userIsSuperAdmin" :class="cellClass()"><span class="no-wrap cursor-pointer" :class=" 'download-link-' + behavior" @click="download()">{{ $t('global.download') }}</span></div>
      <div :class="cellClass()">
        <input ref="fileInput" class="hidden-input" type="file" @change="handleFileUpload"/><span class="no-wrap cursor-pointer" :class=" 'upload-link-' + behavior" @click="openFileInput">{{ $t('global.upload') }}</span>
      </div>
      <div :class="cellClass()"> <span :class=" 'last-update-' + behavior">{{ getLastUpdate }}</span></div>
      <div v-if="$slots.extra" :class="cellClass()"><slot name="extra" /></div>
    </div>
  </div>
</td>
</template>

<script lang="ts">
import { defineComponent, computed, reactive, toRefs } from "vue";
import { useUser } from "@/composables";

export default defineComponent({
  name: "DownloadUpload",
  props: {
    dataItem: { type: Object, required: true },
    behavior: { type: String, required: true }
  },
  emits: [
    "download",
    "upload",
  ],
  setup(props, { emit, slots }) {
    const { userIsSuperAdmin } = useUser();

    /**
     * `col-4` while there are three items, `col` once a fourth joins them.
     *
     * Pinned to `col-4` in the three-item case rather than always `col` so the payables columns
     * render byte-identically to before the slot existed: `col` distributes by count, so a
     * non-superadmin's two-item row would have gone from two thirds to two halves — a layout change
     * in a column this change is not about.
     *
     * <b>A plain function, deliberately not a `computed`</b> (review finding on PR 14830). The setup
     * context's `slots` is not reactive, so a computed over it collects no dependencies: it is
     * evaluated once and cached, while the template's own `v-if="$slots.extra"` is re-read every
     * render. An instance Vue reuses across a slotted and an unslotted cell would then have rendered
     * four items on thirds, or three on quarters. Called per render, the class and the cell it sizes
     * are read from the same thing and cannot disagree.
     */
    function cellClass(): string {
      return slots.extra ? "col text-center" : "col-4 text-center";
    }

    interface DownloadUploadInterface {
      fileUpload: File | null;
      fileInput: any
    }

    const downloadUpload = reactive<
      DownloadUploadInterface
    >({
      fileUpload: null,
      fileInput: null
    });

    function dateHelper(behavior: string) {
      switch (behavior) {
        case 'smeAdjustments':
          return props.dataItem?.smeCustomizationLastUpdatedAt ?? '-'
        case 'peerGroupAndSupplierStandardAdjustments':
          return props.dataItem?.dataCustomizationLastUpdatedAt ?? '-'  
        // UC-SET-07 / AB#19711. AR owns the applied-adjustments timestamp — it lives in
        // ar.sale_line_customization, which this application does not read — so the sale-files grid
        // has no field for it yet and the cell shows '-'. Named here rather than left to fall
        // through to undefined, which the template would have rendered as an empty cell that looks
        // like a value of nothing rather than a figure nobody is reporting.
        case 'peerGroupAndBuyerStandardAdjustments':
          return props.dataItem?.strategyAdjustmentsLastUpdatedAt ?? '-'
        // UC-SET-08 / AB#19911, and '-' for the same reason as the case above: the applied
        // timestamp for this file lives in ar.parsed_company_customization, which AR owns and this
        // application does not read. Named rather than left to fall through to undefined, which
        // renders as an empty cell that reads as a value of nothing.
        case 'creditRatingAdjustments':
          return props.dataItem?.creditRatingAdjustmentsLastUpdatedAt ?? '-'
      }
    }

    /**
     * Date of Last Update: Null if never has been changed.
     */
    const getLastUpdate = computed(() => {
      return dateHelper(props.behavior)
    })

    const openFileInput = () => {
      // Trigger click event on the file input
      downloadUpload.fileInput?.click();
    };
    
    function download(): void {
      emit("download", props.dataItem, props.behavior);
    }

    function upload(): void {
      emit("upload", props.dataItem, downloadUpload.fileUpload, props.behavior);
    }

    const handleFileUpload = (event: Event) => {
      const inputElement = event.target as HTMLInputElement;
      const fileList = inputElement.files;

      if (fileList && fileList.length > 0) {
        // Assuming you only want to handle the first file if multiple files are selected
        downloadUpload.fileUpload = fileList[0];
        upload();
        // reset the file input
        inputElement.value = '';
      }
    };

    return {
      cellClass,
      ...toRefs(downloadUpload),
      download,
      getLastUpdate,
      handleFileUpload,
      openFileInput,
      upload,
      userIsSuperAdmin
    };
  }
});
</script>

<style lang="scss" scoped>
.no-wrap {
  white-space: nowrap;
}
.hidden-input {
  display: none;
}
</style>
