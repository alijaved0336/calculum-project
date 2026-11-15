<template>
<CalculumModal v-if="showModal" @close="cancel" :showClose="true" :size="'lg'" :title="$t('home.homePreference.confirm')">
  <template v-slot:modalContent>
    <p>{{ $t('home.homePreference.unsavedChanges') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancel">           <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="discardChanges">           <span>{{ $t('global.discard') }}    </span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="modalConfirmSaveBtnOnClick"><span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<PeerGroupStandardModal v-if="showPeerGroupStandardModal" @close="showPeerGroupStandardModal = false" :data="peerGroupStandardModalData" @save="handlePeerGroupStandardModalSave" :key="'pperGroupStandardModal'+keyComponentRender"></PeerGroupStandardModal>
<SupplierStandardModal v-if="showSupplierStandardModal" @close="showSupplierStandardModal = false" :data="supplierStandardModalData" @save="handleSupplierStandardModalSave" :key="'supplierStandardModal'+keyComponentRender"></SupplierStandardModal>
<div class="row">
  <div class="col">
    <div class="card" style="min-height: auto; height: auto">
      <div class="card-body">
        <div class="row cursor-pointer" id="show-strategies-section" @click="showStrategies = !showStrategies">
          <div class="col-11 cursor-pointer"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('home.homeCompanySettings.paymentTermsStrategies') }}
              <CalculumTooltipIcon :infoText="$t('home.homeCompanySettings.strategiesTxtTooltipDefault')" :advancedTooltipClass="true" :uniqueIdentifier="'popover-setup-paymenttermsstrategies'" :keyPopOver="'setupPaymenTermsStrategies'"></CalculumTooltipIcon></span>
            <p class="text-base mt-4 cursor-pointer">{{ $t('home.homeCompanySettings.strategiesTxt') }}    </p>
            <p>{{ 'By default, all suppliers and spend lines are included in the term extension program. Create one or more sets of conditions for suppliers that will be excluded from the term extension analysis.' }}         </p>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showStrategies"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showStrategies">                   </i></div>
        </div>
        <div class="row" v-if="showStrategies">
          <div class="col-12 col-sm-12 col-lg-6 col-xl-6 col-md-12 mb-3" v-for="(strategy, index) in dataStrategies" :key="index">
            <div class="row min-h-12">
              <div class="col-4 col-xl-5 col-lg-8 col-md-10 col-sm-8 d-flex flex-column"><span class="text-base font-medium">{{ $t('home.entityCard.strategies.' + strategy.key) }}</span><span class="text-sm font-normal text-gray-500" v-if="strategy.key === 'peerGroupAvgStrategy' || strategy.key === 'supplierStandardStrategy' || strategy.key === 'scfStandardStrategy'">{{ strategy.calculationMethod === 'Q3' ? $t('global.thirdQuartileD') : $t('global.averageD') }}</span><span class="text-sm font-normal text-gray-500" v-if="strategy.key === 'regulatoryTermsStrategy'">{{ $t('home.entityCard.strategies.' + strategy.regulatoryMethod) }}</span></div>
              <div class="col-8 col-xl-7 col-lg-4 col-md-2 col-sm-4">
                <div class="row">
                  <div class="col-2">
                    <label class="switch">
                      <input type="checkbox" v-model="strategy.isAllowed" :disabled="spendFileInrecalculation" @change="changeStatus"/><span class="slider round" :id="'slider-id-' + strategy.key" :class="{'slider-disabled no-hover': spendFileInrecalculation}"></span>
                    </label>
                  </div>
                  <div class="col-10 d-flex" v-if="(strategy.key === 'supplierStandard2Strategy' || strategy.key === 'peerGroupStandard2Strategy') && strategy.isAllowed" :class="{'cursor-pointer' : !spendFileInrecalculation}" @click="spendFileInrecalculation ? null : openMoreSettingsForNewStrategy(strategy.key)">                   <span class="ml-2 text-sm font-medium text-gray-700" :class="{'cursor-pointer' : !spendFileInrecalculation}" :id="'more-settings-' + strategy.key">{{ $t('home.entityCard.strategies.moreSettings') }}</span><span class="ml-2 text-sm font-medium text-gray-700" :class="{'cursor-pointer' : !spendFileInrecalculation}"><i class="fa-solid fa-up-right-and-down-left-from-center text-sm" aria-hidden="true"></i></span></div>
                  <div class="col-10 d-flex" v-if="strategy.key === 'peerGroupAvgStrategy' && strategy.isAllowed" :class="{'disabled-button': !strategy.isAllowed, 'cursor-pointer' : strategy.isAllowed}" @click="showMoreSettingsMenuDropdown(strategy.key, strategy.isAllowed, $event)" ref="peerGroupStandardMoreSettingsButton"><span class="ml-2 text-sm font-medium text-gray-700" :id="'more-settings-' + strategy.key">{{ $t('home.entityCard.strategies.moreSettings') }}</span>
                    <CalculumChevronDown v-if="!peerGroupStandardOpenMoreSettings"></CalculumChevronDown>
                    <CalculumChevronUp v-if="peerGroupStandardOpenMoreSettings"></CalculumChevronUp>
                    <div class="calculum-popup" :class="peerGroupStandardOpenMoreSettings ? 'show' : 'hide'">
                      <div class="d-flex flex-column popup-settings" :class="strategy.key + '-popup-settings'">
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.calculationMethod" @change="peerGroupStandardMoreSettingsOnOptionClicked(null)" type="radio" value="AVG" :disabled="spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.calculationMethod !== 'AVG' || spendFileInrecalculation}">&nbsp;    </span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': spendFileInrecalculation}" @click="spendFileInrecalculation ? null : peerGroupStandardMoreSettingsOnOptionClicked('AVG')">{{ $t('global.averageD') }}</span>
                        </div>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.calculationMethod" @change="peerGroupStandardMoreSettingsOnOptionClicked(null)" type="radio" value="Q3" :disabled="spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.calculationMethod !== 'Q3' || spendFileInrecalculation}">&nbsp;</span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': spendFileInrecalculation}" @click="spendFileInrecalculation ? null : peerGroupStandardMoreSettingsOnOptionClicked('Q3')">{{ $t('global.third_quartile') }}</span>
                        </div>
                        <div class="d-flex flex-column"><span>{{ $t('global.minOccurrences') }}</span>
                          <input class="form-control" min="5" max="9999" type="number" v-model="strategy.minOccurrences" @change="changeStatus" @keyup="validateMinOccurrences($event)" @keyup.enter="closePopup(strategy.key)" :id="'input-minimum-occurrences-' + strategy.key" :disabled="spendFileInrecalculation"/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-10 d-flex" v-if="strategy.key === 'parentSupplierMaxStrategy' && strategy.isAllowed" :class="{'cursor-pointer' : strategy.isAllowed}" @click="showMoreSettingsMenuDropdown(strategy.key, strategy.isAllowed, $event)"><span class="ml-2 text-sm font-medium text-gray-700">{{ $t('home.entityCard.strategies.moreSettings') }}</span>
                    <CalculumChevronDown v-if="!parentSupplierMaxStrategyOpenMoreSettings"></CalculumChevronDown>
                    <CalculumChevronUp v-if="parentSupplierMaxStrategyOpenMoreSettings"></CalculumChevronUp>
                    <div class="calculum-popup" :class="parentSupplierMaxStrategyOpenMoreSettings ? 'show' : 'hide'">
                      <div class="d-flex popup-settings gap-2 section-values">
                        <KendoCheckbox class="admin-checkbox" :key="keycheckBoxRender" :default-checked="strategy.parentSupplierMaxStrategySameSupplierIndustry" @change="(e) => setValueToStrategy(e, 'parentSupplierMaxStrategySameSupplierIndustry')" :disabled="spendFileInrecalculation"></KendoCheckbox><span class="cursor-pointer text-sm font-normal text-gray-900" :class="{'no-hover': spendFileInrecalculation}" @click="spendFileInrecalculation ? null : strategy.parentSupplierMaxStrategySameSupplierIndustry = !strategy.parentSupplierMaxStrategySameSupplierIndustry, setValidateDatas()">{{ $t('home.entityCard.strategies.sameSupplierIndustry') }}
                          <CalculumTooltipIcon :infoText="$t('home.entityCard.strategies.sameSupplierIndustryTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span>
                      </div>
                      <div class="d-flex popup-settings gap-2 mt-2 section-values">
                        <KendoCheckbox class="admin-checkbox" :key="keycheckBoxRender" :default-checked="strategy.parentSupplierMaxStrategySameSupplierRegion" @change="(e) => setValueToStrategy(e, 'parentSupplierMaxStrategySameSupplierRegion')" :disabled="spendFileInrecalculation"></KendoCheckbox><span class="cursor-pointer text-sm font-normal text-gray-900" :class="{'no-hover': spendFileInrecalculation}" @click="spendFileInrecalculation ? null : strategy.parentSupplierMaxStrategySameSupplierRegion = !strategy.parentSupplierMaxStrategySameSupplierRegion, setValidateDatas()">{{ $t('home.entityCard.strategies.sameSupplierRegion') }}
                          <CalculumTooltipIcon :infoText="$t('home.entityCard.strategies.sameSupplierRegionTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span>
                      </div>
                      <div class="d-flex flex-column section-values mt-2"><span>{{ $t('home.entityCard.strategies.minimumSpendVolume') }} (%)
                          <CalculumTooltipIcon :infoText="$t('home.entityCard.strategies.minimumSpendVolumeTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span>
                        <input class="form-control" min="0" max="100" type="number" v-model="strategy.parentSupplierMaxStrategyVolumePercentage" @change="validateVolumePercentage(strategy.parentSupplierMaxStrategyVolumePercentage)" @keyup="validateVolumePercentage(strategy.parentSupplierMaxStrategyVolumePercentage)" @keyup.enter="closePopup(strategy.key)" :id="'input-minimum-occurrences-' + strategy.key" :disabled="spendFileInrecalculation"/><span class="error text-left errors-name" v-if="minimumSpendVolumeError">{{ $t('global.errors.baseRate') }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="col-10 d-flex" v-if="strategy.key === 'scfStandardStrategy' && strategy.isAllowed" :class="{'cursor-pointer' : strategy.isAllowed}" @click="showMoreSettingsMenuDropdown(strategy.key, strategy.isAllowed, $event)" ref="scfPeerStandardStrategyMoreSettingsButton"><span class="ml-2 text-sm font-medium text-gray-700">{{ $t('home.entityCard.strategies.moreSettings') }}</span>
                    <CalculumChevronDown v-if="!scfPeerStandardStrategyOpenMoreSettings"></CalculumChevronDown>
                    <CalculumChevronUp v-if="scfPeerStandardStrategyOpenMoreSettings"></CalculumChevronUp>
                    <div class="calculum-popup" :class="scfPeerStandardStrategyOpenMoreSettings ? 'show' : 'hide'">
                      <div class="d-flex flex-column popup-settings">
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.calculationMethod" @change="scfPeerStandardStrategyMoreSettingsOnOptionClicked(null)" type="radio" value="AVG" :disabled="spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.calculationMethod !== 'AVG' || spendFileInrecalculation}">&nbsp;    </span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': spendFileInrecalculation}" @click="spendFileInrecalculation ? null : scfPeerStandardStrategyMoreSettingsOnOptionClicked('AVG')">{{ $t('global.averageD') }}</span>
                        </div>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.calculationMethod" @change="scfPeerStandardStrategyMoreSettingsOnOptionClicked(null)" type="radio" value="Q3" :disabled="spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.calculationMethod !== 'Q3' || spendFileInrecalculation}">&nbsp;</span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': spendFileInrecalculation}" @click="spendFileInrecalculation ? null : scfPeerStandardStrategyMoreSettingsOnOptionClicked('Q3')">{{ $t('global.third_quartile') }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-10 d-flex" v-if="strategy.key === 'supplierStandardStrategy' && strategy.isAllowed" :class="{'cursor-pointer' : strategy.isAllowed}" @click="showMoreSettingsMenuDropdown(strategy.key, strategy.isAllowed, $event)" ref="supplierStandardStrategyMoreSettingsButton"><span class="ml-2 text-sm font-medium text-gray-700">{{ $t('home.entityCard.strategies.moreSettings') }}</span>
                    <CalculumChevronDown v-if="!supplierStandardStrategyOpenMoreSettings"></CalculumChevronDown>
                    <CalculumChevronUp v-if="supplierStandardStrategyOpenMoreSettings"></CalculumChevronUp>
                    <div class="calculum-popup" :class="supplierStandardStrategyOpenMoreSettings ? 'show' : 'hide'">
                      <div class="d-flex flex-column popup-settings" :class="strategy.key + '-popup-settings'">
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.calculationMethod" @change="supplierStandardStrategyMoreSettingsOnOptionClicked(null)" type="radio" value="AVG" :disabled="spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.calculationMethod !== 'AVG' || spendFileInrecalculation}">&nbsp;    </span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': spendFileInrecalculation}" @click="spendFileInrecalculation ? null : supplierStandardStrategyMoreSettingsOnOptionClicked('AVG')">{{ $t('global.averageD') }}</span>
                        </div>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.calculationMethod" @change="supplierStandardStrategyMoreSettingsOnOptionClicked(null)" type="radio" value="Q3" :disabled="spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.calculationMethod !== 'Q3' || spendFileInrecalculation}">&nbsp;</span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': spendFileInrecalculation}" @click="spendFileInrecalculation ? null : supplierStandardStrategyMoreSettingsOnOptionClicked('Q3')">{{ $t('global.third_quartile') }}</span>
                        </div>
                        <div class="d-flex flex-column"><span>{{ $t('global.minOccurrences') }}</span>
                          <input class="form-control" min="5" max="9999" type="number" v-model="strategy.minOccurrences" @change="changeStatus" @keyup="validateMinOccurrences($event)" @keyup.enter="closePopup(strategy.key)" :id="'input-minimum-occurrences-' + strategy.key" :disabled="spendFileInrecalculation"/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-10 d-flex" v-if="strategy.key === 'regulatoryTermsStrategy'" :class="{'cursor-pointer' : strategy.isAllowed }" @click="showMoreSettingsMenuDropdown(strategy.key, strategy.isAllowed, $event)" ref="button"><span class="ml-2 text-sm font-medium text-gray-700">{{ $t('home.entityCard.strategies.moreSettings') }}</span>
                    <CalculumChevronDown v-if="!regulatoryTermsStrategyOpenMoreSettings"></CalculumChevronDown>
                    <CalculumChevronUp v-if="regulatoryTermsStrategyOpenMoreSettings"></CalculumChevronUp>
                    <div class="calculum-popup" :class="regulatoryTermsStrategyOpenMoreSettings ? 'show' : 'hide'">
                      <div class="d-flex flex-column popup-settings"><span class="text-xs font-medium text-gray-500">{{ $t('home.entityCard.strategies.countryForRegulations') }}</span>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.regulatoryCountrySource" @change="changeStatus()" type="radio" value="supplier" :disabled="!strategy.isAllowed || spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.regulatoryCountrySource !== 'supplier' || !strategy.isAllowed || spendFileInrecalculation}">&nbsp;</span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': !strategy.isAllowed || spendFileInrecalculation}" @click="(!strategy.isAllowed || spendFileInrecalculation) ? null : (strategy.regulatoryCountrySource = 'supplier', changeStatus())">{{ $t('home.entityCard.strategies.SUPPLIER') }}</span>
                        </div>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.regulatoryCountrySource" @change="changeStatus()" type="radio" value="buyer" :disabled="!strategy.isAllowed || spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.regulatoryCountrySource !== 'buyer' || !strategy.isAllowed || spendFileInrecalculation}">&nbsp;</span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': !strategy.isAllowed || spendFileInrecalculation}" @click="(!strategy.isAllowed || spendFileInrecalculation) ? null : (strategy.regulatoryCountrySource = 'buyer', changeStatus())">{{ $t('home.entityCard.strategies.BUYER') }}</span>
                        </div>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.regulatoryCountrySource" @change="changeStatus()" type="radio" value="both" :disabled="!strategy.isAllowed || spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.regulatoryCountrySource !== 'both' || !strategy.isAllowed || spendFileInrecalculation}">&nbsp;</span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': !strategy.isAllowed || spendFileInrecalculation}" @click="(!strategy.isAllowed || spendFileInrecalculation) ? null : (strategy.regulatoryCountrySource = 'both', changeStatus())">{{ $t('home.entityCard.strategies.BOTH') }}</span>
                        </div><span class="text-xs font-medium text-gray-500 mt-2">{{ $t('home.entityCard.strategies.limitPaymentTermsOpportunity') }}</span>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.regulatoryMethod" @change="changeSettings(null,true)" type="radio" value="ONLY_EXCEPTIONS" :disabled="!strategy.isAllowed || spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.regulatoryMethod !== 'ONLY_EXCEPTIONS' || !strategy.isAllowed || spendFileInrecalculation}">&nbsp;</span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': !strategy.isAllowed || spendFileInrecalculation}" @click="(!strategy.isAllowed || spendFileInrecalculation) ? null : changeSettings('ONLY_EXCEPTIONS',true)">{{ $t('home.entityCard.strategies.ONLY_EXCEPTIONS') }}</span>
                        </div>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="strategy.regulatoryMethod" @change="changeSettings(null,true)" type="radio" value="ALL" :disabled="!strategy.isAllowed || spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.regulatoryMethod !== 'ALL' || !strategy.isAllowed || spendFileInrecalculation}">&nbsp;</span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': !strategy.isAllowed || spendFileInrecalculation}" @click="(!strategy.isAllowed || spendFileInrecalculation) ? null : changeSettings('ALL',true)">{{ $t('home.entityCard.strategies.ALL') }}</span>
                        </div>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" type="radio" @change="changeSettings(null,true)" value="NONE" v-model="strategy.regulatoryMethod" :disabled="!strategy.isAllowed || spendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': strategy.regulatoryMethod !== 'NONE' || !strategy.isAllowed || spendFileInrecalculation}">&nbsp;</span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" :class="{'disabled-radio no-hover': !strategy.isAllowed || spendFileInrecalculation}" @click="(!strategy.isAllowed || spendFileInrecalculation) ? null : changeSettings('NONE',true)">{{ $t('home.entityCard.strategies.NONE') }}</span>
                        </div>
                        <div class="d-flex enabled-button" v-if="strategy.regulatoryMethod !== 'NONE'">
                          <input class="k-checkbox k-checkbox-md k-rounded-md" type="checkbox" :checked="strategy.limitOpportunity" :disabled="!strategy.isAllowed || spendFileInrecalculation" @change="changeLimitOpportunity(strategy.limitOpportunity)"/>
                          <label class="k-checkbox-label-regulatory text-sm">{{ 'Limit only the opportunity (do not restrict contractual terms that are currently longer)' }}</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-12 d-flex actions-buttons mt-10">
            <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="modalConfirmSaveBtnOnClick" :disabled="!withChanges || spendFileInrecalculation"><span id="save-button-for-settings">{{ $t('global.save') }}</span></button>
          </div>
        </div>
        <hr class="mt-2 mb-6"/>
        <div class="row" id="show-supplier-strategy-visibility" @click="showSupplierStrategyVisibility = !showSupplierStrategyVisibility">
          <div class="col-11 cursor-pointer"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('global.supplierStrategyVisibility') }}   </span>
            <p class="text-base mt-4 cursor-pointer">{{ $t('global.descriptionSupplierStrategyVisibility') }}</p>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showSupplierStrategyVisibility"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showSupplierStrategyVisibility">           </i></div>
        </div>
        <div class="row" v-if="showSupplierStrategyVisibility">
          <SupplierStrategyVisibility :spendFileInrecalculation="spendFileInrecalculation"></SupplierStrategyVisibility>
        </div>
        <hr class="mt-2 mb-6"/>
        <div class="row" id="show-opportunity-visibility-section" @click="showOpportunityVisibility = !showOpportunityVisibility">
          <div class="col-11 cursor-pointer"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('global.opportunityVisibility') }}   </span>
            <p class="text-base mt-4 cursor-pointer">{{ $t('global.descriptionOnlyTotalOpportunity') }}</p>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showOpportunityVisibility"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showOpportunityVisibility">           </i></div>
        </div>
        <div class="row" v-if="showOpportunityVisibility">
          <OpportunityVisibility :spendFileInrecalculation="spendFileInrecalculation"></OpportunityVisibility>
        </div>
        <hr class="mt-2 mb-6"/>
        <div class="row" @click="showSupplierExcluded = !showSupplierExcluded">
          <div class="col-11 cursor-pointer"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('global.excludesSuppliers') }}</span>
            <p class="text-base mt-4 cursor-pointer">{{ $t('global.descriptionExcludesSection') }}</p>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showSupplierExcluded"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showSupplierExcluded">           </i></div>
        </div>
        <div class="row" id="show-excluded-section" v-if="showSupplierExcluded">
          <div class="col-12">
            <SupplierExcluded :spendFileInrecalculation="spendFileInrecalculation"></SupplierExcluded>
          </div>
        </div>
        <hr class="mt-2 mb-6"/>
        <div id="harmonization"></div>
        <div class="row" id="show-harmonization-groups" @click="showHarmonization = !showHarmonization">
          <div class="col-11 cursor-pointer"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('global.harmonization') }}</span>
            <p class="text-base mt-4 cursor-pointer">{{ $t('global.harmonizationDescription') }}</p>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showHarmonization"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showHarmonization">           </i></div>
        </div>
        <div class="row" id="show-excluded-section" v-if="showHarmonization">
          <div class="col-12">
            <HarmonizationGroups :saveGroupsProp="saveGroups" :spendFileInrecalculation="spendFileInrecalculation"></HarmonizationGroups>
          </div>
        </div>
        <hr class="mt-2 mb-6"/>
        <div class="row" id="show-capped-section" @click="showCappedSection = !showCappedSection">
          <div class="col-11 cursor-pointer">
            <h1 class="text-gray-600 text-base font-semibold">{{ $t('home.entityCard.strategies.maxOppoTitle') }}</h1>
            <p class="text-base mt-4">{{ $t('home.entityCard.strategies.maxOppoTxt') }}</p>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showCappedSection"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showCappedSection">           </i></div>
        </div>
        <div class="row" v-if="showCappedSection">
          <div class="col-12">
            <label class="switch">
              <input type="checkbox" v-model="cappedTermsStrategy" @change="changeMax" :disabled="spendFileInrecalculation"/><span class="slider round" :class="{'slider-disabled no-hover': spendFileInrecalculation}"></span>
            </label>
          </div>
          <div class="col-xl-9 col-lg-9 col-md-6 col-sm-6">
            <table class="table table-bordered">
              <thead>
                <tr>
                  <th class="bg-light">{{ $t('home.entityCard.strategies.contractualActualPT') }}</th>
                  <th class="bg-light">{{ $t('home.entityCard.strategies.maxOppTermHighLvg') }}</th>
                  <th class="bg-light">{{ $t('home.entityCard.strategies.maxOppTermMediumLvg') }}</th>
                  <th class="bg-light">{{ $t('home.entityCard.strategies.maxOppTermLowLvg') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in dataTable" :key="index">
                  <td class="text-center"> <span>{{ row.from }} - {{ row.to }}</span></td>
                  <td> <span>{{ row.high ?? '-' }}</span></td>
                  <td> <span>{{ row.medium ?? '-' }}</span></td>
                  <td> <span>{{ row.low ?? '-' }}                  </span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="col-12 d-flex actions-buttons mt-10">
            <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="saveMax" :disabled="!withChangesMax || spendFileInrecalculation"><span>{{ $t('global.save') }}</span></button>
          </div>
        </div>
        <hr class="mt-2 mb-6"/>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  toRefs,
  watch,
  ref,
  onMounted,
  onUnmounted,
  provide,
  computed,
} from "vue";

import { isNullOrUndefined } from "@/utils";
import { onBeforeRouteLeave } from "vue-router";
import { useHomeStore } from '@/stores/home';
import { useUserStore } from '@/stores/user';
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import CalculumChevronDown from "@/modules/components/CalculumChevronDown.vue";
import CalculumChevronUp from "@/modules/components/CalculumChevronUp.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import router from "@/services/router";
import useUser from "@/services/user/composables/useUser";
import * as clickOutsideRelated from "@/utils/clickOutsideRelated";
import { removeStandard2StrategiesForNonAdmin } from "@/utils/standard2StrategiesVisibility";
import KendoCheckbox from "@/modules/components/checkbox/KendoCheckbox.vue";
import SupplierExcluded from "./CardGroups/SupplierExcluded.vue";
import OpportunityVisibility from "./OpportunityVisibility.vue";
import HarmonizationGroups from "./Financing/HarmonizationGroups.vue";
import SupplierStrategyVisibility from "./SupplierStrategyVisibility.vue";
import { useToast } from "vue-toastification";
import PeerGroupStandardModal from "./Modals/PeerGroupStandardModal.vue";
import SupplierStandardModal from "./Modals/SupplierStandardModal.vue";

export default defineComponent({
  name: "StrategiesSetup",
  components: {
    CalculumModal,
    CalculumLoading,
    CalculumChevronDown,
    CalculumChevronUp,
    CalculumTooltipIcon,
    KendoCheckbox,
    SupplierExcluded,
    OpportunityVisibility,
    HarmonizationGroups,
    SupplierStrategyVisibility,
    PeerGroupStandardModal,
    SupplierStandardModal
  },
  props: {
    showAlert: { type: Boolean },
    otherTab: { type: String, default: null },
    sectionDefault: { type: String, default: null },
    spendFileInrecalculation: { type: Boolean, default: false }
  },
  emits: [
    "send-changes",
    "save-n-continue",
    "discard-n-continue",
    "cancel-n-continue",
  ],
  setup(props, { emit }) {
    const homeStore = useHomeStore();
    const userStore = useUserStore();
    const globalFiltersStore = useGlobalFiltersStore();

    const { user, useFeatureScfStrategy, userIsSuperAdmin } = useUser();

    const toast = useToast();

    type RegulatoryMethod = "ONLY_EXCEPTIONS" | "ALL" | "NONE";

    type RegulatoryCountrySource = "supplier" | "buyer" | "both";

    type CalculationMethod = "AVG" | "Q3";

    const showPeerGroupStandardModal = ref(false);
    const showSupplierStandardModal = ref(false);
    interface DataStrategy {
      key:
        | "industryRegionStandardStrategy"
        | "peerGroupAvgStrategy"
        | "parentSupplierMaxStrategy"
        | "supplierStandardStrategy"
        | "financingStrategy"
        | "buyerStandardStrategy"
        | "cashDiscountConversionStrategy"
        | "regulatoryTermsStrategy"
        | "cappedTermsStrategy"
        | "scfStandardStrategy"
        | "peerGroupStandard2Strategy"
        | "supplierStandard2Strategy"
        | "payOnTermsStrategy";

      regulatoryMethod?: RegulatoryMethod;
      regulatoryCountrySource?: RegulatoryCountrySource;
      calculationMethod?: CalculationMethod; // Default: AVG
      minOccurrences?: number;
      isAllowed: boolean;
      parentSupplierMaxStrategySameSupplierIndustry?: boolean;
      parentSupplierMaxStrategySameSupplierRegion?: boolean;
      parentSupplierMaxStrategyVolumePercentage?: number;
      limitOpportunity: boolean;
      dsoAdjustmentEnabled?: boolean;
      dsoFallbackEnabled?: boolean;
      includeParentTerms?: boolean;
      sisterCompanyInclusion?: string;
      combinationGroups?: Array<string>;
    }

    interface HomeCompanySettings {
      cappedTermsStrategy: boolean;
      cappedTermsStrategyInitial: boolean;
      changeInboth: boolean;
      dataStrategies: DataStrategy[];
      dataStrategiesMax: Array<any>;
      dataTable: any;
      loading: boolean;
      regulatoryTermsStrategyOpenMoreSettings: boolean;
      saveNContinue: any;
      showModal: boolean;
      withChanges: boolean;
      withChangesMax: boolean;
      testValue: boolean;
      testValue2: boolean,
      keycheckBoxRender: number;
      minimumSpendVolumeError: boolean;
      showStrategies: boolean,
      showSupplierExcluded: boolean,
      showCappedSection: boolean,
      showOpportunityVisibility:boolean,
      showHarmonization: boolean,
      saveGroups: boolean,
      showSupplierStrategyVisibility: boolean,
      keyComponentRender: number;
    }

    const data = reactive<HomeCompanySettings>({
      cappedTermsStrategy: false,
      cappedTermsStrategyInitial: false,
      changeInboth: false,
      dataStrategies: [],
      dataStrategiesMax: [],
      dataTable: [],
      loading: false,
      regulatoryTermsStrategyOpenMoreSettings: false,
      saveNContinue: null,
      showModal: props.showAlert,
      withChanges: false,
      withChangesMax: false,
      testValue: false,
      testValue2: false,
      keycheckBoxRender: new Date().getUTCMilliseconds(),
      minimumSpendVolumeError: false,
      showStrategies: true,
      showSupplierExcluded: false,
      showCappedSection: false,
      showOpportunityVisibility: false,
      showHarmonization: false,
      saveGroups: false,
      showSupplierStrategyVisibility: false,
      keyComponentRender: new Date().getUTCMilliseconds()
    });
    const limitOpportunity = ref(true);
    const getStrategy = (key: string) => {
      return data.dataStrategies.find((strategy) => strategy.key === key);
    };
    const changeLimitOpportunity = (state:boolean) => {

      limitOpportunity.value = !state;
      const strategy = getStrategy("regulatoryTermsStrategy");

      if (isNullOrUndefined(strategy)) {
        if (import.meta.env.DEV)
          console.log(
            "** ? - changeSettings - strategy is null or undefined",
          );
        return;
      }
      const regulatoryMethod = strategy.regulatoryMethod ? strategy.regulatoryMethod : null;
      changeSettings(regulatoryMethod,true);
      
    };
    provide('resetChanges', resetChanges)
    function resetChanges() {      
      data.saveGroups = false
    }

    // *** API ***

    function getTableData() {
      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          data.dataTable = callbackSuccessData;
        },
        callbackError: () => {
          toast.error("ERROR updating data");
        },
      };
      homeStore.getCappedTable(params);
    }

    // Validate and adjust minOccurrences value

    /**
     * Retrieve strategies from the server and update the data.
     *
     * @param {type} user - the user object
     * @return {void}
     */
    function retrieveStrategies(): void {
      try {
        // Validate
        if (isNullOrUndefined(user.value)) {
          throw new Error("user is null or undefined");
        }

        if (isNullOrUndefined(user.value.activeSpendFileVersion)) {
          throw new Error("user.activeSpendFileVersion is null or undefined");
        }

        const params = {
          spendUUID: user.value.activeSpendFileVersion["@id"],
          callbackSuccess: (callbackSuccessData: {
            strategies: DataStrategy[];
            payOnTermsStrategyAllowed?: boolean;
          }) => {
            if (!useFeatureScfStrategy()) {
              const scfStandardStrategyIndex =
                callbackSuccessData.strategies.findIndex(
                  (strategy) => strategy.key === "scfStandardStrategy",
                );
              if (scfStandardStrategyIndex >= 0) {
                callbackSuccessData.strategies.splice(
                  scfStandardStrategyIndex,
                  1,
                );
              }
            }
            // AB#20488 (TEMPORARY): SS2.0 / PG2.0 rows are for super admins only
            callbackSuccessData.strategies = removeStandard2StrategiesForNonAdmin(
              callbackSuccessData.strategies,
              userIsSuperAdmin.value,
            );
            //supplierStandardStrategy
            // Conditionally handle minOccurrences property
            callbackSuccessData.strategies = callbackSuccessData.strategies.map(
              (strategy) => {
                if (strategy.key === "peerGroupAvgStrategy" || strategy.key === "peerGroupStandard2Strategy") {
                  // Ensure minOccurrences is a number and default to 0 if invalid
                  strategy.minOccurrences =
                    Number(strategy.minOccurrences) || 5;
                } else if (strategy.key === "supplierStandardStrategy" || strategy.key === "supplierStandard2Strategy") {
                  // Handle supplierStandardStrategy minOccurrences logic
                  strategy.minOccurrences =
                    Number(strategy.minOccurrences) || 5;
                } else {
                  // Ensure minOccurrences is not included for other strategies
                  delete strategy.minOccurrences;
                }
                return strategy;
              },
            );

            // Extract the capped terms strategy
            const cappedTermsStrategyIndex =
              callbackSuccessData.strategies.findIndex(
                (strategy) => strategy.key === "cappedTermsStrategy",
              );

            if (cappedTermsStrategyIndex >= 0) {
              data.cappedTermsStrategy =
                callbackSuccessData.strategies[
                  cappedTermsStrategyIndex
                ].isAllowed;

              data.cappedTermsStrategyInitial =
                callbackSuccessData.strategies[
                  cappedTermsStrategyIndex
                ].isAllowed;

              // Remove the capped terms strategy
              callbackSuccessData.strategies.splice(
                cappedTermsStrategyIndex,
                1,
              );
            }

            // Cache the strategies
            localStorage.setItem(
              "initialStrategies",
              JSON.stringify(callbackSuccessData.strategies),
            );

            // Update the data
            data.dataStrategies = callbackSuccessData.strategies;

            userStore.setPayOnTermsStrategyAllowed(callbackSuccessData.payOnTermsStrategyAllowed ?? true);

            // Disable loading
            data.loading = false;
          },
          callbackError: () => {
            toast.error("ERROR updating data");
          },
        };

        // Enable loading
        data.loading = true;

        homeStore.retrieveStrategies(params);
      } catch (error) {
        //
        if (import.meta.env.DEV) {
          console.log("** Error in retrieveStrategies. ", error);
        }
      }
    }


    const validateMinOccurrences = (event: any) => {
      const value = parseFloat(event.target.value);

      // Check if the value is a valid number and within the specified range
      if (!isNaN(value) && value >= 5 && value <= 9999) {
        data.withChanges = true;
      } else {
        data.withChanges = false;
      }
    };

    /**
     * Function to change the status.
     *
     * @return {void}
     */
    function changeStatus(): void {
      const fromCache = localStorage.getItem("initialStrategies");

      // Parse the cached data
      const cachedData: DataStrategy[] = fromCache ? JSON.parse(fromCache) : [];

      // Function to normalize and validate minOccurrences for peerGroupAvgStrategy only
      const normalizeAndValidate = (
        strategies: DataStrategy[],
      ): DataStrategy[] => {
        let allValid = true; // Track overall validity status

        const updatedStrategies = strategies.map((strategy) => {
          if (
            strategy.key === "peerGroupAvgStrategy" &&
            strategy.minOccurrences !== undefined
          ) {
            // Convert minOccurrences to a number
            const num = Number(strategy.minOccurrences);

            if (
              !isNaN(num) &&
              Number.isFinite(num) &&
              num >= 5 &&
              num <= 9999
            ) {
              // Valid number, round it and assign
              strategy.minOccurrences = Math.floor(num);
            } else {
              // Invalid number, set to default value and mark as invalid
              //strategy.minOccurrences = 5;
              allValid = false;
            }
          }

          // Handle supplierStandardStrategy
          if (
            strategy.key === "supplierStandardStrategy" &&
            strategy.minOccurrences !== undefined
          ) {
            const num = Number(strategy.minOccurrences);
            if (
              !isNaN(num) &&
              Number.isFinite(num) &&
              num >= 3 &&
              num <= 9999
            ) {
              strategy.minOccurrences = Math.floor(num);
            } else {
              allValid = false;
            }
          }
          return strategy;
        });

        return updatedStrategies;
      };

      const normalizedCachedData = normalizeAndValidate(cachedData);
      const normalizedCurrentData = normalizeAndValidate(data.dataStrategies);

      // Check if there are changes between cached and current data
      const changesDetected =
        JSON.stringify(normalizedCachedData) !==
        JSON.stringify(normalizedCurrentData);
      // Check if all minOccurrences values are valid in the current data for peerGroupAvgStrategy
      const peerGroupStrategyCurrent = normalizedCurrentData.find(
        (strategy) => strategy.key === "peerGroupAvgStrategy",
      );

      // Determine if peerGroupAvgStrategy minOccurrences is valid
      const peerGroupStrategyValid = peerGroupStrategyCurrent
        ? typeof peerGroupStrategyCurrent.minOccurrences === "number" &&
          !isNaN(peerGroupStrategyCurrent.minOccurrences) &&
          peerGroupStrategyCurrent.minOccurrences >= 5 &&
          peerGroupStrategyCurrent.minOccurrences <= 9999
        : true;
      // Update data.withChanges based on changes detected and validity
      data.withChanges = changesDetected && peerGroupStrategyValid;
      emit("send-changes", data.withChanges);
    }

    function changeMax(): void {
      if (data.cappedTermsStrategy !== data.cappedTermsStrategyInitial) {
        data.withChangesMax = true;
        emit("send-changes", data.withChangesMax);
      } else {
        data.withChangesMax = false;
        emit("send-changes", data.withChangesMax);
      }
    }

    onBeforeRouteLeave((to) => {


      if (props.spendFileInrecalculation) {
        localStorage.removeItem("initialStrategies");
        return true;
      }

      if (data.withChanges) {
        data.saveNContinue = to;
        data.showModal = true;
        return false;
      } else {
        localStorage.removeItem("initialStrategies");
        return true;
      }
    });

    /**
     * Discard any changes made and either emit an event or navigate to a specific route.
     *
     * @return {void}
     */
    function discardChanges(): void {
      data.withChanges = false;
      if (props.otherTab !== "") {
        emit("discard-n-continue");
      } else {
        router.push(data.saveNContinue.fullPath);
      }
    }

    /**
     * Function to cancel the operation and hide the modal.
     *
     * @return {void}
     */
    function cancel(): void {
      data.showModal = false;

      emit("cancel-n-continue");
    }

    function modalConfirmSaveBtnOnClick() {

      data.saveGroups = true

      data.showModal = false;
      data.loading = true;
      if (data.withChanges && data.withChangesMax) {
        data.changeInboth = true;
        saveStrategies();
      } else if (data.withChanges && !data.withChangesMax) {
        data.changeInboth = false;
        saveStrategies();
      } else if (!data.withChanges && data.withChangesMax) {
        data.changeInboth = false;
        saveMax();
      }
    }

    /**
     * Save the maximum value for the capped terms strategy.
     *
     * @return {void}
     */
    function saveMax(): void {
      try {
        // Validate
        if (isNullOrUndefined(user.value)) {
          throw new Error("user is null or undefined");
        }

        if (isNullOrUndefined(user.value.activeSpendFileVersion)) {
          throw new Error("user.activeSpendFileVersion is null or undefined");
        }

        /**
         * RACE CONDITION GUARD
         *
         * A company/spend-file change may be in flight, meaning activeSpendFileVersion
         * (read below) doesn't yet match the data currently held in `data.dataStrategies`.
         * Saving now could persist stale combination-group data under the new context.
         *
         * See: docs/context/race-condition-company-change.md
         */
        if (globalFiltersStore.getDisableWatchers) {
          toast.error("Company or spend file context is still updating — please try saving again in a moment.");
          return;
        }

        const capped = [
          {
            key: "cappedTermsStrategy",
            isAllowed: data.cappedTermsStrategy,
          },
        ];

        const params = {
          spendUUID: user.value.activeSpendFileVersion["@id"],
          strategies: capped,
          callbackSuccess: () => {
            data.withChangesMax = false;

            data.changeInboth = false;

            data.cappedTermsStrategyInitial = data.cappedTermsStrategy;

            emit("send-changes", data.withChangesMax);

            if (data.withChanges) {
              emit("send-changes", true);
            }

            toast.success("Setup successful");

            if (data.saveNContinue !== null) {
              router.push(data.saveNContinue.fullPath);
            }

            if (props.otherTab !== "") {
              localStorage.removeItem("initialStrategies");
              emit("save-n-continue");
            }

            // Disable loading
            data.loading = false;
          },
          callbackError: () => {
            data.loading = false;
            toast.error("ERROR updating data");
          },
        };

        // Enable loading
        data.loading = true;

        homeStore.postConfigStrategies(params);
      } catch (error) {
        //
        if (import.meta.env.DEV) {
          console.log("** Error in saveMax. ", error);
        }
      }
    }

    /**
     * Save changes function for updating user data.
     *
     * @return {void}
     */
    function saveStrategies(): void {
      try {
        // Validate
        if (isNullOrUndefined(user.value)) {
          throw new Error("user is null or undefined");
        }

        if (isNullOrUndefined(user.value.activeSpendFileVersion)) {
          throw new Error("user.activeSpendFileVersion is null or undefined");
        }

        /**
         * RACE CONDITION GUARD
         *
         * A company/spend-file change may be in flight, meaning activeSpendFileVersion
         * (read below) doesn't yet match the data currently held in `data.dataStrategies`.
         * Saving now could persist stale combination-group data under the new context.
         *
         * See: docs/context/race-condition-company-change.md
         */
        if (globalFiltersStore.getDisableWatchers) {
          toast.error("Company or spend file context is still updating — please try saving again in a moment.");
          return;
        }

        data.showModal = false;

        data.dataStrategies.forEach((strategy: any) => {
          if (strategy.key === "peerGroupAvgStrategy") {
            peerGroupStandardOpenMoreSettings.value = false;
            strategy.minOccurrences = isNaN(Number(strategy.minOccurrences))
              ? 5
              : Number(strategy.minOccurrences);
          }
        });

        const params = {
          spendUUID: user.value.activeSpendFileVersion["@id"],
          strategies: data.dataStrategies,
          callbackSuccess: (callbackSuccessData: any) => {
            data.withChanges = false;

            emit("send-changes", data.withChanges);

            if (data.withChangesMax) {
              emit("send-changes", true);
            }

            toast.success("Setup successful");

            if (data.changeInboth) {
              saveMax();
            }
            //
            else {
              if (data.saveNContinue !== null) {
                router.push(data.saveNContinue.fullPath);
              }

              if (props.otherTab !== "") {
                localStorage.removeItem("initialStrategies");
                emit("save-n-continue");
              }
            }

            // Disable loading
            data.loading = false;
            retrieveStrategies();

          },
          callbackError: () => {
            data.loading = false;
            toast.error("ERROR updating data");
          },
        };

        // Enable loading
        data.loading = true;

        homeStore.postConfigStrategies(params);
      } catch (error) {
        //
        if (import.meta.env.DEV) console.log("** Error in saveChanges:", error);
      }
    }

    function closePopup(strategyKey: string): void {
      if (strategyKey === "peerGroupAvgStrategy") {
        peerGroupStandardOpenMoreSettings.value = false;
      } else if (strategyKey === "supplierStandardStrategy") {
        supplierStandardStrategyOpenMoreSettings.value = false;
      } else if (strategyKey === "parentSupplierMaxStrategy") {
        parentSupplierMaxStrategyOpenMoreSettings.value = false;
      }
    }

    function handleScroll() {
      // You can add a condition to ensure it's scrolling vertically
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 0) {
        // Close both popups on scroll
        peerGroupStandardOpenMoreSettings.value = false
        supplierStandardStrategyOpenMoreSettings.value = false
        scfPeerStandardStrategyOpenMoreSettings.value  = false
        parentSupplierMaxStrategyOpenMoreSettings.value = false
        data.regulatoryTermsStrategyOpenMoreSettings = false
      }
    }

    function handleWheel() {
      // Close popups when using the mouse wheel
      peerGroupStandardOpenMoreSettings.value = false;
      supplierStandardStrategyOpenMoreSettings.value = false
      scfPeerStandardStrategyOpenMoreSettings.value  = false
      parentSupplierMaxStrategyOpenMoreSettings.value = false
      data.regulatoryTermsStrategyOpenMoreSettings = false
    }

    function handlePopup(e: any) {
      // Check if the click happened inside any popup
      const clickedInsidePeerGroup = clickOutsideRelated.menuPopup(
        e,
        ".more-settings-peerGroupAvgStrategy", // Peer Group Strategy Button
        ".peerGroupAvgStrategy-popup-settings", // Peer Group Popup
      );

      const clickedInsideSupplierStandard = clickOutsideRelated.menuPopup(
        e,
        ".more-settings-supplierStandardStrategy", // Supplier Strategy Button
        ".supplierStandardStrategy-popup-settings", // Supplier Popup
      );

      // Check if click is inside the strategies-popup-settings container itself (any popup)
      const clickedInsideAnyPopup = e.target.closest(
        ".strategies-popup-settings",
      );

      // If click is outside all popups and their buttons, close the popups
      if (
        !clickedInsidePeerGroup &&
        !clickedInsideSupplierStandard &&
        !clickedInsideAnyPopup
      ) {
        peerGroupStandardOpenMoreSettings.value = false;
        supplierStandardStrategyOpenMoreSettings.value = false;
        scfPeerStandardStrategyOpenMoreSettings.value  = false
        parentSupplierMaxStrategyOpenMoreSettings.value = false
        data.regulatoryTermsStrategyOpenMoreSettings = false
      }
    }
    onMounted(() => {

      if (props.sectionDefault === "harmonizationGroups") {
        data.showHarmonization = true
        data.showStrategies = false
      } 

      /**
       * RACE CONDITION GUARD — onMounted
       *
       * This view can be mounted while a company/spend-file change is still in flight
       * (selectedProgramId and activeSpendFileVersion may briefly belong to different
       * companies). Skip the initial fetch here; the paired watch(getDisableWatchers)
       * below re-fetches once the transition settles.
       *
       * See: docs/context/race-condition-company-change.md
       */
      if (!globalFiltersStore.getDisableWatchers) {
        retrieveStrategies();
      }
      getTableData();
      document.addEventListener("click", handlePopup);
      document.addEventListener("scroll", handleScroll);
      document.addEventListener("wheel", handleWheel)
    });

    /**
     * RACE CONDITION RECOVERY
     *
     * Setup has no other reactivity to a company/spend-file switch: dataStrategies keeps
     * whatever was loaded for the PREVIOUS active spend file version until this fires. If a
     * Super Admin switches spend files while Setup stays open, saveStrategies()/saveMax()
     * would otherwise post stale combination-group data under the NEW active spend file
     * (AC-08 — save/read context must stay consistent). Re-fetch once the flag clears.
     *
     * See: docs/context/race-condition-company-change.md
     */
    watch(
      () => globalFiltersStore.getDisableWatchers,
      (newValue, oldValue) => {
        if (oldValue === true && newValue === false) {
          retrieveStrategies();
        }
      },
    );

    onUnmounted(() => {
      document.removeEventListener("click", handlePopup);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("wheel", handleWheel);
    });

    // *** END API ***



    /**  parentSupplierMaxStrategy */

    const parentSupplierMaxStrategyOpenMoreSettings = ref(false)

    // *** SCF Peer Group Standard - More Settings ***

    const scfPeerStandardStrategyOpenMoreSettings = ref(false);
    function scfPeerStandardStrategyMoreSettingsOnOptionClicked(
      type: CalculationMethod | null,
    ) {
      try {
        // Validate
        if (!isNullOrUndefined(type)) {
          const strategy = getStrategy("scfStandardStrategy");

          if (isNullOrUndefined(strategy)) {
            throw new Error("strategy not found");
          }

          strategy.calculationMethod = type;
        }

        // Toggle popup visibility
        scfPeerStandardStrategyOpenMoreSettings.value =
          !scfPeerStandardStrategyOpenMoreSettings.value;

        changeStatus();
      } catch (error) {
        if (import.meta.env.DEV)
          console.log(
            "** Error in scfPeerStandardStrategyMoreSettingsOnOptionClicked:",
            error,
          );
      }
    }

    // *** Peer Group Standard - More Settings ***

    const peerGroupStandardOpenMoreSettings = ref(false);

    function peerGroupStandardMoreSettingsOnOptionClicked(
      type: CalculationMethod | null,
    ) {
      try {
        // Validate
        if (!isNullOrUndefined(type)) {
          const strategy = getStrategy("peerGroupAvgStrategy");

          if (isNullOrUndefined(strategy)) {
            throw new Error("strategy not found");
          }

          strategy.calculationMethod = type;
        }

        // Toggle popup visibility
        peerGroupStandardOpenMoreSettings.value =
          !peerGroupStandardOpenMoreSettings.value;

        changeStatus();
      } catch (error) {
        if (import.meta.env.DEV)
          console.log(
            "** Error in supplierStandardStrategyMoreSettingsOnOptionClicked:",
            error,
          );
      }
    }

    // *** END Peer Group Standard - More Settings ***

    // *** Supplier Standard - More Settings ***

    const supplierStandardStrategyOpenMoreSettings = ref(false);

    function supplierStandardStrategyMoreSettingsOnOptionClicked(
      type: CalculationMethod | null,
    ) {
      try {
        // Validate
        if (!isNullOrUndefined(type)) {
          const strategy = getStrategy("supplierStandardStrategy");

          if (isNullOrUndefined(strategy)) {
            throw new Error("strategy not found");
          }

          strategy.calculationMethod = type;
        }

        // Toggle popup visibility
        supplierStandardStrategyOpenMoreSettings.value =
          !supplierStandardStrategyOpenMoreSettings.value;

        changeStatus();
      } catch (error) {
        if (import.meta.env.DEV)
          console.log(
            "** Error in supplierStandardStrategyMoreSettingsOnOptionClicked:",
            error,
          );
      }
    }

    // ** END Supplier Standard - More Settings ***

    // ** Regulatory Terms - More Settings ***

    function changeSettings(type: RegulatoryMethod | null,limit:boolean=false) {
      if (!isNullOrUndefined(type)) {
        const strategy = getStrategy("regulatoryTermsStrategy");

        if (isNullOrUndefined(strategy)) {
          if (import.meta.env.DEV)
            console.log(
              "** ? - changeSettings - strategy is null or undefined",
            );
          return;
        }

        strategy.regulatoryMethod = type;
        if (type !== 'NONE') {
          strategy.limitOpportunity = limitOpportunity.value;
        } else {
          strategy.limitOpportunity = true;
        }
      }

      if (!limit) {
        data.regulatoryTermsStrategyOpenMoreSettings = !data.regulatoryTermsStrategyOpenMoreSettings;
      }
      
      changeStatus();
    }

    // ** END Regulatory Terms - More Settings ***

    watch(
      () => props.showAlert,
      (newValue) => {
        data.showModal = newValue;
      },
    );

    //- This watchers is to close the modals popup
    watch(
      () => parentSupplierMaxStrategyOpenMoreSettings,
      (newValue) => {
        if (newValue) {
          peerGroupStandardOpenMoreSettings.value = false
          supplierStandardStrategyOpenMoreSettings.value = false
          scfPeerStandardStrategyOpenMoreSettings.value = false
          data.regulatoryTermsStrategyOpenMoreSettings = false
        }
      },
    );


    watch(
      () => data.regulatoryTermsStrategyOpenMoreSettings,
      (newValue) => {
        if (newValue) {
          peerGroupStandardOpenMoreSettings.value = false
          supplierStandardStrategyOpenMoreSettings.value = false
          scfPeerStandardStrategyOpenMoreSettings.value = false
          parentSupplierMaxStrategyOpenMoreSettings.value = false
        }
      },
    );

    watch(
      () => peerGroupStandardOpenMoreSettings.value,
      (newValue) => {
        if (newValue) {
          data.regulatoryTermsStrategyOpenMoreSettings = false
          supplierStandardStrategyOpenMoreSettings.value = false
          scfPeerStandardStrategyOpenMoreSettings.value = false
          parentSupplierMaxStrategyOpenMoreSettings.value = false
        }
      },
    );

    watch(
      () => supplierStandardStrategyOpenMoreSettings.value,
      (newValue) => {
        if (newValue) {
          data.regulatoryTermsStrategyOpenMoreSettings = false
          peerGroupStandardOpenMoreSettings.value = false
          scfPeerStandardStrategyOpenMoreSettings.value = false
          parentSupplierMaxStrategyOpenMoreSettings.value = false
        }
      },
    );

    watch(
      () => scfPeerStandardStrategyOpenMoreSettings.value,
      (newValue) => {
        if (newValue) {
          data.regulatoryTermsStrategyOpenMoreSettings = false
          supplierStandardStrategyOpenMoreSettings.value = false
          peerGroupStandardOpenMoreSettings.value = false
          parentSupplierMaxStrategyOpenMoreSettings.value = false
        }
      },
    );

    /**
     * Toggles the visibility of the "More Settings" menu dropdown for the SCF Peer Group Standard strategy.
     *
     * @param {string} strategyKey - The key of the strategy.
     * @param {boolean} strategyIsAllowed - Indicates whether the strategy is allowed.
     * @return {void} This function does not return a value.
     */
    //
    function showMoreSettingsMenuDropdown(
      strategyKey: string,
      strategyIsAllowed: boolean,
      event: MouseEvent
    ): void {
      // Stop click propagation to prevent handlePopup from triggering
      event.stopPropagation();

      // Guard: do not open the popup for strategies the user is not allowed to configure
      if (!strategyIsAllowed) return;

      // Open the popup for the respective strategy and close others
      switch (strategyKey) {
        case "scfStandardStrategy":
          scfPeerStandardStrategyOpenMoreSettings.value = true
          break;

        case "regulatoryTermsStrategy":
          data.regulatoryTermsStrategyOpenMoreSettings = true
          break;

        case "supplierStandardStrategy":
          supplierStandardStrategyOpenMoreSettings.value = true
          break;

        case "peerGroupAvgStrategy":
          peerGroupStandardOpenMoreSettings.value = true
          break;
        
        case "parentSupplierMaxStrategy":
          parentSupplierMaxStrategyOpenMoreSettings.value = true
          break

        default:
          break;
      }

      // Close other popups to ensure only one is open at a time
      closeOtherPopups(strategyKey);
    }

    function closeOtherPopups(openedStrategyKey: string) {
      // Close all other popups except the one that was just opened
      if (openedStrategyKey !== "scfStandardStrategy") {
        scfPeerStandardStrategyOpenMoreSettings.value = false;
      }
      if (openedStrategyKey !== "regulatoryTermsStrategy") {
        data.regulatoryTermsStrategyOpenMoreSettings = false;
      }
      if (openedStrategyKey !== "supplierStandardStrategy") {
        supplierStandardStrategyOpenMoreSettings.value = false;
      }
      if (openedStrategyKey !== "peerGroupAvgStrategy") {
        peerGroupStandardOpenMoreSettings.value = false;
      }
    }

    // *** Pending changes modal ***

    onBeforeRouteLeave((to) => {
      if (data.withChanges) {
        data.saveNContinue = to;
        data.showModal = true;
        return false;
      } else {
        localStorage.removeItem("initialStrategies");
        return true;
      }
    });


    function setValueToStrategy(e: any, field: any) {

      const strategy = data.dataStrategies.find(
          (strategy: any) => strategy.key === "parentSupplierMaxStrategy",
        );

        if (strategy) {
          switch (field) {
            case "parentSupplierMaxStrategySameSupplierIndustry":
            strategy.parentSupplierMaxStrategySameSupplierIndustry = e.value
              break;
            case "parentSupplierMaxStrategySameSupplierRegion":
            strategy.parentSupplierMaxStrategySameSupplierRegion = e.value
              break; 
            default:
              break;
          }
        } 
        setValidateDatas()
    }


    function setValidateDatas() {  
      
      data.keycheckBoxRender++
      const fromCacheStrategies = localStorage.getItem("initialStrategies");      
      if (JSON.stringify(data.dataStrategies) !== fromCacheStrategies) {
        data.withChanges = true        
      } else {
        data.withChanges = false
      }
      emit("send-changes", data.withChanges)
    }

    function validateVolumePercentage(value: number | undefined) {      
      if (value === null || value === undefined || (value < 0 || value > 100) ) {
        data.minimumSpendVolumeError = true
        data.withChanges = false
        emit("send-changes", data.withChanges)
      } else {
        data.minimumSpendVolumeError = false
        setValidateDatas()
      }      
    }

    function openMoreSettingsForNewStrategy(strategyKey: string) {
      if (props.spendFileInrecalculation) {
        return
      }
      if (strategyKey === "peerGroupStandard2Strategy") {
        showPeerGroupStandardModal.value = true
        data.keyComponentRender++
      } else if (strategyKey === "supplierStandard2Strategy") {
        showSupplierStandardModal.value = true
        data.keyComponentRender++
      }
    }
    // *** END Pending changes modal ***


    const supplierStandardModalData = computed(() => {
      const strategy = getStrategy("supplierStandard2Strategy");
      return strategy ?? []
      
    });

    function handleSupplierStandardModalSave(config: any) {
      data.dataStrategies = data.dataStrategies.map(strategy =>
        strategy.key === 'supplierStandard2Strategy' ? { ...strategy, ...config } : strategy
      )
      setValidateDatas()
    }


    const peerGroupStandardModalData = computed(() => {
      const strategy = getStrategy("peerGroupStandard2Strategy");
      return strategy ?? []
      
    });

    function handlePeerGroupStandardModalSave(config: any) {
      data.dataStrategies = data.dataStrategies.map(strategy =>
        strategy.key === 'peerGroupStandard2Strategy' ? { ...strategy, ...config } : strategy
      )
      setValidateDatas()
    }

    return {
      ...toRefs(data),
      cancel,
      changeMax,
      changeSettings,
      changeStatus,
      clickOutsideRelated,
      closePopup,
      discardChanges,
      handleScroll,
      modalConfirmSaveBtnOnClick,
      peerGroupStandardMoreSettingsOnOptionClicked,
      peerGroupStandardOpenMoreSettings,
      router,
      saveMax,
      saveStrategies,
      scfPeerStandardStrategyMoreSettingsOnOptionClicked,
      scfPeerStandardStrategyOpenMoreSettings,
      showMoreSettingsMenuDropdown,
      supplierStandardStrategyMoreSettingsOnOptionClicked,
      supplierStandardStrategyOpenMoreSettings,
      validateMinOccurrences,
      parentSupplierMaxStrategyOpenMoreSettings,
      setValueToStrategy,
      setValidateDatas,
      validateVolumePercentage,
      limitOpportunity,
      changeLimitOpportunity,
      showPeerGroupStandardModal,
      showSupplierStandardModal,
      openMoreSettingsForNewStrategy,
      supplierStandardModalData,
      handleSupplierStandardModalSave,
      peerGroupStandardModalData,
      handlePeerGroupStandardModalSave
    };
  },
});
</script>

<style lang="scss" scoped>
@use "src/resources/assets/styles/variables/colors" as *;
@use "sass:map";

.card {
  min-height: auto !important;

  &:hover {
    box-shadow: 0 1px 5px map.get($colors, "shadow");
  }
}

.actions-buttons {
  flex: 1 0 auto;
  justify-content: end;
  gap: 1rem;
}

.disabled-button {
  justify-content: start;
  gap: 1.5rem;
}

.enabled-button {
  gap: 15px;
  padding-left: 2px;
  margin-top: 9px;
}

.d-flex.flex-column.popup-settings {
  gap: 0.5rem;
}

.calculum-popup {
  min-width: 220px;
}

.section-values {    
  align-items: anchor-center;
}
.checkbox-opp-regulatory {
    display: flex;
    align-items: center;
  }
span.error {
  margin-top: 5px;
  color: map.get($colors, "error-500");
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
}
.k-checkbox-label-regulatory{
  margin: 0;
  padding: 0 !important;
  display: inline-flex;
  align-items: flex-end;
}
</style>
