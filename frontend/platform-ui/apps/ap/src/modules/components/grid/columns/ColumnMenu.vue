<template>
  <div>
    <GridColumnMenuSort
      :column="column"
      :sortable="sortable"
      :sort="sort"
      :style="{ width: setwidth + 'px' }"
      @closemenu="closeMenu"
      @sortchange="sortChange"
      
    />    
        
    <GridColumnMenuFilter
      v-if="showFilterComponent"
      :column="column"
      :filterable="filterable"
      :filter="filter"           
      :style="{ width: setwidth + 'px' }"
      @filterfocus="handleFocus"
      @closemenu="closeMenu"
      @expandchange="expandChange"
      @filterchange="filterChange"
    />  
    
      <GridColumnMenuCheckboxFilter
          v-if="showCheckboxFilterComponent"
          :column="column"
          :filter="filter"
          :filterable="filterable"
          :unique-data="true"
          :search-box="true"
          :data-items="dataItems"     
          :style="{ width: setwidth + 'px' }"     
          @filterfocus="handleFocus"
          @expandchange="expandChange"
          @filterchange="filterChange"
          @closemenu="closeMenu"
        />      

  </div>
</template>
<script>
import {
  GridColumnMenuFilter,
  GridColumnMenuSort,
  GridColumnMenuCheckboxFilter,
} from '@progress/kendo-vue-grid';

import { StringUtils } from "@/utils";

