import type { BuyerCompanyDetailsResponse } from '@/api'
import type { CustomerCardHeaderIdentity } from '@/stores/customerCardModal'

/** The header's identity from the Company Details response - the one buyer-scoped response on
 * this screen that carries name, logo and flag together (UC-UI-26 FR3). */
export function toHeaderIdentity(details: BuyerCompanyDetailsResponse): CustomerCardHeaderIdentity {
  return {
    name: details.companyName,
    originalName: details.originalName,
    role: details.role,
    country: details.countryName,
    countryFlagUrl: details.countryFlagUrl,
    logoUrl: details.logoUrl,
  }
}
