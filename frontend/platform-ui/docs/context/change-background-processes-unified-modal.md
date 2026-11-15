# Checklist: Unified Background Processes Modal (Work Item 13492)

## Work Item Requirements

### General Description
- Unified "Background Processes" modal that displays all active tasks as a queue
- Each task is displayed as an item/row within the modal (not separate modals)
- Users can execute multiple tasks in parallel
- The modal appears automatically when there is at least one active task
- Reusable system for future types of background processes

### Acceptance Criteria

#### 1. Trigger Behavior
- [ ] When a background process starts, the "Background Processes" modal appears automatically
- [ ] If additional processes are started, they are added to the modal as new items in the list

#### 2. Modal Layout
- [ ] A single modal that contains N tasks
- [ ] Each task is displayed as an item/row with:
  - [ ] Title (e.g., "Exporting PDF", "Generating ZIP")
  - [ ] Progress bar or percentage
  - [ ] Status text
  - [ ] Cancel button (if allowed)

#### 3. Task Management
- [ ] Users can trigger multiple background operations
- [ ] Each operation must appear independently in the modal
- [ ] Users can cancel any running task if supported

#### 4. Completion Behavior
- [ ] When a task completes, it remains visible with "Completed" status
- [ ] Completed tasks remain until the modal is closed or the user clears the list
- [ ] The modal closes automatically when all tasks are completed and removed (optional based on UX)

#### 5. Scalability
- [ ] The system must be able to support future types of background processes with minimal changes

## Implementation Plan

### Phase 1: Create Generic Background Processes System
- [x] Create `useBackgroundProcesses.ts` composable to manage the process queue
  - [x] Define `BackgroundProcess` interface with: id, title, type, progress, status, cancelable, cancelFn
  - [x] Shared reactive state (singleton) for the process queue
  - [x] Functions: `addProcess`, `updateProcess`, `removeProcess`, `cancelProcess`
  - [x] Computed to determine if there are active processes

- [x] Create `BackgroundProcessesModal.vue` component
  - [x] Modal that displays automatically when there are active processes
  - [x] List of processes as items/rows
  - [x] Each item displays: title, progress, status, cancel button
  - [x] Button to close the modal
  - [x] Option to clear completed processes

### Phase 2: Integrate with PDF Export
- [x] Modify `useMultiplePDFExport.ts` to use the new system
  - [x] Register the process in the queue when it starts
  - [x] Update progress in the queue
  - [x] Mark as completed when it finishes
  - [x] Handle cancellation from the modal

- [x] Modify `MultipleSuppliersExportPDF.vue`
  - [x] When clicking "Export PDF", register the process and close the selection modal
  - [x] The "Background Processes" modal will appear automatically

- [x] Remove or deprecate `BackgroundExportProgress.vue` (replaced by BackgroundProcessesModal)

### Phase 3: Global Integration
- [x] Register `BackgroundProcessesModal` in `App.vue` to make it globally available
- [x] Ensure the modal displays automatically when there are active processes

### Phase 4: Testing and Documentation
- [ ] Update documentation in `multiple-suppliers-pdf-export.md`
- [ ] Test multiple simultaneous exports
- [ ] Verify that the modal closes correctly when there are no active processes
- [ ] Add missing translation keys (remove, clearCompleted, modal.backgroundProcesses)

## Technical Notes

### Process Types
- `PDF_EXPORT`: Multiple PDF export
- Future: `ZIP_GENERATION`, `DATA_EXPORT`, etc.

### Process States
- `running`: Process in execution
- `completed`: Process completed successfully
- `failed`: Process failed
- `cancelled`: Process cancelled by the user

### Estructura de Datos
```typescript
interface BackgroundProcess {
  id: string; // UUID único
  title: string; // "Exporting PDF", "Generating ZIP", etc.
  type: 'PDF_EXPORT' | 'ZIP_GENERATION' | string;
  progress: {
    current: number;
    total: number;
    percentage?: number;
    statusText?: string;
  };
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  cancelable: boolean;
  cancelFn?: () => void;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}
```

