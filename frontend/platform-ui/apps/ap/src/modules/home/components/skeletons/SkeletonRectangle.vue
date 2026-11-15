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
import { StringUtils } from "@/utils";

export default defineComponent({
  name: "SkeletonRectangle",
  components: {
    Skeleton,
  },
  props: {
    size: {
      type: String,
      default: "sm",
    },
    widthPercentAsString: {
      type: String,
      default: "",
    }, // Examples: "50%", "80%"
  },
  setup(props) {
    const styleComputed = computed(() => {
      const s: {
        width: string;
        height: string;
        borderRadius: string;
      } = {
        width: "",
        height: "",
        borderRadius: "",
      };

      switch (props.size) {

        case "full":
          s.width = "100%";
          s.height = "350px";
          s.borderRadius = "4px";
          break;
        case "md":
          s.width = "56px";
          s.height = "36px";
          s.borderRadius = "4px";
          break;
        case "lg":
          s.width = "88px";
          s.height = "44px";
          s.borderRadius = "4px";
          break;
        // case "sm":
        default:
          s.width = "48px";
          s.height = "28px";
          s.borderRadius = "4px";
          break;
      }

      // Overwrite width if custom
      if (!StringUtils.isNullUndefinedOrEmpty(props.widthPercentAsString)) {
        s.width = props.widthPercentAsString;
      }

      return s;
    });

    return {
      styleComputed,
    };
  },
});
</script>
