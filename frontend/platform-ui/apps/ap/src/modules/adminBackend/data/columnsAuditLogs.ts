import { translate } from "@/utils/translation";

export const columnsAuditLogs = [
  {
    field: "id",
    title: translate.t('adminBackend.companiesAdmin.th.id'),
    width: 80,
    resizable: false,
    allowHide: true,
    hidden: true,
    filter: "text",
    locked: false,
    columnMenu: true,
    sortable: false
  },
  {
    field: "formattedDate",
    title: translate.t("adminBackend.audit.columns.date"),
    width: 180,
    resizable: true,
    allowHide: false,
    hidden: false,
    filter: "text",
    locked: false,
    columnMenu: false,
    sortable: false
  },
  {
    field: "level",
    title: translate.t("adminBackend.audit.columns.level"),
    width: 100,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: false,
    columnMenu: true,
    sortable: false
  },
  {
    field: "auditType",
    title: translate.t("adminBackend.audit.columns.type"),
    width: 120,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: false,
    columnMenu: true,
    sortable: true
  },
  {
    field: "context",
    title: translate.t("adminBackend.audit.columns.context"),
    width: 120,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: false,
    columnMenu: true,
    sortable: true
  },
  {
    field: "action",
    title: translate.t("adminBackend.audit.columns.action"),
    width: 120,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: false,
    columnMenu: true,
    sortable: true
  },
  {
    field: "outcome",
    title: translate.t("adminBackend.audit.columns.outcome"),
    width: 120,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: false,
    columnMenu: true,
    sortable: false
  },
  {
    field: "message",
    title: translate.t("adminBackend.audit.columns.message"),
    width: 300,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: false,
    columnMenu: true,
    sortable: false
  },
  // Email column removed - field is not persisted in database
  // Email is computed from user relation and not exposed in grid
  // {
  //   field: "email",
  //   title: translate.t("adminBackend.audit.columns.email"),
  //   width: 200,
  //   resizable: true,
  //   allowHide: true,
  //   hidden: false,
  //   filter: "text",
  //   locked: false,
  //   columnMenu: true,
  //   sortable: true
  // },
  // Company column removed temporarily due to GraphQL schema issues
  // Will be re-enabled once CompareCompany entity is properly configured
  // {
  //   field: "company.name",
  //   title: translate.t("adminBackend.audit.columns.company"),
  //   width: 180,
  //   resizable: true,
  //   allowHide: true,
  //   hidden: true,
  //   filter: "text",
  //   locked: false,
  //   columnMenu: true,
  //   sortable: true
  // },
  {
    field: "ipAddress",
    title: translate.t("adminBackend.audit.columns.ipAddress"),
    width: 140,
    resizable: true,
    allowHide: true,
    hidden: true,
    filter: "text",
    locked: false,
    columnMenu: true,
    sortable: false
  },
  {
    field: "traceId",
    title: translate.t("adminBackend.audit.columns.traceId"),
    width: 280,
    resizable: true,
    allowHide: true,
    hidden: true,
    filter: "text",
    locked: false,
    columnMenu: true,
    sortable: false
  },
  {
    field: "source",
    title: translate.t("adminBackend.audit.columns.source"),
    width: 100,
    resizable: true,
    allowHide: true,
    hidden: true,
    filter: "text",
    locked: false,
    columnMenu: true,
    sortable: false
  }
];

export default columnsAuditLogs;

