/**
 * Tests for useManualCalculatorValidation
 *
 * Covers:
 * - MANUAL_CALCULATOR_DEFAULTS constant shape
 * - isManualFieldInvalid() blank/NaN/valid cases
 * - validateManualCalculatorFields() for all 5 manual-input-mode fields
 * - createManualCalculatorFieldErrors() default shape
 */

import { describe, it, expect } from 'vitest'
import {
  MANUAL_CALCULATOR_DEFAULTS,
  isManualFieldInvalid,
  validateManualCalculatorFields,
  createManualCalculatorFieldErrors,
} from '@/modules/home/entityCard/composables/useManualCalculatorValidation'

describe('useManualCalculatorValidation', () => {
  describe('MANUAL_CALCULATOR_DEFAULTS', () => {
    it('matches the safe industry defaults from the spec', () => {
      expect(MANUAL_CALCULATOR_DEFAULTS).toEqual({
        supplierWacc: 0.09,
        supplierTaxRate: 0.35,
        contractualPaymentTerms: 0,
        changeInTerms: 0,
        priceChange: 0,
      })
    })
  })

  describe('isManualFieldInvalid', () => {
    it('returns true for null', () => {
      expect(isManualFieldInvalid(null)).toBe(true)
    })

    it('returns true for undefined', () => {
      expect(isManualFieldInvalid(undefined)).toBe(true)
    })

    it('returns true for NaN', () => {
      expect(isManualFieldInvalid(NaN)).toBe(true)
    })

    it('returns false for zero', () => {
      expect(isManualFieldInvalid(0)).toBe(false)
    })

    it('returns false for a negative number', () => {
      expect(isManualFieldInvalid(-30)).toBe(false)
    })

    it('returns false for a positive number', () => {
      expect(isManualFieldInvalid(0.09)).toBe(false)
    })
  })

  describe('validateManualCalculatorFields', () => {
    const validValues = {
      supplierWacc: 0.09,
      supplierTaxRate: 0.35,
      contractualPaymentTerms: 0,
      changeInTerms: 0,
      priceChange: 0,
    }

    it('is valid when all fields are filled with valid numbers', () => {
      const { valid, errors } = validateManualCalculatorFields(validValues)

      expect(valid).toBe(true)
      expect(errors).toEqual({
        supplierWacc: false,
        supplierTaxRate: false,
        contractualPaymentTerms: false,
        changeInTerms: false,
        priceChange: false,
      })
    })

    it.each([
      'supplierWacc',
      'supplierTaxRate',
      'contractualPaymentTerms',
      'changeInTerms',
      'priceChange',
    ] as const)('is invalid when %s is blank (null)', (field) => {
      const { valid, errors } = validateManualCalculatorFields({
        ...validValues,
        [field]: null,
      })

      expect(valid).toBe(false)
      expect(errors[field]).toBe(true)
    })

    it.each([
      'supplierWacc',
      'supplierTaxRate',
      'contractualPaymentTerms',
      'changeInTerms',
      'priceChange',
    ] as const)('is invalid when %s is non-numeric (NaN)', (field) => {
      const { valid, errors } = validateManualCalculatorFields({
        ...validValues,
        [field]: NaN,
      })

      expect(valid).toBe(false)
      expect(errors[field]).toBe(true)
    })

    it('only flags the specific invalid field, leaving the others valid', () => {
      const { errors } = validateManualCalculatorFields({
        ...validValues,
        priceChange: null,
      })

      expect(errors.priceChange).toBe(true)
      expect(errors.supplierWacc).toBe(false)
      expect(errors.supplierTaxRate).toBe(false)
      expect(errors.contractualPaymentTerms).toBe(false)
      expect(errors.changeInTerms).toBe(false)
    })
  })

  describe('createManualCalculatorFieldErrors', () => {
    it('defaults every field to false', () => {
      expect(createManualCalculatorFieldErrors()).toEqual({
        supplierWacc: false,
        supplierTaxRate: false,
        contractualPaymentTerms: false,
        changeInTerms: false,
        priceChange: false,
      })
    })

    it('sets every field to the given value', () => {
      expect(createManualCalculatorFieldErrors(true)).toEqual({
        supplierWacc: true,
        supplierTaxRate: true,
        contractualPaymentTerms: true,
        changeInTerms: true,
        priceChange: true,
      })
    })
  })
})
