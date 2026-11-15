import { describe, it, expect } from 'vitest'
import {
  activeClientModeI18nKey,
  type ActiveClientMode,
} from '@/modules/components/grid/calculum-grid/utils/activeClientModeI18nKey'

describe('activeClientModeI18nKey', () => {
  it.each<{ name: string; mode: ActiveClientMode; expected: string | null }>([
    {
      name: 'manual mode',
      mode: 'manual',
      expected: 'adminBackend.companiesAdmin.activeClientMode.manual',
    },
    {
      name: 'auto mode',
      mode: 'auto',
      expected: 'adminBackend.companiesAdmin.activeClientMode.auto',
    },
    {
      name: 'empty string → null',
      mode: '' as unknown as ActiveClientMode,
      expected: null,
    },
    {
      name: 'unknown mode → null',
      mode: 'hybrid' as unknown as ActiveClientMode,
      expected: null,
    },
    {
      name: 'null → null',
      mode: null,
      expected: null,
    },
    {
      name: 'undefined → null',
      mode: undefined,
      expected: null,
    },
  ])('$name', ({ mode, expected }) => {
    expect(activeClientModeI18nKey(mode)).toBe(expected)
  })
})
