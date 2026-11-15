# Apollo Client Deprecation Warnings and Runtime Error Fixes

## Issue Summary
1. Apollo Client 3.14.0 deprecation warnings for:
   - `addTypename` option in `InMemoryCache`
   - `canonizeResults` option in `InMemoryCache`
   - `connectToDevTools` option in `ApolloClient`
   - `name` option in `ApolloClient`
   - `version` option in `ApolloClient`

2. Runtime error: `Cannot read properties of undefined (reading '@id')` in `AdminDataChange.vue`

## Checklist

### Apollo Client Configuration Updates
- [x] Remove `addTypename: false` from `InMemoryCache` initialization
- [x] Remove `canonizeResults: false` from `InMemoryCache` initialization
- [x] Replace `connectToDevTools: false` with `devtools: { enabled: false }` in `ApolloClient`
- [x] Replace `name: 'ada-client'` with `clientAwareness: { name: 'ada-client' }` in `ApolloClient`
- [x] Replace `version: '1.0'` with `clientAwareness: { version: '1.0' }` in `ApolloClient`
- [x] Verify Apollo Client still works correctly after changes

### Runtime Error Fix in AdminDataChange.vue
- [x] Add null/undefined check in `showModalEditReq` function before accessing `item['@id']`
- [x] Add array validation check before iterating `data.dataInfo`
- [x] Add null/undefined check in `parseData` function for array items
- [x] Ensure `hydra:member` array is properly validated before assignment
- [x] Fix `spendFileVersion` null access in `parseData` function

## Changes Made

### Files Modified
1. `src/services/graphql/apolloClient.ts`
   - Removed deprecated `addTypename` and `canonizeResults` options from `InMemoryCache`
   - Updated `ApolloClient` to use `devtools: { enabled: false }` instead of `connectToDevTools: false`
   - Updated `ApolloClient` to use `clientAwareness: { name, version }` instead of top-level `name` and `version`

2. `src/modules/adminBackend/views/AdminDataChange.vue`
   - Added validation in `callbackSuccess` to filter null/undefined items from `hydra:member` array
   - Added array validation and null checks in `showModalEditReq` function
   - Added array validation and null checks in `parseData` function
   - Fixed `spendFileVersion` null access using optional chaining

## Status
✅ All fixes completed and tested. No linter errors.

## Implementation Notes
- Apollo Client 3.14.0 requires new API structure for these options
- The runtime error occurs when iterating over array items that may be undefined/null
- Need to add defensive programming checks to prevent similar errors

