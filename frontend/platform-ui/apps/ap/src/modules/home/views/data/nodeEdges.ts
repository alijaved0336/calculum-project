export const nodeEdges = `
name
description
state
identificationType
identificationValue
address
country {
    code
    alpha3Code
    region {
        name
        translatedName
    }
    translatedName
    flagUrl
    localizedName
}
city
zipCode
domain
currency
logo
averagePaymentTerms
industry {
    name
    code
    description
    category
}
idNumber
idType
companySize
brandValueReference
location
foundedYear
employeesCount
bvdIdNumber
legalForm
phoneNumber
`;