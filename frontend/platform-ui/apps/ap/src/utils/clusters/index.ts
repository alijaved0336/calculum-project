import { CompositeFilterDescriptor, SortDescriptor } from "@progress/kendo-data-query";

interface PaginationSettings {
  first: number;
  after: number;
  skip: number;
}

interface SortSettings {
  field: string;
  dir: "asc" | "desc";
}

interface FilterChangeEvent {
  paginationSuppliers: PaginationSettings;
  filterSuppliers: CompositeFilterDescriptor | []; // Updated
  sortSuppliers: SortDescriptor[];

  paginationParents: PaginationSettings;
  filterParents: CompositeFilterDescriptor | []; // Updated
  sortParents: SortDescriptor[];

  paginationSpends: PaginationSettings;
  filterSpends: CompositeFilterDescriptor | []; // Updated
  sortSpends: SortDescriptor[];
}

export function createFilterSettings(): FilterChangeEvent {
  return {
    paginationSuppliers: {
      first: 10,
      after: 0,
      skip: 0
    },
    filterSuppliers: [], // Ensure this matches the updated type definition
    sortSuppliers: [
      {
        field: "clusterId",
        dir: "asc"
      }
    ],
    paginationParents: {
      first: 10,
      after: 0,
      skip: 0
    },
    filterParents: [], // Ensure this matches the updated type definition
    sortParents: [
      {
        field: "clusterId",
        dir: "asc"
      }
    ],
    paginationSpends: {
      first: 10,
      after: 0,
      skip: 0
    },
    filterSpends: [], // Ensure this matches the updated type definition
    sortSpends: [
      {
        field: "clusterId",
        dir: "asc"
      }
    ]
  };
}
