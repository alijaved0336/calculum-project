# ManageTeamAction - CRUD Functions Implementation

## Summary
Implemented complete CRUD (Create, Read, Update, Delete) functionality for the team management component, including search/filter capability and UI state management.

**Note:** This document describes the initial UI implementation. For the complete API integration and store management, see `change-team-crud-api-integration.md`.

## Changes Applied

### File: `src/modules/components/grid/menuActions/ManageTeamAction.vue`

## 1. Template Changes

### Added Search Input Binding (Lines 8-12)
```pug
input#search-team.form-control.w-100(
    type="text" 
    placeholder="Search..."
    v-model="searchQuery"
)
```

**Purpose:** Binds search input to reactive state for filtering

### Added "Add New" Form (Lines 13-23)
```pug
.header-container(v-if="isAddingNew")
    input.form-control(
        type="text"
        placeholder="Enter team name..."
        v-model="newItemName"
        @keyup.enter="addNewItem"
        autofocus
    )
    .actions-box
        i.fa.fa-check.cursor-pointer.text-success(@click="addNewItem")
        i.fa.fa-times.cursor-pointer.text-danger(@click="cancelAddNew")
```

**Features:**
- Conditional rendering when adding new item
- Enter key to save
- Check icon to confirm
- X icon to cancel
- Auto-focus on input

### Updated Item List with Edit Mode (Lines 24-45)
```pug
.header-container(v-for="item in filteredItems" :key="item.id")
    template(v-if="editingItemId === item.id")
        input.form-control(
            type="text"
            v-model="editingItemName"
            @keyup.enter="saveEdit"
            @keyup.esc="cancelEdit"
        )
        .actions-box
            i.fa.fa-check.cursor-pointer.text-success(@click="saveEdit")
            i.fa.fa-times.cursor-pointer.text-danger(@click="cancelEdit")
    template(v-else)
        .select-box
            input.k-checkbox(...)
            InitialLettersText(:text="item.name")
        .actions-box
            i.fa.fa-pencil.cursor-pointer(@click="startEdit(item)")
            i.del.fa.fa-trash.cursor-pointer(@click="deleteItem(item.id)")
```

**Features:**
- Uses `filteredItems` instead of `items` for search functionality
- Conditional rendering for edit mode
- Enter to save, Esc to cancel
- Edit and delete icons with click handlers

### Updated Header Actions (Lines 4-6)
```pug
.add-team
    i.fa.fa-plus.add_icon.cursor-pointer(@click="toggleAddNew")
    span.text-gray-400.cursor-pointer(@click="clearSelection") {{ 'Clear' }}
```

## 2. Script Changes

### Added TypeScript Interface (Lines 54-57)
```typescript
interface TeamItem {
  id: number;
  name: string;
}
```

**Purpose:** Type safety for team items

### Added Reactive State (Lines 84-88)
```typescript
const searchQuery = ref<string>('');
const editingItemId = ref<number | null>(null);
const editingItemName = ref<string>('');
const isAddingNew = ref<boolean>(false);
const newItemName = ref<string>('');
```

### Added Computed Property (Lines 91-100)
```typescript
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return items.value;
  }
  
  const query = searchQuery.value.toLowerCase();
  return items.value.filter(item => 
    item.name.toLowerCase().includes(query)
  );
});
```

**Purpose:** Filters items based on search query

### Implemented CRUD Functions

#### 1. Create Functions (Lines 107-141)

**toggleAddNew()** - Lines 107-114
```typescript
function toggleAddNew() {
  isAddingNew.value = !isAddingNew.value;
  if (isAddingNew.value) {
    newItemName.value = '';
    cancelEdit();  // Cancel any ongoing edit
  }
}
```

**addNewItem()** - Lines 119-133
```typescript
function addNewItem() {
  if (newItemName.value.trim() === '') return;
  
  const newId = items.value.length > 0 
    ? Math.max(...items.value.map(i => i.id)) + 1 
    : 1;
  
  items.value.push({
    id: newId,
    name: newItemName.value.trim()
  });
  
  newItemName.value = '';
  isAddingNew.value = false;
}
```

**Features:**
- Validates non-empty name
- Generates unique ID (max existing ID + 1)
- Trims whitespace
- Resets form after adding

**cancelAddNew()** - Lines 138-141
```typescript
function cancelAddNew() {
  isAddingNew.value = false;
  newItemName.value = '';
}
```

#### 2. Update Functions (Lines 146-173)

**startEdit()** - Lines 146-151
```typescript
function startEdit(item: TeamItem) {
  editingItemId.value = item.id;
  editingItemName.value = item.name;
  isAddingNew.value = false;  // Cancel add if active
}
```

