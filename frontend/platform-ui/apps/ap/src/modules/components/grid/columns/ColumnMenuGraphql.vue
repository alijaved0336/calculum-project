<template>
<div>
  <GridColumnMenuSort :column="column" :sortable="sortable" :sort="(sort as SortDescriptor[])" :style="{ width: `${setwidth}px` }" @closemenu="closeMenu" @sortchange="sortChange"></GridColumnMenuSort>
  <GridColumnMenuFilter v-if="showFilterComponent" :column="column" :filter="filterToApply" :filterable="filterable" :style="{ width: `${setwidth}px` }" :filterOperators="filterOperators" @filterfocus="handleFocus" @closemenu="closeMenu" @expandchange="(e: any) => expandChange(e)" @filterchange="filterChange" id="filterGridColumn"></GridColumnMenuFilter>
  <GridColumnMenuItemGroup v-if="column.filter !== 'numeric'" :style="{ width: `${setwidth}px` }">
    <GridColumnMenuItem :title="'Select'" :icon-class="'k-i-checkmark'" @menuitemclick="onMenuSelectClick">  </GridColumnMenuItem>
    <GridColumnMenuItemContent v-show="showSelectComponent && columnsExpanded" :show="columnsExpanded" :style="{ width: `${setwidth}px` }">
      <form @submit="onSubmit" @reset="onReset">
        <div :class="showLoading && dataToShow.length === 0 && loadingItems && showSelectComponent && StringUtils.isNullUndefinedOrEmpty(searchSelectFilter) ? 'bg-blur' : ''">
          <div v-if="showSearchBox" class="search-input">
            <div class="input-group"><span class="input-group-text search-icon"><span class="spinner-border spinner-border-sm" v-if="!StringUtils.isNullUndefinedOrEmpty(searchSelectFilter) && loadingItems"></span><i class="fa-brands fa-sistrix text-muted" v-else></i></span>
              <input class="form-control form-control-sm border-start-0 px-5" id="searchSelectFilter" v-model="searchSelectFilter" placeholder="Search" name="searchSelectFilter"/>
            </div>
          </div>
          <div class="d-flex justify-content-center align-items-center mb-4" v-if="dataToShow.length === 0 && loadingItems"><span class="spinner-border spinner-border-sm"></span></div>
          <div class="d-flex justify-content-center align-items-center mb-4" v-else-if="dataToShow.length === 0"><span>{{ 'No results found' }}</span></div>
          <div class="table-wrapper show-scroll" v-else ref="tableRef">
            <table class="table table-borderless table-hover table-sm" role="presentation"><!-- NOSONAR -->
              <colgroup>
                <col class="k-checkbox-col" span="1"/>
                <col class="k-checkbox-label" span="2"/>
              </colgroup>
              <tbody>
                <tr>
                  <td>
                    <input class="k-checkbox k-checkbox-md k-rounded-md checkToSelectAll" :id="`column-visiblity-show-all`" type="checkbox" @change="checkAllSelect"/>
                  </td>
                  <td>
                    <label class="k-checkbox-label" :for="`column-visiblity-show-all`">Check all</label>
                  </td>
                </tr>
                <tr v-for="(item, idx) in dataToShow" :key="idx + 1">
                  <td>
                    <input class="k-checkbox k-checkbox-md k-rounded-md checkToSelect" :id="`column-visiblity-show-${idx}`" type="checkbox" :checked="filterToApplySelectComponent.includes(String(item)) || tempCheckedItem.includes(String(item))" @change="checkItemTemp"/>
                  </td>
                  <td>
                    <label class="k-checkbox-label" :for="`column-visiblity-show-${idx}`">{{ item }}</label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="d-flex justify-content-center align-items-center mt-2 scroll-loading" v-if="loadingItems && dataToShow.length > 0 && StringUtils.isNullUndefinedOrEmpty(searchSelectFilter)"><span class="spinner-border spinner-border-sm"></span></div>
        </div>
        <div class="footer" v-if="dataToShow.length > 0 && showSelectComponent">
          <KButton class="mr-4" type="reset">Clear</KButton>
          <KButton id="filter-results" :theme-color="'primary'">Filter</KButton>
        </div>
      </form>
    </GridColumnMenuItemContent>
  </GridColumnMenuItemGroup>
