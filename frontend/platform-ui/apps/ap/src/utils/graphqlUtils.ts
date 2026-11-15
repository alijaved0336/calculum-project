import { apolloClient } from "@/services/graphql/apolloClient";
import { gql } from "@apollo/client/core";
import { ItemSelectedInCharts } from "@/modules/home/analyze/types";
import { isProgramSfvConsistent } from "@/utils/validation/programSfvConsistency";
import {
  hasUsableTenantScope,
  isTenantScopedCollectionQuery
} from "@/utils/validation/tenantScopedCollections";

// Regex to extract targetProgramUuid and targetSpendFileVersionUuid from GraphQL query strings.
// Both require at least one character, so an empty `targetSpendFileVersionUuid: ""` does not match.
const programUuidRegex = /targetProgramUuid:\s*"([^"]+)"/;
const sfvUuidRegex = /targetSpendFileVersionUuid:\s*"([^"]+)"/;

// Return a safe empty structure so callers accessing response.data.<collection>.edges
// get [] instead of crashing with "Cannot read properties of undefined (reading 'edges')"
const emptyCollectionResponse = () => {
  const emptyCollection = { edges: [], pageInfo: { hasNextPage: false }, totalCount: 0 };
  return {
    data: new Proxy({} as Record<string, typeof emptyCollection>, {
      get: () => emptyCollection
    })
  };
};

export const getCollectionData = async (queryString: string, abortSignal?: AbortSignal | null) => {
  // Defense-in-depth: extract program and SFV UUIDs from the query string
  // and validate consistency before firing the GraphQL request
  const programMatch = programUuidRegex.exec(queryString);
  const sfvMatch = sfvUuidRegex.exec(queryString);

  // Tenant-scoped collections need a usable targetSpendFileVersionUuid. Firing without one
  // only earns a 400 (WI#18809); the view refetches once the store has the active version.
  if (isTenantScopedCollectionQuery(queryString) && !hasUsableTenantScope(sfvMatch?.[1])) {
    if (import.meta.env.DEV) {
      console.warn(
        "[tenant-scope] Skipping API call: no usable targetSpendFileVersionUuid in a",
        "tenant-scoped collection query."
      );
    }
    return emptyCollectionResponse();
  }

  if (programMatch && sfvMatch) {
    if (!isProgramSfvConsistent(programMatch[1], sfvMatch[1])) {
      return emptyCollectionResponse();
    }
  }

  const response = await apolloClient.query({
    query: gql`${queryString}`,
    context: {
      fetchOptions: {
        signal: abortSignal,
      },
      skipIntrospection: true // Skip introspection queries
    }
  });
  return response;
};

export const convertFiltersToGraphQL = (filter: any | undefined) => {
  if (filter) {
    return `telerikFilter: "${JSON.stringify(filter).replace(/"/g, '\\"')}"`;
  } else {
    return "";
  }
};


export const convertFiltersChartsToGraphQL = (filter: any | undefined) => {
  if (filter) {
    return `chartsFilter: "${JSON.stringify(filter).replace(/"/g, '\\"')}"`;
  } else {
    return "";
  }
};

export const convertFiltersToGraphQLSummary = (filter: any | undefined) => {
  if (filter) {
    return `"${JSON.stringify(filter).replace(/"/g, '\\"')}"`;
  } else {
    return "";
  }
};

export const convertGlobalFilterToGraphQL = (filter: any | undefined) => {
  if (filter) {
    return `globalFilter: "${JSON.stringify(filter).replace(/"/g, '\\"')}"`;
  } else {
    return "";
  }
};

export const convertSearchTextToGraphQL = (filter: any | undefined) => {
  if (filter) {
    return `searchText: "${JSON.stringify(filter).replace(/"/g, '\\"')}"`;
  } else {
    return "";
  }
};


export const convertFiltersToREST = (filter: any | undefined) => {
  if (filter) {
    return `${JSON.stringify(filter).replace(/"/g, '"')}`;
  } else {
    return null;
  }
};

export const getActiveColumns = (columns: any, categorizeEdges: any) => {
  columns.forEach(function(data: any) {
    const datas = Object.assign({}, data);
    if (data.hidden !== true) {
      categorizeEdges += data.field + " ";
    }
  });
  return categorizeEdges;
};

