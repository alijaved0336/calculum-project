<template>
<td>
  <div class="col-12 text-center">
    <button class="btn-text text-gray-900" @click="onClick" :class="isEnabled ? `is-enabled` : `opacity-50 cursor-not-allowed`" :disabled="!isEnabled">{{ text }}</button>
  </div>
</td>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "ButtonColumn",
  props: {
    dataItem: { type: Object, required: true },
    text: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    action: { type: String, required: true }
  },
  emits: ["click"],
  setup(props, { emit }) {
    function onClick() {
      emit("click", { action: props.action, dataItem: props.dataItem });
    }

    return {
      onClick
    };
  }
});
</script>
<style lang="scss" scoped>
button.is-enabled {
  &:hover {
    text-underline-position: under;
    text-decoration: underline;
  }
}
</style>
