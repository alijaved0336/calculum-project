<template>
  <Skeleton
    class="skeletons-bg"
    :shape="'rectangle'"
    :style="styleComputed"
  />
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from "vue";
import { Skeleton } from "@progress/kendo-vue-indicators";

export default defineComponent({
  name: "SkeletonPill",
  components: {
    Skeleton,
  },
  props: {
    size: {
      type: Object as PropType<"sm" | "md" | "lg">,
      required: true,
    },
  },
  setup(props) {
    const styleComputed = computed(() => {
      switch (props.size) {
        case "md":
          return {
            width: "56px",
            height: "36px",
            borderRadius: "50px",
          };

        case "lg":
          return {
            width: "88px",
            height: "44px",
            borderRadius: "50px",
          };

        // case "sm":
        default:
          return {
            width: "48px",
            height: "28px",
            borderRadius: "50px",
          };
      }
    });

    return {
      styleComputed,
    };
  },
});
</script>
