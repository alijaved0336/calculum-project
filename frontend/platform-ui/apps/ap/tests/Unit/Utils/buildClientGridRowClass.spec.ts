import { describe, it, expect } from 'vitest'
import { buildClientGridRowClass } from '@/modules/components/grid/calculum-grid/utils/buildClientGridRowClass'

describe('buildClientGridRowClass', () => {
  const base = 'k-master-row'

  it.each([
    {
      name: 'analyze disabled + spendsAmount >= 2 keeps expand',
      input: {
        baseClass: base,
        dataItem: { disabled: true, spendsAmount: 2 },
        entityCard: false,
        isForParent: false,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row item-excluded',
    },
    {
      name: 'analyze disabled + spendsAmount < 2 hides expand',
      input: {
        baseClass: base,
        dataItem: { disabled: false, spendsAmount: 1 },
        entityCard: false,
        isForParent: false,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row hideExpanded',
    },
    {
      name: 'analyze disabled without spendsAmount leaves base (+ excluded)',
      input: {
        baseClass: base,
        dataItem: { disabled: true },
        entityCard: false,
        isForParent: false,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row item-excluded',
    },
    {
      name: 'parent disabled + countOfProviders >= 1 leaves base',
      input: {
        baseClass: base,
        dataItem: { disabled: false, countOfProviders: 1 },
        entityCard: false,
        isForParent: true,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row',
    },
    {
      name: 'parent disabled + countOfProviders 0 hides expand',
      input: {
        baseClass: base,
        dataItem: { disabled: true, countOfProviders: 0 },
        entityCard: false,
        isForParent: true,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row item-excluded hideExpanded',
    },
    {
      name: 'entityCard disabled adds excluded + disabled-checkbox',
      input: {
        baseClass: base,
        dataItem: { disabled: true },
        entityCard: true,
        isForParent: false,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row item-excluded disabled-checkbox',
    },
    {
      name: 'entityCard enabled leaves base',
      input: {
        baseClass: base,
        dataItem: { disabled: false },
        entityCard: true,
        isForParent: false,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row',
    },
    {
      name: 'default child spendsAmount >= 2',
      input: {
        baseClass: base,
        dataItem: { spendsAmount: 5 },
        entityCard: false,
        isForParent: false,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row',
    },
    {
      name: 'default child spendsAmount boundary 1 hides expand',
      input: {
        baseClass: base,
        dataItem: { spendsAmount: 1 },
        entityCard: false,
        isForParent: false,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row hideExpanded',
    },
    {
      name: 'default child nullish spendsAmount hides expand',
      input: {
        baseClass: base,
        dataItem: {},
        entityCard: false,
        isForParent: false,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row hideExpanded',
    },
    {
      name: 'default parent suppliersAmount >= 1',
      input: {
        baseClass: base,
        dataItem: { suppliersAmount: 1 },
        entityCard: false,
        isForParent: true,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row',
    },
    {
      name: 'default parent suppliersAmount 0 hides expand',
      input: {
        baseClass: base,
        dataItem: { suppliersAmount: 0 },
        entityCard: false,
        isForParent: true,
        isSummaryListPlan: false,
      },
      expected: 'k-master-row hideExpanded',
    },
    {
      name: 'summary list plan phases > 0 keeps expand',
      input: {
        baseClass: base,
        dataItem: { phases: 2 },
        entityCard: false,
        isForParent: true,
        isSummaryListPlan: true,
      },
      expected: 'k-master-row',
    },
    {
      name: 'summary list plan phases 0 hides expand',
      input: {
        baseClass: base,
        dataItem: { phases: 0 },
        entityCard: false,
        isForParent: true,
        isSummaryListPlan: true,
      },
      expected: 'k-master-row hideExpanded',
    },
  ])('$name', ({ input, expected }) => {
    expect(buildClientGridRowClass(input)).toBe(expected)
  })
})
