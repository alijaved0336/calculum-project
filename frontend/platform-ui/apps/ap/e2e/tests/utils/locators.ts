export const locators = {
  pilotSection: {
    divPilotSection: "div.pilot-section",
  },
  modals: {
    customModal:
      "#calculum-modal-container > div > div.row.mt-2 > div > button.btn.btn-primary.font-md.text-capitalize",
  },
  filter: {
    filterBtn: 'svg[data-testid="filter-icon"]',
    clearFilterBtn:
      'button.btn.btn-primary.font-md:has(span:text("Clear All"))',
    field: {
      acceptanceType: "span.mr-1.text-option:has-text('Acceptance Type')",
      actualPaymentTerms:
        "span.mr-1.text-option:has-text('Actual Payment Terms')",
      buyer: "span.mr-1.text-option:has-text('Buying Entity')",
      buyerLeverage: "span.mr-1.text-option:has-text('Buying Entity Leverage')",
      commodity: "span.mr-1.text-option:has-text('Commodity')",
      companySize: "span.mr-1.text-option:has-text('Company Size')",
      contractualWithCashDiscount:
        "span.mr-1.text-option:has-text('Contractual With Cash Discount')",
      contractualWithoutCashDiscount:
        "span.mr-1.text-option:has-text('Contractual Without Cash Discount')",
      country: "span.mr-1.text-option:has-text('Country')",
      creditRating: "span.mr-1.text-option:has-text('Credit Rating')",
      currency: "span.mr-1.text-option:has-text('Currency')",
      inclusiveDiversityOwnedBusiness:
        "span.mr-1.text-option:has-text('Inclusive Diversity Owned Business')",
      industry: "span.mr-1.text-option:has-text('Industry')",
      region: "span.mr-1.text-option:has-text('Region')",
      sme: "span.mr-1.text-option:has-text('SME')",
      spendVolume: "span.mr-1.text-option:has-text('Spend Volume')",
      transactionType: "span.mr-1.text-option:has-text('Transaction Type')",
      scfVcardDiscounting: {
        fieldBtn:
          'div.options-menu-filters span:text("SCF, Vcard & Discounting")',
        programApplied: 'span.k-panelbar-item-text:text("Program Applied")',
      },
      planAndManage: {
        fieldBtn: 'div.options-menu-filters span:text("Plan & Manage")',
      },
      spendVolumeAndPaymentTerms: {
        fieldBtn:
          'div.options-menu-filters span:text("Spend Volume & Payment Terms")',
        currency: 'span.k-panelbar-item-text:text("Invoice Currencies")',
      },
      opportunity: {
        fieldBtn: 'div.options-menu-filters span:text("Opportunity")',
        nineBoxes: {
          termExtension:
            'span.k-panelbar-item-text:text("9 Boxes Term Extension")',
          vCard: 'span.k-panelbar-item-text:text("9 Boxes Vcard")',
          financing: 'span.k-panelbar-item-text:text("9 Boxes Financing")',
          scf: 'span.k-panelbar-item-text:text("9 Boxes SCF")',
        },
      },
    },
    operators: {
      isEqualTo: "span.mr-1.text-option:has-text('Is equal to')",
      isGreaterThan: "span.mr-1.text-option:has-text('Is greater than')",
      isGreaterThanOrEqualTo:
        "span.mr-1.text-option:has-text('Is greater than or equal to')",
      isLessThan: "span.mr-1.text-option:has-text('Is less than')",
      isLessThanOrEqualTo:
        "span.mr-1.text-option:has-text('Is less than or equal to')",
      isNotEqualTo: "span.mr-1.text-option:has-text('Is not equal to')",
    },
    logicalOperators: {
      and: "span.mr-1.text-option:has-text('AND')",
      or: "span.mr-1.text-option:has-text('OR')",
    },
    saveChanges: 'button.btn.btn-primary.font-md:has-text("Show Results")',
    // The group condition editor (CalculumAnalyzeFilter, opened from Buyer
    // Standard / Card Groups / Financing with the title "Condition Settings")
    // is a different panel from the global filters one above: its button reads
    // "Save", or "Update" when editing an existing condition, never "Show
    // Results". Match its own class so neither label breaks the lookup.
    saveCondition: "button.btn.btn-primary.font-md.save-changes-filter",
  },
  dropdown: {
    fieldSelection: ".custom-dropdown-field-selection",
    conditionOneSelection: ".custom-dropdown-condition-one-selection",
    conditionLogicalOperator: ".custom-dropdown-condition-logical-selection",
    conditionTwoSelection: ".custom-dropdown-condition-two-selection",
  },
  list: {
    chooseColumns: ".choose-columns-grid-button",
    openGridOptions: ".open-grid-options",
    exportToExcel: ".export-grid-button",
    tabs: {
      parents: 'span.k-link:text("Parents")',
      spends: 'span.k-link:text("Spend Lines")',
      suppliers: 'span.k-link:text("Suppliers")',
    },
  },
  analyze: {
    list: {
      itself: '#analyze-header-menu >> .btn:has-text("List")',
      // The level tabs are addressed by role from `AnalyzeUtils`: only the
      // tabstrip of the grid the user is looking at reaches the accessibility
      // tree, because the other two grids stay mounted behind
      // `.hidden-grid { display: none }`.
    },
    overview: {
      itself: '#analyze-header-menu >> .btn:has-text("Overview")',
    }
  },
  entityCard: {
    closeCard: '[data-testid="close-icon"]',
    // Closes the entity card modal itself. Unlike `closeCard`, which matches the
    // close icon of every CalculumClose instance in the page, this id is
    // rendered only by the two EntityCardOverview instances that pass
    // `has-id` (CalculumClose.vue), so it addresses the entity card and nothing
    // else. Keep every caller pointing here: the id lives on a bound attribute
    // and has been silently dropped before (commit 29b0ba8a37), so it must stay
    // changeable in one place.
    closeButton: "#entity-close-modal",
    menu: {
      companyDetails: "#company-details-tab",
      corporateTree: "#corporate-tab",
      kebabMenu: ".name-entity >> svg.three-dots-icon.my-auto",
      notes: "span.d-flex.text-gray-500 >> span:has-text('Notes')",
      opportunity: "#opportunity-tab",
      ratingMetrics: "#ratings-and-metrics-tab",
      calculator: "#entity-card-calculator",
      results: "#results-tab",
    },
    oportunity: {
      adabotChart: ".charts-side",
      adabotChartLine: ".charts-side >> .line-chart",
      spendsTab: "li >> .inProgram",
    },
    calculator: {
      matrixTab: "#matrix-calculator",
      accordionTab: "#accordion-calculator",
    },
  },
  grid: {
    list: {
      checkbox:
        ".k-table-th.k-header.k-grid-header-sticky.filter-options >> .k-checkbox.k-checkbox-md.k-rounded-md",
    },
  },
  headerMenu: {
    programHeader: {
      allPrograms: 'a.all-programs-btn:has-text("All Programs")',
      keebabMenuButton: "#closeoptions",
      dropDown: {
        edit: '.fix-menu.collapse.show >> span:has-text("Edit")',
        activateProgram:
          "li:nth-child(5) > div > div > span.label-status.ml-2.cursor-pointer",
        programDetails: "#options-menu > ul > li:nth-child(9) > button > span",
        options: ".btn.btn-simple.btn-simple--icon.link.link--icon.collapsed", //#closeoptions > span > svg
      },

      list: 'a.btn:has-text("List")',
      nineBoxes: "#ninebox_cf",
      nineBoxesFinancing: "#ninebox_financing",
      overview: 'a.btn:has-text("Overview")',
      waterfall: 'a.btn:has-text("Waterfall")',
    },
    topMenu: {
      userMenu: "button#user-menu",
      adminConsole:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Admin Console")',
      companyInfo:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Company Info")',
      dropDownMenu: "button#user-menu",
      financialData:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Financial Data")',
      manageFiles:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Manage Files")',
      helpAndSupport:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Help & Support")',
      logout:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Logout")',
      manageTeam:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Manage Users")',
      manageTemplates:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Manage Templates")',
      preferences:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Preferences")',
      releases:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Releases")',
      training:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Training")',
      valueProposition:
        'div.dropdown-header-menu.dropdown-header-menu__user >> span:has-text("Value Proposition")',
    },
  },
  plan: {
    addPlan: 'div.cursor-pointer:has-text("NEW PLAN")',
    cancelPlanCreation: '.btn.outline-secondary-btn:has-text("CANCEL")',
    newPhase: 'div.new-plan:has-text("NEW PHASE")',
    phasePopupSave: "div.row.mt-2 > div > button.btn.btn-primary.font-md",
    phasePopupSelectAllRecords: "div.k-grid-aria-root thead input.k-checkbox",
    phasePopupClose: "svg.btn-close[data-testid='close-icon']"
  },
  program: {
    addPhase: 'button:has-text("ADD PHASE")',
    addPlan: '.new-plan >> div >> span:has-text("New Plan")',
    card: ".card-v2",
    confirm: {
      save: '.btn.btn-primary.font-md:has-text("Save")',
    },
    edition: {
      list: {
        headers: {
          financing:
            'span.option-edit.tooltip-main-options.options-cell:text("Financing Group")',
          harmonization: 'span:has-text("Harmonization Groups")',
          includeExclude:
            'span.option-edit.tooltip-main-options.options-cell:text("Include / Exclude")',
          moderateButton:
            "span.option-edit.tooltip-main-options.options-cell >> ul >> li >> button.moderate-btn",
          pencilIcon:
            "thead >> tr >> nth=0 >> th >> nth=0 >> .k-icon.k-svg-i-more-vertical",
          supplierButton: ".list-options >> nth=1",
        },
      },
      toolbar: {
        addHarmonization: '.btn >> span:text("Add Harmonization")',
        editHarmonization: '.btn >> span:text("Edit Harmonization")',
      },
    },
    editPhase: {
      edit: ".fix-menu >> ul >> nth=0 >> a",
      options: ".options-col >> nth=1 >> .options-for-phase",
    },
    deletePlan: '.btn-action-analyze-program-card >> span:has-text("Delete")',
    menuCard: ".icon-svg__button-18",
    nextButton: 'button:has-text("Next")',
    nextButtonPlan: 'button:has-text("Save")',
    nextButtonPlanSpan:
      "#container-main-id > div.sub-main-sections > div > div > div > div.card-body > div:nth-child(2) > div.col-12.d-flex.actions-buttons.mt-10 > button",
    saveButton:
      '.form-group > .row > .col-xl-6 > label > button:has-text("Save")',
    showProgramCF: "div.card-v2 >> .btn.btn-primary.font-md.show-cashFlow-btn",
    list: "a#program_list",
    supplierPriorization:'a#ninebox_cf',
    financing9Boxes:'a#ninebox_financing',
  },
  sidebar: {
    analyze: '.user-sidebar >> .user-sidebar-item >> span:text("Analyze")',
    manage: '.user-sidebar >> .user-sidebar-item >> span:text("Manage")',
    compare: '.user-sidebar >> .user-sidebar-item >> span:text("Compare")',
    entities: '.user-sidebar >> .user-sidebar-item >> span:text("Suppliers")',
    home: '.user-sidebar >> .user-sidebar-item >> span:text("Home")',
    match: '.user-sidebar >> .user-sidebar-item >> span:text("Match")',
    plan: '.user-sidebar >> .user-sidebar-item >> span:text("Plan")',
    program: '.user-sidebar >> .user-sidebar-item >> span:text("Opportunity")',
    settings: '.user-sidebar >> .user-sidebar-item >> span:text("Setup")',
  },
  manageView: {
    manageOverview: "#manage-overview-tab",
    manageEmailNegotiations: "#manage-email-negotiations-tab",
  },
  userMenu: {
    adminConsole: {
      createCompany:
        '.menu__link.link.link--icon.link--special >> span:text("Create Company")',
      dataController: 'li.menu__item >> span:text("Data")',
      listCompanies: 'li.menu__item >> span:text("Companies")',
      itself: 'a.dropdown-item >> span:text("Admin Console")',
      data: {
        main: '.menu__link.link.link--icon.link--special >> span:text("Data")',
        uploadData: 'span.k-link:text("Upload Data")',
        dataChanges: 'span.k-link:text("Data Change")',
        downloadData: 'span.k-link:text("Download Data")',
      },
      uiGroups: 'li.menu__item >> span:text("Groups")',
      clusterController: 'li.menu__item >> span:text("Clusters")',
      userPanel: 'li.menu__item >> span:text("User Panel")',
      companyView: {
        saveChanges:
          '.btn.btn-primary.font-md.text-capitalize:has-text("Save")',
      },
      uploadInvitations:
        '.menu__link.link.link--icon.link--special >> span:text("Upload Invitations")',
    },
  },
  navigationMenu: {
    // Main navigation container
    container: 'nav.menu.menu__sidebar',
    menuList: 'nav.menu.menu__sidebar ul.menu__ul',
    
    // Individual menu items - using text-based selectors for reliability
    companies: 'li.menu__item >> span:text("Companies")',
    uiGroups: 'li.menu__item >> span:text("Groups")',
    data: 'li.menu__item >> span:text("Data")',
    statistics: 'li.menu__item >> span:text("Statistics")',
    audit: 'li.menu__item >> span:text("Audit")',
    release: 'li.menu__item >> span:text("Release")',
    adminProcess: 'li.menu__item >> span:text("Admin Process")',
    clusters: 'li.menu__item >> span:text("Clusters")',
    spends: 'li.menu__item >> span:text("Spends")',
    uploadInvitations: 'li.menu__item >> span:text("Upload Invitations")',
    userPanel: 'li.menu__item >> span:text("User Panel")',
    
    // Alternative selectors using CSS nth-child for robustness
    byPosition: {
      companies: 'li.menu__item:nth-child(1) >> span',
      uiGroups: 'li.menu__item:nth-child(2) >> span',
      data: 'li.menu__item:nth-child(3) >> span',
      statistics: 'li.menu__item:nth-child(4) >> span',
      audit: 'li.menu__item:nth-child(5) >> span',
      release: 'li.menu__item:nth-child(6) >> span',
      adminProcess: 'li.menu__item:nth-child(7) >> span',
      clusters: 'li.menu__item:nth-child(8) >> span',
      spends: 'li.menu__item:nth-child(9) >> span',
      uploadInvitations: 'li.menu__item:nth-child(10) >> span',
      userPanel: 'li.menu__item:nth-child(11) >> span',
    },
    
    // Active menu item selector
    activeItem: 'li.menu__item a.menu__link.active',
    
    // Menu link selectors (includes both icon and text)
    menuLinks: {
      companies: 'li.menu__item >> a.menu__link >> span:text("Companies")',
      uiGroups: 'li.menu__item >> a.menu__link >> span:text("Groups")',
      data: 'li.menu__item >> a.menu__link >> span:text("Data")',
      statistics: 'li.menu__item >> a.menu__link >> span:text("Statistics")',
      audit: 'li.menu__item >> a.menu__link >> span:text("Audit")',
      release: 'li.menu__item >> a.menu__link >> span:text("Release")',
      adminProcess: 'li.menu__item >> a.menu__link >> span:text("Admin Process")',
      clusters: 'li.menu__item >> a.menu__link >> span:text("Clusters")',
      spends: 'li.menu__item >> a.menu__link >> span:text("Spends")',
      uploadInvitations: 'li.menu__item >> a.menu__link >> span:text("Upload Invitations")',
      userPanel: 'li.menu__item >> a.menu__link >> span:text("User Panel")',
    },
  },
  settings: {
    opportunityVisibilitySection: "#show-opportunity-visibility-section",
    paymentTermsStrategiesSection: "#show-strategies-section",
    showOpportunityVisibilitySection: "#show-opportunity-visibility-section",
    showSupplierStrategyVisibility: "#show-supplier-strategy-visibility",
    paymentTermsStrategiesSectionOpen:
      "#show-strategies-section .fa-chevron-up",
    paymentTermsStrategies: 'a:has-text("Payment Terms & Strategies")',
    vCard: {
      tab: 'a:has-text("Vcard")',
      addGroup: '.btn.outline-secondary-btn:has-text("Add Group")',
      enableSwitch: "span.slider.round",
      saveBtn: '.btn.btn-primary.font-md:has-text("Save")',
    },
    buyerStandardGroup: {
      addGRoup: '.btn.outline-secondary-btn:has-text("Add Group")',
      // Keyed off the tab id, not its label: the Setup tab was relabelled from
      // "Buying Entity Standard Group" to "Buyer Standard Group"
      // (HomeCompanySettings.vue:153, i18n home.homeCompanySettings.buyerStandardGroup),
      // so the old text match never resolved and every caller timed out on the click.
      buyerTab: "a#setup-buyer-standard",
      paymentCycleTab: 'a:has-text("Payment Cycle")',
      save: '.btn.btn-primary:has-text("Save")',
      delete: '.btn.btn-primary:has-text("Delete")',
    },
    dropdownsMoreSettings: {
      //this is index dropdowns because they don't have id but yes the same text
      name: "More Settings",
      parenSupplierMax: 1,
      supplierStandard: 2,
    },
    harmonizationGroups: "#show-harmonization-groups",
    financingRate: "#show-financing-rate",
    financingGroups: "#show-financing-groups",
    // Cash Flow tab (WI#16637). The tab is keyed off its id, not its label:
    // it was renamed from "Payment Float" to "Cash Flow"
    // (HomeCompanySettings.vue tabConfigs, i18n home.homeCompanySettings.cashFlowTabTitle).
    cashFlow: {
      tab: "a#setup-cash-flow",
      // Collapsible header of the Cash Flow Calculation section; also the only
      // stable hook that tells the two cards of the tab apart.
      calculationSectionHeader: "#show-adp-visibility",
      calculationCard: ".card:has(#show-adp-visibility)",
      calculationSaveButton:
        ".card:has(#show-adp-visibility) .actions-buttons button.btn-primary",
      // The real radio inputs are `display: none` (_main.scss .rounded-checkbox
      // input), so they can be asserted with toBeChecked but never clicked.
      // Selection goes through the option label, which carries the @change handler.
      averageDaysPaidRadio:
        '.card:has(#show-adp-visibility) input.styled-checkbox[type="radio"][value="show"]',
      contractualRadio:
        '.card:has(#show-adp-visibility) input.styled-checkbox[type="radio"][value="hide"]',
      averageDaysPaidOption:
        '.card:has(#show-adp-visibility) .disabled-button:has(input[value="show"]) .flex-column',
      contractualOption:
        '.card:has(#show-adp-visibility) .disabled-button:has(input[value="hide"]) .flex-column',
      // Shown by HomeCompanySettings while the spend file is recalculating; the
      // whole Setup page is read-only until it clears.
      recalculationAlert: ".alert-warning-custom",
      // The Payment Float card has no id; it is the only card of the tab whose
      // text carries the section name, so filtering on it is unambiguous.
      paymentFloatCard: '.card:not(:has(#show-adp-visibility)):has-text("Payment Float")',
      paymentFloatHeader:
        '.card:not(:has(#show-adp-visibility)):has-text("Payment Float") .card-body > .row',
      paymentFloatSaveButton:
        ".payment-cycle-content .actions-buttons button.btn-primary",
      paymentCycleSelect: "#selectPaymentCycle",
      paymentCycleDays: "#paymentCycleDays",
      // Rendered by EntityTermsChartLine, BarsComponent and BarsComponentNew
      // only while the basis is Average Days Paid.
      avgDaysPaidMarker: ".avg-days-paid",
      historyToggle: '.scf-badge:has-text("PT History")',
      historyGridHeader: '.list-historical .k-table-th:has-text("Avg Days Paid")',
      historyChartLegend: 'span.legend-text:has-text("Avg Days Paid")'
    }
  },
  navbar: {
    spendFileDropdown: {
      container: "#spendfile-dropdown-navbar",
      dropdown: ".custom-spendfile-dropdown",
      // The navbar options panel was renamed from .dropdown-options to
      // .dropdown-options-navbar (HomeNavbar.vue, commit 955e0b890a
      // "fix fonts in AR and clean CSS"); the design-system
      // SearchableDropdown keeps the old .dropdown-options class.
      options: ".custom-spendfile-dropdown .dropdown-options-navbar",
      item: ".custom-spendfile-dropdown .dropdown-item",
      // Relative to `item`: the "<name> (Ver. n)" label of one option
      // (HomeNavbar.vue, `version.nameFormatted`).
      itemName: "span.name",
      selected: ".custom-spendfile-dropdown .dropdown-selected span",
      label: "label:has-text=('Spend File (Version)')"
    },
    companyDropdown: {
      container: "#company-dropdown-navbar",
      dropdown: ".custom-company-dropdown",
      // Same .dropdown-options-navbar rename as the spend file dropdown.
      options: ".custom-company-dropdown .dropdown-options-navbar",
      item: ".custom-company-dropdown .dropdown-item",
      selected: ".custom-company-dropdown .dropdown-selected span"
    },
    currencyDropdown: {
      container: ".custom-currency-dropdown",
      options: ".custom-currency-dropdown .currency-item-container",
      selected: ".custom-currency-dropdown .dropdown-selected span"
    }
  },
  urls: {
    includesAnalyze: "/analyze",
  },
};
