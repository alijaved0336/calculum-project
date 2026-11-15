<template>
<div class="row">
  <div class="col col-xl-1-5">
    <div class="col col-12 px-0 d-flex h-100">
      <div class="card card--auto-height shadow-none">
        <div class="card-body d-flex flex-column justify-content-between px-2 py-2">
          <div class="row mb-2">
            <div class="col-12 d-flex align-items-top gap-2">
              <h5 class="text-sm font-base d-flex mb-0" style="min-height: 1.5em;"><span>Sales Volume</span></h5>
              <CalculumTooltipIconNew :infoText="'Company Credit Rating'"></CalculumTooltipIconNew>
            </div>
          </div>
          <div class="row d-flex justify-content-center align-items-center">
            <div class="col-6">
              <div class="d-flex flex-column px-1 justify-content-center gap-2">
                <div>
                  <p class="mb-0 mx-auto font-semibold text-5xl truncate-text">730.2k</p>
                </div>
              </div>
            </div>
            <div class="col-6">
              <div class="d-flex flex-column px-1 justify-content-start gap-2">
                <div>
                  <div class="text-sm d-flex font-semibold">Parent</div>
                </div>
                <div>
                  <div class="text-base mb-0 font-semibold">1.4m</div>
                </div>
              </div>
            </div>
          </div>
          <div class="row mt-1">
            <div class="d-flex justify-content-between ml-auto">
              <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs" style="opacity: 0;">0</span>
                <CalculumTooltipIconNew :infoText="''"></CalculumTooltipIconNew>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col col-6 col-xl-3">
    <div class="col col-12 px-0 d-flex h-100">
      <div class="card card--auto-height shadow-none d-flex flex-row">
        <div class="card-body d-flex flex-column justify-content-between px-2 py-2 col-6">
          <div class="row mb-2">
            <div class="col-12 d-flex align-items-top gap-2">
              <h5 class="text-sm font-base d-flex mb-0" style="min-height: 1.5em;"><span>Sales Materiality</span></h5>
              <CalculumTooltipIconNew :infoText="'Test'"></CalculumTooltipIconNew>
            </div>
          </div>
          <div class="row d-flex justify-content-center align-items-center">
            <div class="col-6">
              <div class="d-flex flex-column px-1 justify-content-center gap-2">
                <div>
                  <p class="mb-0 mx-auto font-semibold text-5xl truncate-text">Low</p>
                </div>
              </div>
            </div>
            <div class="col-6">
              <div class="d-flex flex-column px-1 justify-content-start gap-2">
                <div>
                  <div class="text-sm d-flex font-semibold"></div>
                </div>
                <div>
                  <div class="text-base mb-0 font-semibold"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="row mt-1">
            <div class="d-flex justify-content-between ml-auto">
              <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs">Show Details</span>
                <CalculumTooltipIconNew :infoText="'footer Tooltip'"></CalculumTooltipIconNew>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 pl-4">
          <div class="card-body d-flex flex-column justify-content-between px-2 py-2 h-100" style="background-color: #f9fafb; border-radius: 0.25rem;">
            <div class="row mb-2">
              <div class="col-12 d-flex align-items-top gap-2">
                <h5 class="text-sm font-base d-flex mb-0" style="min-height: 1.5em;"><span>Supplier Entity(ies)</span></h5>
                <CalculumTooltipIconNew :infoText="''"></CalculumTooltipIconNew>
              </div>
            </div>
            <div class="row d-flex justify-content-center align-items-center">
              <div class="col-12">
                <div class="d-flex flex-column px-1 justify-content-center gap-2">
                  <div>
                    <p class="mb-0 mx-auto font-semibold text-2xl truncate-text">Texas A&M Canada</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="row mt-2">
              <div class="d-flex justify-content-between ml-auto">
                <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs" style="opacity: 0;">0</span>
                  <CalculumTooltipIconNew :infoText="''"></CalculumTooltipIconNew>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col col-xl-1-5 col-3">
    <div class="col col-12 px-0 d-flex h-100">
      <div class="card card--auto-height shadow-none">
        <div class="card-body d-flex flex-column justify-content-between px-2 py-2">
          <div class="row mb-2">
            <div class="col-12 d-flex align-items-top gap-2">
              <h5 class="text-sm font-base d-flex mb-0" style="min-height: 1.5em;"><span>Invoice Currency</span></h5>
              <CalculumTooltipIconNew :infoText="'Invoice Currency tooltip text'"></CalculumTooltipIconNew>
            </div>
          </div>
          <div class="row d-flex justify-content-center align-items-center">
            <div class="col-12">
              <div class="d-flex flex-column px-1 justify-content-center gap-2">
                <div>
                  <p class="mb-0 mx-auto font-semibold text-5xl truncate-text">USD</p>
                </div>
              </div>
            </div>
          </div>
          <div class="row mt-1">
            <div class="d-flex justify-content-between ml-auto">
              <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs" style="opacity: 0;">0</span>
                <CalculumTooltipIconNew :infoText="''"></CalculumTooltipIconNew>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col col-6 col-xl-3">
    <div class="col col-12 px-0 d-flex h-100">
      <div class="card card--auto-height shadow-none d-flex flex-row">
        <div class="card-body d-flex flex-column justify-content-between px-2 py-2 col-6">
          <div class="row mb-2">
            <div class="col-12 d-flex align-items-top gap-2">
              <h5 class="text-sm font-base d-flex mb-0" style="min-height: 1.5em;"><span>Credit Limit</span></h5>
              <CalculumTooltipIconNew :infoText="''"></CalculumTooltipIconNew>
            </div>
          </div>
          <div class="row d-flex justify-content-center align-items-center">
            <div class="col-6">
              <div class="d-flex flex-column px-1 justify-content-center gap-2">
                <div>
                  <p class="mb-0 mx-auto font-semibold text-5xl truncate-text">96.2k</p>
                </div>
              </div>
            </div>
            <div class="col-6">
              <div class="d-flex flex-column px-1 justify-content-start gap-2">
                <div>
                  <div class="text-sm d-flex font-semibold">Parent</div>
                </div>
                <div>
                  <div class="text-base mb-0 font-semibold">345.7k</div>
                </div>
              </div>
            </div>
          </div>
          <div class="row mt-1">
            <div class="d-flex justify-content-between ml-auto">
              <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs"></span>
                <CalculumTooltipIconNew :infoText="''"></CalculumTooltipIconNew>
              </div>
            </div>
          </div>
        </div>
        <div class="col-3 px-0">
          <div class="card-body d-flex flex-column justify-content-between px-2 py-2 h-100">
            <div class="row mb-2">
              <div class="col-12 d-flex align-items-top gap-2">
                <h5 class="text-sm font-base d-flex mb-0" style="min-height: 1.5em;"><span>Credit Insurance</span></h5>
                <CalculumTooltipIconNew :infoText="''"></CalculumTooltipIconNew>
              </div>
            </div>
            <div class="row d-flex justify-content-center align-items-center">
              <div class="col-12 px-0">
                <div class="d-flex flex-column justify-content-center gap-2">
                  <div class="d-flex align-items-center gap-2">
                    <div class="insured-image-wrapper"><img class="insured-image" src="@/resources/assets/images/Insured.png" alt="Canada Flag"/></div><span class="text-base font-semibold">Insured</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="row mt-2">
              <div class="d-flex justify-content-between ml-auto">
                <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs" style="opacity: 0;">0</span>
                  <CalculumTooltipIconNew :infoText="''"></CalculumTooltipIconNew>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-3 pl-4 pr-2">
          <div class="card-body d-flex flex-column justify-content-between px-2 py-2 h-100" style="background-color: #f9fafb; border-radius: 0.25rem;">
            <div class="row mb-2">
              <div class="col-12 d-flex align-items-top gap-2">
                <h5 class="text-sm font-base d-flex mb-0" style="min-height: 1.5em;"><span>Credit Rating</span></h5>
                <CalculumTooltipIconNew :infoText="''"></CalculumTooltipIconNew>
              </div>
            </div>
            <div class="row d-flex justify-content-center align-items-center">
              <div class="col-12">
                <div class="d-flex flex-column px-1 justify-content-center gap-2">
                  <div>
                    <p class="mb-0 mx-auto font-semibold text-5xl truncate-text">AA-</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="row mt-2">
              <div class="d-flex justify-content-between ml-auto">
                <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs" style="opacity: 0;">0</span>
                  <CalculumTooltipIconNew :infoText="''"></CalculumTooltipIconNew>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col col-6 col-xl-3">
    <div class="col col-12 px-0 d-flex h-100">
      <div class="card card--auto-height shadow-none">
        <div class="card-body d-flex flex-column justify-content-between px-2 py-2">
          <div class="row mb-2">
            <div class="col-12 d-flex align-items-top gap-2">
              <h5 class="text-sm font-base d-flex mb-0" style="min-height: 1.5em;"><span>Parent Organization</span></h5>
              <CalculumTooltipIconNew :infoText="'Parent Organization tooltip text'"></CalculumTooltipIconNew>
            </div>
          </div>
          <div class="row d-flex justify-content-center align-items-center">
            <div class="col-12">
              <div class="d-flex flex-column px-1 justify-content-center gap-2">
                <div>
                  <p class="mb-0 mx-auto font-semibold text-2xl truncate-text">Automatic Data Processing, Inc</p>
                </div>
              </div>
            </div>
          </div>
          <div class="row mt-1">
            <div class="d-flex justify-content-between ml-auto">
              <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs">Show Details</span>
                <CalculumTooltipIconNew :infoText="'text!'"></CalculumTooltipIconNew>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row mb-8">
  <div class="col d-flex flex-column gap-4">
    <div class="text-sm font-base d-flex mb-0">Selected Options</div>
    <div class="d-flex gap-2">
      <div class="main-pill-container d-flex font-semibold" :class="{ 'main-pill-container--active': firstRowIsActivated }"><span @click="firstRowIsActivated = !firstRowIsActivated">Supply Chain Finance</span></div>
      <div class="main-pill-container d-flex font-semibold" :class="{ 'main-pill-container--active': secondaryRowIsActivated }"><span @click="secondaryRowIsActivated = !secondaryRowIsActivated">Late Payment Interest</span></div>
      <div class="main-pill-container d-flex font-semibold main-pill-container--disabled">Risk Mitigation</div>
      <div class="main-pill-container d-flex font-semibold main-pill-container--disabled">Early Payment Discount</div>
      <div class="main-pill-container d-flex font-semibold main-pill-container--disabled">Dynamic Discounting</div>
      <div class="main-pill-container d-flex font-semibold main-pill-container--disabled">Receivable Finance</div>
    </div>
  </div>
