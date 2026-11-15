
import useUser from "@/services/user/composables/useUser";
import { useModulePlan } from "@/composables";
import { isStandard2StrategyVisibleForUser } from "@/utils/standard2StrategiesVisibility";


export const clearCache = (defaultColumns: any, cachecolumns: any): any => {

  const newArray = []
  for (let row of defaultColumns){

    let indexSpend = -1;
    //- If the column is a custom data point, search by the field
    if (row.field.toLowerCase().includes('customdatapoint')) {
      indexSpend = cachecolumns.findIndex((x: any) => x.field === row.field)    
    } else {
      //- If the column is not a custom data point, search by the field and the title
      indexSpend = cachecolumns.findIndex((x: any) => x.field === row.field && x.title === row.title)    
    }
    
    //- If the column is found, update the values
    if (indexSpend > -1) { 
      row.hidden = cachecolumns[indexSpend].hidden ?? false
      if (cachecolumns[indexSpend].orderIndex){
        row.id = cachecolumns[indexSpend].id
        row.orderIndex = cachecolumns[indexSpend].orderIndex
        row.editable = cachecolumns[indexSpend].editable
        row.isAccessible = cachecolumns[indexSpend].isAccessible
      }
    }
    //- If the column is not found, add it to the new array with the defaults values
    newArray.push(row)
  } 
  return newArray
}

export const clearCacheChilds = (defaultColumns: any, cachecolumns: any): any => {
  const newArray:any = []
  defaultColumns.forEach((column: any) => {
    const indexParentReorder = cachecolumns.findIndex((x: any) => x.title === column.title && x.field === column.field)  
    let childreorder = indexParentReorder > -1 ? cachecolumns[indexParentReorder].children : [] 
    if (childreorder){
      column.children.forEach((columnChild: any) => 
      {          
      let indexSpend = childreorder.findIndex((y: any) => y.field === columnChild.field && y.title === columnChild.title)              
        if (indexSpend > -1) { 
          columnChild.allowHide = childreorder[indexSpend].allowHide
          columnChild.hidden = childreorder[indexSpend].hidden
          columnChild.width = childreorder[indexSpend].width
          if (childreorder[indexSpend].orderIndex){
            columnChild.id = childreorder[indexSpend].id
            columnChild.orderIndex = childreorder[indexSpend].orderIndex
            columnChild.editable = childreorder[indexSpend].editable
            columnChild.isAccessible = childreorder[indexSpend].isAccessible              
          }
        }
      })           
    }          
    newArray.push(column)
  })
  return newArray
}  

export const removeCustomColumns = (resetColumns: any): any => {  
  let dataPointsColumns = 10
  for (let i = 1; i <= dataPointsColumns; i++ ){
    let customColumn = resetColumns.findIndex((x: any) => x.field === 'customDataPoint'+i)
    if (customColumn > -1) {
      resetColumns.splice(customColumn, 1)
    }
  }
  return resetColumns
}



export const remove9boxFinancingColumns = (resetColumns: any): any => {
  
    const scalePotentialSCFRevenue = resetColumns.findIndex((x: any) => x.field === 'scalePotentialSCFRevenue')
    if (scalePotentialSCFRevenue > -1) {
      resetColumns.splice(scalePotentialSCFRevenue, 1)
    }
    
    const scaleFinancingValueToSupplier = resetColumns.findIndex((x: any) => x.field === 'scaleFinancingValueToSupplier')
    if (scaleFinancingValueToSupplier > -1) {
      resetColumns.splice(scaleFinancingValueToSupplier, 1)
    }

    const scaleUsingFinancing = resetColumns.findIndex((x: any) => x.field === 'scaleUsingFinancing')
    if (scaleUsingFinancing > -1) {
      resetColumns.splice(scaleUsingFinancing, 1)
    }

    const financialBox = resetColumns.findIndex((x: any) => x.field === 'financialBox')
    if (financialBox > -1) {
      resetColumns.splice(financialBox, 1)
    }

    const scfBox = resetColumns.findIndex((x: any) => x.field === 'scfBox')
    if (scfBox > -1) {
      resetColumns.splice(scfBox, 1)
    }

  
  
  return resetColumns
}


