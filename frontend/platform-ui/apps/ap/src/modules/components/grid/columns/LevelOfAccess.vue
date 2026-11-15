<template>
  <td class="text-center spend-filestatus-container">

    <a
      :id="'isPublic-' + dataItem.id"
      class="cursor-pointer"
      @click="changeLevelOfAccess()"
      >{{ currentLevelStatusString }} </a
    >
  </td>
</template>

<script lang="ts">
import { translate } from "@/utils/translation";
import { computed, defineComponent, reactive, toRefs, watch } from "vue";
import { useAdminBackendStore } from '@/stores/adminBackend';

export default defineComponent({
  name: "LevelOfAccessColumn",
  props: {
    dataItem: { type: Object, required: true },
    behavior: { type: String, default: "spendFile" }
  },
  emits: ["update-level-of-access"],
  setup(props, { emit }) {
    const adminBackendStore = useAdminBackendStore();

    interface DataInterface {
      currentLevelStatusIsPublic: boolean;
    }

    const data = reactive<DataInterface>({
      currentLevelStatusIsPublic: props.dataItem?.isPublic === true
    });


    watch(
      () => props.dataItem,
      () => {
        data.currentLevelStatusIsPublic = props.dataItem?.isPublic
      },
      { deep: true }
    );    

    const currentLevelStatusString = computed(() => {
      return data.currentLevelStatusIsPublic
        ? translate.t("adminBackend.adminUploadData.spendFileStatus.public")
        : translate.t("adminBackend.adminUploadData.spendFileStatus.private");
    });

    function changeLevelOfAccess() {
      emit(
        "update-level-of-access",
        props.behavior,
        data.currentLevelStatusIsPublic,
        props.dataItem
      );
    }

    watch(
      () => adminBackendStore.getCurrentSpendFileIsPublic,
      newValue => {
        const storeSpendFileStatusObject =
          adminBackendStore.mySpendFileStatusObject;        

        // Update only if the current dataItem matches the one in the store
        if (
          props.dataItem.iri === storeSpendFileStatusObject.iri &&
          props.dataItem.version === storeSpendFileStatusObject.version
        ) {
          
          data.currentLevelStatusIsPublic = newValue;
        }
      },
      { deep: true } // Add deep:true to track nested changes
    );

    return {
      ...toRefs(data),
      changeLevelOfAccess,
      currentLevelStatusString
    };
  }
});
</script>
