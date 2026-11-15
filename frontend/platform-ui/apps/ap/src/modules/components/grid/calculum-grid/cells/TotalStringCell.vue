<script setup lang="ts">
defineOptions({ name: "TotalStringCell" });

defineProps<{
  field: string;
}>();
</script>

<template>
  <span class="text-left">{{ $t("global.total") }} </span>
  <span class="text-left">{{ field === "alias" ? "" : field }}</span>
</template>