/**
 * Safely extracts nodes from a GraphQL response with proper null checks
 * @param response - The GraphQL response
 * @param collectionName - The name of the collection (e.g., 'spends', 'suppliers')
 * @returns Array of nodes or empty array if response is invalid
 */
export function safelyExtractNodes(response: any, collectionName: string = 'spends'): any[] {
  try {
    if (!response?.data?.[collectionName]?.edges) {
      if (import.meta.env.DEV) console.error(`Invalid response structure for ${collectionName}:`, response);
      return [];
    }
    
    return response.data[collectionName].edges.map((edge: any) => edge.node);
  } catch (error) {
    if (import.meta.env.DEV) console.error(`Error extracting nodes from ${collectionName}:`, error);
    return [];
  }
}

/**
 * Safely gets pagination info from a GraphQL response
 * @param response - The GraphQL response
 * @param collectionName - The name of the collection (e.g., 'spends', 'suppliers')
 * @returns Object with hasNextPage and totalCount, or defaults
 */
export function safelyGetPaginationInfo(response: any, collectionName: string = 'spends'): { hasNextPage: boolean; totalCount?: number } {
  try {
    const pageInfo = response?.data?.[collectionName]?.pageInfo;
    const totalCount = response?.data?.[collectionName]?.totalCount;
    
    return {
      hasNextPage: pageInfo?.hasNextPage ?? false,
      totalCount: totalCount
    };
  } catch (error) {
    if (import.meta.env.DEV) console.error(`Error getting pagination info from ${collectionName}:`, error);
    return { hasNextPage: false };
  }
}




export function createKendoFilterFromChartSelection(itemSelectedInCharts: ItemSelectedInCharts): object | [] {
  if (!itemSelectedInCharts.name || itemSelectedInCharts.name === '') {
    return [];
  }

  // Transform the value if it's a boolean field option (perSME, perPilot, etc.)
  // Note: Boolean values are already transformed to 'Yes'/'No' in MetricsComponents.vue parseDataForChart
  let filterValue = itemSelectedInCharts.name;

  let secondaryFilterValue = itemSelectedInCharts.secondaryName;
  
  // No transformation needed here anymore - the chart already provides 'Yes'/'No' for boolean fields

  return {
    logic: "and",
    filters: [
      {
        logic: "or",
        filters: [
          {
            field: "groupName",
            operator: "eq",
            value: itemSelectedInCharts.groupName
          }
        ]
      },
      {
        logic: "or",
        filters: [
          {
            field: "optionName",
            operator: "eq",
            value: itemSelectedInCharts.optionName
          }
        ]
      },
      {
        logic: "and",
        filters: [
          ...(secondaryFilterValue ? [
            {
              field: "name",
              operator: "eq",
              value: secondaryFilterValue
            }
          ] : []),
          {
            field: "name",
            operator: "eq",
            value: filterValue, // Use transformed value
          },
        ],
      },
    ],
  };
};

/**
 * Adds vCard filter to existing telerik filter
 * Creates a filter structure with "isnull" operator for vCardBox field
 * @param telerikFilter - Existing telerik filter (can be string or null)
 * @param vcardEnabled - Whether vCard filter should be added
 * @returns String with merged filters or original filter if vcardEnabled is false
 */
export function addVCardFilterToTelerikFilter(
  telerikFilter: string | null,
  vcardEnabled: boolean
): string | null {
  // If vCard is not enabled, return original filter
  if (!vcardEnabled) {
    return telerikFilter;
  }

  // Parse the existing filter if it's a string
  let existingFilter: any = null;
  if (telerikFilter) {
    try {
      existingFilter = typeof telerikFilter === 'string' ? JSON.parse(telerikFilter) : telerikFilter;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error parsing telerikFilter:', error);
      existingFilter = null;
    }
  }

  // Create vCard filter structure
  const vCardFilter = {
    field: "vCardBox",
    operator: "isNotNull",
    value: true
  };

  // If there are existing filters, merge them
  if (existingFilter && existingFilter.filters && existingFilter.filters.length > 0) {
    // Add vCard filter directly to the filters array
    existingFilter.filters.push(vCardFilter);
    return JSON.stringify(existingFilter);
  } else {
    // Create new filter structure with only vCard filter (simple structure)
    return JSON.stringify({
      logic: "and",
      filters: [vCardFilter]
    });
  }
}