</div>
<div class="row">
  <div class="col-12">
    <div class="card card--auto-height shadow-none">
      <div class="card-body d-flex flex-column justify-content-between gap-6">
        <div class="d-flex align-items-center justify-content-between gap-4">
          <div class="d-flex align-items-center gap-2"><span class="text-5xl font-semibold">Supply Chain Finance</span>
            <CalculumTooltipIconNew :infoText="'text!'"></CalculumTooltipIconNew>
          </div>
          <div class="d-flex align-items-center gap-4">
            <button class="button button--base font-semibold" @click="firstRowIsOpened = !firstRowIsOpened"><span v-if="!firstRowIsOpened">Show More</span><span v-else>Show Less</span></button>
            <div class="d-flex gap-4 align-items-center">
              <div class="header-title text-2xl font-semibold"><span v-if="firstRowIsActivated">Strategy Activated</span><span v-else>Strategy Deactivated</span></div>
              <SwitcherBase v-model:checked="firstRowIsActivated"></SwitcherBase>
            </div>
          </div>
        </div>
        <div class="row d-flex">
          <div class="col-6 d-flex">
            <div class="card card--auto-height shadow-none m-0" style="background: #f9fafb">
              <div class="card-body d-flex flex-column justify-content-between">
                <TripleCardComponent :isSuccess="false" :isInnerCard="true" :title1="'Payment Terms'" :tooltipText1="'tooltip Text'" :title2="'Proposed Discount Rate'" :tooltipText2="'tooltip Text 2'" :firstItemTitle="'Contractual'" :firstItemMain="'60'" :firstItemTooltip="''" :firstItemConclusion="'Past dues: 14'" :secondItemTitle="'Opportunity'" :secondItemMain="'7'" :secondItemTooltip="''" :secondItemConclusion="'Past dues: -'" :thirdItemTitle="'APR'" :thirdItemMain="'0.67%'" :thirdItemTooltip="'Test tooltip'" :thirdItemConclusion="''" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" @calculator-click="handleCalculatorClick"></TripleCardComponent>
              </div>
            </div>
          </div>
          <div class="col-6 d-flex">
            <div class="card card--auto-height shadow-none m-0">
              <div class="card-body d-flex flex-column justify-content-center">
                <div class="d-flex align-items-stretch row flex-row">
                  <div class="col-4 h-auto d-flex align-items-center">
                    <div class="main-image-wrapper"><img class="main-image" src="@/resources/assets/images/chart-1.jpg" alt="Canada Flag"/></div>
                  </div>
                  <div class="col-8 d-flex flex-column gap-4">
                    <div class="text-3xl font-semibold" style="color: #9786f0;"><span>Supply Chain Finance</span></div>
                    <div class="text-base font-semibold"><span>Supplier charges late payment interest, which acts as a financial penalty. This interest serves to compensate the supplier for the impact on the cash flow.</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-12" v-if="firstRowIsOpened">
    <div class="card card--auto-height shadow-none position-relative">
      <button class="cross-box" @click="firstRowIsOpened = false">
        <div class="cross-box-line"></div>
        <div class="cross-box-line"></div>
      </button>
      <div class="card-body d-flex flex-column justify-content-between gap-6">
        <div class="row d-flex">
          <div class="col-6 d-flex">
            <div class="card card--auto-height shadow-none m-0" style="background: #f9fafb">
              <div class="card-body d-flex flex-column justify-content-start">
                <TripleCardComponent :isSuccess="true" :isInnerCard="true" :title1="'Supplier Impact'" :tooltipText1="''" :title2="''" :tooltipText2="'tooltip Text 2'" :firstItemTitle="'Cash Flow Impact '" :firstItemMain="'-'" :firstItemTooltip="'test!'" :firstItemConclusion="''" :secondItemTitle="'Interest  Gain'" :secondItemMain="'8.2k'" :secondItemTooltip="'test 2!'" :secondItemConclusion="''" :thirdItemTitle="'Economic Impact'" :thirdItemMain="'8.2k'" :thirdItemTooltip="'Test tooltip 3'" :thirdItemConclusion="''" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" @calculator-click="handleCalculatorClick"></TripleCardComponent>
                <TripleCardComponent class="mt-4" :isSuccess="true" :isInnerCard="true" :title1="''" :tooltipText1="''" :title2="''" :tooltipText2="''" :firstItemTitle="'Credit Exposure Risk'" :firstItemMain="'-'" :firstItemTooltip="'test!'" :firstItemConclusion="''" :secondItemTitle="''" :secondItemMain="''" :secondItemTooltip="''" :secondItemConclusion="''" :thirdItemTitle="''" :thirdItemMain="''" :thirdItemTooltip="''" :thirdItemConclusion="''" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" @calculator-click="handleCalculatorClick"></TripleCardComponent>
                <div class="d-flex flex-column gap-2 mt-8"></div>
              </div>
            </div>
          </div>
          <div class="col-6 d-flex">
            <div class="card card--auto-height shadow-none m-0">
              <div class="card-body d-flex flex-column justify-content-start">
                <TripleCardComponent :isSuccess="true" :isInnerCard="true" :title1="'Buyer  Impact'" :tooltipText1="''" :title2="''" :tooltipText2="''" :firstItemTitle="'Cash Flow Impact'" :firstItemMain="'-'" :firstItemTooltip="'test!'" :firstItemConclusion="''" :secondItemTitle="'Cost Impact'" :secondItemMain="'-8.2k'" :secondItemTooltip="'test 2!'" :secondItemConclusion="''" :thirdItemTitle="'Economic Impact'" :thirdItemMain="'-2.1k'" :thirdItemTooltip="'Test tooltip 3'" :thirdItemConclusion="''" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" style="flex: 0;" @calculator-click="handleCalculatorClick"></TripleCardComponent>
                <div class="d-flex flex-column gap-2 mt-8"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row">
  <div class="col-12">
    <div class="card card--auto-height shadow-none">
      <div class="card-body d-flex flex-column justify-content-between gap-6">
        <div class="d-flex align-items-center justify-content-between gap-4">
          <div class="d-flex align-items-center gap-2"><span class="text-5xl font-semibold">Late Payment Interest</span>
            <CalculumTooltipIconNew :infoText="'text!'"></CalculumTooltipIconNew>
          </div>
          <div class="d-flex align-items-center gap-4">
            <button class="button button--base font-semibold" @click="secondaryRowIsOpened = !secondaryRowIsOpened"><span v-if="!secondaryRowIsOpened">Show More</span><span v-else>Show Less</span></button>
            <div class="d-flex gap-4 align-items-center">
              <div class="header-title text-2xl font-semibold"><span v-if="secondaryRowIsActivated">Strategy Activated</span><span v-else>Strategy Deactivated</span></div>
              <SwitcherBase v-model:checked="secondaryRowIsActivated"></SwitcherBase>
            </div>
          </div>
        </div>
        <div class="row d-flex">
          <div class="col-6 d-flex">
            <div class="card card--auto-height shadow-none m-0" style="background: #f9fafb">
              <div class="card-body d-flex flex-column justify-content-between">
                <TripleCardComponent :isSuccess="false" :isInnerCard="true" :title1="'Payment Terms'" :tooltipText1="'tooltip Text'" :title2="'Proposed Late Paym. Interest'" :tooltipText2="'tooltip Text 2'" :firstItemTitle="'Contractual'" :firstItemMain="'60'" :firstItemTooltip="''" :firstItemConclusion="'Past dues: 14'" :secondItemTitle="'Opportunity'" :secondItemMain="'45'" :secondItemTooltip="''" :secondItemConclusion="'Past dues: 14'" :thirdItemTitle="'APR'" :thirdItemMain="'0.32%'" :thirdItemTooltip="'Test tooltip'" :thirdItemConclusion="''" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" @calculator-click="handleCalculatorClick"></TripleCardComponent>
              </div>
            </div>
          </div>
          <div class="col-6 d-flex">
            <div class="card card--auto-height shadow-none m-0">
              <div class="card-body d-flex flex-column justify-content-center">
                <div class="d-flex align-items-stretch row flex-row">
                  <div class="col-4 h-auto d-flex align-items-center">
                    <div class="main-image-wrapper"><img class="main-image" src="@/resources/assets/images/chart-2.png" alt="Canada Flag"/></div>
                  </div>
                  <div class="col-8 d-flex flex-column gap-4">
                    <div class="text-3xl font-semibold" style="color: #9786f0;"><span>Late Payment Interest</span></div>
                    <div class="text-base font-semibold"><span>Supplier charges late payment interest, which acts as a financial penalty. This interest serves to compensate the supplier for the impact on the cash flow.</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-12" v-if="secondaryRowIsOpened">
    <div class="card card--auto-height shadow-none position-relative">
      <button class="cross-box" @click="secondaryRowIsOpened = false">
        <div class="cross-box-line"></div>
        <div class="cross-box-line"></div>
      </button>
      <div class="card-body d-flex flex-column justify-content-between gap-6">
        <div class="row d-flex">
          <div class="col-6 d-flex">
            <div class="card card--auto-height shadow-none m-0" style="background: #f9fafb">
              <div class="card-body d-flex flex-column justify-content-start">
                <TripleCardComponent :isSuccess="true" :isInnerCard="true" :title1="'Supplier Impact'" :tooltipText1="''" :title2="''" :tooltipText2="'tooltip Text 2'" :firstItemTitle="'Cash Flow Impact '" :firstItemMain="'-'" :firstItemTooltip="'test!'" :firstItemConclusion="''" :secondItemTitle="'Interest  Gain'" :secondItemMain="'8.2k'" :secondItemTooltip="'test 2!'" :secondItemConclusion="''" :thirdItemTitle="'Economic Impact'" :thirdItemMain="'8.2k'" :thirdItemTooltip="'Test tooltip 3'" :thirdItemConclusion="''" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" @calculator-click="handleCalculatorClick"></TripleCardComponent>
                <TripleCardComponent class="mt-4" :isSuccess="true" :isInnerCard="true" :title1="''" :tooltipText1="''" :title2="''" :tooltipText2="''" :firstItemTitle="'Credit Exposure Risk'" :firstItemMain="'-'" :firstItemTooltip="'test!'" :firstItemConclusion="''" :secondItemTitle="''" :secondItemMain="''" :secondItemTooltip="''" :secondItemConclusion="''" :thirdItemTitle="''" :thirdItemMain="''" :thirdItemTooltip="''" :thirdItemConclusion="''" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" @calculator-click="handleCalculatorClick"></TripleCardComponent>
                <div class="d-flex flex-column gap-2 mt-8"></div>
              </div>
            </div>
          </div>
          <div class="col-6 d-flex">
            <div class="card card--auto-height shadow-none m-0">
              <div class="card-body d-flex flex-column justify-content-start">
                <TripleCardComponent :isSuccess="true" :isInnerCard="true" :title1="'Buyer  Impact'" :tooltipText1="''" :title2="''" :tooltipText2="''" :firstItemTitle="'Cash Flow Impact'" :firstItemMain="'-'" :firstItemTooltip="'test!'" :firstItemConclusion="''" :secondItemTitle="'Cost Impact'" :secondItemMain="'-8.2k'" :secondItemTooltip="'test 2!'" :secondItemConclusion="''" :thirdItemTitle="'Economic Impact'" :thirdItemMain="'-2.1k'" :thirdItemTooltip="'Test tooltip 3'" :thirdItemConclusion="''" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" style="flex: 0;" @calculator-click="handleCalculatorClick"></TripleCardComponent>
                <div class="d-flex flex-column gap-2 mt-8"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>