**saveEdit()** - Lines 156-165
```typescript
function saveEdit() {
  if (editingItemName.value.trim() === '') return;
  
  const itemIndex = items.value.findIndex(i => i.id === editingItemId.value);
  if (itemIndex !== -1) {
    items.value[itemIndex].name = editingItemName.value.trim();
  }
  
  cancelEdit();
}
```

**Features:**
- Validates non-empty name
- Finds item by ID
- Updates name
- Trims whitespace
- Exits edit mode

**cancelEdit()** - Lines 170-173
```typescript
function cancelEdit() {
  editingItemId.value = null;
  editingItemName.value = '';
}
```

#### 3. Delete Function (Lines 178-180)
```typescript
function deleteItem(itemId: number) {
  items.value = items.value.filter(i => i.id !== itemId);
}
```

**Features:**
- Removes item by ID
- Updates array immutably

#### 4. Utility Function (Lines 185-190)
```typescript
function clearSelection() {
  const checkboxes = document.querySelectorAll('.k-checkbox');
  checkboxes.forEach((checkbox: any) => {
    checkbox.checked = false;
  });
}
```

**Purpose:** Clears all checkbox selections

## 3. Style Changes (Lines 276-287)

```scss
.del {
  color: $color-primary-500;
}
.text-success {
  color: #28a745;
}
.text-danger {
  color: #dc3545;
}
.form-control {
  flex: 1;
}
```

**Added:**
- Success color for check icons
- Danger color for cancel/delete icons
- Flex styling for input fields

## Features Implemented

### ✅ Create (Add)
- Click "+" icon to show add form
- Enter team name
- Press Enter or click check icon to save
- Click X icon to cancel
- Validates non-empty names
- Generates unique IDs

### ✅ Read (Search/Filter)
- Type in search box to filter items
- Case-insensitive search
- Searches in team names
- Shows all items when search is empty

### ✅ Update (Edit)
- Click pencil icon to enter edit mode
- Modify team name
- Press Enter or click check icon to save
- Press Esc or click X icon to cancel
- Validates non-empty names
- Only one item can be edited at a time

### ✅ Delete
- Click trash icon to delete item
- Immediate deletion (no confirmation)
- Item removed from list

### ✅ Additional Features
- Clear button to deselect all checkboxes
- Mutual exclusion: can't add and edit simultaneously
- Keyboard shortcuts (Enter, Esc)
- Auto-focus on input fields
- Visual feedback with colored icons

## User Interactions

### Adding New Item
1. Click "+" icon
2. Add form appears
3. Type team name
4. Press Enter or click ✓
5. Item added to list
6. Form closes

### Editing Item
1. Click pencil icon on item
2. Item switches to edit mode
3. Modify name
4. Press Enter or click ✓
5. Changes saved
6. Returns to normal view

### Deleting Item
1. Click trash icon
2. Item immediately removed

### Searching
1. Type in search box
2. List filters in real-time
3. Clear search to show all

### Clearing Selection
1. Click "Clear" text
2. All checkboxes unchecked

## Technical Details

### State Management
- All state managed with Vue 3 Composition API
- Reactive refs for UI state
- Computed property for filtered items

### ID Generation
- Uses `Math.max()` to find highest existing ID
- Adds 1 to generate new unique ID
- Handles empty array case (starts at 1)

### Validation
- Trims whitespace before saving
- Rejects empty names
- Returns early if validation fails

### Mutual Exclusion
- Starting edit cancels add mode
- Starting add cancels edit mode
- Prevents conflicting states

## Testing Checklist

- [x] No linter errors
- [x] TypeScript compilation successful
- [ ] Manual testing needed:
  - [ ] Add new item with valid name
  - [ ] Try to add with empty name (should reject)
  - [ ] Edit existing item
  - [ ] Try to edit with empty name (should reject)
  - [ ] Delete item
  - [ ] Search for items
  - [ ] Clear search
  - [ ] Clear checkboxes
  - [ ] Press Enter to save (add/edit)
  - [ ] Press Esc to cancel edit
  - [ ] Click check icon to save
  - [ ] Click X icon to cancel
  - [ ] Try to add while editing (should cancel edit)
  - [ ] Try to edit while adding (should cancel add)

## Future Enhancements

### Suggested Improvements
1. **Confirmation Modal**: Add confirmation before delete
2. **Duplicate Check**: Prevent duplicate team names
3. **API Integration**: Persist changes to backend
4. **Loading States**: Show loading during API calls
5. **Error Handling**: Display errors with toasts
6. **Undo/Redo**: Allow reverting changes
7. **Bulk Actions**: Select multiple items for bulk operations
8. **Sorting**: Add ability to sort items
9. **Pagination**: Handle large lists efficiently
10. **Drag & Drop**: Reorder items by dragging

## Date
February 13, 2026
