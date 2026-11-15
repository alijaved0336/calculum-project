<template>
  <KendoDropDownButton
    :items="dataList"    
    :shape="'square'"
    :svg-icon="moreVerticalIcon"
    button-class="-mr-2 pl-2 pr-0"
    fill-mode="flat"
    rounded="large"
    @itemclick="onItemclick"
  />
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { DropDownButton } from "@progress/kendo-vue-buttons";
import { moreVerticalIcon } from "@progress/kendo-svg-icons";

export default defineComponent({
  name: "CalculumDropDownButton",
  components: {
    KendoDropDownButton: DropDownButton,
  },
  props: {
    dataList: {
      type: Array as PropType<Array<{ key: string; text: string }>>,
      required: true,
    },
  },
  emits: ["item-clicked"],
  setup(props: any, { emit }: any) {
    return {
      moreVerticalIcon,      
      onItemclick: function (e: any) {        
        emit("item-clicked", e);
      },
    };
  },
});
</script>
