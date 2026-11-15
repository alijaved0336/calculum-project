import { process, type SortDescriptor } from "@progress/kendo-data-query";
import type {
  GraphqlGridFilterDescriptor,
  GraphqlGridRow,
  GraphqlGridSortDescriptor,
} from "./types";

export type GraphqlGridMockQuery = {
  skip: number;
  take: number;
  sort?: GraphqlGridSortDescriptor[];
  filter?: GraphqlGridFilterDescriptor;
};

export type GraphqlGridMockResult = {
  items: GraphqlGridRow[];
  total: number;
};

/**
 * In-memory stand-in for a GraphQL list resolver.
 * Uses Kendo `process` so Storybook sort/filter match Grid behavior
 * (numeric fields by value; strings lexicographically — e.g. Supplier 1, 10, 100).
 */
export function queryGraphqlGridMock(
  allRows: GraphqlGridRow[],
  query: GraphqlGridMockQuery,
): GraphqlGridMockResult {
  const sort = (query.sort ?? []).filter(
    (descriptor): descriptor is SortDescriptor => Boolean(descriptor.field && descriptor.dir),
  );

  const result = process(allRows as Record<string, unknown>[], {
    skip: Math.max(0, query.skip),
    take: Math.max(1, query.take),
    sort,
    filter: query.filter,
  });

  return {
    items: result.data as GraphqlGridRow[],
    total: result.total,
  };
}

export function buildDemoRows(count = 137): GraphqlGridRow[] {
  const statuses = ["Pending", "In Review", "Contacted", "Resolved"] as const;
  const industries = ["Hardware", "Plumbing", "Software", "Logistics"] as const;

  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const day = (index % 28) + 1;
    return {
      id,
      supplierName: `Supplier ${id}`,
      email: `contact${id}@supplier-demo.com`,
      spend: Math.round((50_000 + id * 1_337.25) * 100) / 100,
      contactStatus: statuses[index % statuses.length],
      industry: industries[index % industries.length],
      country: ["Switzerland", "Germany", "France", "USA"][index % 4],
      updatedAt: `2026-0${(index % 9) + 1}-${String(day).padStart(2, "0")}`,
      phaseName: ["Discovery", "Negotiation", "Onboarding", "Closed"][index % 4],
      scfGroup: index % 2 === 0 ? "F1, Base + 1.20%" : "F2, Base + 0.80%",
      economicPi: ["Low", "Medium", "High"][index % 3],
      buyingEntity: `Buyer ${(index % 7) + 1}`,
      spendAlias: `Alias ${id}`,
      boxesVcard: `Box ${(index % 9) + 1}`,
    };
  });
}
