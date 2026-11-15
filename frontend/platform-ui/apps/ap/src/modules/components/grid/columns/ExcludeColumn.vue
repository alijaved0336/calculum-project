<template>
  <td class="">
    <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'">
      <div class="align-icons">
        <span :style="'display: none;'">{{ dataItem.disabled }}</span>

        <!-- Inlcude -->
        <span v-if="(dataItem.disabled === false)" class="checkmark" :class="{ 'no-actions': avoidAction || !canManageExclusion }"
          :title="$t('home.analyze.analyzeHeader.included')" @click="patchProgramSpendConfiguration(true)" />

        <!-- Exclude -->
        <span v-if="(dataItem.disabled === true)" class="crossout" :class="{ 'no-actions': avoidAction || !canManageExclusion }" :title="$t('home.analyze.analyzeHeader.excluded')"
          @click="patchProgramSpendConfiguration(false)" />

        <!-- Multiple -->
        <!-- If supliers grid, show the amount of spends, if not, show the amount of providers -->
        <span v-if="(dataItem.disabled === null)" class="multiplestatus" :title="$t('tableStatus.multiple')">
          {{ levelOfGrid === 'supplier' ? dataItem.spendCounts : dataItem.supplierCounts }}
        </span>
      </div>
    </Tooltip>
  </td>
</template>

<script lang="ts">

import { defineComponent, computed } from 'vue'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useAnalyzeStore } from '@/stores/analyze'
import { useExclusionReasonStore } from '@/stores/exclusionReason'
import { useToast } from "vue-toastification";
import { Tooltip } from '@progress/kendo-vue-tooltip'
import * as formatData from '@/utils/FormatData'
import { useAppStore } from '@/stores/app'
import useUser from '@/services/user/composables/useUser'

export default defineComponent({
  name: 'ExcludeColumn',
  components: { Tooltip },
  props: {
    dataItem: { type: Object, required: true },
    levelOfGrid: { type: String, required: false, default: 'spends' },
    typeGrid: { type: String, required: false, default: 'master' },//master, I mean is the main grid
    selectedProgramId: { type: String, required: false, default: '' },
    filter: { type: Object, required: true, default: undefined },
    avoidAction: { type: Boolean, required: false, default: false }
  },
  emits: ['update-row-data', 'close-loading', 'show-recalculation', 'show-spend-modal', 'filter-status-by-row'],
  setup(props, { emit }) {
    const globalFiltersStore = useGlobalFiltersStore()
    const analyzeStore = useAnalyzeStore()
    const exclusionReasonStore = useExclusionReasonStore()
    const toast = useToast()
    const { userIsSuperAdmin, userDataRoleEnabled } = useUser()

    // AB#20307/FR-08: same Super Admin / Data Team restriction as the includeExclude toolbar
    // option (CalculumDropdownEditProgramOption.vue) - this per-row checkbox posts the same
    // `key: 'disabled'` patch and must be gated identically.
    const canManageExclusion = computed(() => userIsSuperAdmin.value || userDataRoleEnabled.value)

    let filters = {
      telerikFilter: formatData.convertFiltersToREST(props.filter),
      targetProgramUuid: props.selectedProgramId,
      globalFilter: formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied),
      currencyRate: useAppStore().getCurrencyAmount
    }

    /**
     * Patch program spend configuration.
     *
     * AB#20307: excluding (action === true) blocks on a reason - the popup resolves null if the
     * user cancels, in which case nothing is sent at all. Including needs no reason (it already
     * clears any existing one server-side).
     */
    async function patchProgramSpendConfiguration(action: boolean) {

      if (props.avoidAction) {
        if (import.meta.env.DEV) console.log("** avoid make actions in childs grids")
        return
      }
      if (!canManageExclusion.value) {
        return
      }

      const changed: Record<string, unknown> = {
        key: 'disabled',
        value: action
      }
      if (action) {
        const reason = await exclusionReasonStore.requestReason(props.selectedProgramId)
        if (reason === null) {
          emit('close-loading')
          return
        }
        changed.reason = reason
      }

      emit('close-loading')
      const uuids = [props.dataItem.uuid]
      const params = {
        program: props.selectedProgramId,
        changed,
        uuids,
        filters,
        level: props.levelOfGrid,
        all: false,
        callbackSuccess: (callbackSuccessData: any) => {
          emit('update-row-data', callbackSuccessData, 'fullDisabled')
        },
        callbackError: (callbackError: any) => {
          if (callbackError.data.subject === 'spendAlreadyInActiveProgram') {
            emit('show-spend-modal', props.dataItem.activeProgram)
          } else {
            toast.success('ERROR updating data.');
          }
        }
      }
      analyzeStore.postProgramSpendConfigurationbyGroups(params)
    }

    return {
      patchProgramSpendConfiguration,
      canManageExclusion
    }
  }
})
</script>

<style lang="scss" scoped>
@import '../../../../resources/assets/styles/variables/colors';

td.highlited.highlited--col-2.analyze-table-cell-group {
  border-top: 1px solid #dee2e6;
  text-align: center;
  padding: 0.75rem;
}

td.highlited.highlited--col-2.analyze-table-cell-grou button {
  margin: 0;
  position: absolute;
  top: 50%;
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
}

.justify-content-evenly {
  justify-content: space-evenly;
}

.align-icons {
  display: flex;
  justify-content: center;
  align-content: center;
}

.icon-disabled {
  display: contents !important;
  color: #000000;
}

.multiplestatus {
  background: $color-gray-100 !important;
  text-align: center;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  color: $color-gray-700;
  font-size: 12px;
}
</style>
