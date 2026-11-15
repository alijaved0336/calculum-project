/**
 * Pure helpers for UI Group form validation and company selection mapping.
 */

export function isNameEmpty(name: string): boolean {
  return !name || name.trim().length < 1;
}

export function mapCompaniesFromIri(companies: Array<{ '@id': string }> | undefined): Array<{ uuid: string }> {
  if (!companies?.length) return [];
  return companies.map((item) => {
    const parts = (item['@id'] ?? '').split('/');
    return { uuid: parts[3] ?? '' };
  });
}

export function mapCompaniesFromUuid(companies: Array<{ uuid: string }>): Array<{ uuid: string }> {
  return companies.map((item) => ({ uuid: item.uuid }));
}
