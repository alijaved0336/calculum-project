/**
 * Utility functions for Entity Card operations
 * 
 * These functions handle common data transformations and formatting
 * used in entity card components.
 */

/**
 * Gets the first letter of a name/string (uppercase)
 * Used for displaying initials in avatar circles when no logo is available
 * 
 * @param name - The name to extract initial from
 * @returns First letter in uppercase, or empty string if name is empty
 * 
 * @example
 * getInitial('Test Company') // returns 'T'
 * getInitial('') // returns ''
 * getInitial(null) // returns ''
 */
export function getInitial(name: string | null | undefined): string {
  if (!name || name.length === 0) {
    return '';
  }
  return name.substring(0, 1).toUpperCase();
}

/**
 * Formats a company type string by capitalizing the first character
 * 
 * @param companyType - The company type to format (e.g., 'supplier', 'parent')
 * @returns Formatted company type with first letter capitalized, or empty string if input is empty
 * 
 * @example
 * formatCompanyType('supplier') // returns 'Supplier'
 * formatCompanyType('parent') // returns 'Parent'
 * formatCompanyType('') // returns ''
 * formatCompanyType(null) // returns ''
 */
export function formatCompanyType(companyType: string | null | undefined): string {
  if (!companyType || companyType.length === 0) {
    return '';
  }
  return companyType.charAt(0).toUpperCase() + companyType.slice(1);
}

/**
 * Removes duplicate objects from an array based on a specific ID field
 * Keeps the first occurrence of each unique ID
 * 
 * @param array - Array of objects to deduplicate
 * @param idField - Name of the field to use for identifying duplicates (default: '@id')
 * @returns New array with duplicates removed
 * 
 * @example
 * const items = [
 *   { '@id': '1', name: 'A' },
 *   { '@id': '2', name: 'B' },
 *   { '@id': '1', name: 'C' }
 * ]
 * removeDuplicatesById(items) // returns [{ '@id': '1', name: 'A' }, { '@id': '2', name: 'B' }]
 * 
 * @example
 * const items = [
 *   { id: '1', name: 'A' },
 *   { id: '2', name: 'B' },
 *   { id: '1', name: 'C' }
 * ]
 * removeDuplicatesById(items, 'id') // returns [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]
 */
