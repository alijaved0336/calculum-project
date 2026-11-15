export interface MatchingField {
    field: string;
    checked: boolean;
}

export const matchingFieldsData: { matchingFields: MatchingField[] } = {
    'matchingFields' : [
        { field: 'provider', checked: true },
        { field: 'buyer', checked: true },
        { field: 'team', checked: true },
        { field: 'currency', checked: true },
        { field: 'contractualPaymentTermsWithoutCashDiscounts', checked: true },
        { field: 'contractualPaymentTermsWithCashDiscounts', checked: true },
        { field: 'cashDiscounts', checked: true }, 
        { field: 'actualPaymentTerms', checked: true },

    ]
}

export const  vCardFields = [
    { field: 'vCardAverageTransactionSize', checked: false },
    { field: 'vCardNumberOfPayments', checked: false },
    { field: 'vCardNumberOfInvoices', checked: false },
    { field: 'vCardIsAlreadyInUse', checked: false },
    { field: 'vCardVolume', checked: false },
    { field: 'vCardAcceptanceType', checked: false },
    { field: 'vCardProvider', checked: false },
    { field: 'vCardPaymentMethod', checked: false },
    { field: 'vCardLargestTransactionSize', checked: false },
    { field: 'vCardIndirectSpend', checked: false }
]   