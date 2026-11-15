<template>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('global.nineboxes.modal.title')" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="inner-container">
      <div class="left-side-container col-12 col-md-6"><span class="text-gray-500 text-base font-normal">{{ $t('global.nineboxes.modal.message') }}</span></div>
      <div class="right-side-container col-12 col-md-6">
        <div class="d-flex flex-column"><span>{{$t('global.nineboxes.modal.unassignedItems')}}:</span>
          <table class="table table-bordered table-striped rounded">
            <thead>
              <tr>
                <th class="custom-cells" scope="col"> {{ $t('global.spends') }}</th>
                <th class="custom-cells" scope="col"> {{ $t('global.nineboxes.table.suppliers') }}</th>
                <th class="custom-cells" scope="col"> {{ $t('global.nineboxes.table.parents') }}</th>
                <th class="custom-cells" scope="col"> {{ $t('global.nineboxes.table.volume') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="custom-cells">{{ totalBoxesInfoSummary.spends > 0 ? formatData.getNumberWithDecimals(totalBoxesInfoSummary.spends,0) : '-' }}</td>
                <td class="custom-cells">{{ totalBoxesInfoSummary.suppliers > 0 ? formatData.getNumberWithDecimals(totalBoxesInfoSummary.suppliers,0) : '-' }}</td>
                <td class="custom-cells">{{ totalBoxesInfoSummary.parents > 0 ? formatData.getNumberWithDecimals(totalBoxesInfoSummary.parents,0) : '-' }}</td>
                <td class="custom-cells">{{ totalBoxesInfoSummary.volume > 0 ? StringUtils.formatBigNumbers(totalBoxesInfoSummary.volume) : '-' }}  </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn btn-primary font-md" @click="() => $emit('close')" style="z-index: 1; width: fit-content"> <span>{{$t('global.ok')}}      </span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import * as formatData from '@/utils/FormatData'
import iconClose from '@/resources/assets/images/icons/iconClose.vue'
import { StringUtils } from '@/utils'
export default defineComponent({
  name: "NineBoxesTableModal",
  components: {
    iconClose, CalculumModal
  },
  props: {
    totalBoxesInfoSummary: {type: Object, required: true}
  },
  emits: ['close'],
  setup(props, {emit}) {
    return {
      formatData,
      StringUtils
    }
  },
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.col-6 {
  margin: 0;
  padding: 0;
}

.custom-cells{
  font-size: 1rem;
  color: $color-gray-700;
  font-weight: 400;
}


/**
  MEDIA QUERIES
*/

@media screen and (max-width: 1280px){
  .inner-container{
    display: flex;
    align-items: center;
    align-self: center;
    justify-self: center;
    flex-direction: column;
    max-width: 40rem;
    height: 100% !important;
  }
  .left-side-container{
    width: fit-content;
  }

  .left-side-container,
  .right-side-container {
    flex-basis: 100%;
    max-width: 100%;
  }

  

  
}

.inner-container{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: 250px;
  width: 100%;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  background: $color-gray-50;
  margin: 0;
}

.icon-close{
  width: 11.27px;
  height: 11.24px;
  position: absolute;
  right: 5px;
  top: 10px;
}

tr th {
  background: $color-gray-50;
}

tr td {
  background: #FFF;
}


.bottom-section{
  background: #FFF;
}

.right-side-container{
  padding: 3em;
  span {
    color: $color-gray-400;
  }
}

.left-side-container{
  height: 98%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  padding: 3em;
  border-radius: 0.5rem;
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.06), 0px 1px 3px 0px rgba(16, 24, 40, 0.10);
  font-size: 1rem;
  font-style: normal;
  font-weight: 400;
}

</style>