export const removescfGroupStandardStrategy = (columns: any, allowedStrategy: boolean = false): any => {
  if (!allowedStrategy) {
    const scfGroupStandardStrategy = columns.findIndex((x: any) => x.field === 'scfGroupStandardStrategy')
    if (scfGroupStandardStrategy > -1) {
      columns.splice(scfGroupStandardStrategy, 1)
    }
  }
  return columns
}

export const removeSupplierStandard2Strategy = (columns: any, allowedStrategy: boolean = false): any => {
  // AB#20488 (TEMPORARY): the 2.0 columns are also hidden from non super admins.
  const { userIsSuperAdmin } = useUser();
  if (!isStandard2StrategyVisibleForUser(allowedStrategy, userIsSuperAdmin.value)) {
    const supplierStandard2Strategy = columns.findIndex((x: any) => x.field === 'entitySupplierStandard2Strategy')
    if (supplierStandard2Strategy > -1) {
      columns.splice(supplierStandard2Strategy, 1)
    }
  }
  return columns
}

export const removePeerGroupStandard2Strategy = (columns: any, allowedStrategy: boolean = false): any => {
  // AB#20488 (TEMPORARY): the 2.0 columns are also hidden from non super admins.
  const { userIsSuperAdmin } = useUser();
  if (!isStandard2StrategyVisibleForUser(allowedStrategy, userIsSuperAdmin.value)) {
    const peerGroupStandard2Strategy = columns.findIndex((x: any) => x.field === 'entityPeerGroupStandard2Strategy')
    if (peerGroupStandard2Strategy > -1) {
      columns.splice(peerGroupStandard2Strategy, 1)
    }
  }
  return columns
}

export const removeFinancingRelatedColumns = (columns: any, hasFinancing: boolean = false): any => {

  const { useFeature9BoxesFinancing } = useUser();
  if (!hasFinancing || !useFeature9BoxesFinancing.value) {
    const financings = columns.findIndex((x: any) => x.field === 'financings')
    if (financings > -1) {
      columns.splice(financings, 1)
    }
    
    const fundingCost = columns.findIndex((x: any) => x.field === 'fundingCost')
    if (fundingCost > -1) {
      columns.splice(fundingCost, 1)
    }

    const financingStrategy = columns.findIndex((x: any) => x.field === 'financingStrategy')
    if (financingStrategy > -1) {
      columns.splice(financingStrategy, 1)
    }

    const financingGroupName = columns.findIndex((x: any) => x.field === 'financingGroup.name')
    if (financingGroupName > -1) {
      columns.splice(financingGroupName, 1)
    }
    

  }

  return columns
}

export const removeHarmonizationRelatedColumns = (columns: any, hasHarmonization: boolean = false): any => {
  if (!hasHarmonization) {
    const harmonizations = columns.findIndex((x: any) => x.field === 'harmonizations')
    if (harmonizations !== -1) {
      columns.splice(harmonizations, 1)
    }
  }

  return columns
}


export const removePlanColumns = (columns: any): any => {

  const { modulePlanIsAvailable } = useModulePlan();

  if (!modulePlanIsAvailable.value) {
    const planName = columns.findIndex((x: any) => x.field === 'planName')
    if (planName > -1) {
      columns.splice(planName, 1)
    }
    
    const planNames = columns.findIndex((x: any) => x.field === 'planNames')
    if (planNames > -1) {
      columns.splice(planNames, 1)
    }

    const phaseNameStatuses = columns.findIndex((x: any) => x.field === 'phaseNameStatuses')
    if (phaseNameStatuses > -1) {
      columns.splice(phaseNameStatuses, 1)
    }

  }

  return columns
}

export const removeForecastVolumeColumns = (columns: any): any => {
  const { useFeatureForecastVolume } = useUser();
  if (!useFeatureForecastVolume.value){
    const forecastVolume = columns.findIndex((x: any) => x.field === 'forecastVolume')
    if (forecastVolume > -1) {
      columns.splice(forecastVolume, 1)
    }
  }

  return columns
}
