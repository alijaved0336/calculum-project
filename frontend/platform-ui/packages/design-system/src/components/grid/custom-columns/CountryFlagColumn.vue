<template>
<td>
  <div class="country-flag-cell">
    <div class="country-flag-cell__name-wrap">
      <Tooltip :open-delay='100' :anchor-element="'target'">
        <p :title="textValue" class="country-flag-cell__name">{{ textValue }}</p>
      </Tooltip>
    </div>
    <img
      v-if="showFlagImage"
      class="country-flag-cell__flag"
      :src="flagUrl as string"
      :alt="textValue"
      loading="lazy"
      @error="onFlagError"
    />
  </div>
</td>
</template>

<script lang='ts'>
import { defineComponent, computed, ref, watch } from 'vue';
import { getNestedValue } from '@progress/kendo-vue-grid';
import { Tooltip } from '@progress/kendo-vue-tooltip';
import { isNullOrUndefined } from "../../../utils";

export default defineComponent({
  name: 'CountryFlagColumn',
  components: {
    Tooltip,
  },
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
  },
  setup(props) {
    const brokenFlag = ref(false);

    const textValue = computed(() => {
      const value = getNestedValue(props.field, props.dataItem);
      return isNullOrUndefined(value) ? "-" : value;
    });

    // The flag URL always rides on the same row-level field regardless of which country field
    // (`countryCode`/`countryName`) the column itself renders - there is one flag per row, not one
    // per country column.
    

    const flagUrl = computed(() => {      
      if (props.field === "supplierCountryName") {
        return getNestedValue("supplierCountryFlagUrl", props.dataItem);
      }
      
      if (props.field === "countryName") {
        return getNestedValue("countryFlagUrl", props.dataItem);
      }

      if (props.field === "entityCountryName") {
        return getNestedValue("entityFlagUrl", props.dataItem);
      }

      return null;
    });

    // A party-grain rollup (e.g. supplierCountryName across a buyer's several suppliers) reads as
    // its distinct values comma-joined - there is no single country left to draw a flag for once
    // the text is a list, so the cell falls back to text-only rather than picking one arbitrarily.
    const isMultiValue = computed(() => typeof textValue.value === "string" && textValue.value.includes(","));

    const showFlagImage = computed(() => Boolean(flagUrl.value) && !brokenFlag.value && !isMultiValue.value);

    watch(flagUrl, () => {
      brokenFlag.value = false;
    });

    function onFlagError() {
      brokenFlag.value = true;
    }

    return {
      textValue,
      flagUrl,
      showFlagImage,
      onFlagError,
    };
  }
})
</script>

<style lang="scss" scoped>
.country-flag-cell {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  min-width: 0;
  // AB#20356: was `padding-top: 0.75rem` with no bottom counterpart - `align-items: center` only
  // centers within THIS box, so the box itself has to fill the `<td>` for that to read as
  // centered (same fix already applied to EntityLogoColumn.vue/TextColumn.vue).
  height: 100%;

  // See EntityLogoColumn's own note: a flex item with `flex: 1 1 0%; min-width: 0` gives a
  // deterministic remaining width regardless of what Tooltip renders around the text, unlike the
  // global `ellipsis_custom_flags` class's `width: calc(100% - 40px)` on an inline-block, which
  // truncated inconsistently depending on the country name's own length.
  &__name-wrap {
    flex: 1 1 0%;
    min-width: 0;
    overflow: hidden;
  }

  &__name {
    display: block;
    overflow: hidden;
    margin: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  // A rectangular flag icon, not a circular chip - matches AP's ShowFlags.vue (a flag is a
  // rectangle, not a badge; the circular treatment belongs to supplier-card's own avatar-style flag).
  &__flag {
    flex: 0 0 auto;
    width: 1.75rem;
    height: 1.25rem;
    object-fit: cover;
    border-radius: 2px;
  }
}
</style>
