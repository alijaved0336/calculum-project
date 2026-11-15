# Reset MultipleSuppliersExportPDF Component for Multiple Exports

## Checklist

- [x] Analyze current component behavior
- [x] Add watch to reset `suppliersToExport` when `props.suppliers` changes
- [x] Reset `suppliersToExport` when modal closes after export starts
- [x] Update `BackgroundExportProgress.vue` to show multiple concurrent exports from `useBackgroundProcesses`
- [x] Remove progress display from `MultipleSuppliersExportPDF.vue` (progress shown in `BackgroundExportProgress.vue`)
- [x] Simplify component to only initiate exports, not display progress
- [ ] Test that multiple exports can be initiated and all are visible
- [ ] Verify component resets correctly for new export batches

## Problem

When a user exports a ZIP, the modal closes but the component doesn't reset completely. When a new batch of suppliers is sent, the component may still have state from the previous export, preventing the user from exporting or canceling properly.

Additionally, `BackgroundExportProgress.vue` currently only shows one export at a time because it uses the singleton state from `useMultiplePDFExport`. However, the system should support multiple concurrent exports, all visible in the progress component.

## Solution

1. **Reset component state**: Add a `watch` to sync `suppliersToExport` with `props.suppliers` and reset when modal closes after export starts.
2. **Multiple exports display**: Update `BackgroundExportProgress.vue` to use `useBackgroundProcesses` to display all concurrent exports instead of just the singleton state from `useMultiplePDFExport`.

## Changes Made

### MultipleSuppliersExportPDF.vue
- Add `watch` to sync `suppliersToExport` with `props.suppliers`
- Reset `suppliersToExport` when export starts and modal closes
- **Removed all progress display UI** (progress indicator, errors display, status text)
- **Removed** `progress`, `errors`, `isExporting`, `isMinimized` from composable destructuring
- **Removed** `getStatusText` function
- **Simplified** `handleClose` to just emit 'close' (no cancellation logic)
- **Removed** `cancelExport` and `setMinimized` from composable destructuring
- **Removed** `errors` reference from `export-complete` emit
- **Simplified** button disabled condition to only check `suppliersToExport.length === 0`
- **Removed** unused CSS for progress container
- Component now only displays supplier list and initiates exports - all progress is shown in `BackgroundExportProgress.vue`

### BackgroundExportProgress.vue
- **Single modal in bottom right corner**: Uses `Teleport` to render a single modal container in the bottom right corner (does not block UI)
- **All processes in one modal**: All processes are displayed in a list within the single modal window
- **Simple Cancel button**: Each running process has a simple "Cancel" button (only visible when process is running and cancelable)
- **Uses `useBackgroundProcesses`**: Changed from using `useMultiplePDFExport` singleton state to `useBackgroundProcesses` to show all concurrent exports
- **Modal visibility**: Modal appears automatically when there are active processes (`v-if="hasActiveProcesses"`) and hides when all processes are completed
- **Automatic cleanup**: When all processes finish (modal hides), completed/cancelled/failed processes are automatically cleaned from the queue using `clearCompleted()`. This ensures that when a new export is initiated, only new processes are shown, not old completed ones.
- **Cleanup on cancel**: When a process is cancelled and it's the last active process, completed processes are also cleaned up after a short delay to ensure state is updated.
- **Non-blocking UI**: Modal is positioned fixed in the bottom right corner, allowing users to continue working and selecting other bulk exports
- **Each process item displays**:
  - Title and status text
  - Progress bar with percentage (only for running processes)
  - Current/Total count (only for running processes)
  - Error message (if any)
  - Cancel button (only for running, cancelable processes)
- **Maintains same visual design**: Individual process items maintain the same visual design as before, but are now contained within a single modal

