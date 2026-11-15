<template>
<div class="d-flex w-100 title-section"><span class="text-xxs font-bold text-gray-700">{{ $t('global.priceChange') }} </span></div>
<div class="d-flex w-100">
  <table class="matrix-table">
    <thead>
      <tr>
        <th></th>
        <th v-for="(col, index) in columns" :key="index">{{ col }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
        <td class="label-row">{{ row.label }}</td>
        <td class="column" v-for="(cell, colIndex) in row.values" :key="colIndex" :class="getCellClass(rowIndex,colIndex,cell)">{{ formatData.getNumberWithDecimals(cell,1) }}</td>
      </tr>
    </tbody>
  </table>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import * as formatData from '@/utils/FormatData'
import { isNumber } from 'lodash';

interface Row {
label: string;
values: number[];
}

export default defineComponent({
name: 'MatrixTable',
props: {
  calculateTable: { type: Object, required: true, default: () => { } },
},
setup( props ) {
  const columns = ref(['-3.00%', '-2.00%', '-1.00%', '0.00%', '+1.00%', '+2.00%', '+3.00%']);
  
  const orderedKeys = [90, 60, 30, 0, -30, -60, -90];

  const rows = computed(() => {
      return orderedKeys.map(key => {
        const keyString = key.toString();
        return {
          label: keyString,
          values: props.calculateTable[keyString] || []
        };
      });
    });


  const getCellClass = (rowIndex: number, colIndex: number, value: number) => {

    if (isNumber(value) && value >= 0) {
      return `column-good-one`;
    } else {
      return `column-bad-one`;
    }  
  };

  return {
    columns,
    rows,
    getCellClass,
    formatData
  };
}
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.opacity-03 {
  opacity: 0.3;
}

.column {
  position: relative;
  text-align: center;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 20px;
  border-radius: 10px;  
  height: 34px;  

  &-good-one {
    background: $color-teal-75;
    color: $color-teal-700;
  }

  &-bad-one {
    background: $color-primary-75;
    color: $color-primary-700;
  }



  &-00 {
    background: #EAECEF;
    color: $color-gray-800;
  }
  
  &-01 {
    background: #E0E3E8;
    color: $color-gray-800;
  }

  &-02 {
    background: #E0E3E8;
    color: $color-gray-800;
  }

  &-03 {
    background: #FF2C4F;
    color: $color-white;
  }

  &-04 {
    background: #FF4766;
    color: $color-white;
  }

  &-05 {
    background: #FF6E86;
    color: $color-white;
  }

  &-06 {
    background: #FF6E86;
    color: $color-white;
  }

  &-10 {
    background: #D9DCE3;
    color: $color-gray-800;
  }
  
  &-11 {
    background: #C9CCD6;
    color: $color-gray-800;
  }

  &-12 {
    background: #C9CCD6;
    color: $color-gray-800;
  }

  &-13 {
    background: #E02343;
    color: $color-white;
  }

  &-14 {
    background: #E43F5B;
    color: $color-white;
  }

  &-15 {
    background: #E43F5B;
    color: $color-white;
  }

  &-16 {
    background: #E9687E;
    color: $color-white;
  }

  &-20 {
    background: #CACDD7;
    color: $color-gray-800;
  }
  
  &-21 {
    background: #B7BBC9;
    color: $color-gray-800;
  }

  &-22 {
    background: #B7BBC9;
    color: $color-gray-800;
  }

  &-23 {
    background: #E64F69;
    color: $color-white;
  }

  &-24 {
    background: #E64F69;
    color: $color-white;
  }

  &-25 {
    background: #E9657B;
    color: $color-white;
  }

  &-26 {
    background: #EC7E90;
    color: $color-white;
  }

  &-30 {
    background: #BBBFCD;
    color: $color-gray-800;
  }
  
  &-31 {
    background: #A4AABB;
    color: $color-gray-800;
  }

  &-32 {
    background: #A4AABB;
    color: $color-gray-800;
  }

  &-33 {
    background: #9299AE;
    color: $color-white;
  }

  &-34 {
    background: #EC7B8E;
    color: $color-white;
  }

  &-35 {
    background: #EF91A1;
    color: $color-white;
  }

  &-36 {
    background: #EF93A3;
    color: $color-white;
  }

  &-40 {
    background: #858DA4;
    color: $color-white;
  }
  
  &-41 {
    background: #4A5578;
    color: $color-white;
  }

  &-42 {
    background: #6E7793;
    color: $color-white;
  }

  &-43 {
    background: #9299AE;
    color: $color-white;
  }

  &-44 {
    background: #EF91A1;
    color: $color-white;
  }

  &-45 {
    background: #F6BDC7;
    color: $color-primary-700;
  }

  &-46 {
    background: #F6BEC8;
    color: $color-primary-700;
  }


  &-50 {
    background: #77809A;
    color: $color-white;
  }
  
  &-51 {
    background: #4A5578;
    color: $color-white;
  }

  &-52 {
    background: #5C6685;
    color: $color-white;
  }

  &-53 {
    background: #6E7793;
    color: $color-white;
  }

  &-54 {
    background: #B7BBC9;
    color: $color-gray-800;
  }

  &-55 {
    background: #F9D3D9;
    color: $color-primary-700;
  }

  &-56 {
    background: #F9D4DA;
    color: $color-primary-700;
  }

  &-60 {
    background: #64697B;
    color: $color-white;
  }
  
  &-61 {
    background: #30374F;
    color: $color-white;
  }

  &-62 {
    background: #454B61;
    color: $color-white;
  }

  &-63 {
    background: #595F72;
    color: $color-white;
  }

  &-64 {
    background: #ACAFB9;
    color: $color-gray-800;
  }

  &-65 {
    background: #FFE4E8;
    color: $color-primary-700;
  }

  &-66 {
    background: #FFE4E8;
    color: $color-primary-700;
  }
}


.matrix-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;  
  border: unset;
}

.matrix-table th {
  background-color: $color-white;  
  border: 1px solid $color-white;
  color: $color-gray-800;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 16.5px;
}

.matrix-table th, .matrix-table td {
  padding: 10px;
  border: 4px solid $color-white;
}

.label-row {
  color: $color-gray-800;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 16.5px;
  width: 50px;
}


.title-section {
  justify-content: center;
}

.chart-title-container {
  display: flex;
  align-items: center;
}

.line-color {
  flex-grow: 0;
  height: 3px;
  width: 15px;
  
  &-positive {
    background-color: $color-gray-700; 
  }

  &-negative {
    background-color: $color-primary-500; 
  }
}

</style>