<script lang='ts'>
import { onBeforeRouteLeave } from 'vue-router'
import { toRefs, reactive, computed, onMounted, onUnmounted, defineComponent, watch, ComputedRef, ref } from 'vue'
import { translate } from '@/utils/translation'
import { useHomeStore } from '@/stores/home'
import { useAppStore } from '@/stores/app'
import { useNegotiationStatusStore } from '@/stores/negotiationStatus'
import { usePlanStore } from '@/stores/plan'
import { useNotificationsStore } from '@/stores/notifications'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useAnalyzeStore } from '@/stores/analyze'
import { useEntityCardStore } from '@/stores/entityCard'
import { useOverviewStore } from '@/stores/overview'
import { CalculumLayout, CalculumLoading } from '@ada/design-system'

//- Utils
import { StringUtils, NumberUtils } from '@/utils'
import { getNumberWithDecimals } from '@/utils/FormatData';
import useEntity from '@/modules/home/entityCard/composables/useEntity'

//- Interfaces
import { DataInterface, recentNotification } from '@/types/homeView';
import { Match, ProgramSpendInfo } from '@/types';
import HomeProgramStatusDropdown from '@/modules/home/components/HomeProgramStatusDropdown.vue'
import * as formatData from '@/utils/FormatData'

//- Components
import GeneralGaugeBar from '@/modules/components/GeneralGaugeBar.vue'
import PlanSummary from '@/modules/home/components/PlanSummary.vue'
import TripleCardComponent from '@/modules/components/cards/TripleCardComponent.vue'
import LineChartCardComponent from '@/modules/components/cards/LineChartCardComponent.vue'
import BigNumberTwoIdenticalColsNew from '@/modules/components/cards/BigNumberTwoIdenticalColsNew.vue'
import StatusesCardsScroll from '@/modules/home/manageModule/components/StatusesCardsScroll.vue'
import NoDataAvailable from '@/modules/components/NoDataAvailable.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import NotesScroll from '@/modules/home/components/NotesScroll.vue'
import RecentNotification from '@/modules/home/components/RecentNotification.vue'
import SkeletonScrollCards from '@/modules/home/components/skeletons/SkeletonScrollCards.vue'
import OverviewLocationNew from '@/modules/home/overview/components/OverviewLocationNew.vue';
import MetricsComponentNew from '@/modules/components/metrics/MetricsComponentsNew.vue';
import MetricsComponentNew3 from '@/modules/components/metrics/MetricsComponentsNew3.vue';
import { CalculumFullScreen } from "@ada/design-system";
import BarsWrapperNew from '@/modules/components/BarsWrapperNew.vue';
import CalculumTooltipIconNew from "@/modules/components/CalculumTooltipIconNew.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import SwitcherBase from '@/modules/components/switcher/SwitcherBase.vue'


