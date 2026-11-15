import { PopoverData } from "@/types";
import { translate } from "@/utils/translation";

export const popovers: Partial<PopoverData>[] = [
  // custom currency information

  {
    key: "custom-currency-info",
    steps: [
      //step 1
      {
        title: `${translate.t("home.components.navbar.topMenu.currency")}`,
        linkto: "custom-currency",
        titleClass: "shepherd-title opportunity-title",
        text: `<h4 class="mb-1 text-lg font-semibold">
        ${translate.t("home.components.navbar.topMenu.userSelectedCurrency")}</h4>
      <p>${translate.t("home.components.navbar.topMenu.userSelectedCurrencyText")}</p>
        <h4 class="mb-1 text-lg font-semibold">
        ${translate.t("home.components.navbar.topMenu.impactOnDisplayedAmounts")}
        </h4>
        <p>${translate.t("home.components.navbar.topMenu.impactOnDisplayedAmountsText")}</p>

      `,
        buttons: [
          {
            actionText: "next",
            action: () => {},
            text: "Next"
          }
        ]
      },
      //step 2
      {
        title: `${translate.t("home.components.navbar.topMenu.currency")}`,
        linkto: "custom-currency",
        titleClass: "shepherd-title opportunity-title",
        text: `<h4 class="mb-1 text-lg font-semibold">
        ${translate.t("home.components.navbar.topMenu.originalCurrencyReference")}</h4>
      <p>${translate.t("home.components.navbar.topMenu.originalCurrencyReferenceText")}</p>
        <h4 class="mb-1 text-lg font-semibold">
        ${translate.t("home.components.navbar.topMenu.exchangeRate")}
        </h4>
        <p>${translate.t("home.components.navbar.topMenu.exchangeRateText")}</p>

      `,
        buttons: [
          {
            classes: "shepherd-button-secondary",
            text: "Back",
            actionText: "back"
          },
          {
            text: "Ok, got it",
            actionText: "complete"
          }
        ]
      }
    ]
  },

  {
    key: "sme-europe",
    title: `${translate.t("global.smeSource.smeEuropeanModelTooltip")}`,
    body: `${translate.t("global.smeSource.tooltip.europe")}`,
    // linkto: "sme-europe",
    // btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: 'sme-default',
    title: `${translate.t("global.smeSource.smeDefaultModelTooltip")}`,
    body: `${translate.t("global.smeSource.tooltip.default")}`,
    // linkto: "sme-default",
    // btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: 'sme-custom',
    title: '',
    body: '',
    // linkto: "sme-default",
    // btnText: `${translate.t("common.learnMore")}`
  },



  /** Entity Ratings & Metrics */

  // Company Rating
  {
    key: "entityRatingsCountryCreditRating",
    title: `${translate.t("home.entityCard.strategies.companyRating")}`,
    body: `${translate.t("home.entityCard.strategies.companyRatingPopover")}`,
    linkto: "company-credit-rating",
    btnText: `${translate.t("common.learnMore")}`
  },

  // Supplier Financing
  {
    key: "entityRatingsFinancingRate",
    title: `${translate.t("global.supplierFinancingRate")}`,
    body: `${translate.t("global.supplierFinancingRatePopover")}`,
    linkto: "supplier-financing-rate",
    btnText: `${translate.t("common.learnMore")}`
  },

  // Buyer Leverage
  {
    key: "entityRatingsBuyerLeverage",
    title: `${translate.t("home.entityCard.buyerLeverageMateriality")}`,
    body: `${translate.t(
      "home.entityCard.advancedTooltip.opportunity.buyerLeverage"
    )}`,
    linkto: "buyer-leverage-materiality",
    btnText: `${translate.t("common.learnMore")}`
  },

  // Metrics
  {
    key: "entityRatingsMetrics",
    title: `${translate.t("home.entityCard.strategies.metrics")}`,
    body: `${translate.t("home.entityCard.strategies.metricsPopover")}`,
    linkto: "metrics",
    btnText: `${translate.t("common.learnMore")}`
  },

  // Data Depth
  {
    key: "entityRatingsDataDepth",
    title: `${translate.t("home.entityCard.strategies.dataDepth")}`,
    body: `${translate.t("home.entityCard.strategies.dataDepthPopover")}`,
    linkto: "data-depth",
    btnText: `${translate.t("common.learnMore")}`
  },

  // Country Rating
  {
    key: "entityRatingsCountryRating",
    title: `${translate.t("home.entityCard.strategies.countryRating")}`,
    body: `${translate.t("home.entityCard.strategies.countryRatingPopover")}`,
    linkto: "country-rating",
    btnText: `${translate.t("common.learnMore")}`
  },

  //ESG Rating
  {
    key: "entityRatingsESGRating",
    title: `${translate.t("home.entityCard.strategies.esgRating")}`,
    body: `${translate.t("home.entityCard.strategies.esgRatingPopover")}`,
    linkto: "esg-rating",
    btnText: `${translate.t("common.learnMore")}`
  },

  //DEI
  {
    key: "entityRatingsDEI",
    title: `${translate.t("home.entityCard.strategies.dei")}`,
    body: `${translate.t("home.entityCard.strategies.deiPopover")}`,
    linkto: "dei",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** Opportinity */

  // Buyer Leverage
  {
    key: "entityOpportunityBuyerLeverage",
    title: `${translate.t("home.entityCard.strategies.buyerLeverage")}`,
    body: `${translate.t("home.entityCard.strategies.buyerLeveragePopover")}`,
    linkto: "buyer-leverage-materiality",
    btnText: `${translate.t("common.learnMore")}`
  },
  // Company Credit Rating
  {
    key: "entityOpportunityCompanyCreditRating",
    title: `${translate.t("home.entityCard.strategies.companyRating")}`,
    body: `${translate.t("home.entityCard.strategies.companyRatingPopover")}`,
    linkto: "company-credit-rating",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** Entity negotiation */
  {
    key: "entityCreditRating",
    title: `${translate.t("global.companyCreditRating")}`,
    body: `${translate.t("global.companyCreditRatingPopover")}`,
    linkto: "credit-rating",
    btnText: `${translate.t("common.learnMore")}`
  },
  // {
  //   key: "entityPaymentTermsStrategies",
  //   title: `${translate.t("global.paymentTermsStrategies")}`,
  //   body: `${translate.t("global.paymentTermsStrategiesPopover")}`,
  //   linkto: "payment-terms-strategies",
  //   btnText: `${translate.t("common.learnMore")}`
  // },
  {
      key: "entityPaymentTermsStrategies",
      title: `${translate.t("global.paymentTermsStrategies")}`,
      steps: [
        {
          title: `${translate.t("global.waterfallChart")}`,
          linkto: "waterfall",
          titleClass: "shepherd-title opportunity-title",
          // 1.
          // Actual
          // Pay on terms
          // Supplier parent max
          text: `
            <h4 class="mb-1 text-lg font-semibold">${translate.t(
              `global.waterfall.actual`
            )}</h4>
            <p>${translate.t(
              `home.entityCard.strategies.currentTermsTooltip`
            )}</p>

            <h4 class="mb-1 text-lg font-semibold">${translate.t(
              `global.waterfall.payOnTerms`
            )}</h4>
            <p>${translate.t(
              `home.entityCard.strategies.payOnTermsStrategyTooltip`
            )}</p>

            <h4 class="mb-1 text-lg font-semibold">${translate.t(
              `global.waterfall.parentSupplierMax`
            )}</h4>
            <p>${translate.t(
              `home.entityCard.strategies.parentSupplierMaxStrategyTooltip`
            )}</p>
          `,
          buttons: [
            {
              actionText: "next",
              action: () => {},
              text: "Next"
            }
          ]
        },
        {
          // 2.
          // Industry region standard
          // Supplier standard
          // Financing
          title: translate.t("global.waterfallChart"),
          text: `
            <h4 class="mb-1 text-lg font-semibold">${translate.t(
              `global.waterfall.industryRegionStandard`
            )}</h4>
            <p>${translate.t(
              `home.entityCard.strategies.industryRegionStandardStrategyTooltip`
            )}</p>

            <h4 class="mb-1 text-lg font-semibold">${translate.t(
              `global.waterfall.supplierStandard`
            )}</h4>
            <p>${translate.t(
              `home.entityCard.strategies.supplierStandardStrategyTooltip`
            )}</p>

            <h4 class="mb-1 text-lg font-semibold">${translate.t(
              `global.waterfall.peerGroupStandard`
            )}</h4>
            <p>${translate.t(
              `home.entityCard.strategies.peerGroupStandardStrategyTooltip`
            )}</p>

            <h4 class="mb-1 text-lg font-semibold">${translate.t(
              `global.waterfall.financing`
            )}</h4>
            <p>${translate.t(
              `home.entityCard.strategies.financingStrategyTooltip`
            )}</p>
          `,
          buttons: [
            {
              classes: "shepherd-button-secondary",
              text: "Back",
              actionText: "back"
            },
            {
              text: "Next",
              actionText: "next"
            }
          ]
        },
        {
          // 3.
          // Cash discount conversion
          // Buyer standard
          // Harmonization
          title: translate.t("global.waterfallChart"),
          text: `
            <h4 class="mb-1 text-lg font-semibold">${translate.t(
              `global.waterfall.cashDiscountConversion`
            )}</h4>
            <p>${translate.t(
              `home.entityCard.strategies.cashDiscountConversionStrategyTooltip`
            )}</p>

            <h4 class="mb-1 text-lg font-semibold">${translate.t(
              `global.waterfall.buyerStandard`
            )}</h4>
            <p>${translate.t(
              `home.entityCard.strategies.buyerStandardStrategyTooltip`
            )}</p>

            <h4 class="mb-1 text-lg font-semibold">${translate.t(
              `global.harmonization`
            )}</h4>
            <p>${translate.t(
              `home.entityCard.strategies.harmonizationTooltip`
            )}</p>
          `,
          buttons: [
            {
              classes: "shepherd-button-secondary",
              text: "Back",
              actionText: "back"
            },
            {
              text: "Next",
              actionText: "next"
            }
          ]
        },
        {
          // 4.
          // Regulatory terms
          // Payment terms target opportunity
          // Term extension cap
          title: translate.t("global.waterfallChart"),
          text: `
            <h4 class="mb-1 text-lg font-semibold">
              ${translate.t("global.regulatoryTerms")}
            </h4>
            <p>${translate.t("global.regulatoryTermsTooltip")}</p>

            <h4 class="mb-1 text-lg font-semibold">
              ${translate.t(
                "global.waterfall.paymentTermsTargetOpportunity"
              )}</h4>
            <p>
            ${translate.t("home.entityCard.strategies.opportunityTermsTooltip")}
            </p>

            <h4 class="mb-1 text-lg font-semibold">
              ${translate.t("global.waterfall.termExtensionCap")}</h4>
            <p>
            ${translate.t("global.waterfall.termExtensionCapTooltip")}
            </p>
          `,
          buttons: [
            {
              classes: "shepherd-button-secondary",
              text: "Back",
              actionText: "back"
            },
            {
              text: "Done",
              actionText: "complete"
            },
            {
              text: `${translate.t("common.learnMore")}`,
              actionText: "linkTo",
              linkTo: "program-payment-terms",
            }
          ]
        }
      ]
    },
  {
    key: "entityUnusedStrategies",
    title: `${translate.t("global.unusedStrategies")}`,
    body: `${translate.t("global.unusedStrategiesPopover")}`,
    linkto: "disabled-or-unavailable-strategies",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "proposedTerms",
    title: `${translate.t("home.entityCard.strategies.proposedTerms")}`,
    body: `${translate.t("home.entityCard.strategies.proposedTermsPopover")}`,
    linkto: "opportunity",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "agreedNewTerms",
    title: `${translate.t("home.entityCard.strategies.agreedNewTerms")}`,
    body: `${translate.t("home.entityCard.strategies.agreedNewTermsPopover")}`,
    linkto: "agreed",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "payOnTermsStrategy",
    title: `${translate.t("home.entityCard.strategies.payOnTermsStrategy")}`,
    body: `${translate.t(
      "home.entityCard.strategies.payOnTermsStrategyPopover"
    )}`,
    linkto: "pay-on-terms",
    btnText: `${translate.t("common.learnMore")}`
  },

  {
    key: 'vCard',
    title: `${translate.t('home.entityCard.strategies.vCard')}`,
    body: `${translate.t(
      "home.entityCard.strategies.vCardTooltipStrategyPopover"
    )}`,
    //linkto: 'v-card',
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "parentSupplierMaxStrategy",
    title: `${translate.t(
      "home.entityCard.strategies.parentSupplierMaxStrategy"
    )}`,
    body: `${translate.t(
      "home.entityCard.strategies.parentSupplierMaxStrategyPopover"
    )}`,
    linkto: "parent-and-supplier-max",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "industryRegionStandardStrategy",
    title: `${translate.t(
      "home.entityCard.strategies.industryRegionStandardStrategy"
    )}`,
    body: `${translate.t(
      "home.entityCard.strategies.industryRegionStandardStrategyPopover"
    )}`,
    linkto: "industry-and-region-standard",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "supplierStandardStrategy",
    title: `${translate.t(
      "home.entityCard.strategies.supplierStandardStrategy"
    )}`,
    body: `${translate.t(
      "home.entityCard.strategies.supplierStandardStrategyPopover"
    )}`,
    linkto: "supplier-standard",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "peerGroupAvgStrategy",
    title: `${translate.t("home.entityCard.strategies.peerGroupAvgStrategy")}`,
    body: `${translate.t(
      "home.entityCard.strategies.peerGroupAvgStrategyPopover"
    )}`,
    linkto: "peer-group-standard",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "financingStrategy",
    title: `${translate.t("home.entityCard.strategies.financingStrategy")}`,
    body: `${translate.t(
      "home.entityCard.strategies.financingStrategyPopover"
    )}`,
    linkto: "financing-group",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "cashDiscountConversionStrategy",
    title: `${translate.t(
      "home.entityCard.strategies.cashDiscountConversionStrategy"
    )}`,
    body: `${translate.t(
      "home.entityCard.strategies.cashDiscountConversionStrategyPopover"
    )}`,
    linkto: "cash-discount-conversion",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "buyerStandardStrategy",
    title: `${translate.t("home.entityCard.strategies.buyerStandardStrategy")}`,
    body: `${translate.t(
      "home.entityCard.strategies.buyerStandardStrategyPopover"
    )}`,
    linkto: "buyer-standard",
    btnText: `${translate.t("common.learnMore")}`
  },

  //Regulatory Terms Strategy
  {
    key: "regulatoryTermsStrategy",
    title: `${translate.t(
      "home.entityCard.strategies.regulatoryTermsStrategy"
    )}`,
    body: `${translate.t(
      "home.entityCard.strategies.regulatoryTermsStrategyPopover"
    )}`,
    linkto: "regulatory-terms",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** Compare */

  {
    key: "dpoComparison",
    title: `${translate.t("home.compare.charts.compareMetrics")}`,
    body: `${translate.t("home.compare.charts.tooltips.dpoComparison")}`,
    linkto: "compare-metrics",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "lastDso",
    title: `${translate.t("home.compare.charts.compareMetrics")}`,
    body: `${translate.t("home.compare.charts.tooltips.lastDso")}`,
    linkto: "compare-metrics",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "lastC2c",
    title: `${translate.t("home.compare.charts.compareMetrics")}`,
    body: `${translate.t("home.compare.charts.tooltips.lastC2c")}`,
    linkto: "compare-metrics",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "lastDpoYears",
    title: `${translate.t("home.compare.charts.compareMetrics")}`,
    body: `${translate.t("home.compare.charts.tooltips.lastDpoYears")}`,
    linkto: "compare-metrics",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "lastDsoYears",
    title: `${translate.t("home.compare.charts.compareMetrics")}`,
    body: `${translate.t("home.compare.charts.tooltips.lastDsoYears")}`,
    linkto: "compare-metrics",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "lastC2cYears",
    title: `${translate.t("home.compare.charts.compareMetrics")}`,
    body: `${translate.t("home.compare.charts.tooltips.lastC2cYears")}`,
    linkto: "compare-metrics",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "lastCfi",
    title: `${translate.t("home.compare.charts.compareMetrics")}`,
    body: `${translate.t("home.compare.charts.tooltips.lastCfi")}`,
    linkto: "compare-metrics",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "lastPaymentTerms",
    title: `${translate.t("home.compare.charts.lastPaymentTerms")}`,
    body: `${translate.t("home.compare.charts.tooltips.lastPaymentTerms")}`,
    linkto: "compare-metrics",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "potentialCashFlowImpact",
    title: `${translate.t("home.compare.charts.potentialCashFlowImpact")}`,
    body: `${translate.t(
      "home.compare.charts.tooltips.potentialCashFlowImpact"
    )}`,
    linkto: "potential-cash-impact",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** setup */

  {
    key: "setupBuyerGroup",
    title: `${translate.t("home.homeCompanySettings.buyerStandardGroup")}`,
    body: `${translate.t(
      "home.homeCompanySettings.buyerStandardGroupTextTooltip"
    )}`,
    linkto: "setup-buyer-standard-group",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "setupPaymenTermsStrategies",
    title: `${translate.t("home.homeCompanySettings.paymentTermsStrategies")}`,
    body: `${translate.t("home.homeCompanySettings.strategiesTxtTooltip")}`,
    linkto: "setup-payment-terms-strategies",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** Preferences */

  {
    key: "preferencesHelpNSupport",
    title: `${translate.t("home.homeHelpSupport.title")}`,
    body: `${translate.t("home.homeHelpSupport.popoverText")}`,
    linkto: "help-support",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "preferencesManageTeam",
    title: `${translate.t("home.homeManageTeam.title")}`,
    body: `${translate.t("home.homeManageTeam.titleTooltip")}`,
    linkto: "manage-team",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "preferencesManageFile",
    title: `${translate.t("home.components.menuAccount.manageSpendFile")}`,
    body: `${translate.t(
      "home.components.menuAccount.manageSpendFileTooltip"
    )}`,
    linkto: "manage-files",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "preferencesManagePreferences",
    title: `${translate.t("home.homePreference.title")}`,
    body: `${translate.t("home.homePreference.titleTooltip")}`,
    linkto: "preferences",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "preferencesFinancialData",
    title: `${translate.t("home.homeFinancialData.title")}`,
    body: `${translate.t("home.homeFinancialData.textPopover")}`,
    linkto: "financial-data",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "preferencesCompanyInfo",
    title: `${translate.t("home.homeCompanyInfo.title")}`,
    body: `${translate.t("home.homeCompanyInfo.titleTooltip")}`,
    linkto: "company-info",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** Match */

  {
    key: "matchLocation",
    title: `${translate.t("home.overview.location")}`,
    body: `${translate.t("home.overview.locationTooltip")}`,
    linkto: "location",
    btnText: `${translate.t("common.learnMore")}`
  },

  {
    key: "matchedVsUnmatched",
    title: `${translate.t("home.overview.matchedUnmatchedData")}`,
    body: `${translate.t("global.matchedvsunmatchedTooltipPopover")}`,
    linkto: "match-data",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "includedVsExcluded",
    title: `${translate.t("home.overview.includedVsExcluded")}`,
    body: `${translate.t("global.includedVsExcludedTooltipPopover")}`,
    linkto: "match-data",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "matchedDataQuality",
    title: `${translate.t("home.match.matchedDataQualityTitle")}`,
    body: `${translate.t("home.match.matchedDataQualityTooltipPopover")}`,
    linkto: "data-quality",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** Plan */

  {
    key: "planTimeLineOptions",
    title: `${translate.t("global.timeline")}`,
    body: `${translate.t("global.timelineTooltip")}`,
    linkto: "timeline-cash-flow",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "planCashFlowOptions",
    title: `${translate.t("global.cashFlowOpportunity")}`,
    body: `${translate.t("global.cashFlowOpportunityTooltip")}`,
    linkto: "timeline-cash-flow",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "planSelectCharts",
    title: `${translate.t("global.planSelectChartsTitle")}`,
    body: `${translate.t("global.planSelectChartsPopover")}`,
    linkto: "timeline-cash-flow",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "planSummaryPhase",
    title: `${translate.t("home.plan.planPhaseSingleDimension.allPhases")}`,
    body: `${translate.t(
      "home.plan.planPhaseSingleDimension.allPhasesPopover"
    )}`,
    linkto: "plan-summary",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "planPhase",
    title: `${translate.t("home.plan.planPhaseSingleDimension.planPhase")}`,
    body: `${translate.t(
      "home.plan.planPhaseSingleDimension.planPhasePopover"
    )}`,
    linkto: "plan-phase",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "planSetupNEdit",
    title: `${translate.t("home.plan.planPhaseSingleDimension.setupNEdit")}`,
    body: `${translate.t(
      "home.plan.planPhaseSingleDimension.setupNEditPopover"
    )}`,
    linkto: "phase-setup-edit",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** Program Overview */
  {
    key: "programFinancingPresent",
    title: `${translate.t("global.financing")}`,
    body: `${translate.t("global.financingSCFProgramOverviewTooltip")}`,
    linkto: "program-financing-present",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "programPaymentTerms",
    title: `${translate.t("global.paymentTermsD")}`,
    body: `${translate.t("global.paymentTermsDTooltip")}`,
    linkto: "program-payment-terms",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "programDistribution",
    title: `${translate.t("global.programDistribution")}`,
    body: `${translate.t("global.programDistributionTooltip")}`,
    linkto: "program-distribution",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "programCFOpportunity",
    title: `${translate.t("global.cashFlowOpportunity")}`,
    body: `${translate.t("global.cashFlowOpportunityTooltipPopover")}`,
    linkto: "program-cash-flow-opportunity",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "programSpendNEntities",
    title: `${translate.t(
      "home.analyze.analyzeProgramOverview.spendEntities"
    )}`,
    body: `${translate.t(
      "home.analyze.analyzeProgramOverview.spendEntitiesPopover"
    )}`,
    linkto: "spend-entities",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "programOverviewGroups",
    title: `${translate.t("home.analyze.analyzeProgramOverview.groups")}`,
    body: `${translate.t("home.analyze.analyzeProgramOverview.groupsPopover")}`,
    linkto: "groups",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** Program Waterfall */

  {
    key: "programWaterfallOverview",
    steps: [
      {
        title: `${translate.t("global.waterfallChart")}`,
        linkto: "waterfall",
        titleClass: "shepherd-title opportunity-title",
        // 1.
        // Actual
        // Pay on terms
        // Supplier parent max
        text: `
          <h4 class="mb-1 text-lg font-semibold">${translate.t(
            `global.waterfall.actual`
          )}</h4>
          <p>${translate.t(
            `home.entityCard.strategies.currentTermsTooltip`
          )}</p>

          <h4 class="mb-1 text-lg font-semibold">${translate.t(
            `global.waterfall.payOnTerms`
          )}</h4>
          <p>${translate.t(
            `home.entityCard.strategies.payOnTermsStrategyTooltip`
          )}</p>

          <h4 class="mb-1 text-lg font-semibold">${translate.t(
            `global.waterfall.parentSupplierMax`
          )}</h4>
          <p>${translate.t(
            `home.entityCard.strategies.parentSupplierMaxStrategyTooltip`
          )}</p>
        `,
        buttons: [
          {
            actionText: "next",
            action: () => {},
            text: "Next"
          }
        ]
      },
      {
        // 2.
        // Industry region standard
        // Supplier standard
        // Financing
        title: translate.t("global.waterfallChart"),
        text: `
          <h4 class="mb-1 text-lg font-semibold">${translate.t(
            `global.waterfall.industryRegionStandard`
          )}</h4>
          <p>${translate.t(
            `home.entityCard.strategies.industryRegionStandardStrategyTooltip`
          )}</p>

          <h4 class="mb-1 text-lg font-semibold">${translate.t(
            `global.waterfall.supplierStandard`
          )}</h4>
          <p>${translate.t(
            `home.entityCard.strategies.supplierStandardStrategyTooltip`
          )}</p>

          <h4 class="mb-1 text-lg font-semibold">${translate.t(
            `global.waterfall.peerGroupStandard`
          )}</h4>
          <p>${translate.t(
            `home.entityCard.strategies.peerGroupStandardStrategyTooltip`
          )}</p>

          <h4 class="mb-1 text-lg font-semibold">${translate.t(
            `global.waterfall.financing`
          )}</h4>
          <p>${translate.t(
            `home.entityCard.strategies.financingStrategyTooltip`
          )}</p>
        `,
        buttons: [
          {
            classes: "shepherd-button-secondary",
            text: "Back",
            actionText: "back"
          },
          {
            text: "Next",
            actionText: "next"
          }
        ]
      },
      {
        // 3.
        // Cash discount conversion
        // Buyer standard
        // Harmonization
        title: translate.t("global.waterfallChart"),
        text: `
          <h4 class="mb-1 text-lg font-semibold">${translate.t(
            `global.waterfall.cashDiscountConversion`
          )}</h4>
          <p>${translate.t(
            `home.entityCard.strategies.cashDiscountConversionStrategyTooltip`
          )}</p>

          <h4 class="mb-1 text-lg font-semibold">${translate.t(
            `global.waterfall.buyerStandard`
          )}</h4>
          <p>${translate.t(
            `home.entityCard.strategies.buyerStandardStrategyTooltip`
          )}</p>

          <h4 class="mb-1 text-lg font-semibold">${translate.t(
            `global.harmonization`
          )}</h4>
          <p>${translate.t(
            `home.entityCard.strategies.harmonizationTooltip`
          )}</p>
        `,
        buttons: [
          {
            classes: "shepherd-button-secondary",
            text: "Back",
            actionText: "back"
          },
          {
            text: "Next",
            actionText: "next"
          }
        ]
      },
      {
        // 4.
        // Regulatory terms
        // Payment terms target opportunity
        // Term extension cap
        title: translate.t("global.waterfallChart"),
        text: `
          <h4 class="mb-1 text-lg font-semibold">
            ${translate.t("global.regulatoryTerms")}
          </h4>
          <p>${translate.t("global.regulatoryTermsTooltip")}</p>

          <h4 class="mb-1 text-lg font-semibold">
            ${translate.t(
              "global.waterfall.paymentTermsTargetOpportunity"
            )}</h4>
          <p>
          ${translate.t("home.entityCard.strategies.opportunityTermsTooltip")}
          </p>

          <h4 class="mb-1 text-lg font-semibold">
            ${translate.t("global.waterfall.termExtensionCap")}</h4>
          <p>
          ${translate.t("global.waterfall.termExtensionCapTooltip")}
          </p>
        `,
        buttons: [
          {
            classes: "shepherd-button-secondary",
            text: "Back",
            actionText: "back"
          },
          {
            text: "Done",
            actionText: "complete"
          }
        ]
      }
    ]
  },

  /** Program Edition */

  {
    key: "programEditionTitle",
    title: `${translate.t("home.analyze.groupsConfiguration.msg7")}`,
    body: `${translate.t(
      "home.analyze.groupsConfiguration.programEditionPopover"
    )}`,
    linkto: "program-edition",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "programEditionHarmonization",
    title: `${translate.t("home.analyze.termHarmonization")}`,
    body: `${translate.t("home.analyze.termHarmonizationPopover")}`,
    linkto: "harmonization-group",
    btnText: `${translate.t("common.learnMore")}`
  },
  {
    key: "programEditionFinancing",
    title: `${translate.t("home.analyze.externalFinancing")}`,
    body: `${translate.t("home.analyze.externalFinancingPopover")}`,
    linkto: "financing-group",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** Plan */

  {
    key: "planPhaseBuyerleverage",
    title: `${translate.t(
      "home.entityCard.advancedTooltip.opportunity.buyerLeverageTitle"
    )}`,
    body: `${translate.t(
      "home.entityCard.advancedTooltip.opportunity.buyerLeverage"
    )}`,
    linkto: "buyer-leverage-materiality",
    btnText: `${translate.t("common.learnMore")}`
  },

  /** Analyze */

  {
    key: "analyzeBuyerLeverage",
    title: `${translate.t(
      "home.entityCard.advancedTooltip.opportunity.buyerLeverageTitle"
    )}`,
    body: `${translate.t(
      "home.entityCard.advancedTooltip.opportunity.buyerLeverage"
    )}`,
    linkto: "buyer-leverage-materiality",
    btnText: `${translate.t("common.learnMore")}`
  }
];
