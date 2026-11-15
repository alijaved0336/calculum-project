import { translate } from '../../../../utils/translation'

export const spendfilesColumns = [
  { field: 'media.originalFileName', title: translate.t('global.fileName'), width: 250, resizable: true, allowHide: true, hidden: false, filter: 'text', className: 'text-center' },
  { field: 'version', title: translate.t('adminBackend.adminUploadData.table.version'), width: 80, resizable: true, allowHide: true, hidden: false, filter: 'text', className: 'text-center' },
  { field: 'created', title: translate.t('adminBackend.adminUploadData.table.created'), width: 150, resizable: true, allowHide: true, hidden: false, filter: 'text', className: 'text-center' },
  { field: 'initialDate', title: translate.t('adminBackend.adminUploadData.table.initialDate'), width: 170, allowHide: true, hidden: false, filter: 'text', resizable: true, className: 'text-center' },
  { field: 'finalDate', title: translate.t('adminBackend.adminUploadData.table.finalDate'), width: 150, allowHide: true, hidden: false, filter: 'text', resizable: true, className: 'text-center' },
  { field: 'status', title: translate.t('adminBackend.adminUploadData.table.status'), width: 150, allowHide: true, hidden: false, filter: 'text', resizable: true, className: 'text-center' },
  { field: 'providerCount', title: translate.t('adminBackend.adminUploadData.table.providerCount'), width: 150, allowHide: true, hidden: false, filter: 'numeric', resizable: true, className: 'text-center' },
  { field: 'buyerCount', title: translate.t('adminBackend.adminUploadData.table.buyerCount'), width: 150, allowHide: true, hidden: false, filter: 'numeric', resizable: true, className: 'text-center' },
  { field: 'spendCount', title: translate.t('adminBackend.adminUploadData.table.spendCount'), width: 150, allowHide: true, hidden: false, filter: 'numeric', resizable: true, className: 'text-center' },
  { field: 'spendVolume', title: translate.t('adminBackend.adminUploadData.table.spendVolume'), width: 200, allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'moneyTemplate' }
]

export const homeFinancialDataColumns = [
  {
    field: 'year', title: translate.t('home.homeFinancialData.financialDataForm.year'), width: 100, resizable: true, allowHide: true, hidden: false, filter: 'text', className: 'text-center' 
  },
  {
    field: 'inventory', title: translate.t('home.homeFinancialData.financialDataForm.inventory'), width: 150, resizable: true, allowHide: true, hidden: false, filter: 'numeric', cell: 'moneyTemplate' 
  },
  {
    field: 'tradeReceivable', title: translate.t('home.homeFinancialData.financialDataForm.tradeReceivable'), width: 150, resizable: true, allowHide: true, hidden: false, filter: 'numeric', cell: 'moneyTemplate' 
  },
  {
    field: 'tradePayable', title: translate.t('home.homeFinancialData.financialDataForm.tradePayable'),width: 150,resizable: true,allowHide: true,hidden: false,filter: 'numeric',cell: 'moneyTemplate'
  },
  {
    field: 'totalRevenue', title: translate.t('home.homeFinancialData.financialDataForm.totalRevenue'), width: 150, resizable: true, allowHide: true, hidden: false, filter: 'numeric', cell: 'moneyTemplate' 

  },
  {
    field: 'costOfGoods', title: translate.t('home.homeFinancialData.financialDataForm.costOfGoods'),width: 150,resizable: true,allowHide: true,hidden: false,filter: 'numeric',cell: 'moneyTemplate'
  },
  { field: 'harmonizationGroupsCount', title: translate.t('common.actions'), width:"100px" , resizable: true, allowHide: true, hidden: false, filter: 'text', cell: 'actionsFinancingView', columnMenu: false }

]

