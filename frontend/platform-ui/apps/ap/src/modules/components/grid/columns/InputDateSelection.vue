<template>
  <td class="text-center">
    <span v-if="!hasPilotRoleEnabled">-</span>
    <div v-else class="form-group">
      <label for="dateSelectedValue">
        <input id="dateSelectedValue" v-model="dateSelectedValue" type="date" class="form-control mt-1"
          :checked="dateChosen" @change="onDateSelected" />
        <div v-if="isCalendarVisible" class="my-date-picker"></div>
      </label>
    </div>
  </td>
</template>

<script lang="ts">
import { computed, defineComponent, watch, reactive, toRefs } from "vue";

interface Entity {
  id: string;
  pilotTimeExpire: string | null;
}

export default defineComponent({
  name: "InputDateSelection",
  props: {
    dataItem: { type: Object, required: true },
    savedCompanyEntities: { type: Array as () => Entity[], required: true }
  },
  emits: ["date-selected"],
  setup(props, { emit }) {
    interface InputDateSelectionInterface {
      dateChosen: boolean;
      isCalendarVisible: boolean;
      dateSelectedValue: string | null;
    }

    // Function for formatting date for <input type="date">
    function formatDateForInput(date: Date): string {
      const pad = (n: number) => (n < 10 ? "0" + n : n.toString());
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1); // Months are zero-indexed
      const day = pad(date.getDate());
      return `${year}-${month}-${day}`; // YYYY-MM-DD format
    }

    // Function to create a Date object in UTC from YYYY-MM-DD string
    function createUTCDateFromString(dateString: string): Date {
      // Parse YYYY-MM-DD format
      const [year, month, day] = dateString.split("-").map(Number);
      // Create date in UTC (month is 0-indexed in Date.UTC)
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }

    // Function for formatting timestamp
    function formatDateForTimestamp(date: Date): string {
      const pad = (n: number) => (n < 10 ? "0" + n : n.toString());
      const year = date.getUTCFullYear();
      const month = pad(date.getUTCMonth() + 1); // Months are zero-indexed
      const day = pad(date.getUTCDate());
      const hours = pad(date.getUTCHours());
      const minutes = pad(date.getUTCMinutes());
      const seconds = pad(date.getUTCSeconds());
      const milliseconds = date
        .getUTCMilliseconds()
        .toString()
        .padStart(3, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}Z`; // Added Z for UTC
    }

    const today = new Date();
    const defaultDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 30
    );
    const defaultDateString = formatDateForInput(defaultDate);

    // Helper function to format date from UTC Date object for input
    function formatDateForInputFromUTC(date: Date): string {
      const pad = (n: number) => (n < 10 ? "0" + n : n.toString());
      const year = date.getUTCFullYear();
      const month = pad(date.getUTCMonth() + 1); // Months are zero-indexed
      const day = pad(date.getUTCDate());
      return `${year}-${month}-${day}`; // YYYY-MM-DD format
    }

    // Helper function to safely parse existing date strings
    function parseExistingDate(dateString: string | null): string {
      if (!dateString) return defaultDateString;
      
      try {
        // If the date string is already in YYYY-MM-DD format, use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          return dateString;
        }
        
        // Otherwise, parse it and convert to YYYY-MM-DD format
        // Parse the date string (it may be in ISO format with timezone)
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return defaultDateString;
        }
        // Use UTC methods to extract the date part to avoid timezone shifts
        // This ensures that 2026-01-23T00:00:00+00:00 shows as 2026-01-23, not 2026-01-22
        return formatDateForInputFromUTC(date);
      } catch {
        return defaultDateString;
      }
    }

    const dateSelected = reactive<InputDateSelectionInterface>({
      dateChosen: false,
      isCalendarVisible: false,
      dateSelectedValue: parseExistingDate(props.dataItem.pilotTimeExpire)
    });

    // Flag to track if user is making changes to prevent watch from interfering
    let isUserEditing = false;

    const isPilotCompany = computed(() => {
      return props.dataItem.roles.includes("FEATURE_PILOT");
    });

    function onDateSelected(event: Event) {
      const input = event.target as HTMLInputElement;
      // Set flag to prevent watch from overwriting user input
      isUserEditing = true;
      
      // Create date in UTC explicitly to avoid timezone issues
      // input.value is in YYYY-MM-DD format
      const selectedDate = createUTCDateFromString(input.value);
      dateSelected.dateChosen = true;
      const timestamp = formatDateForTimestamp(selectedDate);
      emit("date-selected", props.dataItem, timestamp);
      
      // Reset flag after a short delay to allow prop updates to be processed
      setTimeout(() => {
        isUserEditing = false;
      }, 100);
    }

    // Watch for prop.savedCompanyEntities
    watch(
      () => props.savedCompanyEntities,
      () => { },
      { deep: true }
    );

    // Watch for changes in pilotTimeExpire to update the displayed date
    // Only update if user is not currently editing to avoid interfering with user input
    watch(
      () => props.dataItem.pilotTimeExpire,
      (newValue) => {
        // Don't update if user is currently editing
        if (isUserEditing) {
          return;
        }
        
        const parsedValue = parseExistingDate(newValue);
        // Only update if the new parsed value is different from current value
        if (parsedValue !== dateSelected.dateSelectedValue) {
          dateSelected.dateSelectedValue = parsedValue;
        }
      },
      { deep: true }
    );

    const hasPilotRoleEnabled = computed(() => {
      const dataItemId = props.dataItem["@id"];
      return !!props.savedCompanyEntities.find(
        (entity: Entity) => entity.id === dataItemId
      );
    });

    return {
      ...toRefs(dateSelected),
      hasPilotRoleEnabled,
      isPilotCompany,
      onDateSelected
    };
  }
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors.scss";

.form-group {
  margin-bottom: 0 !important;
}

.form-group input:not(:placeholder-shown) {
  height: 3rem;
  padding-top: 0.25rem;
}

input::-webkit-datetime-edit-day-field:focus,
input::-webkit-datetime-edit-month-field:focus,
input::-webkit-datetime-edit-year-field:focus {
  background-color: $button-bg-primary;
  color: white;
  outline: none;
}

input::-webkit-calendar-picker-indicator {
  background-image: url("@/resources/assets/images/icons/calendar.svg") !important;
}

/* Styles for the calendar popup */
.my-date-picker {
  position: absolute;
  background-color: #ffffff;
}

/* Styles for the selected day */
.my-date-picker td.is-selected {
  background-color: #ff0000;
}

.k-calendar .k-calendar-td.k-selected {
  background-color: red;
}
</style>
