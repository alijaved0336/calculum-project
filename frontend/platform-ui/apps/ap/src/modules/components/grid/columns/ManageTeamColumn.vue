<template>
<td>
  <Tooltip :open-delay="100" :anchor-element="'target'">
    <div class="d-flex align-items-center justify-content-center gap-3 w-100 manage-team-container">
      <div class="ellipsis_custom pointer pt-3">
        <p class="pt-3 ml-2 ellipsis_custom custom-td-cell-for-grid" v-if="textValue !== '-'" :class="fieldClass" :title="textValue" :style="'text-align: ' + aligment + ';'">{{ textValue }}</p>
        <p class="pt-3 ml-2 ellipsis_custom custom-td-cell-for-grid" v-else :style="'text-transform: capitalize; text-align: ' + aligment + ';'">{{ textValue }}</p>
      </div>
      <div class="manage-team-wrapper"><i class="fa-solid fa-pencil text-sm cursor-pointer" @click.stop="onPencilClick"></i></div>
    </div>
  </Tooltip>
</td>
</template>
<script lang="ts">
import { defineComponent, computed } from "vue";
import { getNestedValue } from "@progress/kendo-vue-grid";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { NumberUtils, isNullOrUndefined } from "@/utils";
import { useI18n } from "vue-i18n";
export default defineComponent({
  name: "ManageTeamColumn",
  components: {
    Tooltip,
  },
  inject: {
    kendoIntlService: { default: null },
  },
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
    aligment: { type: String, required: false, default: "center" },
  },
  emits: ["call-action"],
  setup(props, { emit }) {
    const translate = useI18n();

    const fieldClass = computed(() => {
      const entityDomain = props.field !== "entityDomain";
      const byEmail = props.field !== "createdBy.email";
      if (entityDomain && byEmail) return "capitalize-text";
      return "";
    });
    const textValue = computed(() => {
      const value = getNestedValue(props.field, props.dataItem);
      if (isNullOrUndefined(value)) {
        return "-";
      } else {
        if (props.field === "smeSource") {
          return translate.t(`home.entityCard.companyDetails.${value}.name`);
        }
        if (value === "null") {
          return "-";
        }
        return value;
      }
    });

    /** Unique key for this row so the parent opens the dropdown only for the clicked row. */
    const rowKey = computed(() => {
      return props.dataItem?.["@id"] ?? props.dataItem?.id ?? props.dataItem?.uuid ?? String(NumberUtils.getRandomInt())
    });

    function onPencilClick() {
      emit("call-action", {
        open: true,
        rowKey: rowKey.value,
      });
    }

    return {
      textValue,
      fieldClass,
      onPencilClick,
    };
  },
});
</script>

<style scoped>
.capitalize-text {
  text-transform: capitalize;
}
.manage-team-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
</style>