export function removeDuplicatesById<T extends Record<string, any>>(
  array: T[],
  idField: string = '@id'
): T[] {
  const seen = new Set<string>();
  return array.filter((item) => {
    const id = item[idField];
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

/**
 * Checks if a program should have its options blocked
 * Programs are blocked when they are recalculating or pending recalculation
 * 
 * @param programInRecalculation - Whether program is currently recalculating
 * @param pendingRecalculation - Whether program has a pending recalculation
 * @returns true if program options should be blocked, false otherwise
 * 
 * @example
 * shouldBlockProgramOptions(true, false) // returns true
 * shouldBlockProgramOptions(false, true) // returns true
 * shouldBlockProgramOptions(true, true) // returns true
 * shouldBlockProgramOptions(false, false) // returns false
 */
export function shouldBlockProgramOptions(
  programInRecalculation: boolean,
  pendingRecalculation: boolean
): boolean {
  return programInRecalculation || pendingRecalculation;
}

/**
 * Checks if financing features should be enabled for a program
 * 
 * @param hasFinancing - Whether the program has financing 
 * @param useFeature9BoxesFinancing - Whether 9 boxes financing feature is enabled
 * @returns true if financing should be enabled, false otherwise
 * 
 * @example
 * isFinancingFeatureEnabled(true, true, true) // returns true
 * isFinancingFeatureEnabled(false, true, true) // returns false
 * isFinancingFeatureEnabled(true, false, true) // returns false
 */
export function isFinancingFeatureEnabled(
  hasFinancing: boolean,  
  useFeature9BoxesFinancing: boolean
): boolean {
  return hasFinancing && useFeature9BoxesFinancing;
}

/**
 * GraphQL collection and single-row filter holding the calculated cash-flow values
 * (headline Cash Flow + Agreed) for one entity-card selection.
 */
export interface CalculatedCashFlowSource {
  collectionQuery: string;
  alias: string;
  rowFilter: string;
  /** Ready-to-interpolate `targetEntityType` argument (trailing comma included), empty when not needed. */
  entityTypeFilter: string;
}

/**
 * Resolves which program_calculated_data collection holds the cash-flow row for the
 * selected entity-card level, and how to pin that single row.
 *
 * Every level is identified by its OWN uuid: spends by `uuid`, suppliers and parents by
 * `entityUuid`. `parentUuid` is not an option here — in program_calculated_data_parent it
 * holds the row's ultimate parent, which is always NULL because that table only ever
 * contains entities without a parent.
 *
 * WI#19124: `targetEntityType` is NOT optional for potential entities. The backend filter
 * (AdaTargetEntityTypeFilter) falls back to 'supplier' when the argument is absent instead of
 * skipping the restriction, so a potential row — stored with entity_type 'potential-supplier' /
 * 'potential-parent' — is filtered out and the collection comes back empty. Same convention as the
 * entity-card grids in ListNegotiation.vue / ListForecast.vue. The value must be 'potential': the
 * filter only accepts 'supplier' | 'potential' | 'pilot' | '*' and throws on anything else.
 *
 * @param level - Entity-card level ('spend' | 'supplier' | 'potential-supplier' | 'parent' | 'potential-parent')
 * @param uuids - The spend uuid (spend level) and the entity uuid (supplier/parent levels)
 * @param isPotential - Whether the entity-card entity is a potential one (the `potentialTheme` prop)
 * @returns The collection to query, its response alias, the row filter and the entity-type filter, or null when the uuid the level needs is missing
 *
 * @example
 * buildCalculatedCashFlowSource('parent', { entityUuid: 'abc' })
 * // returns { collectionQuery: 'collectionQueryProgramListParents', alias: 'parents', rowFilter: 'entityUuid: "abc"', entityTypeFilter: '' }
 */
export function buildCalculatedCashFlowSource(
  level: string,
  uuids: { spendUuid?: string | null; entityUuid?: string | null },
  isPotential = false
): CalculatedCashFlowSource | null {
  const entityTypeFilter = isPotential ? 'targetEntityType: "potential",' : '';

  if (level === 'spend') {
    if (!uuids.spendUuid) {
      return null;
    }
    return {
      collectionQuery: 'collectionQueryProgramListSpends',
      alias: 'spends',
      rowFilter: `uuid: "${uuids.spendUuid}"`,
      entityTypeFilter,
    };
  }

  if (!uuids.entityUuid) {
    return null;
  }

  const onParent = level === 'parent' || level === 'potential-parent';
  return {
    collectionQuery: onParent
      ? 'collectionQueryProgramListParents'
      : 'collectionQueryProgramListSuppliers',
    alias: onParent ? 'parents' : 'suppliers',
    rowFilter: `entityUuid: "${uuids.entityUuid}"`,
    entityTypeFilter,
  };
}


/**
 * WI#18804: initial sort of the entity card Spend Lines grid — Spend Volume descending,
 * so the largest spend line is on top (it used to default to alphabetical supplier order).
 * Pilot accounts keep their pilot rows on top, volume-descending within.
 *
 * ListNegotiation.vue builds its initial `sortSpends` descriptor from this; the backend
 * applies the same volume-desc default when no `order` reaches
 * collectionQueryProgramListSpends at all.
 *
 * @param pilotFirst - keep pilot rows on top (pilot account, entity-card grid)
 */
export function defaultSpendLinesSort(pilotFirst: boolean): Array<{ field: string; dir: 'asc' | 'desc' }> {
  const volumeDesc = { field: 'volume', dir: 'desc' as const };

  return pilotFirst
    ? [{ field: 'isPilot', dir: 'desc' }, volumeDesc]
    : [volumeDesc];
}

/**
 * US-18713: decides whether the SCF tab must refetch when it becomes visible again.
 *
 * The tab is cached by the <KeepAlive> in EntityCardOverview, so onMounted never runs a
 * second time. On activation it compares the refresh token it last fetched with against
 * the current one: they differ only after a Target or an Agreed term was saved
 * successfully.
 *
 * @param lastSeenToken - token value the currently displayed figures were fetched with
 * @param currentToken - token value in the entity card store right now
 * @param spendUuid - spend configuration the tab is pointing at; empty until the tab's
 *                    own initial load has resolved, and there is nothing to refetch then
 */
export function shouldRefreshFinancingTab(
  lastSeenToken: number,
  currentToken: number,
  spendUuid: string | null | undefined,
): boolean {
  if (!spendUuid) {
    return false;
  }

  return lastSeenToken !== currentToken;
}