// Kendo
import { Skeleton } from '@progress/kendo-vue-indicators';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import {
  Chart,
  ChartSeries,
  ChartSeriesItem,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartTooltip,
  ChartLegend,
} from '@progress/kendo-vue-charts';

/** Composables */
import useFirebase from "@/composables/firebase/useFirebase";
import useSpendFile from "@/composables/useSpendFile";
import useProgramList from "@/composables/useProgramList";
import { useUser, useModulePlan } from "@/composables";
import { useToast } from "vue-toastification";
import useApolloClient from "@/services/graphql/useApolloClient";
import { shouldShowErrorToasts } from "@/utils/axios";
import { useUserStore } from '@/stores/user'
import { useSubscribeStore } from '@/stores/subscribe'
import * as clickOutsideRelated from '@/utils/clickOutsideRelated'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'


export default defineComponent({
  name: 'ReceivablesMockup4',
  components: { TripleCardComponent, SwitcherBase, CalculumLayout, GeneralGaugeBar, HomeProgramStatusDropdown, BigNumberTwoIdenticalColsNew,LineChartCardComponent, StatusesCardsScroll, NoDataAvailable, CalculumTooltipIcon, PlanSummary, CalculumModal, Skeleton, NotesScroll, RecentNotification, SkeletonScrollCards, OverviewLocationNew, Tooltip, MetricsComponentNew, MetricsComponentNew3, CalculumFullScreen, BarsWrapperNew, Chart, ChartSeries, ChartSeriesItem, ChartCategoryAxis, ChartCategoryAxisItem, ChartValueAxis, ChartValueAxisItem, ChartTooltip, ChartLegend, iconEllipsisVertical, CalculumLoading, CalculumTooltipIconNew, SkeletonRectangle, },
  props: {
    resetStorage: { type: String, default: '0', requied: false },
    editionMode: { type: Boolean, required: false, default: false }
  },
  emits: ['change-content','change-tab'],
  setup(props, { emit }) {
    const homeStore = useHomeStore()
    const appStore = useAppStore()
    const globalFiltersStore = useGlobalFiltersStore()
    const analyzeStore = useAnalyzeStore()
    const entityCardStore = useEntityCardStore()
    const overviewStore = useOverviewStore()
    const subscribeStore = useSubscribeStore()
    const planStore = usePlanStore()
    const notificationsStore = useNotificationsStore()
    const negotiationStatusStore = useNegotiationStatusStore()
    const toast = useToast();
    const { subscribeToPrograms } = useFirebase();
    const { spendFileVersionActiveId, showOpportunityExpectedOpportunity } = useSpendFile()
    const { setSelectedProgramValues, setProgramsToDropdown } = useProgramList()
    const { entitySelectedTrackingNumber } = useEntity()
    const { user, userId, userIri, useFeatureEntityCardNewsletter } = useUser();
    const { apolloClientResetStore, isResetting } = useApolloClient();
    const userStore = useUserStore()

    let setGlobalFilter = formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied)

    const currentTab = ref('Strategy')
    const firstRowIsOpened = ref(false)
    const firstRowIsActivated = ref(false)
    const secondaryRowIsOpened = ref(false)
    const secondaryRowIsActivated = ref(false)
    const showOptions = ref(false)
    const isBadgeShowing = ref(false)
    const mockMenuOptions = ref([
      { id: 'view-details', label: 'View details' },
      { id: 'export-csv', label: 'Export CSV' },
      { id: 'share', label: 'Share report' },
      { id: 'archive', label: 'Archive' }
    ])
    const yAxisLabelsContent = (e: { value: number }) => {
      if (e.value === 0) {
        return '0';
      }

      if (Math.abs(e.value) >= 1000) {
        return `${Math.round(e.value / 1000)}k`;
      }

      return `${e.value}`;
    };
    const metricSelectionMetricSelected = ref<Match.Metric>('spendVolume')
    const matchData = ref<Match.MatchAPIResponse | null>(null)
    const countriesMap: ComputedRef<Match.CountriesMap> = computed(() => ({
      suppliers: matchData.value?.countriesMap?.suppliers ?? [],
      buyers: matchData.value?.countriesMap?.buyers ?? []
    }))
    const objData = reactive({ visibility: true })

    interface additionalInterface {
      keyMetricsComponent: number
      programPaymentTerms: {
        contractual: number | null
        current: number | null
        expected: number | null
        proposed: number | null
        paymentCycleFloat: number
        expectedFloat: number | null
      }
      programPaymentTermsLoading: boolean
    }

    const data = reactive<DataInterface & additionalInterface>({
      username: user.value?.firstName,
      loadingPrograms: false,
      selectedProgramUri: '',
      statusesInfo: [],
      selectedTabIndex: homeStore.getEntityLevelTabSelected,
      key: new Date().getUTCMilliseconds(),
      keyGauge1: new Date().getUTCMilliseconds(),
      keyGauge2: new Date().getUTCMilliseconds(),
      keyGauge3: new Date().getUTCMilliseconds(),
      keyScroll: new Date().getUTCMilliseconds(),
      keyScrollRecentchanges: new Date().getUTCMilliseconds(),
      agreedInfo: {
        start: 0,
        end: 0,
        agreed: 0,
        percentage: 0
      },
      suppliersNegotiated: {
        start: 0,
        end: 0,
        negotiated: 0,
        percentage: 0
      },
      cashFlowAchieved: {
        start: 0,
        end: 0,
        agreed: 0,
        percentage: 0
      },
      loadingGaugeInfoPaymentTerms: true,
      loadingGaugeInfocashFlowAchieved: true,
      loadingStackedBarInfo: true,
      programValues: {
        recalculationInProgress: true,
        pendingRecalculation: true,
        selectedProgramId: null,
        isBoxesRecalculating: null
      },
      dropdownProgramValues: {
        programsList: null
      },
      loadingGaugesuppliersNegotiated: true,
      programSpendInfo: {},
      loadingSuppliersNegotiated: true,
      planSummary: [],
      loadingPlanSummary: true,
      keyPlansummary: new Date().getUTCMilliseconds(),
      showModalPlanSummary: false,
      areNotesLoading: true,
      notesSummary: [],
      homeDashboardWithPrograms: false,
      keyLayout: new Date().getUTCMilliseconds(),
      keyMetricsComponent: NumberUtils.getRandomInt(),
      programPaymentTerms: {
        contractual: null,
        current: null,
        expected: null,
        proposed: null,
        paymentCycleFloat: 0,
        expectedFloat: null
      },
      programPaymentTermsLoading: true
    })


    const {
      modulePlanIsAvailable,
    } = useModulePlan();


    /** Api Calls */

    function getNotes() {
      const params = {
        userID: userId.value,
        spendFileVersion: spendFileVersionActiveId.value,
        callbackSuccess: (callbackSuccessData: any) => {
          data.notesSummary = callbackSuccessData.filter((item: any) => item.createdBy['@id'] !== userIri.value)
          data.areNotesLoading = false
        },
        callbackError: (callbackErrorData: any) => {
          data.areNotesLoading = false
        }
      }
      notificationsStore.getUserNotes(params)
    }

    function getAllPrograms() {
      data.loadingPrograms = true
      const params = {
        scope: 'all',
        marked: null,
        firstName: null,
        lastName: null,
        recalculationInProgress: false,
        spendFileVersion: spendFileVersionActiveId.value,
        callbackSuccess: (response: any) => {

          data.programValues = setSelectedProgramValues(response)
          if (StringUtils.isNullUndefinedOrEmpty(data.programValues.selectedProgramId)) {

            data.loadingGaugeInfoPaymentTerms = false
            data.loadingGaugeInfocashFlowAchieved = false
            data.loadingGaugesuppliersNegotiated = false
            data.loadingSuppliersNegotiated = false
            data.loadingPlanSummary = false
            data.programPaymentTermsLoading = false
            data.loadingPrograms = false
            return
          }

          data.dropdownProgramValues = setProgramsToDropdown(response)

          if (data.dropdownProgramValues.programsList && data.dropdownProgramValues.programsList.length >= 2) {
            data.homeDashboardWithPrograms = true //to add a extra class to the dashboard
            data.keyLayout++
          }

          subscribeToPrograms([StringUtils.removeIRI(data.programValues.selectedProgramId)])

          data.key++
          reactiveFnsByProgram()
          data.loadingPrograms = false
        },
        callbackError: () => {
          data.loadingPrograms = false
          if (shouldShowErrorToasts()) {
            toast.error(translate.t('error.server500'))
          }
        }
      }
      analyzeStore.fetchAllPrograms(params)
    }

    function getInfo(type: string) {
      const params = {
        programId: data.programValues.selectedProgramId,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        type: type,
        callbackSuccess: (response: any) => {

          switch (type) {

            case 'stats_agreed':
              data.agreedInfo = response.agreedInfo
              data.loadingGaugeInfoPaymentTerms = false
              data.keyGauge1++
              break;

            case 'stats_info':
              data.cashFlowAchieved.end = response.statusesInfo[3].total
              data.cashFlowAchieved.agreed = response.statusesInfo[3].value
              data.cashFlowAchieved.percentage = response.statusesInfo[3].percentage
              data.loadingGaugeInfocashFlowAchieved = false
              data.keyGauge2++
              break;

            case 'stats_suppliers_negotiated':

              data.suppliersNegotiated = response.suppliersNegotiated
              data.loadingGaugesuppliersNegotiated = false
              data.keyGauge3++
              break;

            default:
              data.key++
              break;
          }

        },
        callbackError: () => {
          data.loadingGaugeInfoPaymentTerms = false
          data.loadingStackedBarInfo = false
          if (shouldShowErrorToasts()) {
            toast.error(translate.t('error.server500'))
          }
        }
      }
      analyzeStore.getStatsAgreed(params)
    }


    function getPlansSummary() {
      const params = {
        programId: data.programValues.selectedProgramId,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        fullDisabled: false,
        callbackSuccess: (response: any) => {
          data.planSummary = response
          data.loadingPlanSummary = false
          data.keyPlansummary++
        },
        callbackError: () => {
          data.loadingGaugeInfoPaymentTerms = false
          data.loadingStackedBarInfo = false
          if (shouldShowErrorToasts()) {
            toast.error(translate.t('error.server500'))
          }
        }
      }
      planStore.getPlansSummaryByProgram(params)
    }

    function getProgramSpendInfo() {

      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(data.programValues.selectedProgramId)) {
        if (import.meta.env.DEV) console.log('** (getProgramSpendInfo) selectedProgramId is null or undefined');
        return;
      }

      const params = {
        programId: data.programValues.selectedProgramId,
        globalFilter: setGlobalFilter,
        fullDisabled: false,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        callbackSuccess: (response: ProgramSpendInfo) => {
          data.programSpendInfo = response
          data.loadingSuppliersNegotiated = false
          data.key++
        },
        callbackError: () => {
          // Disable loading
          // data.programSpendInfoLoading = false
        }
      }
      analyzeStore.getProgramSpendInfo(params)
    }

    async function getOverviewMapData() {
      try {
        const response = await new Promise<Match.MatchAPIResponse>((resolve, reject) => {
          overviewStore.matchDataAPIReadAll({
            spendVersion: spendFileVersionActiveId.value,
            callbackSuccess: resolve,
            callbackError: reject
          })
        })

        matchData.value = response
      } catch (error) {
        matchData.value = null
      }
    }

    async function onSelect(e: any) {
      await apolloClientResetStore();
      if (!isResetting.value) {
        data.selectedTabIndex = e;
        homeStore.setEntityLevelTabSelected(data.selectedTabIndex);
        data.keyScroll++;
      }
    }


    /** Fn to emit */

    async function changeProgram(programID: any) {
      const programInList = data.dropdownProgramValues.programsList.find(
        (x: any) => StringUtils.removeIRI(x['@id']) === StringUtils.removeIRI(programID)
      );

      if (!programInList) return;

      data.programValues.selectedProgramId = StringUtils.removeIRI(programID);
      // data.programValues.recalculationInProgress = programInList.recalculationInProgress;
      // data.programValues.pendingRecalculation = programInList.pendingRecalculation;
      entityCardStore.setSelectedProgram(data.programValues.selectedProgramId);
      subscribeToPrograms([data.programValues.selectedProgramId]);

      await apolloClientResetStore();
      if (!isResetting.value) {
        reactiveFnsByProgram();
        data.keyScroll++;
        data.keyScrollRecentchanges++;
      }
    }

    function reactiveFnsByProgram() {

      /** Reset all values */

      data.agreedInfo.start = 0
      data.agreedInfo.end = 0
      data.agreedInfo.agreed = 0
      data.agreedInfo.percentage = 0

      data.suppliersNegotiated.start = 0
      data.suppliersNegotiated.end = 0
      data.suppliersNegotiated.negotiated = 0
      data.suppliersNegotiated.percentage = 0


      data.cashFlowAchieved.start = 0
      data.cashFlowAchieved.end = 0
      data.cashFlowAchieved.agreed = 0
      data.cashFlowAchieved.percentage = 0

      data.programSpendInfo = {}

      data.keyGauge1++
      data.keyGauge2++
      data.keyGauge3++
      data.key++
      data.planSummary = []

      /** Reset all to true */

      data.loadingGaugeInfoPaymentTerms = true
      data.loadingGaugeInfocashFlowAchieved = true
      data.loadingGaugesuppliersNegotiated = true
      data.loadingPlanSummary = true
      data.loadingSuppliersNegotiated = true

      getInfo('stats_agreed')
      getInfo('stats_info')
      getInfo('stats_suppliers_negotiated')
      getPlansSummary()
      getProgramSpendInfo()
      data.programPaymentTermsLoading = true
      data.programPaymentTerms = { contractual: null, current: null, expected: null, proposed: null, paymentCycleFloat: 0, expectedFloat: null }
      getProgramPaymentTerms()
      getOverviewMapData()
    }


    /** Computed */

    const blockProgramOptions = computed(() => {
      return data.programValues.recalculationInProgress || data.programValues.pendingRecalculation
    })

    const labelForRecalculatingStatus = computed(() => {
      if (data.programValues.recalculationInProgress) {
        return translate.t('global.programInrecalculation')
      }
      if (data.programValues.pendingRecalculation) {
        return translate.t('global.pendingRecalculation')
      }
      return null
    })

    const contractualValueComputed = computed(() => {
      return typeof data.programPaymentTerms?.contractual === 'number' ? Number(data.programPaymentTerms.contractual) : null
    })

    const actualValueComputed = computed(() => {
      return typeof data.programPaymentTerms?.current === 'number' ? Number(data.programPaymentTerms.current) : null
    })

    const getPaymentCycleFloatValue = computed(() => {
      return data.programPaymentTerms?.paymentCycleFloat
    })

    const getExpectedFloat = computed(() => {
      return data.programPaymentTerms?.expectedFloat
    })

    function onMockOptionClick(item: { id: string; label: string }) {
      showOptions.value = false
    }

    function handleClick(e: MouseEvent) {
      const clickedInside = clickOutsideRelated.menuPopup(e, '.three-dots-icon', '#options-menu')

      if (clickedInside !== undefined) {
        showOptions.value = clickedInside
      }
    }

    function getProgramPaymentTerms() {
      if (StringUtils.isNullUndefinedOrEmpty(data.programValues.selectedProgramId)) return
      const params = {
        programId: data.programValues.selectedProgramId,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        fullDisabled: false,
        callbackSuccess: (response: any) => {
          data.programPaymentTerms.current = Math.round(response.currentAvgPaymentTerms)
          data.programPaymentTerms.proposed = Math.round(response.proposedAvgPaymentTerms)
          data.programPaymentTerms.contractual = response.contractualAvgPaymentTerms !== null ? Math.round(response.contractualAvgPaymentTerms) : null
          data.programPaymentTerms.expected = response.expectedAvgPaymentTerms ?? null
          data.programPaymentTerms.paymentCycleFloat = response.paymentCycleFloat ?? 0
          data.programPaymentTerms.expectedFloat = response.expectedFloat ?? null
          data.programPaymentTermsLoading = false
        },
        callbackError: () => {
          data.programPaymentTermsLoading = false
        }
      }
      analyzeStore.getProgramPaymentTerms(params)
    }


    watch(
      () => subscribeStore.refreshPrograms,
      (newValue) => {

        switch (newValue) {
          //The final state and refresh all and show all the values
          case "ready":
            initialCalls()
            break;

          default:
            break;
        }
      },
    );


    onMounted(() => {
      userStore.setLastSectionVisitedbyUser('home')
      initialCalls()
      document.body.addEventListener('click', handleClick)

      if (props.resetStorage !== '0') {
        clearAllVuex()
      }
    })

    onUnmounted(() => {
      document.body.removeEventListener('click', handleClick)
    })

    onBeforeRouteLeave(async (to) => {
      await apolloClientResetStore();
    })

    function initialCalls() {
      data.loadingPrograms = true
      data.areNotesLoading = true
      getAllPrograms()
      getNotes()
      getOverviewMapData()
    }

    watch(entitySelectedTrackingNumber, async () => {
      await apolloClientResetStore();
      if (!isResetting.value) {
        reactiveFnsByProgram();
        data.keyScroll++;
        data.keyScrollRecentchanges++;
      }
    });

    watch(() => props.resetStorage, () => {
      //-Because now, always will overwrite from API whoamin
      if (props.resetStorage !== '0') {
        clearAllVuex()
      }
    }, { deep: true })

    const dataNotificationMessages: ComputedRef<recentNotification | null> = computed(() => {
      let otherNotification = notificationsStore.getMessages

      if (!otherNotification || otherNotification.length === 0) {
        return null
      }

      const getReleaseNotification = otherNotification.filter((item: any) => item.originType === "NEW_RELEASE_ADA_PLATFORM")

      if (getReleaseNotification) {
        return getReleaseNotification[0]
      }

      return null
    });


    watch(
      () => negotiationStatusStore.getRefresNotes,
      (newValue) => {
        getNotes()
      }
    )

    const globalFiltersData = computed(() => {
      if (globalFiltersStore.getDisableWatchers) {
        return null;
      }
      const filters = globalFiltersStore.getFiltersApplied;
      return formatData.convertFiltersToREST(filters);
    });

    watch(globalFiltersData, (newValue) => {
      if (newValue !== null) {
        setGlobalFilter = newValue;
        reactiveFnsByProgram();
        data.keyScroll++;
        data.keyScrollRecentchanges++;
      }
    }, { flush: 'post' });

    watch(
      () => appStore.getCurrencyAmount,
      (newValue) => {
        setTimeout(function () {
          reactiveFnsByProgram()
          data.keyScroll++
          data.keyScrollRecentchanges++
        }, 100)
      }
    )

    function clearAllVuex() {
      globalFiltersStore.setValuesByColumn({
        spends: [],
        suppliers: [],
        parents: [],
        potentials: []
      })
      analyzeStore.setFinancingsGroupsbyProgram([])
      analyzeStore.setHarmonizationsGroupsbyProgram([])
    }

    function changeTab(tab: string) {
      currentTab.value = tab
    }

    function showModal() {
      emit('change-content', objData, null, 'edit')
    }

    function onOverlayAction(action: 'delete' | 'showOrHide') {
      if (action === 'showOrHide') {
        objData.visibility = !objData.visibility
      }
      emit('change-content', objData, null, action)
    }

    function handleCalculatorClick() {
       emit('change-tab','EntityCardCalculator')
      // This function can be used to handle clicks on the calculator icon in the tooltip
    }

    return {
      ...toRefs(data),
      StringUtils,
      getNumberWithDecimals,
      onSelect,
      changeProgram,
      blockProgramOptions,
      labelForRecalculatingStatus,
      dataNotificationMessages,
      isResetting,
      formatData,
      currentTab,
      showOptions,
      isBadgeShowing,
      mockMenuOptions,
      onMockOptionClick,
      changeTab,
      useFeatureEntityCardNewsletter,
      modulePlanIsAvailable,
      yAxisLabelsContent,
      metricSelectionMetricSelected,
      countriesMap,
      contractualValueComputed,
      actualValueComputed,
      getPaymentCycleFloatValue,
      getExpectedFloat,
      showOpportunityExpectedOpportunity,
      objData,
      showModal,
      onOverlayAction,
      firstRowIsOpened,
      firstRowIsActivated,
      secondaryRowIsOpened,
      secondaryRowIsActivated,
      handleCalculatorClick
    }
  }

})
</script>

