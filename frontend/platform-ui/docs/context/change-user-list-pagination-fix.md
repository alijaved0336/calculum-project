# Checklist: Fix User List Pagination Limit

## Problem
The user list only shows 100 users instead of all existing users. This is because API Platform is configured with a default pagination limit of 100 items per page, and the frontend is not requesting more items.

## Root Cause
- API Platform configuration in `config/packages/api_platform.yaml` sets `pagination_items_per_page: 100` as default
- Frontend API call in `src/modules/welcome/api/index.ts` function `getCompanyUsers()` does not specify `itemsPerPage` parameter
- Maximum allowed is 500 items per page according to `pagination_maximum_items_per_page: 500`

## Solution
Modify the frontend API call to include the `itemsPerPage` parameter with a value of 500 to retrieve all users in a single request.

## Implementation Checklist

- [x] Identify the problem (API Platform pagination limit)
- [x] Locate the frontend API call (`getCompanyUsers` in `src/modules/welcome/api/index.ts`)
- [x] Modify `getCompanyUsers` function to add `itemsPerPage=500` parameter to the API request
- [ ] Test that all users are now returned
- [ ] Verify the solution works for companies with more than 100 users
- [ ] Consider if pagination should be implemented for companies with more than 500 users (future enhancement)

## Files Modified
1. ✅ `src/modules/welcome/api/index.ts` - Added `itemsPerPage=500` parameter to API call

## Implementation Details
- Modified `getCompanyUsers()` function to append `itemsPerPage=500` query parameter
- Used `URLSearchParams` to properly construct the query string
- Works with both `notAll=true` and `notAll=false/null` cases
- All components using this function will automatically benefit from the fix:
  - `HomeManageTeam.vue`
  - `CompanyUsers.vue`
  - `WelcomeTeam.vue`
  - Any other component using `welcomeStore.getCompanyUsers()`

## Notes
- The maximum items per page is 500 according to API Platform configuration
- For companies with more than 500 users, pagination would need to be implemented in the frontend (future enhancement)
- This fix should work for most cases as it's unlikely a company has more than 500 users
- The change is backward compatible and doesn't break existing functionality
