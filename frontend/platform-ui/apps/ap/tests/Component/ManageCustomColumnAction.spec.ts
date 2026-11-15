/**
 * Tests for ManageCustomColumnAction numeric-input logic.
 *
 * The component cannot be mounted directly in Vitest because its Pug template
 * contains TypeScript casts that the Rollup SSR transform cannot parse.
 * Strategy: mirror the relevant pure logic as standalone functions and test
 * those directly (same pattern as ManageTeamAction.spec.ts).
 */

import { describe, it, expect } from 'vitest'

// ─── Mirrors numericValidationError computed ──────────────────────────────────

type ColumnType = "text" | "number" | "days" | "money"

const NUMERIC_MSG = "Enter a valid number (up to 4 decimal places)"
const INTEGER_MSG = "Enter a whole number (no decimals)"

function numericValidationError(value: string, columnType: ColumnType): string | null {
  if (value === "") return null
  if (columnType === "days") {
    return /^\d+$/.test(value) ? null : INTEGER_MSG
  }
  return /^-?\d+(\.\d{1,4})?$/.test(value) ? null : NUMERIC_MSG
}

// ─── Mirrors isNumeric computed ───────────────────────────────────────────────

function isNumeric(columnType: ColumnType): boolean {
  return columnType !== "text"
}

// ─── Mirrors submitNumeric guard ──────────────────────────────────────────────

function canSubmitNumeric(value: string, validationError: string | null): boolean {
  return validationError === null && value !== ""
}

// ─── Tests: isNumeric ─────────────────────────────────────────────────────────

describe('ManageCustomColumnAction — isNumeric', () => {
  it('returns false for "text"', () => {
    expect(isNumeric("text")).toBe(false)
  })

  it('returns true for "number"', () => {
    expect(isNumeric("number")).toBe(true)
  })

  it('returns true for "days"', () => {
    expect(isNumeric("days")).toBe(true)
  })

  it('returns true for "money"', () => {
    expect(isNumeric("money")).toBe(true)
  })
})

// ─── Tests: numericValidationError — empty input ─────────────────────────────

describe('ManageCustomColumnAction — numericValidationError — empty input', () => {
  it('returns null for empty string regardless of columnType', () => {
    expect(numericValidationError("", "days")).toBeNull()
    expect(numericValidationError("", "number")).toBeNull()
    expect(numericValidationError("", "money")).toBeNull()
  })
})

// ─── Tests: numericValidationError — days (integer only) ─────────────────────

describe('ManageCustomColumnAction — numericValidationError — days', () => {
  it('accepts positive integer', () => {
    expect(numericValidationError("30", "days")).toBeNull()
  })

  it('accepts zero', () => {
    expect(numericValidationError("0", "days")).toBeNull()
  })

  it('rejects decimal number', () => {
    expect(numericValidationError("30.5", "days")).toBe(INTEGER_MSG)
  })

  it('rejects negative integer', () => {
    expect(numericValidationError("-5", "days")).toBe(INTEGER_MSG)
  })

  it('rejects alphabetic input', () => {
    expect(numericValidationError("abc", "days")).toBe(INTEGER_MSG)
  })

  it('rejects value with trailing dot', () => {
    expect(numericValidationError("30.", "days")).toBe(INTEGER_MSG)
  })
})

// ─── Tests: numericValidationError — number / money (decimal ≤4dp) ───────────

describe('ManageCustomColumnAction — numericValidationError — number', () => {
  it('accepts integer', () => {
    expect(numericValidationError("100", "number")).toBeNull()
  })

  it('accepts 1 decimal place', () => {
    expect(numericValidationError("1.5", "number")).toBeNull()
  })

  it('accepts 4 decimal places', () => {
    expect(numericValidationError("1234.5678", "number")).toBeNull()
  })

  it('rejects 5 decimal places', () => {
    expect(numericValidationError("1234.56789", "number")).toBe(NUMERIC_MSG)
  })

  it('accepts negative decimal', () => {
    expect(numericValidationError("-1.5", "number")).toBeNull()
  })

  it('rejects alphabetic input', () => {
    expect(numericValidationError("abc", "number")).toBe(NUMERIC_MSG)
  })

  it('rejects value with trailing dot', () => {
    expect(numericValidationError("10.", "number")).toBe(NUMERIC_MSG)
  })
})

describe('ManageCustomColumnAction — numericValidationError — money', () => {
  it('accepts integer', () => {
    expect(numericValidationError("5000", "money")).toBeNull()
  })

  it('accepts 4 decimal places', () => {
    expect(numericValidationError("5000.1234", "money")).toBeNull()
  })

  it('rejects 5 decimal places', () => {
    expect(numericValidationError("5000.12345", "money")).toBe(NUMERIC_MSG)
  })

  it('accepts negative value', () => {
    expect(numericValidationError("-5000", "money")).toBeNull()
  })
})

// ─── Tests: canSubmitNumeric guard ────────────────────────────────────────────

describe('ManageCustomColumnAction — canSubmitNumeric', () => {
  it('returns false when input is empty', () => {
    expect(canSubmitNumeric("", null)).toBe(false)
  })

  it('returns false when there is a validation error', () => {
    expect(canSubmitNumeric("30.5", INTEGER_MSG)).toBe(false)
  })

  it('returns true when input is non-empty and error is null', () => {
    expect(canSubmitNumeric("30", null)).toBe(true)
  })

  it('returns false when error is non-null even if input is non-empty', () => {
    expect(canSubmitNumeric("abc", NUMERIC_MSG)).toBe(false)
  })
})