</div>
</template>
<script lang="ts">
import { ref, computed, onMounted, nextTick, defineComponent, watchEffect, watch, reactive } from 'vue';
import {
  GridColumnMenuFilter,
  GridColumnMenuSort,
  GridColumnMenuCheckboxFilter, GridColumnMenuItemGroup, GridColumnMenuItem, GridColumnMenuItemContent
} from '@progress/kendo-vue-grid';
import { StringUtils } from "@/utils";
import { SortDescriptor } from '@progress/kendo-data-query';
import { Button as KButton } from '@progress/kendo-vue-buttons';
import { createNewDescriptorFilterStructure, getCheckedLabelsText, removeFieldFromFilters, RootFilter, transformRegulatoryTermsValueInverse, cleanNewDescriptorFilterStructure } from '../../utils/utilsColumnsFilter'

interface SearchSelectFilter {
  value: string | null;
  isBlank: boolean;
}
interface FilterCheck {
  logic: string;
  filters: Filter[];
}

interface Filter {
  field: string;
  operator: string;
  value: string;
}
export default defineComponent({
  name: 'ColumnMenu',
  components: {
    GridColumnMenuSort: GridColumnMenuSort,
    GridColumnMenuFilter: GridColumnMenuFilter,
    GridColumnMenuCheckboxFilter: GridColumnMenuCheckboxFilter,
    GridColumnMenuItemGroup, GridColumnMenuItem, GridColumnMenuItemContent, KButton
  },
  props: {
    column: { type: Object, default: () => ({}) },
    datos: { type: Array, default: () => [] },
    sortable: { type: [Boolean, Object], default: () => true },
    sort: { type: Array, default: () => [] },
    filter: { type: Object, default: () => ({}) },
    filterable: { type: Boolean, default: () => false },
    summaryOperation: { type: String, default: () => '' },
    total: { type: Number, default: () => 0 },
    remainigItems: { type: Boolean, default: () => true },
    loadingItemsApi: { type: Boolean, default: () => false },
  },
  emits: ['contentfocus', 'show-values-by-column', 'expandchange', 'closemenu', 'filterchange', 'sendColumnFiltered', 'sortchange'],
  setup(props, { emit }) {
    // Default Grid filter operators:
    const filterOperators = {
      'text': [
        { text: 'grid.filterContainsOperator', operator: 'contains' },
        { text: 'grid.filterNotContainsOperator', operator: 'doesnotcontain' },
        { text: 'grid.filterEqOperator', operator: 'eq' },
        { text: 'grid.filterNotEqOperator', operator: 'neq' },
        { text: 'grid.filterStartsWithOperator', operator: 'startswith' },
        { text: 'grid.filterEndsWithOperator', operator: 'endswith' },
        { text: 'grid.filterIsNullOperator', operator: 'isnull' },
        { text: 'grid.filterIsNotNullOperator', operator: 'isnotnull' },
        { text: 'grid.filterIsEmptyOperator', operator: 'isempty' },
        { text: 'grid.filterIsNotEmptyOperator', operator: 'isnotempty' }
      ],
      'numeric': [
        { text: 'grid.filterEqOperator', operator: 'eq' },
        { text: 'grid.filterNotEqOperator', operator: 'neq' },
        { text: 'grid.filterGteOperator', operator: 'gte' },
        { text: 'grid.filterGtOperator', operator: 'gt' },
        { text: 'grid.filterLteOperator', operator: 'lte' },
        { text: 'grid.filterLtOperator', operator: 'lt' },
        { text: 'grid.filterIsNullOperator', operator: 'isnull' },
        { text: 'grid.filterIsNotNullOperator', operator: 'isnotnull' }
      ],
      'date': [
        { text: 'grid.filterEqOperator', operator: 'eq' },
        { text: 'grid.filterNotEqOperator', operator: 'neq' },
        { text: 'grid.filterAfterOrEqualOperator', operator: 'gte' },
        { text: 'grid.filterAfterOperator', operator: 'gt' },
        { text: 'grid.filterBeforeOperator', operator: 'lt' },
        { text: 'grid.filterBeforeOrEqualOperator', operator: 'lte' },
        { text: 'grid.filterIsNullOperator', operator: 'isnull' },
        { text: 'grid.filterIsNotNullOperator', operator: 'isnotnull' }
      ],
      'boolean': [
        { text: 'grid.filterEqOperator', operator: 'eq' }
      ]
    }
    const tableRef = ref<HTMLElement | null>(null)
    const columnsExpanded = ref(false);
    const columnFilterExpanded = ref(false)
    const searchSelectFilter = ref<string | null>(null);
    const paginationDefault = {
      first: 20,
      after: 0,
      skip: 0
    };
    const pagination = reactive(paginationDefault);
    const onMenuSelectClick = () => {
      columnsExpanded.value = !columnsExpanded.value
      const filterGridColumn = document.getElementById('filterGridColumn')
      if (columnFilterExpanded.value) {
        if (filterGridColumn) {
          const menuItem = filterGridColumn.querySelector('.k-columnmenu-item') as HTMLElement | null;
          if (menuItem) {
            menuItem.click();
          }
        }
      }
      if (columnsExpanded.value) {
        getData(pagination.first, pagination.after, null, true);
      }
    };
    function getMoreDatas() {
      if (tableRef.value) {
        const div = tableRef.value
        const isAtEnd = div.scrollTop >= div.scrollHeight - div.clientHeight - 2
        if (isAtEnd && props.remainigItems) {
          pagination.after += pagination.first
          if (props.total > pagination.after) {
            if (searchSelectFilter.value) {
              const searchText = { value: searchSelectFilter.value, isBlank: searchSelectFilter.value.trim() === '' };
              getData(pagination.first, pagination.after, searchText);
            } else {
              getData(pagination.first, pagination.after);
            }
          }
        }
      }
    }
    onMounted(() => {
      adjustPopupPosition();
    });
    function getData(cantRecords: number, fromRecord: number, searchQuery: SearchSelectFilter | null = null, resetData: boolean = false) {
      emit('show-values-by-column', { column: props.column.field, cantRecords: cantRecords, fromRecord: fromRecord, searchQuery: searchQuery, resetData: resetData });

      checkEnableDefault();
    }
    const setwidth = ref<number | null>(null);
    const dataToShow = computed(() => props.datos.map((item: any) => item[props.column.field]));
    const loadingItems = computed(() => props.loadingItemsApi);
    const filterToApply = computed(() => {
      if (props.filter && typeof props.filter === 'object' && Object.keys(props.filter).length > 0) {
        const validateFilterObj = Object.entries(props.filter);
        if (validateFilterObj && validateFilterObj.length > 0) {
          return {
            logic: 'and' as 'and' | 'or',
            filters: [],
            ...props.filter
          };
        }
      }
      return undefined;
    });
    const showSelectComponent = computed(() => {
      return !(props.column.field === 'entityName' && props.summaryOperation === 'list');
    });
    const showLoading = computed(() => {
      if (props.summaryOperation === 'list') {
        return false;
      }
      return true;
    });
    const showFilterComponent = computed(() => {
      const fields = [
        'isSME',
        'isVCardApplied',
        'entityEthnicMinorityOwnedBusiness',
        'entityWomanOwnedBusiness',
        'entityVeteranOwnedBusiness',
        'box',
        'vCardBox',
        'financialBox'
      ];
      return !fields.includes(props.column.field);
    });
    // Boolean columns only have true/false values, so a free-text search box is meaningless and,
    // worse, sends a `searchText` that the backend applies as `column ILIKE '%..%'` — which fails on
    // a boolean column (Sentry ADA-PLATFORM-API-56B). Hide the search box for boolean columns.
    const showSearchBox = computed(() => props.column.filter !== 'boolean');
    function setWidthPopup(wd: string) {
      const wrappers = document.querySelectorAll('.k-child-animation-container')
      wrappers.forEach(wrapper => (wrapper as HTMLElement).style.width = wd);
      let valueWidth = 600
      if (wd !== '600px') {
        valueWidth = 350
      }
      setwidth.value = valueWidth
      const popupContainer = document.querySelector('.k-animation-container.k-animation-container-relative.k-animation-container-shown') as HTMLElement
      if (popupContainer) {
        const currentLeft = parseFloat(getComputedStyle(popupContainer).left);
        const popupWidth = popupContainer.offsetWidth;
        const viewportWidth = window.innerWidth;
        if (currentLeft < 20) {
          popupContainer.style.left = `${currentLeft + 20}px`;
        } else if (currentLeft + popupWidth > viewportWidth) {
          popupContainer.style.left = `${currentLeft - 250}px`;
        }
        if (props.summaryOperation !== 'list') {
          openDefaultFilter();
        }
      }
    }
    function adjustPopupPosition() {
      nextTick(() => {
        setTimeout(() => {
          setWidthPopup('350px')
        }, 450);
      });
    }

    function openDefaultFilter() {
      if (props.column.filter !== 'numeric') {
        onMenuSelectClick()
      } else {
        const filterGridColumn = document.getElementById('filterGridColumn')
        columnFilterExpanded.value = props.column.filter === 'numeric'
        if (columnFilterExpanded.value) {
          if (filterGridColumn) {
            const menuItem = filterGridColumn.querySelector('.k-columnmenu-item') as HTMLElement | null;
            if (menuItem) {
              menuItem.click();
            }
          }
        }
      }

    }

    function handleFocus(e: Event) {
      emit('contentfocus', e);
    }

    function expandChange(e: Event) {
      columnsExpanded.value = !e
      columnFilterExpanded.value = Boolean(e);
      emit('expandchange');
    }

    function closeMenu() {
      emit('closemenu');
    }

    function filterChange(newDescriptor: any, e: Event) {

      let convertFilter = newDescriptor
      if (newDescriptor === null) {
        convertFilter = cleanNewDescriptorFilterStructure()
      }

      emit('filterchange', convertFilter, e);
      emit('sendColumnFiltered', convertFilter, props.column);
    }

    function sortChange(newDescriptor: any, e: Event) {
      emit('sortchange', newDescriptor, e);
    }
    watchEffect(async () => {
      if (dataToShow.value.length > 0 && showSelectComponent.value && columnsExpanded.value) {
        await nextTick();
        if (tableRef.value) {
          tableRef.value.addEventListener('scroll', getMoreDatas);
        }
      } else {
        if (tableRef.value) {
          tableRef.value.removeEventListener('scroll', getMoreDatas);
        }
      }
    });
    watch(searchSelectFilter, (newVal, oldVal) => {
      if (newVal !== null) {
        if (newVal.trim() === '') {
          const searchText = { value: newVal, isBlank: true };
          getData(20, 0, searchText, true)
          newVal = null;
          pagination.after = 0
        } else {
          const searchText = { value: newVal, isBlank: false };
          getData(20, 0, searchText)
        }
        if (newVal !== oldVal) {
          pagination.after = 0
        }
      }
    });
    const filterToApplySelectComponent = ref<Array<string>>([])
    function checkEnableDefault() {
      if (filterToApply.value) {
        // We extract the texts (values) from the filter
        const findFilterIndex = filterToApply.value.filters.findIndex((filter: FilterCheck) =>
          filter.filters.some((subFilter: { field: string }) =>
            subFilter.field === props.column.field
          )
        );
        if (findFilterIndex !== -1) {
          const targetFilter: FilterCheck = filterToApply.value.filters[findFilterIndex];
          filterToApplySelectComponent.value = targetFilter.filters
            .filter((subFilter: { field: string }) => subFilter.field === props.column.field)
            .map((subFilter: { value: any }) => transformRegulatoryTermsValueInverse(subFilter.value));
        } else {
          filterToApplySelectComponent.value = [];
        }
      }

    }
    const tempCheckedItem = ref<Array<string>>([])
    const checkItemTemp = (e: Event) => {
      const element = (e.target as HTMLInputElement)
      const isChecked = element.checked;
      const labelElement = document.querySelector(`label[for="${element.id}"]`);
      if (labelElement) {
        if (isChecked) {
          tempCheckedItem.value.push(String(labelElement.textContent))
        } else {
          tempCheckedItem.value = tempCheckedItem.value.filter(item => item != labelElement.textContent)
        }
      }
    }
    const onSubmit = (e: Event) => {
      e.preventDefault();
      let values: number[] | string[] = getCheckedLabelsText('input[type="checkbox"].checkToSelect')
      if (props.column.filter === 'numeric') {
        values = values.reduce((acc, str) => {
          const num = +str;
          if (!isNaN(num)) acc.push(num);
          return acc;
        }, [] as number[]);
      }
      const res = createNewDescriptorFilterStructure(props.column.field, values, filterToApply.value as RootFilter)
      filterChange(res, e)
      closeMenu();
    };
    const onReset = (e: Event) => {
      e.preventDefault();
      const checkboxes = (tableRef.value as HTMLTableElement).querySelectorAll<HTMLInputElement>('input[type="checkbox"].checkToSelect');
      Array.from(checkboxes).filter((checkbox: HTMLInputElement) => checkbox.checked).forEach((checkb: HTMLInputElement) => { checkb.checked = false })
      const res = removeFieldFromFilters(props.column.field, filterToApply.value as RootFilter)
      filterChange(res, e)
      closeMenu();
    }
    const checkAllSelect = (e: Event) => {
      const isChecked = (e.target as HTMLInputElement).checked;
      const checkboxes = (tableRef.value as HTMLTableElement).querySelectorAll<HTMLInputElement>('input[type="checkbox"].checkToSelect');
      Array.from(checkboxes).forEach((checkbox: HTMLInputElement) => checkbox.checked = isChecked);
    }
    return {
      setwidth,
      dataToShow,
      filterToApply,
      showSelectComponent,
      showLoading,
      showFilterComponent,
      showSearchBox,
      handleFocus,
      expandChange,
      closeMenu,
      filterChange, filterOperators,
      sortChange, tableRef, onMenuSelectClick, columnsExpanded, searchSelectFilter, onSubmit, onReset, filterToApplySelectComponent, checkAllSelect, loadingItems, StringUtils, checkItemTemp, tempCheckedItem
    };
  }
})
</script>
<style scoped lang="scss">
.footer {
  display: flex;
  justify-content: flex-end;
  padding: 8px;
}

.d-flex.flex-column.text-center {
  justify-content: center !important;
}

.table-wrapper {
  display: block;
  max-height: 250px;
  overflow-y: auto;
  width: 100%;
  padding-left: 20px;
  padding-right: 20px;

  /* Optional: Add some spacing between header and scrollable content */
  tbody tr:first-child td {
    padding-top: 8px;
  }
}

.search-input {
  padding-left: 20px;
  padding-right: 20px;
}

.k-checkbox-col {
  width: 2px;
}

.k-checkbox-label {
  width: 100%;
}


span.search-icon {
  border-radius: 0 !important;
}


.scroll-loading {
  position: absolute;
  bottom: 60px;
  left: 50%;
}
</style>
