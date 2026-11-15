<template>
    <div :class="`circle ${size} ${bgColor}`"></div>
  </template>
  
  <script lang="ts">
  import { defineComponent } from "vue";
  
  export default defineComponent({
    name: "SquareShape",
    props: {
      bgColor: { type: String, default: "bg-gray-500" },
      size: { type: String, default: "small" },
    },
  });
  </script>
  
  <style lang="scss" scoped>
  @import "src/resources/assets/styles/variables/_colors";
  @import "src/resources/assets/styles/utils/_background.scss";
  .circle {
    border-radius: 0px;

    &.xsmall {
      width: 10px;
      height: 10px;
    }
    &.small {
      width: 15px;
      height: 15px;
    }
    &.medium {
      width: 20px;
      height: 20px;
    }
    &.large {
      width: 25px;
      height: 25px;
    }
  }
  </style>
  