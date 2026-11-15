import * as colorsGroups from "@/utils/ColorsGroups";
import { Text } from "@progress/kendo-drawing";
import StringUtils from "./StringUtils";

/**
 * Array of colors used in the chart
 */
const colors = [
  colorsGroups.chartFirstGroup,
  colorsGroups.chartSecondGroup,
  colorsGroups.chartThirdGroup,
  colorsGroups.chartFourthGroup,
  colorsGroups.chartFifthGroup,
];

/**
 * Calculates the highes phase number by spliting the phaseName
 * and retrieving the number which comes after the Phase .
 */
export const findPhaseWithHighestNumber = (dataArray: any) => {
  let highestNumber = 0;

  dataArray.forEach((phase: any) => {
    if (phase.phaseName !== "Rest") {
      const number = parseInt(phase.phaseName.split(" ")[1]);
      if (!isNaN(number) && number > highestNumber) {
        highestNumber = number;
      }
    }
  });

  return highestNumber;
};

/**
 * Calculates the color based on the phase number
 * by split the phase name and number
 * @param phase The phase object from data series
 */
export function getPhaseColor(phase: any) {
  // Example: phase = { category: 'Phase 1' or 'Rest' or other categories }

  let phaseColorIndex = phase.index + 1

  // Calculate the index of the color based on the phase number
  let colorIndex = (phaseColorIndex - 1) % 6; // Use the length of the colors array

  // Return the color from the colors array based on the calculated index
  return colors[colorIndex];
}


/**
 * Calculates if the dateSeries array is less or equal to 6,
 * if yes the legend shows
 */
export function isChartLegendVisible(dataValues: any, legendMaxItems: number) {
  return dataValues.length <= legendMaxItems;
}

/**
 * get color for legend for the chart
 */

export function getColorForLegend(phase: any) {

  if (phase.phaseName.toLowerCase() === "rest") {
    return colorsGroups.restColor;
  }
  if (phase.phaseName.toLowerCase() === "total" || phase.phaseName.toLowerCase() === "target") {
    return colorsGroups.totalWaterfall;
  }

  return getColor(phase.phaseNumber);
}

/**
 * returns the color based on the index
 * @param numberVal index of the dataSeries
 * @returns
 */
export function getColor(numberVal: number): string | undefined {
  if (numberVal < 1) {
    return;
  }
  
  // Calculate the index of the color based on the phase number
  let colorIndex = (numberVal - 1) % 6;

  // Return the color from the colors array based on the calculated index
  return colors[colorIndex];
}


export const convertGlobalFilterToGraphQL = (filter: any | undefined) => {
  if (filter) {
    return `globalFilter: "${JSON.stringify(filter).replace(/"/g, '\\"')}"`;
  } else {
    return "";
  }
};

/**
 * returns days amount + days (string). Bars show up to 2 decimals, so a strategy that moves the
 * term by a few hundredths of a day is not drawn as "0"; the Total stays in whole days.
 */
export function getDays(e: any) {
  let roundedValue = Math.round(e.value * 100) / 100;
  const centerX = e.rect.origin.x + e.rect.size.width / 2 - 5;
  if (e.category === "Total") {
    return new Text(`${Math.ceil(e.value)}`, [centerX, e.rect.origin.y - 10], {
      font: "500 14px Inter",
      fill: {
        color: colorsGroups.color222222,
      },
    });
  }
  if (e.value > 0) {
    return new Text(`${roundedValue}`, [centerX, e.rect.origin.y - 10], {
      font: "500 14px Inter",
      fill: {
        color: colorsGroups.color222222,
      },
    });
  } else if (e.value < 0) {
    return new Text(`${roundedValue}`, [centerX, e.rect.origin.y + 10], {
      font: "500 14px Inter",
      fill: {
        color: colorsGroups.color222222,
      },
    });
  } else {
    return new Text("0", [centerX + 5, e.rect.origin.y + 10], {
      font: "500 14px Inter",
      fill: {
        color: colorsGroups.color222222,
      },
    });
  }
}

/***
 * converts long float number to a string with 1 decimal point, adds
 * k , m , b, t for the amount at the end of the string
 */
export function convertBigNumber(e: any) {
  let val = StringUtils.formatBigNumbers(e.value);
  if (e.value) {
    return new Text(
      `${val}`,
      //[centerX, e.rect.origin.y - 10],
      getCashFlowLabelPoint(
        e.value,
        val.length,
        e.rect.origin,
        e.rect.size.width,
      ),
      {
        font: "500 14px Inter",
        fill: {
          color: colorsGroups.color222222,
        },
      },
    );
  } else {
    return new Text(
      "0",
      getCashFlowLabelPoint(0, 1, e.rect.origin, e.rect.size.width),
      //[centerX + 5, e.rect.origin.y + 10],
      {
        font: "500 14px Inter",
        fill: {
          color: colorsGroups.color222222,
        },
      },
    );
  }
}

/**
 * returns the text position (center location)
 */
