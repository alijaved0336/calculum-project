<template>
  <td class="d-flex align-items-center mt-4 justify-content-center custom-gap">
    <!-- Mark as Solved -->
    <Tooltip
      :open-delay="100"
      :anchor-element="'target'"
      :position="'top'"
    >
      <div
        :title="getMarkAsSolvedTooltip()"
        class="d-flex align-items-center custom-padding"
        :class="isMarkAsSolvedDisabled ? 'no-pointer disabled' : 'custom_cursor_pointer'"
        @click="markAsSolved"
      >
        <iconCheckCircle width="16px" height="16px" class="icon mark-solved-action" />
      </div>
    </Tooltip>

    <!-- Edit -->
    <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
      <div 
        :title="$t('global.edit')" 
        class="d-flex align-items-center custom-padding custom_cursor_pointer" 
        :class="isEditDisabled ? 'no-pointer disabled' : ''"
        @click="editItem">
        <iconPencil class="icon edit-action" />
      </div>
    </Tooltip>

    <!-- Clone -->
    <Tooltip
      :open-delay="100"
      :anchor-element="'target'"
      :position="'top'"
    >
      <div
        :title="$t('global.clone')"
        class="d-flex align-items-center custom-padding custom_cursor_pointer"
        @click="cloneItem"
      >
        <iconClone width="16px" height="16px" class="icon clone-action" />
      </div>
    </Tooltip>

    <!-- Delete -->
    <Tooltip
      v-if="dataItem.cloned && dataItem.status?.toLowerCase() === 'pending'" 
      :open-delay="100"
      :anchor-element="'target'"
      :position="'top'">
      <div 
        :title="$t('global.delete')" 
        class="d-flex align-items-center custom-padding custom_cursor_pointer"
        @click="deleteItem">
        <iconTrash class="icon delete-action" />
      </div>
    </Tooltip>

    <Tooltip v-else :open-delay="100" :anchor-element="'target'" :position="'top'">
      <div :title="$t('global.delete')" class="d-flex align-items-center custom-padding no-pointer">
        <iconTrash class="icon disabled" />
      </div>
    </Tooltip>
  </td>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useI18n } from "vue-i18n";
import { Tooltip } from '@progress/kendo-vue-tooltip';
import iconTrash from "@/resources/assets/images/icons/iconTrash.vue";
import iconPencil from "@/resources/assets/images/icons/iconPencil.vue";
import iconClone from "@/resources/assets/images/icons/iconClone.vue";
import iconCheckCircle from "@/resources/assets/images/icons/iconCheckCircle.vue";
export default defineComponent({
  name: "ActionsDataChangeEditCloneDelete",
  components: {
    Tooltip,
    iconTrash,
    iconPencil,
    iconClone,
    iconCheckCircle,
  },
  props: {
    dataItem: { type: Object, required: true },
  },
  emits: ["edit-item", "clone-item", "delete-item", "mark-as-solved"],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    
    const isMarkAsSolvedDisabled = computed(() => {
      const status = props.dataItem?.status?.toLowerCase();
      return status !== 'pending';
    });

    const isEditDisabled = computed(() => {
      const status = props.dataItem?.status?.toLowerCase();
      // Edit button should only be enabled for pending status
      return status !== 'pending';
    });

    function getMarkAsSolvedTooltip() {
      const status = props.dataItem?.status?.toLowerCase();
      if (status === 'solved') {
        return translate.t('adminBackend.dataChange.alreadySolved');
      }
      return translate.t('adminBackend.dataChange.actions.markAsSolved');
    }

    function cloneItem() {
      emit("clone-item", props.dataItem);
    }
    function editItem() {
      // Only allow edit if status is pending
      if (!isEditDisabled.value) {
        emit("edit-item", props.dataItem);
      }
    }
    function deleteItem() {
      emit("delete-item", props.dataItem);
    }
    function markAsSolved() {
      if (!isMarkAsSolvedDisabled.value) {
        emit("mark-as-solved", props.dataItem);
      }
    }

    return {
      cloneItem,
      deleteItem,
      editItem,
      markAsSolved,
      isMarkAsSolvedDisabled,
      isEditDisabled,
      getMarkAsSolvedTooltip,
    };
  },
});
</script>
<style lang="scss" scoped>
.custom-gap{
gap: 10px;
}

.disabled {
  opacity: 0.4;
}

.no-pointer {
  cursor: default;
}

.icon {
  display: inline-block;
  width: 16px;
  height: 16px;
}

.mark-solved-action {
  width: 16px;
  height: 16px;
  color: inherit;
}

.mark-solved-action svg {
  fill: currentColor;
}
</style>