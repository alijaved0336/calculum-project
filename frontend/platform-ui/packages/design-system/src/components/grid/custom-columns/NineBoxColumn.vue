<template>
<td class="text-center">
  <div class="nine-box-column-cell">
    <div v-if="boxNumber !== null" class="nine-box-column">
      <svg class="nine-box-column__icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect
          v-for="(cell, index) in cells"
          :key="index"
          :x="cell.x"
          :y="cell.y"
          width="4.5"
          height="4.5"
          rx="1"
          :fill="index === highlightedIndex ? '#1570EF' : '#D0D5DD'"
        />
      </svg>
      <span>{{ $t('global.box') }} {{ boxNumber }}</span>
    </div>
    <span v-else>-</span>
  </div>
</td>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { getNestedValue } from "@progress/kendo-vue-grid";
import { NINE_BOX_POSITION_NUMBERS } from "../../nine-box-card";

// Row-major 3x3 cell coordinates, same spacing as AP's own icon set (18x18 viewBox, 4.5x4.5
// cells) - ported from apps/ap/src/resources/assets/images/9boxes/blue-Financing-box-0N.vue.
const CELL_POSITIONS = [1.5, 6.75, 12];
const CELLS = Array.from({ length: 9 }, (_, index) => ({
  x: CELL_POSITIONS[index % 3],
  y: CELL_POSITIONS[Math.floor(index / 3)],
}));

/**
 * The per-row nine-box classification - AP's own grid column (`globalColumns.ts`'s `box` export,
 * `cell: "nineBoxes"`, `apps/ap/.../grid/columns/NineBoxes.vue`). Same mini "which cell" icon
 * (`apps/ap/src/resources/assets/images/9boxes/blue-Financing-box-0N.vue`), ported as ONE
 * parameterized icon rather than AP's 9 near-duplicate files - verified against 4 of the 9 real
 * ones that the highlighted cell is always the same blue regardless of box number, only its
 * position changes, so a single component parameterized by position covers all 9.
 *
 * `field` is the row's raw nine-box NUMBER (1-9, or null/0 for unranked - not AP's own domain
 * string), matching this endpoint's own `nineBox` field rather than AP's differently-shaped one.
 */
export default defineComponent({
  name: "NineBoxColumn",
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
  },
  setup(props) {
    const boxNumber = computed<number | null>(() => {
      const value = getNestedValue(props.field, props.dataItem);
      return typeof value === "number" && value >= 1 && value <= 9 ? value : null;
    });

    const highlightedIndex = computed(() =>
      boxNumber.value === null ? -1 : NINE_BOX_POSITION_NUMBERS.indexOf(boxNumber.value),
    );

    return { boxNumber, highlightedIndex, cells: CELLS };
  },
});
</script>

<style lang="scss" scoped>
// AB#20356: the outer cell wrapper was missing entirely - .nine-box-column below only centers ITS
// OWN children (icon+label), not itself within the <td>, and the "-" empty state had no wrapper at
// all (same root cause already fixed on TextColumn.vue/MoneyColumn.vue/NoDecimalsColumn.vue).
.nine-box-column-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.nine-box-column {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
</style>
