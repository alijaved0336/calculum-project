<template>
<td>
  <div class="text-center date-column-cell">{{ formattedDate }}</div>
</td>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { getNestedValue } from "@progress/kendo-vue-grid";

/**
 * Renders a date/datetime GraphQL scalar (arrives as an ISO 8601 string) as its date part only
 * (YYYY-MM-DD) - none of GraphqlGrid's columns are time-of-day, so trimming the time avoids an
 * unreadable full timestamp. Same intent as apps/ap's DatesColumn.vue (its own `getISODate`
 * helper), rewritten rather than imported: `@/utils` resolves per-app, and this column is shared
 * by every GraphqlGrid host.
 */
export default defineComponent({
  name: "DateColumn",
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
  },
  setup(props) {
    const formattedDate = computed(() => {
      const value = getNestedValue(props.field, props.dataItem);
      if (value === null || value === undefined || value === "") {
        return "-";
      }
      return String(value).split("T")[0];
    });

    return { formattedDate };
  },
});
</script>

<style scoped>
/* AB#20356: same fix already applied to NoDecimalsColumn.vue/MoneyColumn.vue - `.text-center`
   (Bootstrap) only sets text-align, which flexbox ignores. */
.date-column-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
