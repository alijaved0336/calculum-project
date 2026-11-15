<template>
<span class="kanban-undo-toast"><strong>{{ entityName }}</strong> {{ $t('home.manageModule.dragAndDrop.movedTo', { status: destinationLabel }) }} <a class="kanban-undo-toast-action" @click.stop="$emit('undo')">{{ $t('global.undo') }}</a></span>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "KanbanUndoToastContent",
  props: {
    entityName: { type: String, required: true },
    destinationLabel: { type: String, required: true }
  },
  emits: ["undo"]
});
</script>

<style scoped lang="scss">
.kanban-undo-toast {
  display: inline-block;
}

.kanban-undo-toast-action {
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline;
  margin-left: 0.25rem;
}
</style>
