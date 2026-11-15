import { describe, it, expect } from 'vitest'
import { buildGraphqlGridRowClass } from '@/modules/components/grid/calculum-grid-graphql/utils/buildGraphqlGridRowClass'

describe('buildGraphqlGridRowClass', () => {
  const base = 'k-master-row'
  const blur = ' blur-effect'
  const noBlur = ''

  it.each([
    {
      name: 'analyze disabled + spendsAmount >= 2 keeps expand and appends blur',
      input: {
        baseClass: base,
        dataItem: { disabled: true, spendsAmount: 2 },
        entityCard: false,
        isForParent: false,
        blurSuffix: blur,
      },
      expected: 'k-master-row item-excluded blur-effect',
    },
    {
      name: 'analyze disabled + spendsAmount < 2 hides expand and appends blur',
      input: {
        baseClass: base,
        dataItem: { disabled: false, spendsAmount: 1 },
        entityCard: false,
        isForParent: false,
        blurSuffix: blur,
      },
      expected: 'k-master-row hideExpanded blur-effect',
    },
    {
      name: 'analyze disabled without spendsAmount leaves base (+ excluded)',
      input: {
        baseClass: base,
        dataItem: { disabled: true },
        entityCard: false,
        isForParent: false,
        blurSuffix: blur,
      },
      expected: 'k-master-row item-excluded',
    },
    {
      name: 'parent disabled + countOfProviders >= 1 appends blur only',
      input: {
        baseClass: base,
        dataItem: { disabled: false, countOfProviders: 1 },
        entityCard: false,
        isForParent: true,
        blurSuffix: blur,
      },
      expected: 'k-master-row blur-effect',
    },
    {
      name: 'parent disabled + countOfProviders 0 hides expand then blur',
      input: {
        baseClass: base,
        dataItem: { disabled: true, countOfProviders: 0 },
        entityCard: false,
        isForParent: true,
        blurSuffix: blur,
      },
      expected: 'k-master-row item-excluded hideExpanded blur-effect',
    },
    {
      name: 'entityCard disabled adds excluded + disabled-checkbox + blur',
      input: {
        baseClass: base,
        dataItem: { disabled: true },
        entityCard: true,
        isForParent: false,
        blurSuffix: blur,
      },
      expected: 'k-master-row item-excluded disabled-checkbox  blur-effect',
    },
    {
      name: 'entityCard enabled adds spaced blur only',
      input: {
        baseClass: base,
        dataItem: { disabled: false },
        entityCard: true,
        isForParent: false,
        blurSuffix: blur,
      },
      expected: 'k-master-row  blur-effect',
    },
    {
      name: 'default child spendsAmount >= 2',
      input: {
        baseClass: base,
        dataItem: { spendsAmount: 5 },
        entityCard: false,
        isForParent: false,
        blurSuffix: noBlur,
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
        blurSuffix: blur,
      },
      expected: 'k-master-row hideExpanded  blur-effect',
    },
    {
      name: 'default child nullish spendsAmount hides expand',
      input: {
        baseClass: base,
        dataItem: {},
        entityCard: false,
        isForParent: false,
        blurSuffix: noBlur,
      },
      expected: 'k-master-row hideExpanded ',
    },
    {
      name: 'default parent suppliersAmount >= 1',
      input: {
        baseClass: base,
        dataItem: { suppliersAmount: 1 },
        entityCard: false,
        isForParent: true,
        blurSuffix: blur,
      },
      expected: 'k-master-row blur-effect',
    },
    {
      name: 'default parent suppliersAmount 0 hides expand',
      input: {
        baseClass: base,
        dataItem: { suppliersAmount: 0 },
        entityCard: false,
        isForParent: true,
        blurSuffix: noBlur,
      },
      expected: 'k-master-row hideExpanded ',
    },
  ])('$name', ({ input, expected }) => {
    expect(buildGraphqlGridRowClass(input)).toBe(expected)
  })
})
