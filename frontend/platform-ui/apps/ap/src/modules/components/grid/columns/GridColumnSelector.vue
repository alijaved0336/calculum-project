<template>
<Tooltip :anchor-element="'target'" :position="'top'">
  <div class="icons-grid-container choose-columns-grid-button" :title="$t('global.selectColumns')" data-toggle="collapse" data-target="#options-columns">
    <ChooseColumns data-toggle="collapse" data-target="#options-columns" :title="$t('global.selectColumns')"></ChooseColumns>
  </div>
</Tooltip>
<div class="float-menu collapse" id="options-columns">
  <div class="d-flex justify-content-between mb-2"><span class="text-base font-bold">{{ $t('global.selectColumns') }}</span>
    <Tooltip :anchor-element="'target'" :position="'top'">
      <CalculumClose class="cursor-pointer" data-toggle="collapse" data-target="#options-columns" :title="$t('button.close')"></CalculumClose>
    </Tooltip>
  </div>
  <form class="options-columns-form" @submit="onSubmit" @reset="onReset">
    <div class="search-container mb-3">
      <input class="form-control search-input" v-model="searchTerm" type="text" :placeholder="'Type to search fields...'" @click.stop @focus.stop @mousedown.stop/>
    </div>
    <div class="all-checkbox-container" v-if="filteredColumns.length > 0">
      <div class="k-column-list-item all-checkbox-item"><span class="input-terms" @click.stop="onToggleAllVisibleColumns">
          <input class="k-checkbox k-checkbox-md k-rounded-md" :id="'column-all-visible'" type="checkbox" :readOnly="true" :checked="areAllVisibleColumnsSelected" @click.stop="onToggleAllVisibleColumns"/>
          <label class="k-checkbox-label ml-2" :for="'column-all-visible'" :style="{ userSelect: 'none' }">{{ $t('global.selectAll') }}</label></span></div>
    </div>
    <div v-else><span class="text-base font-bold">{{ 'Field(s) not found' }}</span></div>
    <div class="k-column-list" :style="{ 'max-height': maxHeight }">
      <div class="k-column-list-item" v-for="(column, idx) in filteredColumns" :key="idx"><span class="input-terms" @click.stop="onToggleColumn(getOriginalIndex(column))">
          <input class="k-checkbox k-checkbox-md k-rounded-md" :id="'column-visiblity-hidden-' + getOriginalIndex(column)" type="checkbox" :readOnly="true" :disabled="column.allowHide !== undefined ? !column.allowHide : true" :checked="!column.hidden" @click.stop="onToggleColumn(getOriginalIndex(column))"/>
          <label class="k-checkbox-label ml-2" :for="'column-visiblity-hidden-' + getOriginalIndex(column)" :style="{ userSelect: 'none' }" @click.stop>{{ column.title }}</label></span></div>
    </div>
    <div class="k-columnmenu-actions-reset-colums mt-3" v-if="filteredColumns.length > 0">
      <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content; text-wrap: nowrap;" type="button" @click="onResetDefault"><span>{{ $t('button.reset') }}</span></button>
      <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content; text-wrap: nowrap;" type="reset" data-toggle="collapse" data-target="#options-columns"><span>{{ $t('global.selectAll') }}</span></button>
      <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content; text-wrap: nowrap;" type="submit" :disabled="!hasAtLeastOneVisibleColumn" data-toggle="collapse" data-target="#options-columns"><span>{{ $t('global.save') }}</span></button>
    </div>
  </form>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Tooltip } from '@progress/kendo-vue-tooltip';
import ChooseColumns from '@ada/design-system/assets/icons/iconCustomize.vue';
import CalculumClose from '@/modules/components/CalculumClose.vue';

