import { translate } from "@/utils/translation";

const supplyChainFinanceGridColumns = [
  {
    field: "name",
    title: translate.t('adminBackend.gridColumns.name'),
    locked: true,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text"
  },
  {
    field: "source",
    title: translate.t('adminBackend.audit.columns.source'),
    locked: true,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text"
  },
  {
    field: "statusFormatted",
    title: translate.t('global.status'),
    locked: true,
    width: 150,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text"
  },
  {
    field: "scfRecalculate",
    title: translate.t('common.actions'),
    locked: true,
    width: 150,
    resizable: true,
    allowHide: true,
    hidden: false,
    sortable: false,
    cell: "scfActions"
  }
];

export default supplyChainFinanceGridColumns;