/*** FINANCIAL DATA - ADD COMPANY VIEW COLUMNS ***/
export const searchCompaniesColumns = [
      {
        field: "selected",
        title: translate.t("home.analyze.table.selected"),
        width: '100px',
        resizable: false,
        allowHide: false,
        hidden: false,
        filter: 'boolean',
        cell: 'selectedCompanyFinancialDataView'
      },
      {
        field: "name",
        title: translate.t("home.analyze.table.companyName"),
        width: '250px',
        resizable: false,
        allowHide: false,
        hidden: false,
        filter: "text",
        cell: 'selectedCompanyFinancialDataViewName'
      },
      {
        field: "country",
        title: translate.t("home.analyze.table.country"),
        width: '150px',
        resizable: false,
        allowHide: false,
        hidden: false,
        filter: "text",
        cell : 'selectedCompanyFinancialDataViewCountry'
      },
      {
        field: "region",
        title: translate.t("home.analyze.table.region"),
        width: '150px',
        resizable: false,
        allowHide: false,
        hidden: false,
        filter: "text",
        cell : 'selectedCompanyFinancialDataViewRegion'
      },
      {
        field: "industry",
        title: translate.t("home.analyze.table.industry"),
        width: '150px',
        resizable: false,
        allowHide: false,
        hidden: false,
        filter: "text",
        cell : 'selectedCompanyFinancialDataViewIndustry'
      },
      {
        field: "naicsCode",
        title: translate.t("home.analyze.table.naicsCode"),
        width: 'auto',
        resizable: false,
        allowHide: false,
        hidden: false,
        filter: "text",
        cell : 'selectedCompanyFinancialDataViewNaicsCode'

      }
    ];
    

  
    export const selectedCompanyValuesColumns = [ 
      {
        field: 'year',
        title: translate.t('home.analyze.table.year'),
        width: '100px',
        resizable: false,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        columnMenu: "columnMenuTemplate",
        cell: 'selectedCompanyFinancialDataViewYear',
        
      },
      {
        field: 'DPOValue',
        title: translate.t('home.analyze.table.dpo'),
        width: '100px',
        resizable: false,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        columnMenu: "columnMenuTemplate",
        cell: 'selectedCompanyFinancialDataViewDpo',
        
      },
      {
        field: 'DSOValue',
        title: translate.t('home.analyze.table.dso'),
        width: '100px',
        resizable: false,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        columnMenu: "columnMenuTemplate",
        cell: 'selectedCompanyFinancialDataViewDso',
        
      },
      {
        field: 'DIOValue',
        title: translate.t('home.analyze.table.dio'),
        width: '100px',
        resizable: false,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        columnMenu: "columnMenuTemplate",
        cell: 'selectedCompanyFinancialDataViewDio',
        
      },
      {
        field: 'C2CValue',
        title: translate.t('home.analyze.table.c2c'),
        width: '100px',
        resizable: false,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        columnMenu: "columnMenuTemplate",
        cell: 'selectedCompanyFinancialDataViewC2c',
        
      },
      {
        field: 'INVValue',
        title: translate.t('home.analyze.table.inventory'),
        width: '100px',
        resizable: false,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        columnMenu: "columnMenuTemplate",
        cell: 'selectedCompanyFinancialataViewInventory',
      },
      {
        field: 'TRADE_RECEIVABLEValue',
        title: translate.t('home.analyze.table.tradeReceivable'),
        width: '150px',
        resizable: false,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        columnMenu: "columnMenuTemplate",
        cell: 'selectedCompanyFinancialDataViewTradeReceivable',
      },
      {
        field: 'TRADE_PAYABLEValue',
        title: translate.t('home.analyze.table.tradePayable'),
        width: '150px',
        resizable: false,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        columnMenu: "columnMenuTemplate",
        cell: 'selectedCompanyFinancialDataViewTradePayable',
        
      },
      {
        field: 'TOTAL_REVENUEValue',
        title: translate.t('home.analyze.table.totalRevenue'),
        width: '150px',
        resizable: false,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        columnMenu: "columnMenuTemplate",
        cell: 'selectedCompanyFinancialDataViewTotalRevenue',
        
      },
      {
        field: 'COST_OF_GOODValue',
        title: translate.t('home.analyze.table.costOfGoods'),
        width: '150px',
        resizable: false,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        columnMenu: "columnMenuTemplate",
        cell: 'selectedCompanyFinancialDataViewCostOfGoods',
        
      }
    ]