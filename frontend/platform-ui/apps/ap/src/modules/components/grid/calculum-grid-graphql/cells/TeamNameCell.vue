<script setup lang="ts">
import { TextColumn } from "@ada/design-system";
import ManageTeamColumn from "@/modules/components/grid/columns/ManageTeamColumn.vue";
import ManageTeamAction from "@/modules/components/grid/menuActions/ManageTeamAction.vue";
import type { ActionFromEditProgram } from "@/modules/components/types";
import type {
  GraphqlGridEditProgramPayload,
  GraphqlGridManageTeamOpenPayload,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridEditProgram";

defineOptions({ name: "TeamNameCell" });

export interface TeamNameCellHandlers {
  onManageTeamOpen: (payload: GraphqlGridManageTeamOpenPayload) => void;
  closeManageTeam: () => void;
  handleTeamChange: (
    keyId: ActionFromEditProgram,
    isEmit: boolean,
    payload: GraphqlGridEditProgramPayload | null,
  ) => void;
}

defineProps<{
  dataItem: Record<string, unknown> & { uuid?: string | null };
  field: string;
  rowType?: string;
  handleEditProgramAction: boolean;
  activeManageTeamRowKey: string | null;
  handlers: TeamNameCellHandlers;
}>();
</script>

<template>
  <TextColumn
    v-if="rowType !== 'groupHeader' && !handleEditProgramAction"
    :data-item="dataItem"
    :field="field"
    :aligment="'left'"
  />
  <ManageTeamColumn
    v-else
    :data-item="dataItem"
    :field="field"
    :aligment="'left'"
    @call-action="handlers.onManageTeamOpen"
  />
  <div
    v-if="activeManageTeamRowKey === dataItem.uuid"
    class="manage-team-dropdown"
    @click.stop
    @mouseleave="handlers.closeManageTeam"
  >
    <ManageTeamAction :option="'manageTeam'" @call-action="handlers.handleTeamChange" />
  </div>
</template>

<style lang="scss">
.manage-team-dropdown {
  position: absolute;
  min-width: 300px;
  background: white;
  border: 1px solid #eaecf0;
  border-radius: 0.375rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  z-index: 99999;
}
</style>
