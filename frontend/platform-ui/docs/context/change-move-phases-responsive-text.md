# MovePhasesAction - Responsive Text Implementation

## Summary
Made the empty list message in `MovePhasesAction.vue` responsive to adapt to different screen sizes.

## Changes Applied

### File: `src/modules/components/grid/menuActions/MovePhasesAction.vue`

#### 1. Responsive Typography (Lines 50-54)
```scss
span {
  font-size: clamp(12px, 2.5vw, 14px);  // Was: font-size: 14px;
  word-break: break-word;                // New: prevents overflow
  line-height: 1.4;                      // New: improves readability
}
```

**Benefits:**
- Font scales automatically between 12px (mobile) and 14px (desktop)
- Text breaks properly on narrow screens
- Better line spacing for multi-line text

#### 2. Container Improvements (Lines 69-76)
```scss
.test {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  padding: 8px;           // New: adds breathing room
  text-align: center;     // New: centers wrapped text
}
```

**Benefits:**
- Proper padding prevents text from touching edges
- Centered alignment improves visual hierarchy
- Works well with existing flex-wrap

## Technical Details

### CSS Technique: `clamp()`
- **Syntax**: `clamp(min, preferred, max)`
- **Browser Support**: Chrome 79+, Firefox 75+, Safari 13.1+
- **Fallback**: Not needed (modern browsers only)

### Affected Message
- **i18n Key**: `home.analyze.moveBetweenPlanPhasesEmptyList`
- **English**: "You should create at least one Plan/Phase to use this feature."
- **Spanish**: "Debes crear al menos un plan/fase para utilizar esta función."

## Testing Recommendations

1. **Mobile (320px - 768px)**: Verify text is readable at 12px minimum
2. **Tablet (768px - 1024px)**: Verify smooth scaling
3. **Desktop (1024px+)**: Verify text caps at 14px maximum
4. **Long translations**: Test with languages that have longer strings

## Related Components

This pattern can be applied to other menu action components with empty states:
- `ExportPDFAction.vue`
- `FinancingAction.vue`
- `SetTargetAction.vue`
- `VcardAction.vue`

## Date
February 13, 2026