<style lang='scss' scoped>

@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_borders.scss";


.cross-box {

  position: absolute;
  top: 4px;
  right: 4px;
  width: 1.25rem;
  min-width: 1.25rem;
  aspect-ratio: 1/1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  cursor: pointer;
  border: none;
  background: transparent;

  .cross-box-line {
    position: absolute;
    width: 2px;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    transform: rotate(45deg);
    pointer-events: none;

    &:nth-child(2) {
      transform: rotate(-45deg);
    }
  }
      &:hover {
          .cross-box-line {

      background-color: rgba(0, 0, 0, 0.9);
          }
    }
}

.button{

  &--base{
    border-radius: 0.5rem;
    overflow: hidden;
    color: #fff;
    background: #adb6f6;
    padding: 0.5rem 1rem;
    border: none;
    font-size: 1.125rem;
    transition: all 0.3s ease;

    &:hover{
      background: #5266eb;
    }
  }
}

.main-pill-container{
background: #fff;
border: 1px solid $color-gray-300;
border-radius:100vmax;
cursor: pointer;

&--active{
  background: #5266eb;
  color: #fff;
}
&--disabled{
  background: #eee;
  color: #9e9e9e;
  cursor: not-allowed;
}
}

.truncate-text {
width: 100%;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}


.main-image-wrapper{
  width: 100%;
  min-width: 100%;
  height: calc(100% + 24px * 2);
  position: relative;
  left: -0.5rem;

  .main-image{
    // position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    // object-position: 100% 50%;
  }
}
.insured-image-wrapper{
  width: 2rem;
  min-width: 2rem;
  aspect-ratio: 1/1;
  position: relative;

  .insured-image{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.col{
  &.col-xl-1-5{
    @media screen and (min-width: 1400px) {
      flex: 0 0 12.5%;
      max-width: 12.5%;
    }
  }
  &.col--4-5{
    flex: 0 0 37.5%;
    max-width: 37.5%;
  }
  &.col--7-5{
    flex: 0 0 62.5%;
    max-width: 62.5%;
  }
  &.col--04{
    flex: 0 0 40%;
    max-width: 40%;
  }
  &.col--02{
    flex: 0 0 20%;
    max-width: 20%;
  }
}
.company-image-wrapper,
.country-image-wrapper{
  width: 1.875rem;
  min-width: 1.875rem;
  aspect-ratio: 1/1;
  border-radius: 100vmax;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow:  0 0 0 1px #666;

  &--small{
    width: 1.25rem;
    min-width: 1.25rem;
  }

  img{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.company-image-wrapper{
  width: 3rem;
  min-width: 3rem;
}
.card{
  &--auto-height{
    height: auto !important;
    min-height: auto !important;
    flex: 1;
  }
  &--full-height{
    height: 100% !important;
    min-height: 100% !important;
  }
  &--inner{
    border: none;
    box-shadow: none;
    margin: 0;
    min-height: auto !important;
    padding: 0;
  }
}
.home-card-height {
  min-height: 21.5rem !important;
  max-height: 21.5rem !important;
}

.card-home-plan {
  min-height: 264px !important;
  max-height: 264px !important;
  overflow: hidden;
  overflow-y: auto;

  &-no-scroll {
    overflow-y: hidden;
  }
}

.title-dashboard {
  align-items: end;
  width: 20%;
}

.gauge-title {
  min-height: 50px;
  margin-bottom: 2rem;
  position: relative;
  overflow: visible;
}

@media (max-width: 1600px) {
  .card-body {
    flex: 1 1 auto;
    min-height: 1px;
    padding: 1.25rem;
  }
}

@media (max-width: 1400px) {
  .card-body {
    flex: 1 1 auto;
    min-height: 1px;
    padding: 0.5rem;
  }
}

.home-dashboard-aligment {
  align-items: end;
}

.home-dashboard-aligment-dropdown {
  justify-content: end;
}

.options-menu-wrapper {
  position: relative;

  .three-dots-icon {
    max-height: 16px;
  }

  #options-menu.fix-menu {
    position: absolute;
    top: 2rem;
    right: 0;
    min-width: 220px;
    background: $color-white;
    border-radius: 4px;
    z-index: 20;
    padding: 0.25rem 0;
    border: 1px solid $color-gray-300;
  }

  .options-menu-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .options-menu-item {
    padding: 0.5rem 0.875rem;

    &:hover {
      background: $color-gray-100;
    }
  }
}

.sales-distribution-chart {
  height: 19rem;
}

.btn {
  font-size: 14px !important;
}

</style>
