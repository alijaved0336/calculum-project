<template>
<td>
    <div class="pointer text-column-cell">
        <div class="text-column-cell__name-wrap">
            <Tooltip :open-delay='100' :anchor-element="'target'">
                <p v-if="textValue !== '-' " :class="field !== 'entityDomain' && field !== 'createdBy.email' ? 'capitalize-text' : ''"  :title="textValue" :style="'text-align: ' + aligment + ';'"
                    class="ml-2 ms-2 text-column-cell__name">{{ textValue }}</p>

                <!-- The empty-state dash always centers, regardless of `aligment` - it's a placeholder,
                     not left-aligned content, so a left-aligned column's dash shouldn't hug the cell's
                     left edge the way its real text does. -->
                <p v-else style="text-transform: capitalize; text-align: center;"
                    class="ml-2 ms-2 text-column-cell__name">{{ textValue }}</p>
            </Tooltip>
        </div>
    </div>
</td>
</template>

<script lang='ts'>
import { defineComponent, computed } from 'vue';
import { getNestedValue } from '@progress/kendo-vue-grid';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { isNullOrUndefined } from "../../../utils";
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: 'TextColumn',
  components: {
    Tooltip,
  },
  inject: {
    kendoIntlService: { default: null },
  },
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
    aligment: { type: String, required: false, default: "center" },
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const textValue = computed(() => {
      const value = getNestedValue(props.field, props.dataItem)
      if (isNullOrUndefined(value)) {
        return "-"
      } else {
        if (props.field === 'smeSource') {
          return translate.t(`home.entityCard.companyDetails.sources.${value}.name`)
        }

        if (value === 'null') {
          return '-'
        }

        return value
      }
    });

    return {
      textValue
    };
  }
})
</script>

<style scoped>

.capitalize-text {
    text-transform: capitalize;
}

/* AB#20356: was Bootstrap's `pt-3` (padding-top: 1rem) on both this div and its child <p> - 2rem
   of top-only padding with no bottom counterpart, which pushed the text down inside the cell
   instead of centering it. A scoped class here beats the global `.ellipsis_custom` on the same
   div on specificity, regardless of source order (Vue's scoped attribute selector outweighs a
   plain global class), so this doesn't fight the truncation styling that class already provides.
   AB#20356 follow-up: that first fix didn't actually take - this div was nested INSIDE <Tooltip>,
   and Kendo's Tooltip wraps its slot in its own unstyled, auto-height div, so `height: 100%` here
   resolved against that auto-height wrapper (not the <td>) and silently computed to `auto`. Moved
   this div OUTSIDE <Tooltip> (now the direct child of <td>, with <Tooltip> nested inside it, same
   order as EntityLogoColumn.vue/CountryFlagColumn.vue) so the percentage has a real height to
   resolve against. */
.text-column-cell {
    display: flex;
    align-items: center;
    height: 100%;
}

/* AB#20356 follow-up: the truncating <p> used the global `.ellipsis_custom` class
   (`width: calc(100% - 10px)` on a `display: inline-block` element) while sitting directly inside
   <Tooltip> - live-verified this let long values (e.g. Industry, custom attribute columns) overflow
   past the column by 100-300+px instead of truncating, since a flex item's default `min-width: auto`
   refuses to shrink below its `white-space: nowrap` content's own width, and Tooltip's own unstyled
   wrapper has no width/flex rules to force it smaller. Same fix as EntityLogoColumn.vue's
   __name-wrap/__name: `flex: 1 1 0%; min-width: 0` gives this wrapper a deterministic width it can
   actually shrink to, and the <p> truncates against that real width instead of a computed percentage. */
.text-column-cell__name-wrap {
    flex: 1 1 0%;
    min-width: 0;
    overflow: hidden;
}

.text-column-cell__name {
    display: block;
    overflow: hidden;
    /* Live-verified: the browser's own <p> default (0 top / 1em bottom) left this asymmetric -
       .text-column-cell__name-wrap's `overflow: hidden` traps that bottom margin inside its own
       block formatting context instead of collapsing it away, so the wrap's own height grows to
       include it and the visible text ends up pinned to the top of the cell instead of centered.
       Same fix as EntityLogoColumn.vue's __name: reset to 0. */
    margin: 7px 0px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

</style>
