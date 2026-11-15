<template>
<CalculumGrid :gridData="gridDataColumnsComputed" :gridColumns="dataColumns" :allowExportExcel="false" :hideColumnSelector="false" :childrenColumns="false" :showToolbar="true" :selectable="true" :forAdminDataChange="true" :compareList="true" :key="key" :gridHeight="gridHeight" @resetPeers="$emit('reset-peers')" @editPeers="$emit('edit-peers')" @selectRow="selectRowItems" @selectAllRow="selectAllRow" @resetDefaultColumns="resetDefaultColumns"> </CalculumGrid>
</template>

<script lang="ts">

import { reactive, toRefs, defineComponent, watch, computed, onMounted } from "vue";
import CalculumGrid from "@/modules/components/grid/CalculumGrid.vue";
import { NumberUtils } from "@/utils";
import {  defaultCompareListCompanies } from "../data/columns";
import * as cacheGrid from "@/utils/dataGridClear";
import { useI18n } from "vue-i18n";
import { useFinancingDataCompaniesStore } from "@/stores/financingDataCompanies";
import { ObjectUtils } from "@/utils";

export default defineComponent({
    name: "ListCompare",
    components: { CalculumGrid },
    props: {
        listOfCompaniesData: { type: Array, default: () => [] },
        selectedChart: { type: String, required: true, default: "" },
        startYearCompareGrid: { type: Number, required: true, default: 0 },
        endYearCompareGrid: { type: Number, required: true, default: 0 },
        acronymChart: { type: String, required: true, default: "" }
     },
    emits: ["change-data", "select-all-row", "select-row", "reset-peers", "edit-peers"],
    setup(props, { emit }) {

        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
        const financingDataCompaniesStore = useFinancingDataCompaniesStore();

        interface ListCompareInterface {
            dataColumns: Array<any>,
            dataInfo: Array<any>,
            key: number,
            gridHeight: string
        }


        const data = reactive<ListCompareInterface>({
            dataColumns: getgridColumns(),
            dataInfo: setDataInfo(),
            key: NumberUtils.getRandomInt(),
            gridHeight: 'auto'
        })

    function selectRowItems(items: any) {        
        emit('select-row', items)        
    }

    function selectAllRow(items: any, status: boolean) {
        emit('select-all-row', items, status)
    }

    function setDataInfo() {

        const copyData = ObjectUtils.cloneDeep(props.listOfCompaniesData)

        return copyData
    }

    
    watch(
      () => props.listOfCompaniesData,
      () => {        
        data.dataInfo = setDataInfo();
      },
      { deep: true }
    );



    function getgridColumns(resetcolumnsFlag: boolean = false): Array<any> {
        const columns: Array<any> = [];
        defaultCompareListCompanies.forEach(function(config: any) {
            const newConfig = Object.assign({}, config);
            columns.push(newConfig);
        });

        let resetcolumns = [];

        const gridCache = resetcolumnsFlag ? [] : financingDataCompaniesStore.getHomeFinancingListCompaniesCompare();
        if (
            gridCache &&
            gridCache.length &&
            JSON.stringify(ObjectUtils.cloneDeep(columns)) !==
            JSON.stringify(gridCache)
        ) {
            resetcolumns = cacheGrid.clearCache(
                ObjectUtils.cloneDeep(columns),
            gridCache
            );
        } else {
            resetcolumns =  ObjectUtils.cloneDeep(columns)
        }
       

            const entityName = resetcolumns.findIndex(
                (x: any) => x.field === "entityName"
            );

            if (entityName > -1) {
                resetcolumns[entityName].title = translate.t("home.analyze.table.companyName")
                resetcolumns[entityName].hidden = false            
                resetcolumns[entityName].width = '400px'            
            }



            const entityCountryName = resetcolumns.findIndex(
                (x: any) => x.field === "entityCountryName"
            );
            if (entityCountryName > -1) {                
                resetcolumns[entityCountryName].title = translate.t("home.analyze.table.country")      
            }

            const entityRegion = resetcolumns.findIndex(
                (x: any) => x.field === "entityRegion"
            );
            if (entityRegion > -1) {
                resetcolumns[entityRegion].hidden = false     
                resetcolumns[entityRegion].cell = ''            
                resetcolumns[entityRegion].width = '300px'      
                resetcolumns[entityRegion].title = translate.t("home.analyze.table.region")      
            }


            const entityContinent = resetcolumns.findIndex(
                (x: any) => x.field === "entityContinent"
            );
            if (entityContinent > -1) {
                resetcolumns[entityContinent].hidden = false     
                resetcolumns[entityContinent].cell = ''            
                resetcolumns[entityContinent].width = '300px'            
                resetcolumns[entityContinent].title = translate.t("home.analyze.table.continent")
            }

            const entityIndustryName = resetcolumns.findIndex(
                (x: any) => x.field === "entityIndustryName"
            );
            if (entityIndustryName > -1) {
                resetcolumns[entityIndustryName].hidden = false 
                resetcolumns[entityIndustryName].width = '550px'
                resetcolumns[entityIndustryName].title = translate.t("global.industryNameNAICS4")
            }

            const entityIndustryCode = resetcolumns.findIndex(
                (x: any) => x.field === "entityIndustryCode"
            );
            if (entityIndustryCode > -1) {
                resetcolumns[entityIndustryCode].hidden = false
                resetcolumns[entityIndustryCode].width = '150px'                 
            }        

            const entityIndustryNameNaics2 = resetcolumns.findIndex(
                (x: any) => x.field === "entityIndustryNameNaics2"
            );
            if (entityIndustryNameNaics2 > -1) {
                resetcolumns[entityIndustryNameNaics2].hidden = true
                resetcolumns[entityIndustryNameNaics2].width = '550px'     
                resetcolumns[entityIndustryNameNaics2].title = translate.t("global.industryNameNAICS2")
            }

            const entityIndustryCodeNaics2 = resetcolumns.findIndex(
                (x: any) => x.field === "entityIndustryCodeNaics2"
            );
            if (entityIndustryCodeNaics2 > -1) {
                resetcolumns[entityIndustryCodeNaics2].hidden = true
                resetcolumns[entityIndustryCodeNaics2].width = '150px'                 
            } 

            const entityIndustryNameNaics3 = resetcolumns.findIndex(
                (x: any) => x.field === "entityIndustryNameNaics3"
            );
            if (entityIndustryNameNaics3 > -1) {
                resetcolumns[entityIndustryNameNaics3].hidden = true
                resetcolumns[entityIndustryNameNaics3].width = '550px'          
                resetcolumns[entityIndustryNameNaics3].title = translate.t("global.industryNameNAICS3")

            }
            
            const entityIndustryCodeNaics3 = resetcolumns.findIndex(
                (x: any) => x.field === "entityIndustryCodeNaics3"
            );
            if (entityIndustryCodeNaics3 > -1) {
                resetcolumns[entityIndustryCodeNaics3].hidden = true
                resetcolumns[entityIndustryCodeNaics3].width = '150px'                 
            } 

        const getYearsDifference = (props.endYearCompareGrid  - props.startYearCompareGrid) + 1
        for (let i = 1; i <= getYearsDifference; i++) {
            const newObject = {    
            field: "metric"+i,
            title: props.acronymChart + " " + Number(props.startYearCompareGrid + (i - 1)),
            width: "120px",
            resizable: true,
            allowHide: true,
            hidden: false,
            className: "text-center",
            filter: "text",
            cell: 'textTemplate'
            }
            resetcolumns.push(newObject)
        }

        
        financingDataCompaniesStore.setHomeFinancingListCompaniesCompare(resetcolumns);

        return resetcolumns;
    }


    watch(
      () => data.dataColumns,
      () => {
        financingDataCompaniesStore.setHomeFinancingListCompaniesCompare(data.dataColumns);        
      },
      { deep: true }
    );

    const gridDataColumnsComputed = computed(() => {        
      return data.dataInfo
    })

    function resetDefaultColumns() {
        financingDataCompaniesStore.setHomeFinancingListCompaniesCompare(null);
      data.dataColumns = getgridColumns(true);
    }

    onMounted(() => {
     setGridHeight();
    });

    function setGridHeight() {
      const getSubMain = document.getElementById("container-main-id");
      if (getSubMain) {
        if (getSubMain.clientHeight - 115 < 350) {
          data.gridHeight = "350px";
        } else {
          data.gridHeight = getSubMain.clientHeight - 115 + "px";
        }
      }
    }

        
        return {
            ...toRefs(data),
            selectRowItems,
            resetDefaultColumns,
            gridDataColumnsComputed,
            selectAllRow
        }
    }

})
</script>