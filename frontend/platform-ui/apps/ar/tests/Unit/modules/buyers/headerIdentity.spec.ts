import { describe, expect, it } from 'vitest'
import { toHeaderIdentity } from '@/modules/buyers/components/customerCard/headerIdentity'
import type { BuyerCompanyDetailsResponse } from '@/api'

describe('toHeaderIdentity', () => {
  it('maps the Company Details identity onto the header shape', () => {
    const details = {
      companyName: 'Caterpillar Inc',
      originalName: 'CATERPILLAR INC.',
      role: 'Parent',
      countryName: 'United States',
      countryFlagUrl: 'https://example.com/us.svg',
      logoUrl: 'https://example.com/cat.png',
    } as BuyerCompanyDetailsResponse

    expect(toHeaderIdentity(details)).toEqual({
      name: 'Caterpillar Inc',
      originalName: 'CATERPILLAR INC.',
      role: 'Parent',
      country: 'United States',
      countryFlagUrl: 'https://example.com/us.svg',
      logoUrl: 'https://example.com/cat.png',
    })
  })

  it('keeps a null name null so the header shows its own not-available marker', () => {
    const details = { companyName: null, originalName: null, role: 'Counterparty', countryName: null, countryFlagUrl: null, logoUrl: null } as BuyerCompanyDetailsResponse

    expect(toHeaderIdentity(details).name).toBeNull()
  })
})
