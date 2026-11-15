import * as globalColumns from "@ada/design-system/data/globalColumns";

const columnsEmailNegotiations = [
  ...globalColumns.planName,
  ...globalColumns.phaseName,
  ...globalColumns.supplierName,
  ...globalColumns.spendLines,
  ...globalColumns.countryName,
  ...globalColumns.recipientName,
  ...globalColumns.recipientEmail,
  ...globalColumns.sentDate,
  ...globalColumns.emailStatus,
  ...globalColumns.contactAttempts,
  ...globalColumns.resolutionType
];

export default columnsEmailNegotiations;
