import { EntityCard } from "@/types";

const useEntityCardTitle = () => {
  function setBrowserTitlebyTab(selectedButton: EntityCard.EntityCardPage) {
    let title = "Entity - ";

    switch (selectedButton) {
      case "EntityCardNegotiation":
      case "ReceivablesMockup3":
        title += "Opportunity";
        break;

      case "EntityCardSupplierController":
        title += "Supplier Insights";
        break;

      case "ReceivablesMockup4":
        title += "Options";
        break;

      case "EntityCardFinancing":
        title += "SCF";
        break;

      case "EntityCardCompanyDetails":
        title += "Company Details";
        break;

      case "EntityCardCorporateTree":
        title += "Corporate Tree";
        break;

      case "EntityCardRatingsAndMetrics":
      case "ReceivablesMockup5":
        title += "Ratings & Metrics";
        break;

      case "EntityCardCalculator":
        title += "Payment Terms vs Price";
        break;

      case "EntityCardNews":
        title += "News";
        break;

      default:
        break;
    }

    document.title = title;
  }

  return {
    setBrowserTitlebyTab,
  };
};

export default useEntityCardTitle;
