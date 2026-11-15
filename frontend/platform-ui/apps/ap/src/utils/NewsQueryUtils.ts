/**
 * GNews caps the `q` parameter at 200 characters. The News Setup screen used to
 * count the raw configuration text — keywords plus terms concatenated — which
 * ignores the quotes, ` OR ` separators, parentheses and ` AND ` the real query
 * carries, so a configuration counted at 200 built a 271-character query and the
 * news endpoints answered 400.
 *
 * These builders mirror the backend's NewsQueryBuilder so the counter measures
 * exactly what gets sent. Keep the two in step: if one changes, the other changes
 * with it.
 */

export interface NewsSectionTerms {
  selectedTerms: string[];
  additionalTerms: string;
}

export interface GeneralNewsSection extends NewsSectionTerms {
  keywords: string;
}

export interface SupplierNewsSection extends NewsSectionTerms {
  selectedEntities: string[];
}

/** The entity identifiers the backend understands, in the order it emits them. */
export const SUPPLIER_ENTITY_ORDER = ['Supplier Name', 'Parent Name'];

/** Split a comma-separated input into trimmed, non-empty entries. */
export function splitCommaList(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
}

/** Wrap a value in the double quotes GNews uses for an exact phrase match. */
function quote(value: string): string {
  return `"${value}"`;
}

/** Quote each value and OR-join them into a `("a" OR "b")` block. Empty list yields ''. */
function orBlock(values: string[]): string {
  if (values.length === 0) {
    return '';
  }

  return `(${values.map(quote).join(' OR ')})`;
}

/** Every term a section contributes: the selected standard terms plus the additional ones. */
export function collectTerms(section: NewsSectionTerms): string[] {
  return [...(section.selectedTerms ?? []), ...splitCommaList(section.additionalTerms)];
}

/** Build the Home Dashboard query exactly as the backend does. */
export function buildGeneralNewsQuery(section: GeneralNewsSection): string {
  const parts = [orBlock(splitCommaList(section.keywords)), orBlock(collectTerms(section))];

  return parts.filter(part => part.length > 0).join(' AND ');
}

/** Build the term half of the Entity Card query — the only half Setup controls. */
export function buildSupplierTermsQuery(section: NewsSectionTerms): string {
  return orBlock(collectTerms(section));
}

/**
 * Which entity identifiers a configuration selects. An empty selection falls back to
 * both, matching NewsQueryBuilder::resolveSelectedEntities() on the backend — without
 * it an Entity Card would drop the company from its query and return plain industry news.
 */
export function resolveSelectedEntities(selectedEntities: string[] | null | undefined): string[] {
  if (!Array.isArray(selectedEntities) || selectedEntities.length === 0) {
    return [...SUPPLIER_ENTITY_ORDER];
  }

  return SUPPLIER_ENTITY_ORDER.filter(entity => selectedEntities.includes(entity));
}

/**
 * Build the Entity Card query with the entity identifiers standing in for the real
 * company names, which only exist at request time. Display only — for the budget,
 * use entityPartLength.
 */
export function buildSupplierNewsPreview(section: SupplierNewsSection): string {
  const entities = resolveSelectedEntities(section.selectedEntities);

  // The backend omits the parentheses when a single entity is selected.
  const entityPart =
    entities.length > 1 ? orBlock(entities) : entities.map(quote).join('');
  const parts = [entityPart, buildSupplierTermsQuery(section)];

  return parts.filter(part => part.length > 0).join(' AND ');
}

/**
 * Characters the runtime query spends on the entity half, which Setup cannot see.
 * With both names the query carries `("<name>" OR "<name>") AND ` — 2n + 15 — and
 * with the supplier name alone `"<name>" AND ` — n + 7.
 */
export function entityPartLength(nameAllowance: number, includesParent: boolean): number {
  return includesParent ? 2 * nameAllowance + 15 : nameAllowance + 7;
}