export default defineComponent({
    components: { Tooltip, ChooseColumns, CalculumClose },

    props: {
        columns: { type: Array as () => any[], required: true },
        childrenColumns: { type: Boolean, default: false },
        targetOperation: { type: String, default: '' },
    },

    emits: ['reset-default-columns', 'callbackOnSubmit'],

    setup(props, { emit }) {
        const searchTerm = ref('');
        const currentColumns = ref<any[]>([]);
        const originalColumns = ref<any[]>([]);

        // created logic
        const columnsChoose: any[] = [];
        let finalColumnsMatch: any[] = [];

        props.columns.forEach(config => {
            columnsChoose.push({ ...config });
        });

        if (props.childrenColumns) {
            const childrens = columnsChoose.filter(x => x.children);
            for (const row of childrens) {
                for (const rows of row.children) {
                    const newrow = { ...rows, title: rows.title + ' (' + row.title + ')' };
                    finalColumnsMatch = [...finalColumnsMatch, newrow];
                }
            }
            currentColumns.value = finalColumnsMatch;
        } else {
            currentColumns.value = columnsChoose;
        }

        // Sort by name
        currentColumns.value = currentColumns.value.sort((a, b) => {
            if (a.title < b.title) return -1;
            if (a.title > b.title) return 1;
            return 0;
        });

        // Add unique ID to each column to handle duplicates correctly
        currentColumns.value = currentColumns.value.map((col, index) => ({
            ...col,
            _uniqueId: `${col.field || 'col'}_${col.title}_${index}`,
        }));

        originalColumns.value = [...currentColumns.value];

        // Computed
        const filteredColumns = computed(() => {
            if (!searchTerm.value.trim()) return currentColumns.value;
            const searchLower = searchTerm.value.toLowerCase();
            return currentColumns.value.filter(column =>
                column.title.toLowerCase().includes(searchLower)
            );
        });

        const areAllVisibleColumnsSelected = computed(() =>
            filteredColumns.value.every(column => !column.hidden)
        );

        const hasAtLeastOneVisibleColumn = computed(() =>
            currentColumns.value.some(column => !column.hidden)
        );

        const maxHeight = computed(() => {
            switch (props.targetOperation) {
                //-Plan Edit Lists
                case 'editing':
                case 'adding':
                    return '55vh';
                //-Negotiation Agreed Lists
                case 'agreed':
                case 'ptTargetList':
                    return '30vh';
                //- Program, Plan Overview Lists
                case 'forecast':
                    return '25vh';
                default:
                    return '70vh';
            }
        });

        // Methods
        function handleClickOutsideDialog(_e: Event) {
            searchTerm.value = '';
            if (import.meta.env.DEV) console.log('** handleClickOutsideDialog. ? - Not implemented yet.');
        }

        function getOriginalIndex(column: any): number {
            // Use unique ID to handle duplicate columns correctly
            if (column._uniqueId) {
                return originalColumns.value.findIndex(col => col._uniqueId === column._uniqueId);
            }
            // Fallback to title-based search for backward compatibility
            return originalColumns.value.findIndex(col => col.title === column.title);
        }

        function onResetDefault() {
            emit('reset-default-columns');
        }

        function onToggleColumn(id: number) {
            currentColumns.value = currentColumns.value.map((column, idx) =>
                idx === id ? { ...column, hidden: !column.hidden } : column
            );
        }

        function onToggleAllVisibleColumns() {
            const shouldSelectAll = !areAllVisibleColumnsSelected.value;
            currentColumns.value = currentColumns.value.map(column => {
                const isVisibleInFilter = filteredColumns.value.some(filteredCol =>
                    filteredCol._uniqueId
                        ? filteredCol._uniqueId === column._uniqueId
                        : filteredCol.title === column.title
                );
                return isVisibleInFilter ? { ...column, hidden: !shouldSelectAll } : column;
            });
        }

        function onReset(event: Event) {
            event.preventDefault();
            currentColumns.value = currentColumns.value.map(col => ({ ...col, hidden: false }));
            onSubmit();
        }

        function onSubmit(event?: Event) {
            event?.preventDefault();
            emit('callbackOnSubmit', currentColumns.value);
        }

        onMounted(() => {
            document.body.addEventListener('click', handleClickOutsideDialog);
        });

        onBeforeUnmount(() => {
            searchTerm.value = '';
            document.body.removeEventListener('click', handleClickOutsideDialog);
        });

        return {
            searchTerm,
            currentColumns,
            filteredColumns,
            areAllVisibleColumnsSelected,
            hasAtLeastOneVisibleColumn,
            maxHeight,
            getOriginalIndex,
            onResetDefault,
            onToggleColumn,
            onToggleAllVisibleColumns,
            onReset,
            onSubmit,
        };
    },
});
</script>

<style lang="scss" scoped>
@import '../../../../resources/assets/styles/variables/colors';

.btn-columns-menu {
    background-color: $body-bg;
}

#options-columns {
    height: auto;    
    width: 500px; 
}

.search-container {
    position: relative;
}

.search-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #eaecf0;
    border-radius: 4px;
    font-size: 14px;
    background-color: white;
    
    &:focus {
        outline: none;
        border: 1px solid #eaecf0;
        border-radius: 4px;
    
    }
    
    &::placeholder {
        color: #6c757d;
        opacity: 0.7;
    }
}


.all-checkbox-item {
    display: flex;
    align-items: center;
    margin-left: 0; /* Remove default margin */
}

.k-column-list {  
  height: auto;  
  overflow: hidden;
  overflow-y: auto;
}

.k-columnmenu-actions-reset-colums {
    display: flex;
    flex-flow: row;
    gap: 1rem;
}

.input-terms {
    width: 100%;
}

.k-column-list-item {
    padding-block: 0.15rem;
}

</style>
