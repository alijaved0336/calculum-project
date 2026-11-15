<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "PanelBarItemEmpty"
});
</script>

<template>
  <div class="d-flex flex-column text-center">
    <span class="my-6">
      {{ $t("global.noData") }}
    </span>
  </div>
</template>
