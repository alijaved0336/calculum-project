<template>
  <div class="locked-container d-flex align-items-center">
    <iconLock class="locked-icon-svg" />
    <span class="locked-text">{{ $t("global.teaser.locked") }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import iconLock from "@/resources/assets/images/teaser/lock/iconLock.vue";
export default defineComponent({
  name: "Locked",
  components: {
    iconLock
  },
  setup() {
    return {};
  }
});
</script>
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";
.locked-container {
  height: 24px;
  padding: 5px;
  border-radius: 24px;
  background-color: $color-gray-300;
  .locked-text {
    color: $color-gray-700;
    font-weight: 700;
    font-size: 12px;
  }
  .locked-icon-svg {
    width: 12px;
    height: 10.5px;
    margin-right: 8px;
  }
}
</style>