export default {
  name: 'ColumnMenu',
  components: {
    GridColumnMenuSort: GridColumnMenuSort,
    GridColumnMenuFilter: GridColumnMenuFilter,  
    GridColumnMenuCheckboxFilter: GridColumnMenuCheckboxFilter
  },
  props: {
    column: Object,
    datos: Array,
    sortable: [Boolean, Object],
    sort: {
      type: Array,
    },
    filter: Object,
    filterable: Boolean
  },
  data() {
    return {
      currentColumns: [],
      columnsExpanded: false,
      filterExpanded: false,
      dataItems: [],
      setwidth: null
      //dataItemstoSelect: this.$props.datos.sort((a,b) => (a.countryName > b.countryName) ? 1 : ((b.countryName > a.countryName) ? -1 : 0))
    };
  },
  computed: {
    oneVisibleColumn() {
      return this.currentColumns.filter((c) => !c.hidden).length === 1;
    },

    /**
     * WI#18362. The checkbox list renders the raw values, so a boolean column offers "true" and
     * "false" in lower case. Active Client uses the operator filter instead, whose own wording
     * ("Is true" / "Is false") already reads properly.
     */
    showCheckboxFilterComponent() {
      return this.$props.column.field !== 'activeClient';
    },

    showFilterComponent() {       

      const fields = ['isSME','isVCardApplied','entityEthnicMinorityOwnedBusiness', 'entityWomanOwnedBusiness', 'entityVeteranOwnedBusiness','box','vCardBox','financialBox']

      if ( fields.includes(this.$props.column.field) ) {
        return false
      }
      return true   

      }




  },
  mounted() {
    
    if (document.getElementsByClassName('k-columnmenu-item')[3]){
      document.getElementsByClassName('k-columnmenu-item')[3].innerHTML = '<span class="k-icon k-font-icon k-i-checkmark"></span> Select';    
    
    
    this.adjustPopupPosition();}    

    
  },
  created() {
    this.$data.currentColumns = this.$props.columns;    
    let finalOrder = []        
    this.$props.datos.forEach(function (config) {
      const newConfig = Object.assign({}, config)
      newConfig.hidden = false
      finalOrder.push(newConfig)
    })
    this.$data.dataItems = finalOrder
    let currentColumn = this.$props.column.field

    this.$data.dataItems = this.$data.dataItems.sort(function (a, b) {
      const valueColumnA = a[currentColumn];
      const valueColumnB = b[currentColumn];
      if (valueColumnA < valueColumnB) {
      return -1;
    } else if (valueColumnA > valueColumnB) {
      return 1;
    } else {
      return 0;
    }
  });
  }, 
  
  methods: {
   openOptionsFilter() {

     setTimeout(() => { 
      if (document.getElementsByClassName('k-columnmenu-item')[3]) {
        document.getElementsByClassName('k-columnmenu-item')[3].click()  
      } else if (document.getElementsByClassName('k-columnmenu-item')[2]) {
        document.getElementsByClassName('k-columnmenu-item')[2].click()
      }
    }, 450);
  },
    adjustPopupPosition() {
      let currentColumn = this.$props.column.field
      
      if ( StringUtils.validateFieldInArray(currentColumn) ) {
          this.$nextTick(() => {
            setTimeout(() => {              
              const wrappers = document.querySelectorAll('.k-child-animation-container');
              wrappers.forEach(wrapper => {
                  wrapper.style.width = '600px';
              });              
              this.$data.setwidth = '600';
              const popupContainer = document.querySelector('.k-animation-container.k-animation-container-relative.k-animation-container-shown');              

              if (popupContainer) {
                const currentLeft = parseFloat(getComputedStyle(popupContainer).left);
                const popupWidth = popupContainer.offsetWidth;
                const viewportWidth = window.innerWidth;
                if (currentLeft < 20) {
                  popupContainer.style.left = `${currentLeft + 20}px`;
                } else if (currentLeft + popupWidth > viewportWidth) {
                  popupContainer.style.left = `${currentLeft - 250}px`;
                }
                this.openOptionsFilter()
              }
            }, 450);
          });
      }  else {

          this.$nextTick(() => {
            setTimeout(() => {              
              const wrappers = document.querySelectorAll('.k-child-animation-container');
              wrappers.forEach(wrapper => {
                  wrapper.style.width = '350px';
              });              
              this.$data.setwidth = '350';
              const popupContainer = document.querySelector('.k-animation-container.k-animation-container-relative.k-animation-container-shown');              

              if (popupContainer) {
                const currentLeft = parseFloat(getComputedStyle(popupContainer).left);
                const popupWidth = popupContainer.offsetWidth;
                const viewportWidth = window.innerWidth;
                if (currentLeft < 20) {
                  popupContainer.style.left = `${currentLeft + 20}px`;
                } else if (currentLeft + popupWidth > viewportWidth) {
                  popupContainer.style.left = `${currentLeft - 250}px`;
                }

                this.openOptionsFilter()
              }
            }, 450);
          });
      }
    },   
    handleFocus(e) {
      this.$emit('contentfocus', e);
    },
    onToggleColumn(id) {
      this.currentColumns = this.currentColumns.map((column, idx) => {
        return idx === id ? { ...column, hidden: !column.hidden } : column;
      });
    },
    onReset(event) {
      event.preventDefault();
      const allColumns = this.$props.columns.map((col) => {
        return {
          ...col,
          hidden: false,
        };
      });

      this.currentColumns = allColumns;
      this.onSubmit();
    },
    onSubmit(event) {
      if (event) {
        event.preventDefault();
      }
      this.$emit('columnssubmit', this.currentColumns);
      this.$emit('closemenu');
    },
    onMenuItemClick() {
      const value = !this.columnsExpanded;
      this.columnsExpanded = value;
      this.filterExpanded = value ? false : this.filterExpanded;
    },
    onFilterExpandChange(value) {
      this.filterExpanded = value;
      this.columnsExpanded = value ? false : this.columnsExpanded;
    },
    expandChange() {
      this.$emit('expandchange');
    },
    closeMenu() {
      this.$emit('closemenu');      
    },
    filterChange(newDescriptor, e) {
      this.$emit('filterchange', newDescriptor, e);
      this.$emit('sendColumnFiltered', newDescriptor, this.$props.column);
    },
    sortChange(newDescriptor, e) {
      this.$emit('sortchange', newDescriptor, e);
    },
  },
};
</script>