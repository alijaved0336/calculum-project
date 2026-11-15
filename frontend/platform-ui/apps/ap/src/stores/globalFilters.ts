import { defineStore } from 'pinia';
import * as Entity from "@/modules/globalFilters/api";
import { secureStorage } from "@/services/pinia";
// Types
import type {
  TargetView,
  FiltersApplied,
} from "@/types";

export const useGlobalFiltersStore = defineStore('globalFilters', {
  state: () => {
    // Ensure we always have a valid initial state
    const initialState = {
      valuesByColumn: {
        spends: [],
        suppliers: [],
        parents: [],
        potentials: []
      } as { [key in TargetView]: any[] },
      
      filtersApplied: {
        filters: [],
        logic: "and"
      } as FiltersApplied,
      
      templatesActive: null,
      disableWatchers: false
    };
    
    if (import.meta.env.DEV) console.log('Initializing GlobalFiltersStore with state:', initialState);
    return initialState;
  },
  
  getters: {
    getFiltersApplied: (state): FiltersApplied => {
      if (import.meta.env.DEV) console.log('getFiltersApplied called, state:', state);
      const fa = state?.filtersApplied;
      // Guard against null/undefined AND structurally invalid persisted values (e.g. [] from old storage)
      if (!fa || typeof fa !== 'object' || Array.isArray(fa) || !Array.isArray(fa.filters)) {
        if (import.meta.env.DEV) console.warn('GlobalFiltersStore filtersApplied is invalid, returning default:', fa);
        return { filters: [], logic: "and" };
      }
      return fa;
    },
    
    getValuesByColumn: (state) => {
      if (!state || !state.valuesByColumn) {
        if (import.meta.env.DEV) console.warn('GlobalFiltersStore state or valuesByColumn is undefined, returning default');
        return {
          spends: [],
          suppliers: [],
          parents: [],
          potentials: []
        };
      }
      return state.valuesByColumn ?? {
        spends: [],
        suppliers: [],
        parents: [],
        potentials: []
      };
    },
    
    getDisableWatchers: (state): boolean => {
      if (!state) {
        if (import.meta.env.DEV) console.warn('GlobalFiltersStore state is undefined, returning false for disableWatchers');
        return false;
      }
      return state.disableWatchers;
    }
  },
  
  actions: {
    setFiltersApplied(newFiltersApplied: FiltersApplied) {
      if (import.meta.env.DEV) console.log('** setFiltersApplied called with:', newFiltersApplied);
      if (import.meta.env.DEV) console.log('** Current filtersApplied before update:', this.filtersApplied);
      
      try {
        if (!newFiltersApplied || typeof newFiltersApplied !== 'object' || Array.isArray(newFiltersApplied) || !Array.isArray(newFiltersApplied.filters)) {
          if (import.meta.env.DEV) console.warn('setFiltersApplied called with invalid value:', newFiltersApplied);
          this.filtersApplied = {
            filters: [],
            logic: "and"
          };
          return;
        }

        this.filtersApplied = newFiltersApplied;
        if (import.meta.env.DEV) console.log('** filtersApplied updated to:', this.filtersApplied);

      } catch (error) {
        if (import.meta.env.DEV)  console.error('Error in setFiltersApplied:', error);
      }
    },
    
    setValuesByColumn(values: { [key in TargetView]: any[] }) {
      this.valuesByColumn = values;
    },
    
    setDisableWatchers(value: boolean) {
      this.disableWatchers = value;
    },
    
    setBatchUpdate(updates: { 
      setValuesByColumn?: { [key in TargetView]: any[] };
      setFiltersApplied?: FiltersApplied;
    }) {
      if (updates.setValuesByColumn !== undefined) {
        this.valuesByColumn = updates.setValuesByColumn;
      }
      if (updates.setFiltersApplied !== undefined) {
        this.filtersApplied = updates.setFiltersApplied;
      }
    },

    // API Actions
    async templatesAPICreate(params: {
      userId: string | null;
      companyId: string;
      title: string;
      filters: FiltersApplied;
      callbackSuccess?: any;
      callbackError?: any;
    }) {
      const {
        userId,
        companyId,
        title,
        filters,
        callbackSuccess,
        callbackError
      } = params;

      const response = await Entity.templatesAPICreate({
        userId: userId || '',
        companyId,
        title,
        filters
      });

      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data);
        }
        return;
      }

      if (callbackError) {
        callbackError(response);
      }
    },

    async templatesAPIReadAll(params: {
      callbackSuccess?: any;
      callbackError?: any;
    }) {
      const {
        callbackSuccess,
        callbackError
      } = params;

      const response = await Entity.templatesAPIReadAll();

      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data);
        }
        return;
      }

      if (callbackError) {
        callbackError(response);
      }
    },

    async templatesAPIUpdate(params: {
      id: string;
      filters: FiltersApplied;
      callbackSuccess?: any;
      callbackError?: any;
    }) {
      const {
        id,
        filters,
        callbackSuccess,
        callbackError
      } = params;

      const response = await Entity.templatesAPIUpdate({ id, filters });

      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data);
        }
        return;
      }

      if (callbackError) {
        callbackError(response);
      }
    },

    async globalFiltersTemplatesActiveAPIUpdate(params: {
      id: string | null;
      callbackSuccess?: any;
      callbackError?: any;
    }) {
      const {
        id,
        callbackSuccess,
        callbackError
      } = params;

      const response = await Entity.globalFiltersTemplatesActiveAPIUpdate({ id: id || null });

      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data);
        }
        return;
      }

      if (callbackError) {
        callbackError(response);
      }
    },

    async templatesAPIDelete(params: {
      id: string;
      callbackSuccess?: any;
      callbackError?: any;
    }) {
      const {
        id,
        callbackSuccess,
        callbackError
      } = params;

      const response = await Entity.templatesAPIDelete({ id });

      if (response.success) {
        if (callbackSuccess) {
          callbackSuccess(response.data);
        }
        return;
      }

      if (callbackError) {
        callbackError(response);
      }
    }
  },

  persist: {
    key: 'ada-globalFilters',
    storage: secureStorage,
    // Exclude disableWatchers from persistence — it's a transient transition guard.
    // If persisted and the page refreshes mid-transition, it stays true forever,
    // blocking all consistency checks and preventing data from loading.
    omit: ['disableWatchers']
  }
}); 