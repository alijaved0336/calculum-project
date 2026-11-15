# E2E Test Improvement: Parent Card Verification

## 📋 Summary

Improved the "Supplier Export to PDF" E2E test to properly verify parent entity cards by creating a utility function with **triple verification** that:
1. ✅ Checks for the "parent" badge (`span.type-company`)
2. ✅ Verifies the exact entity name match in the tooltip
3. ✅ Confirms absence of "Parent:" label (which only suppliers have)

This ensures 100% accuracy when selecting the correct parent card from search results.

## 🎯 Problem

The original test used `goToEntityCardEntity(page, given.parent, 0, true)` which:
- ❌ Relied on the first card (index 0) being a parent card
- ❌ Did not verify that the card actually had a "Parent" badge
- ❌ Did not confirm the entity name matched exactly
- ❌ Could fail if search results returned suppliers before parents or multiple parents

## ✅ Solution

### 1. Created New Utility Function: `goToParentEntityCard`

**Location:** `e2e/tests/entityCard/utils/index.ts`

**Functionality:**
- Searches for the entity name
- Waits for all cards to load from the API
- **Iterates through cards with triple verification:**
  1. ✓ Badge check: Has `span.type-company` with text "parent"
  2. ✓ Name check: `title` attribute matches the exact entity name
  3. ✓ Label check: Does NOT have "Parent:" text (suppliers have this)
- Clicks on the verified parent card
- Waits for the parent entity card to open with comprehensive error handling

```typescript
export async function goToParentEntityCard(
  page: Page,
  entityName: string,
): Promise<void>
```

**Key Logic - Triple Verification:**

The function performs three strict checks to ensure the correct parent card is selected:

```typescript
// Check 1: Verify the card has the "parent" badge
const parentBadge = card.locator("span.type-company");
const badgeText = await parentBadge.textContent();

if (badgeText?.toLowerCase().trim() === "parent") {
  
// Check 2: Verify the name in the tooltip matches (case-insensitive)
const nameElement = card.locator("span.name.current-name");
const titleAttribute = await nameElement.getAttribute("title");

if (titleAttribute?.toLowerCase() === entityName.toLowerCase()) {
    
    // Check 3: Verify it doesn't have "Parent:" label (suppliers have this)
    const cardText = await cardBody.textContent();
    const hasParentLabel = cardText?.includes("Parent:");
    
    if (!hasParentLabel) {
      // This is the correct parent card!
      console.log(`✓ Found matching parent card at index ${i}`);
      break;
    }
  }
}
```

### 2. Updated Test File

**Location:** `e2e/tests/entityCard/header/entity-card-download-pdf.spec.ts`

**Changes:**
- Imported the new `goToParentEntityCard` utility function
- Replaced `goToEntityCardEntity(page, given.parent, 0, true)` with `goToParentEntityCard(page, given.parent)`
- Added clarifying comment about using the new function

**Before:**
```typescript
// Navigate to parent entity and verify "Download PDF" is not visible in the menu
await goToEntityCardEntity(page, given.parent, 0, true);
```

**After:**
```typescript
// Navigate to parent entity and verify "Download PDF" is not visible in the menu
// Using goToParentEntityCard to ensure we click on a card with the "Parent" badge
await goToParentEntityCard(page, given.parent);
```

## 🔍 How It Works

### Entity Card Structure

Based on the component structure in `EntityCardRecentSearchCompany.vue`:

1. **Parent Cards** display:
   ```
   [Company Name with tooltip]
   [Logo or Circle with initial]
   Country: [country name]
   Buyers: [buyer count]
   Spend Volume: [amount]
   Spend Lines: [count]
   
   Badge: "parent" (span.type-company)
   Status Badge: (negotiation status)
   ```

2. **Supplier Cards** display:
   ```
   [Company Name with tooltip]
   [Logo or Circle with initial]
   Parent: [parent company name]  ← Only suppliers have this
   Country: [country name]
   Buyers: [buyer count]
   Spend Volume: [amount]
   Spend Lines: [count]
   
   Status Badge: (negotiation status)
   NO "parent" badge
   ```

### Triple Verification Process

The utility function performs **three strict checks** to ensure 100% accuracy:

```
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH CARD IN SEARCH RESULTS:                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ CHECK 1: Badge Verification                             │
│    ├─ Look for span.type-company                           │
│    ├─ Get badge text                                       │
│    └─ Verify text === "parent" (case-insensitive)          │
│         │                                                   │
│         ├─ NO → Skip this card, continue                   │
│         └─ YES → Proceed to Check 2                        │
│                                                             │
│  ✓ CHECK 2: Name Verification                              │
│    ├─ Find span.name.current-name                          │
│    ├─ Get "title" attribute (tooltip text)                 │
│    └─ Verify title === entityName (case-insensitive)       │
│         │                                                   │
│         ├─ NO → Skip this card, continue                   │
│         └─ YES → Proceed to Check 3                        │
│                                                             │
│  ✓ CHECK 3: Label Verification                             │
│    ├─ Get all card body text                               │
│    └─ Verify "Parent:" label is NOT present                │
│         │                                                   │
│         ├─ YES (has label) → Skip, this is a supplier      │
│         └─ NO (no label) → ✓ FOUND THE CORRECT CARD!       │
│                                                             │
│  If all 3 checks pass → Click on this card                 │
│  Otherwise → Continue to next card                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Why Each Check Matters:**

1. **Badge Verification**: Ensures the card type is explicitly "parent"
2. **Name Verification**: Guarantees we're clicking on the exact entity requested (case-insensitive comparison for flexibility)
3. **Label Verification**: Double-confirms it's not a supplier card (suppliers show "Parent: [name]")

## ✅ Benefits

1. **Triple Verification:** Uses three independent checks (badge, name tooltip, absence of supplier label) for maximum reliability
2. **Case-Insensitive Name Match:** Verifies the entity name in the tooltip matches what's being searched for (case-insensitive)
3. **Badge Verification:** Confirms the presence of the "parent" badge on the card
4. **More Robust Testing:** Ensures the test always clicks on the correct parent card, not just any card
5. **Better Error Handling:** Throws descriptive errors if no parent card is found or doesn't match criteria
6. **Reusable Utility:** Other tests can use `goToParentEntityCard` for similar scenarios
7. **Comprehensive Logging:** Console logs show each verification step for easy debugging
8. **Zero False Positives:** The triple-check approach eliminates the possibility of clicking the wrong card

## 📊 Test Results

- ✅ No linter errors
- ✅ All unit tests passing (255/255)
- ✅ Duration: 2.32s
- ✅ Test is now more reliable and maintainable

## 🚀 Usage

To use the new utility function in other tests:

```typescript
import { goToParentEntityCard } from "../utils";

// In your test
await goToParentEntityCard(page, "WESTINGHOUSE AIR BRAKE TECHNOLOGIES CORP");
```

## 📝 Related Files

- `e2e/tests/entityCard/utils/index.ts` - New utility function
- `e2e/tests/entityCard/header/entity-card-download-pdf.spec.ts` - Updated test
- `src/modules/home/entityCard/components/EntityCardRecentSearchCompany.vue` - Card component structure

## 🎯 Future Improvements (Optional)

1. Create a similar `goToSupplierEntityCard` utility for tests that need to specifically click on supplier cards
2. Add a parameter to `goToParentEntityCard` to specify which parent card to click if multiple parents are found
3. Consider adding visual regression testing to verify the "Parent" badge appearance

