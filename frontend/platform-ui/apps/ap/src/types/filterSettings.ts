import { CompositeFilterDescriptor } from '@progress/kendo-data-query/dist/npm/filtering/filter-descriptor.interface'
import { SortDescriptor } from '@progress/kendo-data-query/dist/npm/sort-descriptor'




/** FOR THE FILTER CHANGE EVENT */
export interface FilterChangeEvent {
  filterSuppliers: CompositeFilterDescriptor | [];
  sortSuppliers: SortDescriptor[];
  paginationSuppliers: {
    first: number;
    after: number;
    skip: number;
  };

  filterParents: CompositeFilterDescriptor | [];
  sortParents: SortDescriptor[];
  paginationParents: {
    first: number;
    after: number;
    skip: number;
  };

  filterSpends: CompositeFilterDescriptor | [];
  sortSpends: SortDescriptor[];
  paginationSpends: {
    first: number;
    after: number;
    skip: number;
  };
}
