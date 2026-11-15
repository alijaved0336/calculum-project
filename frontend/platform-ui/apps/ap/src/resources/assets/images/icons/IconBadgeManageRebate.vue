<template>
  <svg :width="getSize.width" :height="getSize.height" viewBox="0 0 16 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M0 11.1111C0 11.8472 0.597222 12.4444 1.33333 12.4444H14.6667C15.4028 12.4444 16 11.8472 16 11.1111V6.22222H0V11.1111ZM5.33333 9.22222C5.33333 9.03889 5.48333 8.88889 5.66667 8.88889H9.44444C9.62778 8.88889 9.77778 9.03889 9.77778 9.22222V10.3333C9.77778 10.5167 9.62778 10.6667 9.44444 10.6667H5.66667C5.48333 10.6667 5.33333 10.5167 5.33333 10.3333V9.22222ZM1.77778 9.22222C1.77778 9.03889 1.92778 8.88889 2.11111 8.88889H4.11111C4.29444 8.88889 4.44444 9.03889 4.44444 9.22222V10.3333C4.44444 10.5167 4.29444 10.6667 4.11111 10.6667H2.11111C1.92778 10.6667 1.77778 10.5167 1.77778 10.3333V9.22222ZM16 1.33333V2.66667H0V1.33333C0 0.597222 0.597222 0 1.33333 0H14.6667C15.4028 0 16 0.597222 16 1.33333Z"
      fill="#667085" />
  </svg>

</template>
<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "IconBadgeManageRebate",
  props: {
    sizeWidth: { type: String, default: "16" },
    sizeHeight: { type: String, default: "13" }
  },
  setup(props) {
    const getSize=computed(()=>{
      return props.sizeWidth !== "16" &&  props.sizeHeight !== "13" ? {width:String(props.sizeWidth), height:String(props.sizeHeight)}: {width:"16", height:"13"}
    })
    return {
      getSize
    };
  }
});
</script>
