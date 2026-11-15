# Checklist: Fix Date Timezone Issue for India Users in InputDateSelection

## Problem Identified
A user from India is experiencing issues when saving dates due to timezone problems in date formatting.

## Problem Analysis

### Main Problem
On line 83, a date is created like this:
```javascript
const selectedDate = new Date(`${input.value}T00:00:00`);
```

When creating a date with `new Date("2025-08-27T00:00:00")` without the `Z` suffix, JavaScript interprets it as **local time**, not UTC. This causes:

1. User in India (UTC+5:30) selects "2025-08-27"
2. `new Date("2025-08-27T00:00:00")` is created → interpreted as midnight in India local time
3. This equals `2025-08-26 18:30:00 UTC` (previous day)
4. `formatDateForTimestamp` uses UTC methods, returning the previous day's date

### Additional Problems
- On line 73, `new Date(props.dataItem.pilotTimeExpire)` can also have timezone issues when parsing existing dates.

## Proposed Solution

### Required Changes

1. **Modify `onDateSelected` to explicitly create date in UTC**
   - Parse the input value (YYYY-MM-DD)
   - Create the date using `Date.UTC()` or adding `Z` to the string
   - Ensure the date represents midnight UTC of the selected day

2. **Improve `formatDateForTimestamp` to be more robust**
   - Ensure it always works with UTC dates
   - Validate that the format is consistent

3. **Improve parsing of existing dates on line 73**
   - Ensure `pilotTimeExpire` is parsed correctly regardless of timezone

## Implementation

### Step 1: Create helper function to parse date from input
- Parse YYYY-MM-DD string
- Create Date object in UTC explicitly

### Step 2: Modify `onDateSelected`
- Use the helper function to create date in UTC

### Step 3: Improve `formatDateForTimestamp`
- Ensure it always formats correctly in UTC

### Step 4: Improve initialization of `dateSelectedValue`
- Ensure correct parsing of existing dates

## Validation

- [x] Implementation completed
- [ ] Verify that selected dates are saved correctly in UTC
- [ ] Verify that users in different timezones (India, USA, Europe) can save dates correctly
- [ ] Verify that existing dates are displayed correctly
- [ ] Test with different browser timezone configurations

## Implemented Changes

### 1. `createUTCDateFromString` Function
- Created new function that parses YYYY-MM-DD strings and creates dates explicitly in UTC using `Date.UTC()`
- Avoids timezone issues when creating dates from input

### 2. Modification of `onDateSelected`
- Now uses `createUTCDateFromString` instead of `new Date()` with string without Z
- Guarantees that the date is created in UTC regardless of browser timezone

### 3. `parseExistingDate` Function
- New helper function to safely parse existing dates
- Handles different date formats and validates they are valid
- Returns default date if there are errors

### 4. Improvement in `dateSelectedValue` initialization
- Now uses `parseExistingDate` to handle existing dates more robustly

## Files to Modify

- `Front-End/src/modules/components/grid/columns/InputDateSelection.vue`