export function getCashFlowLabelPoint(
  value: number,
  strSize: number,
  origin: any,
  width: number,
) {
  return [
    origin.x + (width / 2 - strSize * 2.7),
    origin.y + (value >= 0 ? -5 : 5),
  ];
}

/***
 * for the cf y axis labels
 *
 */
export function cashFlowLabels(e: any) {
  return StringUtils.formatBigNumbers(e.value);
}

/**
 * returns the bar item bg-color
 */
export function barItemColor(point: {
  dataItem: { summary: string; amount: number };
  category: string;
  value: number;
  series: any;
  index: number;
}) {
  let summary = point.dataItem.summary;

  if (summary) {
    return summary === "total" ? colorsGroups.totalWaterfall : "#98a2b3";
  }

  if (point.value < 0) {
    return colorsGroups.negativeColorForStrategies;
  }

  if (point.category) {
    if (
      point.category === "Avg. Days Paid" ||
      point.category === "Avg.\nDays\nPaid" ||
      point.category === "Prom. días pagados" ||
      point.category === "Prom.\ndías\npagados"
    ) {
      return colorsGroups.actualPaymentTerms;
    } else if (
      point.category === "Supplier Standard" ||
      point.category === "Supplier\nStandard" ||
      point.category === "Peer Group\nStandard" ||
      point.category === "Peer\nGroup Standard" ||
      point.category === "Peer\nGroup\nStandard" ||
      point.category === "Financing\n(Cost\nPositive)"
    ) {
      return colorsGroups.supplierStandard;
    } else {
      return colorsGroups.defaultColor;
    }
  }
}

/**
 * checks if number is between -0.1 and 0.1
 *
 * @param value number
 * @returns
 */
export function compareValue(value: number) {
  if (value > -0.1) {
    return " > -0.1";
  } else if (value < 0.1) {
    return " < 0.1";
  } else {
    return "between -0.1 and 0.1";
  }
}

export function validatePilotAccount(
  rowProps: any,
  editListView: boolean,
  isPilotAccount: boolean,
  disableBlurEfect: boolean = false,
): string {
  if (disableBlurEfect) {
    return " ";
  } else {
    let companyIsPilot = isPilotAccount;
    let isPilot = !companyIsPilot || rowProps.dataItem.isPilot;
    if (!isPilotAccount) {
      return " ";
    }

    if (editListView) {
      return " ";
    }

    return isPilot ? " " : " blur-effect ";
  }
}

export function getClusterTypeForQuery(clusterType: string) {
  switch (clusterType) {
    case "peerGroup":
      return "generate_peer_group";
    case "supplierStandard":
      return "generate_supplier_standard";
  }
}
export function getClusterType(clusterType: string) {
  switch (clusterType) {
    case "peerGroup":
      return "peer_group_clusters";
    case "supplierStandard":
      return "supplier_standard_clusters";
  }
}



/**
 * Utility function to show virtual card related columns.
 * Sets the `hidden` property to `false` for specific fields.
 * 
 * @param columns - The array of columns to update.
 * @returns The updated array of columns.
 */
export function showVCardColumnsRelated(columns: any[]): any[] {
  // Define the fields related to Virtual Card functionality
  const vCardRelatedFields = [
    'vCardGroupName',
    'isVCardApplied',
    'vCardGroupRebate',
    'vCardAcceptanceType',
    'vCardCashFlowGainFull',
    'vCardCashFlowEpFull',
    'vCardRebatePercent',
    'vCardRebateFull',
    'vCardRebateEpFull',
    'vCardTotalEconomicProfitFull',
    'vCardBox',
    'vCardEconomicProfitImpactLabel',
    'vCardSuccessProbability'
  ];

  // Iterate through the columns and show the specified Virtual Card fields
  return columns.map(column => {
    if (vCardRelatedFields.includes(column.field)) {
      return { ...column, hidden: column.hidden };
    }
    return column; // Return other columns as-is
  });
}


export function removeVCardColumnsRelated(columns: any[]): any[] {
  // Define the fields related to Virtual Card functionality to be removed
  const vCardRelatedFields = [
    'vCardGroupName',
    'isVCardApplied',
    'vCardGroupRebate',
    'vCardAcceptanceType',
    'vCardCashFlowGainFull',
    'vCardCashFlowEpFull',
    'vCardRebateFull',
    'vCardRebatePercent',
    'vCardRebateEpFull',
    'vCardTotalEconomicProfitFull',
    'vCardBox',
    'vCardEconomicProfitImpactLabel',
    'vCardSuccessProbability'
  ];

  // Filter out the specified Virtual Card fields from the columns
  return columns.filter(column => !vCardRelatedFields.includes(column.field));
}


export function removeColumnsforNonAdmins(columns: any[]): any[] {
  // Define the fields related to remove if the user is Non admin
  const fieldsForAdmins = [
    'vCardSuccessProbability',
  ];
 
  return columns.filter(column => !fieldsForAdmins.includes(column.field));
}
