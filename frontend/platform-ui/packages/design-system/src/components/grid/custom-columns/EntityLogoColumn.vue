<template>
<td>
  <div
    class="entity-logo-cell"
    :class="{ 'entity-logo-cell--clickable': isClickable }"
    @click="onCellClick"
  >
    <div v-if="showLogoImage" class="entity-logo-cell__logo">
      <img        
        class="entity-logo-cell__logo-image"
        :src="logoUrl as string"
        :alt="textValue"
        loading="lazy"
        @error="onLogoError"
      />      
    </div>
    <div v-if="!showLogoImage && !textValueNotNull" class="entity-logo-cell__logo">      
      <span v-if="!showLogoImage" class="entity-logo-cell__logo-fallback" aria-hidden="true">
        {{ firstLetter }}
      </span>
    </div>
    <div class="entity-logo-cell__name-wrap">
      <Tooltip :open-delay='100' :anchor-element="'target'">
        <p :title="textValue" class="entity-logo-cell__name">{{ textValue }}</p>
      </Tooltip>
    </div>
  </div>
</td>
</template>

<script lang='ts'>
import { defineComponent, computed, inject, ref, watch } from 'vue';
import { getNestedValue } from '@progress/kendo-vue-grid';
import { Tooltip } from '@progress/kendo-vue-tooltip';
import { isNullOrUndefined } from "../../../utils";
import { ENTITY_LOGO_CLICK_KEY } from "./entityLogoClick";

export default defineComponent({
  name: 'EntityLogoColumn',
  components: {
    Tooltip,
  },
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
    allowOpenEntity: { type: Boolean, default: true },
  },
  setup(props) {
    const brokenLogo = ref(false);

    const textValue = computed(() => {
      const value = getNestedValue(props.field, props.dataItem);
      return isNullOrUndefined(value) ? "-" : value;
    });

    const textValueNotNull = computed(() => {
      const value = getNestedValue(props.field, props.dataItem);
      return isNullOrUndefined(value)
    });

    const firstLetter = computed(() => {
      const value = String(textValue.value);
      return value === "-" ? "-" : value.charAt(0).toUpperCase();
    });

    // Which sibling field on the row carries this column's logo URL depends on `field` - there is
    // no single naming convention across every possible identity column, same as AP's EntityColumn
    // (hasIconUrl/domainForIcon), just with AR's own field names.
    const logoUrl = computed(() => {      
      if (props.field === "supplierName") {
        return getNestedValue("supplierLogoUrl", props.dataItem);
      }
      if (props.field === "parentName") {
        return getNestedValue("parentLogoUrl", props.dataItem);
      }      
      
      if (props.field === "buyerName") {
        return getNestedValue("buyerLogoUrl", props.dataItem);
      }
      if (props.field === "name") {
        return getNestedValue("logoUrl", props.dataItem);
      }
      // AP Compare / entity lists use `entityName` + a URL sibling (`entityLogoUrl`), not the
      // raw `entityMediaPath` that AP's EntityColumn prefixes via getMediaUrl.
      if (props.field === "entityName") {
        return getNestedValue("entityLogoUrl", props.dataItem);
      }
      return null;
    });

    const showLogoImage = computed(() => Boolean(logoUrl.value) && !brokenLogo.value);

    watch(logoUrl, () => {
      brokenLogo.value = false;
    });

    function onLogoError() {
      brokenLogo.value = true;
    }

    // A row carrying `partyId` is an entity the host app can open (AR's Customer Card) - what
    // opening it actually does is the app's own handler (see entityLogoClick.ts). Only from the
    // column that names that party itself (`name` on the party levels, `buyerName` on a sale line,
    // whose `partyId` is its buyer): a Parent/Supplier cell on the same row names a different
    // entity, so opening `partyId`'s card from there would open the wrong one.
    const CLICKABLE_FIELDS = ["buyerName", "name"];
    const onEntityClick = inject(ENTITY_LOGO_CLICK_KEY, null);
    const isClickable = computed(() =>
      props.allowOpenEntity
      && CLICKABLE_FIELDS.includes(props.field)
      && !isNullOrUndefined(props.dataItem?.partyId)
    );

    function onCellClick(event: MouseEvent) {
      if (!isClickable.value) {
        return;
      }
      // Opening the entity is this click's whole meaning - it shouldn't also toggle the row's
      // selection in a selectable grid.
      event.stopPropagation();
      onEntityClick?.(props.dataItem, props.field);
    }

    return {
      isClickable,
      onCellClick,
      textValue,
      firstLetter,
      logoUrl,
      showLogoImage,
      onLogoError,
      textValueNotNull
    };
  }
})
</script>

<style lang="scss" scoped>
.entity-logo-cell {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
  // AB#20356: was `padding-top: 0.75rem` with no bottom counterpart, which pushed the row's
  // content down inside the cell instead of centering it - `align-items: center` above only
  // centers within THIS box, so the box itself has to fill the `<td>` for that to read as
  // centered. Height, not padding, is what does that.
  height: 100%;

  &--clickable {
    cursor: pointer;
  }

  &__logo {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    overflow: hidden;
    border-radius: 50%;
    // A visibly solid gray, not a barely-there tint - AP's equivalent fallback circle
    // ($color-gray-300) reads clearly against the grid's white rows, and --bg-surface-subtle-1
    // (neutral-50, nearly white) didn't.
    background: var(--neutral-300);
  }

  &__logo-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &__logo-fallback {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-1);
    text-transform: uppercase;
  }

  // Deliberately not the global `ellipsis_custom_with_image` class here: its `width: calc(100% -
  // 10px)` on a `display: inline-block` element resolves against whatever box Kendo's Tooltip
  // wraps it in, which doesn't reliably fill the remaining flex space next to the logo - that's
  // what produced the inconsistent, name-length-dependent truncation this replaces. A flex item
  // with `flex: 1 1 0%; min-width: 0` gives a deterministic remaining width regardless of what
  // Tooltip renders around the text, and a plain block child with `white-space: nowrap` truncates
  // against that width without needing a computed percentage.
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
}
</style>
