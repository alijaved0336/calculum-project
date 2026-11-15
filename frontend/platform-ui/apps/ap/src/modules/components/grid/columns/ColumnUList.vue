<template>
  <td
    class="pt-3 ml-2 ellipsis_custom custom-td-cell-for-grid limited-height"
    :title="concatenatedList"
  >
    <Tooltip
      class="ellipsis_tooltip_custom_text"
      :open-delay="100"
      :anchor-element="'target'"
      :position="'bottom'"
    >
      <ul class="limited-height">
        <li v-for="(item, index) in list" :key="index" class="ml-6 list-disc">
          {{ item }}
        </li>
      </ul>
    </Tooltip>
  </td>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";

export default defineComponent({
  name: "ColumnUiList",
  components: {
    Tooltip
  },
  props: {
    list: { type: Array, required: false, default: null }
  },
  setup(props) {
    const concatenatedList = computed(() => {
      return props.list ? props.list.join(", ") : "";
    });
    return { concatenatedList };
  }
});
</script>

<style lang="scss" scoped>
.limited-height {
  max-height: 60px; 
  overflow-y: auto; 
  padding-left: 10px; 
}
.list-disc {
  list-style-type: disc;
}

</style>