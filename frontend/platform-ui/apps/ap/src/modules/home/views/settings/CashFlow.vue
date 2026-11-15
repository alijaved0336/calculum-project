<template>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.homePreference.confirm')" @close="cancel" v-if="showModal">
  <template v-slot:modalContent>
    <p>{{ $t('home.homePreference.unsavedChanges') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancel"><span>{{ $t('global.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="discardChanges"><span>{{ $t('global.discard') }}</span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="saveChanges"><span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal :size="'md'" :showClose="true" :title="$t('home.homeCompanySettings.adpVisibility.confirmTitle')" @close="cancelADPHide" v-if="showADPConfirmModal">
  <template v-slot:modalContent>
    <div class="adp-recalculation-warning"><i class="fa-solid fa-triangle-exclamation mr-2"></i><span class="font-semibold">{{ $t('home.homeCompanySettings.adpVisibility.confirmTitle') }}</span></div>
    <p class="mt-3">{{ $t('home.homeCompanySettings.adpVisibility.confirmBody1') }}</p>
    <p class="mt-2">{{ $t('home.homeCompanySettings.adpVisibility.confirmBody2') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancelADPHide"><span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="confirmADPHide"><span>{{ $t('home.homeCompanySettings.adpVisibility.confirmAccept') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.homeCompanySettings.paymentCycleModalTitle')" @close="() => showConfirmModal = false" v-if="showConfirmModal">
  <template v-slot:modalContent>
    <p>{{ $t('home.homeCompanySettings.paymentCycleModalContent') }}</p>
    <ul>
      <li>
        <div class="d-flex align-items-center"><span class="text-gray-600 text-base font-semibold mr-1">{{ $t('home.homeCompanySettings.paymentCycleModalContentOptions.programTitle') }}</span><span>{{ $t('home.homeCompanySettings.paymentCycleModalContentOptions.program') }}</span></div>
      </li>
      <li>
        <div class="d-flex align-items-center"><span class="text-gray-600 text-base font-semibold mr-1">{{ $t('home.homeCompanySettings.paymentCycleModalContentOptions.planTitle') }}</span><span>{{ $t('home.homeCompanySettings.paymentCycleModalContentOptions.plan') }}</span></div>
      </li>
      <li>
        <div class="d-flex align-items-center"><span class="text-gray-600 text-base font-semibold mr-1">{{ $t('home.homeCompanySettings.paymentCycleModalContentOptions.entityTitle') }}</span><span>{{ $t('home.homeCompanySettings.paymentCycleModalContentOptions.entity') }}</span></div>
      </li>
    </ul>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancelConfirm"><span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="savePaymentCycleChanges('patch')" :disabled="disabledButtonSpendFileInrecalculation"><span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal :size="'md'" :showClose="true" :title="$t('home.homeCompanySettings.nineBoxLimits.modal.title')" @close="closeManualNineBoxLimits" v-if="editingBoxType">
  <template v-slot:modalContent>
    <p class="text-gray-600 text-base font-semibold">{{ $t('home.homeCompanySettings.nineBoxLimits.boxes.' + editingBoxType) }}</p>
    <p class="text-gray-500 text-sm mt-2">{{ $t('home.homeCompanySettings.nineBoxLimits.modal.intro') }}</p>
    <div class="d-flex flex-column mt-3">
      <label class="text-gray-600 text-base" for="nine-box-lower-limit">{{ $t('home.homeCompanySettings.nineBoxLimits.modal.lowerLimit') }}</label>
      <input id="nine-box-lower-limit" class="form-control" type="number" step="any" v-model="editingLowerLimit"/>
    </div>
    <div class="d-flex flex-column mt-3">
      <label class="text-gray-600 text-base" for="nine-box-upper-limit">{{ $t('home.homeCompanySettings.nineBoxLimits.modal.upperLimit') }}</label>
      <input id="nine-box-upper-limit" class="form-control" type="number" step="any" v-model="editingUpperLimit"/>
    </div>
    <p class="text-danger text-sm mt-3" v-if="manualLimitsError">{{ manualLimitsError }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="closeManualNineBoxLimits"><span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" :disabled="!!manualLimitsError || nineBoxLimitsDisabled" @click="saveManualNineBoxLimits"><span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal :size="'md'" :showClose="true" :title="$t('home.homeCompanySettings.buyerLeverageLimits.confirmTitle')" @close="data.showBuyerLeverageLimitsConfirm = false" v-if="showBuyerLeverageLimitsConfirm">
  <template v-slot:modalContent>
    <div class="buyer-leverage-limits-confirm-warning"><i class="fa-solid fa-triangle-exclamation mr-2"></i><span>{{ $t('home.homeCompanySettings.buyerLeverageLimits.confirmBody') }}</span></div>
    <table class="table mt-3">
      <thead>
        <tr>
          <th>{{ $t('home.homeCompanySettings.buyerLeverageLimits.confirmRule') }}</th>
          <th class="text-right">{{ $t('home.homeCompanySettings.buyerLeverageLimits.confirmCurrent') }}</th>
          <th class="text-right">{{ $t('home.homeCompanySettings.buyerLeverageLimits.confirmNew') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="change in buyerLeverageChangedRules" :key="change.rule">
          <td>{{ change.rule }}</td>
          <td class="text-right">{{ change.current }}</td>
          <td class="text-right font-semibold">{{ change.new }}</td>
        </tr>
      </tbody>
    </table>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="data.showBuyerLeverageLimitsConfirm = false"><span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" :disabled="saveBuyerLeverageLimitsDisabled" @click="confirmSaveBuyerLeverageLimits"><span>{{ $t('home.homeCompanySettings.buyerLeverageLimits.saveAndRecalculate') }}</span></button>
  </template>
</CalculumModal>
<CalculumLoading v-if="loadingPatch" :modal="true"></CalculumLoading>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<div class="row">
  <div class="col">
    <div class="card" style="min-height: auto; height: auto">
      <div class="card-body">
        <div class="row" id="show-adp-visibility" @click="showADPVisibility = !showADPVisibility">
          <div class="col-11 cursor-pointer"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('home.homeCompanySettings.adpVisibility.title') }}</span>
            <p class="text-base mt-4 cursor-pointer">{{ $t('home.homeCompanySettings.adpVisibility.description') }}</p>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showADPVisibility"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showADPVisibility"></i></div>
        </div>
        <div class="row custom_height" v-if="showADPVisibility">
          <div class="col-12 cursor-pointer d-flex disabled-button">
            <label class="rounded-checkbox">
              <input class="styled-checkbox" type="radio" value="show" v-model="adpVisibility" @change="onADPChange" :disabled="disabledButtonSpendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio': adpVisibility !== 'show', 'no-hover': disabledButtonSpendFileInrecalculation}">&nbsp;</span>
            </label>
            <div class="d-flex flex-column" @click="disabledButtonSpendFileInrecalculation ? null : (adpVisibility = 'show', onADPChange())" :class="{'no-hover': disabledButtonSpendFileInrecalculation}"><span class="text-gray-600 text-base font-semibold">{{ $t('home.homeCompanySettings.adpVisibility.showADP') }}</span><span class="text-gray-500 text-sm">{{ $t('home.homeCompanySettings.adpVisibility.showADPDescription') }}</span></div>
          </div>
          <div class="col-12 cursor-pointer d-flex disabled-button mt-2">
            <label class="rounded-checkbox">
              <input class="styled-checkbox" type="radio" value="hide" v-model="adpVisibility" @change="onADPChange" :disabled="disabledButtonSpendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio': adpVisibility !== 'hide', 'no-hover': disabledButtonSpendFileInrecalculation}">&nbsp;</span>
            </label>
            <div class="d-flex flex-column" @click="disabledButtonSpendFileInrecalculation ? null : (adpVisibility = 'hide', onADPChange())" :class="{'no-hover': disabledButtonSpendFileInrecalculation}"><span class="text-gray-600 text-base font-semibold">{{ $t('home.homeCompanySettings.adpVisibility.hideADP') }}</span><span class="text-gray-500 text-sm">{{ $t('home.homeCompanySettings.adpVisibility.hideADPDescription') }}</span></div>
          </div>
          <div class="row w-100">
            <div class="col-12 d-flex">
              <div class="row w-100">
                <div class="col-12 d-flex actions-buttons">
                  <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="saveADPVisibility" :disabled="!adpWithChanges || disabledButtonSpendFileInrecalculation"><span>{{ $t('global.save') }}</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="card mt-3" style="min-height: auto; height: auto">
      <div class="card-body">
        <div class="row" @click="showPaymentCycleSection = !showPaymentCycleSection">
          <div class="col-11 cursor-pointer">
            <div class="d-flex align-items-center"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('home.homeCompanySettings.paymentCycleFloat') }}</span>
              <CalculumTooltipIcon class="ml-2" :infoText="$t('home.homeCompanySettings.paymentCycleFloatTooltip')" :size="15" @click.stop></CalculumTooltipIcon>
            </div>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showPaymentCycleSection"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showPaymentCycleSection"></i></div>
        </div>
        <div class="payment-cycle-content" v-if="showPaymentCycleSection">
          <div class="row container-form mb-3 mt-3">
            <div class="col-xl-6">
              <div class="row mt-3 d-flex">
                <div class="col-12">
                  <div class="form-group">
                    <label for="selectPaymentCycle">
                      <select class="form-control required" id="selectPaymentCycle" name="selectPaymentCycle" v-model="paymentCycle" :disabled="disabledButtonSpendFileInrecalculation" @change="changePaymentCycle">
                        <option value="daily" selected="selected">{{ $t('home.homeCompanySettings.paymentCycleOptions.daily') }}</option>
                        <option value="weekly">{{ $t('home.homeCompanySettings.paymentCycleOptions.weekly') }}</option>
                        <option value="biWeekly">{{ $t('home.homeCompanySettings.paymentCycleOptions.biWeekly') }}</option>
                        <option value="monthly">{{ $t('home.homeCompanySettings.paymentCycleOptions.monthly') }}</option>
                        <option value="quarterly">{{ $t('home.homeCompanySettings.paymentCycleOptions.quarterly') }}</option>
                        <option value="other">{{ $t('home.homeCompanySettings.paymentCycleOptions.other') }}</option>
                      </select><span>{{ $t('home.homeCompanySettings.paymentCycleOptions.selectPaymentCycleFrequency') }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-xl-6">
              <div class="row mt-3 d-flex">
                <div class="col-12">
                  <div class="form-group">
                    <label for="paymentCycleDays">
                      <input class="form-control" id="paymentCycleDays" type="number" name="paymentCycleDays" :placeholder="$t('home.homeCompanySettings.paymentCycleDaysOther')" v-model="paymentCycleDays" :disabled="paymentCycle !== 'other' || disabledButtonSpendFileInrecalculation" @input="handlePaymentCycleDaysOtherInput"/><span>{{ $t('home.homeCompanySettings.paymentCycleDaysPlaceholder') }}</span>
                    </label>
                  </div>
                </div>
                <div class="col-12"><span class="error" v-if="paymentCycle === 'other' && !isPaymentCycleDaysValid">{{ $t('home.homeCompanySettings.paymentCycleDaysOther') }}</span></div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-12 d-flex actions-buttons mt-10">
              <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="savePaymentCycleChanges('patch')" :disabled="!isPaymentCycleDaysValid || disabledButtonSpendFileInrecalculation"><span>{{ $t('global.save') }}</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="card mt-3" style="min-height: auto; height: auto">
      <div class="card-body">
        <div class="row" id="show-nine-box-limits" @click="showNineBoxLimits = !showNineBoxLimits">
          <div class="col-11 cursor-pointer"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('home.homeCompanySettings.nineBoxLimits.title') }}</span>
            <p class="text-base mt-4 cursor-pointer">{{ $t('home.homeCompanySettings.nineBoxLimits.description') }}</p>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showNineBoxLimits"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showNineBoxLimits"></i></div>
        </div>
        <div class="row mt-3" v-if="showNineBoxLimits">
          <div class="col-12 mb-2" v-if="!hasAnyNineBoxLimits"><span class="text-gray-500 text-sm">{{ $t('home.homeCompanySettings.nineBoxLimits.empty') }}</span></div>
          <div class="col-12 table-responsive">
            <table class="table nine-box-limits-table">
              <thead>
                <tr>
                  <th scope="col">{{ $t('home.homeCompanySettings.nineBoxLimits.box') }}</th>
                  <th class="text-right" scope="col">{{ $t('home.homeCompanySettings.nineBoxLimits.lowerLimit') }}</th>
                  <th class="text-right" scope="col">{{ $t('home.homeCompanySettings.nineBoxLimits.upperLimit') }}</th>
                  <th class="text-center" scope="col">{{ $t('home.homeCompanySettings.nineBoxLimits.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in nineBoxLimitRows" :key="row.boxType">
                  <td><span class="mr-2">{{ $t('home.homeCompanySettings.nineBoxLimits.boxes.' + row.boxType) }}</span><span class="nine-box-limits-badge" :class="row.hasLimits ? 'is-configured' : 'is-unset'" :data-box-type="row.boxType">{{ row.hasLimits ? $t('home.homeCompanySettings.nineBoxLimits.configured') : $t('home.homeCompanySettings.nineBoxLimits.unset') }}</span></td>
                  <td class="text-right"><i class="nine-box-limits-source mr-2" :class="row.isManual ? 'fa-solid fa-pen' : 'fa-solid fa-wand-magic-sparkles'" :data-box-type="row.boxType" :data-source="row.source" :title="$t('home.homeCompanySettings.nineBoxLimits.source.' + row.source)" v-if="row.hasLimits"></i>{{ row.lowerLimit }}</td>
                  <td class="text-right">{{ row.upperLimit }}</td>
                  <td class="nine-box-limits-actions">
                    <button class="btn outline-primary-btn font-md" type="button" :disabled="nineBoxLimitsDisabled" :data-box-type="row.boxType" data-action="recalculate" @click="recalculateNineBoxLimits(row.boxType)" v-if="!row.isManual"><i class="fa-solid fa-arrows-rotate mr-2"></i><span>{{ $t('home.homeCompanySettings.nineBoxLimits.recalculate') }}</span></button>
                    <button class="btn outline-primary-btn font-md" type="button" :disabled="nineBoxLimitsDisabled" :data-box-type="row.boxType" data-action="reset" @click="resetNineBoxLimits(row.boxType)" v-if="row.canReset"><i class="fa-solid fa-rotate-left mr-2"></i><span>{{ $t('home.homeCompanySettings.nineBoxLimits.resetToDefault') }}</span></button>
                    <button class="btn btn-primary font-md" type="button" :disabled="nineBoxLimitsDisabled" :data-box-type="row.boxType" data-action="manual" @click="openManualNineBoxLimits(row.boxType)"><i class="fa-solid fa-pen-to-square mr-2"></i><span>{{ $t('home.homeCompanySettings.nineBoxLimits.setManually') }}</span></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="card mt-3" style="min-height: auto; height: auto" v-if="userIsSuperAdmin || userDataRoleEnabled">
      <div class="card-body">
        <div class="row">
          <div class="col-12">
            <span class="text-gray-600 text-base font-semibold">{{ $t('home.homeCompanySettings.buyerLeverageLimits.title') }}</span>
            <span class="buyer-leverage-limits-badge ml-2">{{ $t('home.homeCompanySettings.buyerLeverageLimits.superAdminOnly') }}</span>
            <p class="text-base mt-2 text-gray-500">{{ $t('home.homeCompanySettings.buyerLeverageLimits.description') }}</p>
          </div>
        </div>
        <div class="row mt-4 buyer-leverage-limits-row" v-for="row in buyerLeverageRows" :key="row.level">
          <div class="col-2"><span class="buyer-leverage-limits-pill" :class="'is-' + row.level">{{ row.label }}</span></div>
          <div class="col-10 d-flex align-items-center flex-wrap">
            <span class="mr-2">{{ $t('home.homeCompanySettings.buyerLeverageLimits.ruleIfShareGreaterThan') }}</span>
            <div class="buyer-leverage-limits-input-group mr-2">
              <input type="number" step="0.01" min="0" class="form-control" :class="{ 'is-edited': row.percent.edited }"
                v-model="data[row.percentKey]" />
              <span class="ml-1">%</span>
            </div>
            <span class="mr-2">{{ $t('home.homeCompanySettings.buyerLeverageLimits.ruleOrVolumeGreaterThan') }}</span>
            <div class="buyer-leverage-limits-input-group mr-2">
              <span class="mr-1">$</span>
              <input type="number" step="1" min="0" class="form-control" :class="{ 'is-edited': row.amount.edited }"
                v-model="data[row.amountKey]" />
            </div>
            <div class="buyer-leverage-limits-state ml-auto text-right">
              <template v-if="row.percent.edited || row.amount.edited">
                <div v-if="row.percent.edited">
                  <span class="buyer-leverage-limits-edited-dot"></span>
                  <span class="text-sm">{{ $t('home.homeCompanySettings.buyerLeverageLimits.percentEdited') }}</span>
                  <a href="#" class="ml-1 font-semibold" @click.prevent="resetBuyerLeverageField(row.level, 'percent')">{{ $t('home.homeCompanySettings.buyerLeverageLimits.reset') }}</a>
                  <div class="text-xs text-gray-500">{{ $t('home.homeCompanySettings.buyerLeverageLimits.default') }} {{ row.percent.defaultDisplay }}</div>
                </div>
                <div v-if="row.amount.edited">
                  <span class="buyer-leverage-limits-edited-dot"></span>
                  <span class="text-sm">{{ $t('home.homeCompanySettings.buyerLeverageLimits.amountEdited') }}</span>
                  <a href="#" class="ml-1 font-semibold" @click.prevent="resetBuyerLeverageField(row.level, 'amount')">{{ $t('home.homeCompanySettings.buyerLeverageLimits.reset') }}</a>
                  <div class="text-xs text-gray-500">{{ $t('home.homeCompanySettings.buyerLeverageLimits.default') }} {{ row.amount.defaultDisplay }}</div>
                </div>
              </template>
              <template v-else-if="row.isOverride">
                <span class="buyer-leverage-limits-override-badge">{{ $t('home.homeCompanySettings.buyerLeverageLimits.override') }}</span>
                <a href="#" class="ml-1 font-semibold" @click.prevent="resetBuyerLeverageRow(row.level)">{{ $t('home.homeCompanySettings.buyerLeverageLimits.reset') }}</a>
                <div class="text-xs text-gray-500">{{ $t('home.homeCompanySettings.buyerLeverageLimits.default') }} {{ row.percent.defaultDisplay }} / {{ row.amount.defaultDisplay }}</div>
              </template>
              <template v-else>
                <span class="text-sm text-gray-500">{{ $t('home.homeCompanySettings.buyerLeverageLimits.default') }}</span>
              </template>
            </div>
          </div>
          <div class="col-12 d-flex" v-if="row.percent.error || row.amount.error">
            <span class="col-2"></span>
            <span class="text-danger text-sm mr-4">{{ row.percent.error }}</span>
            <span class="text-danger text-sm">{{ row.amount.error }}</span>
          </div>
        </div>
        <div class="row mt-4">
          <div class="col-2"><span class="buyer-leverage-limits-pill is-low">{{ $t('home.homeCompanySettings.buyerLeverageLimits.low') }}</span></div>
          <div class="col-10 d-flex align-items-center"><span>{{ $t('home.homeCompanySettings.buyerLeverageLimits.lowDescription') }}</span></div>
        </div>
        <div class="row mt-4 buyer-leverage-limits-footer align-items-center">
          <div class="col-6">
            <span class="font-semibold mr-2" v-if="buyerLeverageDirtyCount > 0">{{ $t('home.homeCompanySettings.buyerLeverageLimits.unsavedChanges', { count: buyerLeverageDirtyCount }, buyerLeverageDirtyCount) }} ·</span>
            <span class="text-gray-500 text-sm">{{ buyerLeverageLastChangedText }}</span>
          </div>
          <div class="col-6 d-flex justify-content-end">
            <button class="btn outline-secondary-btn font-md mr-2" type="button" :disabled="!canResetAllBuyerLeverageLimits" @click="resetAllBuyerLeverageLimits">{{ $t('home.homeCompanySettings.buyerLeverageLimits.resetAllToDefaults') }}</button>
            <button class="btn outline-secondary-btn font-md mr-2" type="button" :disabled="buyerLeverageDirtyCount === 0" @click="cancelBuyerLeverageLimits">{{ $t('global.cancel') }}</button>
            <button class="btn btn-primary font-md" type="button" :disabled="saveBuyerLeverageLimitsDisabled" @click="openSaveBuyerLeverageLimitsConfirm">{{ $t('home.homeCompanySettings.buyerLeverageLimits.saveAndRecalculate') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, watch, onMounted, onUnmounted, computed } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { onBeforeRouteLeave } from 'vue-router'
import router from '@/services/router'
import { CalculumLoading } from '@ada/design-system'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { useHomeStore } from '@/stores/home'
import { useI18n } from 'vue-i18n'
import { useSpendFile, useCompany, useUser } from '@/composables'
import { useToast } from 'vue-toastification'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useEntityCardStore } from '@/stores/entityCard'
import { useSubscribeStore } from '@/stores/subscribe'
import useFirebase from '@/composables/firebase/useFirebase'
import { changeToCurrency, formatISODateToUS, getNumberWithDecimals } from '@/utils/FormatData'
import type { BuyerLeverageLimits, NineBoxThresholdsActive, NineBoxType } from '@/types'
import { getBuyerLeverageLimits, getSpendFileVersion, postBuyerLeverageLimits, postNineBoxThresholds } from '@/modules/home/api'
import { getProgram } from '@/modules/home/analyze/api'

/**
 * Rounds a stored fraction (e.g. 0.07) to the 2-decimal percent the Buyer Leverage inputs
 * display/accept (7.00) - comparing against the raw `fraction * 100` instead would false-positive
 * as "edited" on values like 0.07 (0.07 * 100 === 7.000000000000001 in IEEE 754), and on anything
 * stored with more than 2 decimals, since the input itself is always rounded to 2. Pure function,
 * so it lives at module scope rather than being recreated on every component instance.
 */
function toRoundedPercent(fraction: number): number {
  return Number((fraction * 100).toFixed(2))
}

export default defineComponent({
  name: 'CashFlowSetup',
  components: { CalculumModal, CalculumLoading, CalculumTooltipIcon },
  props: {
    showAlert: { type: Boolean },
    otherTab: { type: String, default: null },
    sectionDefault: { type: String, default: null },
    spendFileInrecalculation: { type: Boolean, default: false }
  },
  emits: ['send-changes', 'save-n-continue', 'discard-n-continue', 'cancel-n-continue'],
  setup(props, { emit }) {
    const homeStore = useHomeStore()
    const toast = useToast()
    const userStore = useUserStore()
    const entityCardStore = useEntityCardStore()
    const subscribeStore = useSubscribeStore()
    const { subscribeToPrograms, fnSetUnsubscribeProgram } = useFirebase()
    const { spendFileVersionActiveId } = useSpendFile()
    const { companyActiveId, usevCardGroupsEnabled } = useCompany()
    const { useFeatureVirtualCard, useFeature9BoxesFinancing, userPartnerRoleEnabled, userIsSuperAdmin, userDataRoleEnabled } = useUser()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    interface CashFlowSettings {
      loading: boolean
      saveNContinue: any
      showModal: boolean
      showADPVisibility: boolean
      adpVisibility: 'show' | 'hide'
      adpVisibilityOriginal: 'show' | 'hide'
      showADPConfirmModal: boolean
      showPaymentCycleSection: boolean
      paymentCycle: string
      paymentCycleDays: number
      paymentCycleDaysInit: number
      showConfirmModal: boolean
      pcWithChanges: boolean
      isSavingPaymentCycle: boolean
      clickOnCancel: boolean
      savingBeforeLeaving: boolean
      loadingPatch: boolean
      showNineBoxLimits: boolean
      nineBoxThresholds: NineBoxThresholdsActive | null
      // WI#19582: the "set limits manually" modal. `editingBoxType` doubles as the open/closed flag,
      // because there is nothing to show without a row to edit.
      editingBoxType: NineBoxType | null
      editingLowerLimit: string
      editingUpperLimit: string
      applyingBoxType: NineBoxType | null
      externalFinancingEnabled: boolean
      // AB#86ak0mkx0: Buyer Leverage Limits
      buyerLeverageLimits: BuyerLeverageLimits | null
      buyerLeverageMediumPercentInput: string
      buyerLeverageMediumAmountInput: string
      buyerLeverageHighPercentInput: string
      buyerLeverageHighAmountInput: string
      showBuyerLeverageLimitsConfirm: boolean
      savingBuyerLeverageLimits: boolean
    }

    const data = reactive<CashFlowSettings>({
      loading: false,
      saveNContinue: null,
      showModal: props.showAlert,
      showADPVisibility: true,
      adpVisibility: 'show',
      adpVisibilityOriginal: 'show',
      showADPConfirmModal: false,
      showPaymentCycleSection: false,
      paymentCycle: 'daily',
      paymentCycleDays: 0,
      paymentCycleDaysInit: 0,
      showConfirmModal: false,
      pcWithChanges: false,
      isSavingPaymentCycle: false,
      clickOnCancel: false,
      savingBeforeLeaving: false,
      loadingPatch: false,
      showNineBoxLimits: false,
      nineBoxThresholds: null,
      editingBoxType: null,
      editingLowerLimit: '',
      editingUpperLimit: '',
      applyingBoxType: null,
      externalFinancingEnabled: false,
      buyerLeverageLimits: null,
      buyerLeverageMediumPercentInput: '',
      buyerLeverageMediumAmountInput: '',
      buyerLeverageHighPercentInput: '',
      buyerLeverageHighAmountInput: '',
      showBuyerLeverageLimitsConfirm: false,
      savingBuyerLeverageLimits: false,
    })

    /**
     * WI#19582: the table mirrors the 9-box selector in Analyze (`getOptionsAvailable()` in
     * analyze/views/NineBoxesCF.vue), so a company only gets the limits of the boxes it can actually
     * open. What matters is what is enabled today, not what was calculated: a company that used to
     * have VCard keeps its stored pair, and the row stays hidden while the feature is off.
     *
     * The selector's names are not the stored keys; the back end labels the mapping in
     * AnalyzeProgramBoxesManager.php:898-916 — "SCF Provider" is `scf`, and "SCF" is `economicProfit`.
     */
    const visibleNineBoxTypes = computed<NineBoxType[]>(() => {
      const boxTypes: NineBoxType[] = ['cashFlow']
      const financingEnabled = data.externalFinancingEnabled && useFeature9BoxesFinancing.value

      if (financingEnabled && userPartnerRoleEnabled.value) boxTypes.push('scf')
      if (financingEnabled) boxTypes.push('economicProfit')
      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) boxTypes.push('vCard')

      return boxTypes
    })

    /**
     * WI#18968: `med` is the box's lower limit (the floor of Medium) and `high` the upper one (the
     * floor of High).
     *
     * Read from `data.nineBoxThresholds`, which onMounted fills from GET /api/spend_file_versions.
     * Reading `userStore.getUser.activeSpendFileVersion` instead left this empty until a full page
     * reload: the profile payload is fetched once per session, so a recalculation never reached it.
     *
     * WI#19582: every box the company can open gets a row, captured or not. A box with no limits
     * still needs its Recalculate button — that is precisely how it gets its first pair — so
     * dropping the row would hide the only way out of the empty state.
     *
     * The values come from `nineBoxThresholdsActive`, where the back end has already resolved which
     * of the box's two pairs classifies: the user's whenever they set one, the platform's otherwise.
     * `source` is what the row marks with an icon, and it also picks the button — there is nothing
     * to recalculate towards while an override is in force, and nothing to reset while there is no
     * override. `canReset` additionally requires a calculated pair to exist: on a spend file that
     * was never calculated the override has nowhere to go back to.
     */
    const nineBoxLimitRows = computed(() => {
      const thresholds = data.nineBoxThresholds ?? {}

      return visibleNineBoxTypes.value.map((boxType) => {
        const limits = thresholds[boxType]
        const notSet = translate.t('home.homeCompanySettings.nineBoxLimits.notSet')

        return {
          boxType,
          hasLimits: !!limits,
          source: limits?.source ?? 'calculated',
          isManual: limits?.source === 'manual',
          canReset: limits?.source === 'manual' && limits.hasCalculated,
          lowerLimit: limits ? getNumberWithDecimals(changeToCurrency(limits.med)) : notSet,
          upperLimit: limits ? getNumberWithDecimals(changeToCurrency(limits.high)) : notSet,
          // Plain numbers in display currency, for prefilling the modal.
          rawLowerLimit: limits ? changeToCurrency(limits.med) : null,
          rawUpperLimit: limits ? changeToCurrency(limits.high) : null,
        }
      })
    })

    /** The empty message only makes sense when not a single box has been captured yet. */
    const hasAnyNineBoxLimits = computed(() => nineBoxLimitRows.value.some((row) => row.hasLimits))

    /**
     * WI#19582: the reclassification runs on one program — the one the user is working on.
     *
     * Setup is reachable without ever opening a program, so the selected one can be empty; the
     * profile's default is the fallback the rest of the app already uses for exactly this
     * (`programSelectedId ?? user.activeProgramDefaultId`, e.g. SupplierGrid.vue:156). With neither,
     * there is nothing to apply the limits to and both buttons stay disabled.
     */
    const activeProgramUuid = computed(
      () => entityCardStore.getSelectedProgram ?? userStore.getUser?.activeProgramDefaultId ?? '')

    const nineBoxLimitsDisabled = computed(
      () => disabledButtonSpendFileInrecalculation.value ||
        data.applyingBoxType !== null ||
        !activeProgramUuid.value)

    /**
     * Client-side twin of the endpoint's checks. The server is the real gate; this only spares the
     * user a round trip for something the form can already see.
     */
    const manualLimitsError = computed(() => {
      const prefix = 'home.homeCompanySettings.nineBoxLimits.modal.'
      const lower = Number(data.editingLowerLimit)
      const upper = Number(data.editingUpperLimit)

      if (data.editingLowerLimit === '' || data.editingUpperLimit === '' ||
        !Number.isFinite(lower) || !Number.isFinite(upper)) {
        return translate.t(prefix + 'mustBeNumbers')
      }
      if (lower < 0) return translate.t(prefix + 'mustBePositive')
      if (upper <= lower) return translate.t(prefix + 'mustBeGreater')

      return ''
    })

    const adpWithChanges = computed(() => data.adpVisibility !== data.adpVisibilityOriginal)

    /**
     * Shared validation for one Buyer Leverage input. `floor` is the other level's current numeric
     * value for the "must be greater than Medium" check - omitted for Medium's own fields, which
     * have no lower bound of their own (the non-negative check below still applies to both, since
     * the native `min="0"` on the input isn't enforced by v-model).
     */
    function buyerLeverageFieldError(input: string, num: number, prefix: string, floor = -Infinity): string {
      if (input === '' || !Number.isFinite(num)) return translate.t(prefix + 'enterValue')
      if (num < 0) return translate.t(prefix + 'mustBeNonNegative')
      if (num <= floor) return translate.t(prefix + 'mustBeGreaterThanMedium')
      return ''
    }

    /**
     * AB#86ak0mkx0: one row (High or Medium) of the Buyer Leverage Limits card - current input,
     * whether it differs from what's saved (unsaved edit) vs from the Company's default (override),
     * and inline validation. Low has no stored row (it's just "everyone else").
     */
    const buyerLeverageRows = computed(() => {
      const limits = data.buyerLeverageLimits
      if (!limits) return []

      const prefix = 'home.homeCompanySettings.buyerLeverageLimits.'
      const medPercentNum = Number(data.buyerLeverageMediumPercentInput)
      const medAmountNum = Number(data.buyerLeverageMediumAmountInput)
      const highPercentNum = Number(data.buyerLeverageHighPercentInput)
      const highAmountNum = Number(data.buyerLeverageHighAmountInput)

      const medDefaultPercent = toRoundedPercent(limits.medium.defaultPercent)
      const medDefaultAmount = limits.medium.defaultAmount
      const highDefaultPercent = toRoundedPercent(limits.high.defaultPercent)
      const highDefaultAmount = limits.high.defaultAmount

      // Null percent/amount means "no override recorded" - that is the default, not zero.
      const medSavedPercent = toRoundedPercent(limits.medium.percent ?? limits.medium.defaultPercent)
      const medSavedAmount = limits.medium.amount ?? limits.medium.defaultAmount
      const highSavedPercent = toRoundedPercent(limits.high.percent ?? limits.high.defaultPercent)
      const highSavedAmount = limits.high.amount ?? limits.high.defaultAmount

      const highPercentError = buyerLeverageFieldError(data.buyerLeverageHighPercentInput, highPercentNum, prefix, medPercentNum)
      const highAmountError = buyerLeverageFieldError(data.buyerLeverageHighAmountInput, highAmountNum, prefix, medAmountNum)
      const medPercentError = buyerLeverageFieldError(data.buyerLeverageMediumPercentInput, medPercentNum, prefix)
      const medAmountError = buyerLeverageFieldError(data.buyerLeverageMediumAmountInput, medAmountNum, prefix)

      const high = {
        level: 'high' as const,
        label: translate.t(prefix + 'high'),
        percentKey: 'buyerLeverageHighPercentInput' as keyof CashFlowSettings,
        amountKey: 'buyerLeverageHighAmountInput' as keyof CashFlowSettings,
        isOverride: highSavedPercent !== highDefaultPercent || highSavedAmount !== highDefaultAmount,
        percent: {
          // A field left blank/invalid is always "edited", even if its last valid numeric value
          // happened to match what's saved - otherwise Cancel (disabled when nothing is dirty)
          // has no way to recover it, and leaving the tab shows no unsaved-changes warning.
          edited: !!highPercentError || highPercentNum !== highSavedPercent,
          error: highPercentError,
          defaultDisplay: highDefaultPercent.toFixed(2) + '%',
        },
        amount: {
          edited: !!highAmountError || highAmountNum !== highSavedAmount,
          error: highAmountError,
          defaultDisplay: '$' + highDefaultAmount.toLocaleString(),
        },
      }

      const medium = {
        level: 'medium' as const,
        label: translate.t(prefix + 'medium'),
        percentKey: 'buyerLeverageMediumPercentInput' as keyof CashFlowSettings,
        amountKey: 'buyerLeverageMediumAmountInput' as keyof CashFlowSettings,
        isOverride: medSavedPercent !== medDefaultPercent || medSavedAmount !== medDefaultAmount,
        percent: {
          edited: !!medPercentError || medPercentNum !== medSavedPercent,
          error: medPercentError,
          defaultDisplay: medDefaultPercent.toFixed(2) + '%',
        },
        amount: {
          edited: !!medAmountError || medAmountNum !== medSavedAmount,
          error: medAmountError,
          defaultDisplay: '$' + medDefaultAmount.toLocaleString(),
        },
      }

      return [high, medium]
    })

    const buyerLeverageDirtyCount = computed(() =>
      buyerLeverageRows.value.reduce((count, row) => count + (row.percent.edited ? 1 : 0) + (row.amount.edited ? 1 : 0), 0))

    const buyerLeverageWithChanges = computed(() => buyerLeverageDirtyCount.value > 0)

    const buyerLeverageHasError = computed(() =>
      buyerLeverageRows.value.some((row) => !!row.percent.error || !!row.amount.error))

    const canResetAllBuyerLeverageLimits = computed(() => {
      const limits = data.buyerLeverageLimits
      if (!limits) return false
      return (
        Number(data.buyerLeverageMediumPercentInput) !== toRoundedPercent(limits.medium.defaultPercent) ||
        Number(data.buyerLeverageMediumAmountInput) !== limits.medium.defaultAmount ||
        Number(data.buyerLeverageHighPercentInput) !== toRoundedPercent(limits.high.defaultPercent) ||
        Number(data.buyerLeverageHighAmountInput) !== limits.high.defaultAmount
      )
    })

    const buyerLeverageLastChangedText = computed(() => {
      const limits = data.buyerLeverageLimits
      const prefix = 'home.homeCompanySettings.buyerLeverageLimits.'
      if (!limits || !limits.lastChangedBy || !limits.lastChangedAt) {
        return translate.t(prefix + 'lastChangedNever')
      }
      return translate.t(prefix + 'lastChangedBy', {
        date: formatISODateToUS(limits.lastChangedAt),
        user: limits.lastChangedBy,
      })
    })

    /** AC-07: the confirmation's Current/New table - only the rules that actually changed. */
    const buyerLeverageChangedRules = computed(() => {
      const limits = data.buyerLeverageLimits
      if (!limits) return []
      const prefix = 'home.homeCompanySettings.buyerLeverageLimits.'
      const rows: Array<{ rule: string; current: string; new: string }> = []

      const medSavedPercent = toRoundedPercent(limits.medium.percent ?? limits.medium.defaultPercent)
      const medSavedAmount = limits.medium.amount ?? limits.medium.defaultAmount
      const highSavedPercent = toRoundedPercent(limits.high.percent ?? limits.high.defaultPercent)
      const highSavedAmount = limits.high.amount ?? limits.high.defaultAmount

      if (Number(data.buyerLeverageMediumPercentInput) !== medSavedPercent) {
        rows.push({
          rule: translate.t(prefix + 'ruleMediumPercent'),
          current: medSavedPercent.toFixed(2) + '%',
          new: Number(data.buyerLeverageMediumPercentInput).toFixed(2) + '%',
        })
      }
      if (Number(data.buyerLeverageMediumAmountInput) !== medSavedAmount) {
        rows.push({
          rule: translate.t(prefix + 'ruleMediumAmount'),
          current: '$' + medSavedAmount.toLocaleString(),
          new: '$' + Number(data.buyerLeverageMediumAmountInput).toLocaleString(),
        })
      }
      if (Number(data.buyerLeverageHighPercentInput) !== highSavedPercent) {
        rows.push({
          rule: translate.t(prefix + 'ruleHighPercent'),
          current: highSavedPercent.toFixed(2) + '%',
          new: Number(data.buyerLeverageHighPercentInput).toFixed(2) + '%',
        })
      }
      if (Number(data.buyerLeverageHighAmountInput) !== highSavedAmount) {
        rows.push({
          rule: translate.t(prefix + 'ruleHighAmount'),
          current: '$' + highSavedAmount.toLocaleString(),
          new: '$' + Number(data.buyerLeverageHighAmountInput).toLocaleString(),
        })
      }

      return rows
    })

    const hasAnyChanges = computed(() => adpWithChanges.value || data.pcWithChanges || buyerLeverageWithChanges.value)

    const disabledButtonSpendFileInrecalculation = computed(() => props.spendFileInrecalculation)

    const saveBuyerLeverageLimitsDisabled = computed(() =>
      !data.buyerLeverageLimits ||
      !buyerLeverageWithChanges.value ||
      buyerLeverageHasError.value ||
      disabledButtonSpendFileInrecalculation.value ||
      data.savingBuyerLeverageLimits)

    const isPaymentCycleDaysValid = computed(() => {
      if (data.paymentCycle === 'other') {
        return (
          !Number.isNaN(data.paymentCycleDays) &&
          data.paymentCycleDays >= 0 &&
          data.paymentCycleDays <= 180 &&
          data.paymentCycleDays !== data.paymentCycleDaysInit
        )
      }
      return true
    })

    function onADPChange() {
      emit('send-changes', hasAnyChanges.value)
    }

    function saveADPVisibility() {
      if (data.adpVisibility === 'show') {
        doSaveADPVisibility()
        return
      }
      if (!userStore.getHasContractualPaymentTerms) {
        data.adpVisibility = data.adpVisibilityOriginal
        emit('send-changes', hasAnyChanges.value)
        toast.error(translate.t('home.homeCompanySettings.adpVisibility.noContractualTermsError'))
        return
      }
      data.showADPConfirmModal = true
    }

    function confirmADPHide() {
      data.showADPConfirmModal = false
      doSaveADPVisibility()
    }

    function cancelADPHide() {
      data.showADPConfirmModal = false
      data.adpVisibility = data.adpVisibilityOriginal
      emit('send-changes', hasAnyChanges.value)
    }

    function doSaveADPVisibility() {
      data.loading = true
      const hideAverageDaysPaid = data.adpVisibility === 'hide'
      const params = {
        spendFileVersionId: spendFileVersionActiveId.value,
        hideAverageDaysPaid,
        callbackSuccess: (_response: any) => {
          data.loading = false
          data.adpVisibilityOriginal = data.adpVisibility
          userStore.setHideAverageDaysPaid(hideAverageDaysPaid)
          emit('send-changes', hasAnyChanges.value)
          toast.success(translate.t('home.homeCompanySettings.adpVisibility.successSaved'))
        },
        callbackError: () => {
          data.loading = false
          toast.error(translate.t('global.errorSavingData'))
        }
      }
      homeStore.patchADPVisibility(params)
    }

    function loadADPVisibility() {
      const hidden = userStore.getHideAverageDaysPaid
      data.adpVisibility = hidden ? 'hide' : 'show'
      data.adpVisibilityOriginal = data.adpVisibility
    }

    function changePaymentCycle() {
      if (data.paymentCycle === 'daily') {
        data.paymentCycleDays = 0
      } else if (data.paymentCycle === 'weekly') {
        data.paymentCycleDays = 3
      } else if (data.paymentCycle === 'biWeekly') {
        data.paymentCycleDays = 7
      } else if (data.paymentCycle === 'monthly') {
        data.paymentCycleDays = 15
      } else if (data.paymentCycle === 'quarterly') {
        data.paymentCycleDays = 45
      } else {
        data.paymentCycleDays = 0
      }
      data.pcWithChanges = data.paymentCycleDaysInit !== data.paymentCycleDays
      emit('send-changes', hasAnyChanges.value)
    }

    function handlePaymentCycleDaysOtherInput() {
      const numericValue = data.paymentCycleDays.toString().replaceAll(/\D/g, '')
      const intValue = Math.floor(Number.parseFloat(numericValue))
      data.paymentCycleDays = Math.max(0, Math.min(intValue, 180))
    }

    function savePaymentCycleChanges(method: string, beforeLeave: boolean = false) {
      data.isSavingPaymentCycle = method !== 'get'
      data.savingBeforeLeaving = beforeLeave
      data.loadingPatch = true
      const params = {
        paymentCycle: data.paymentCycleDays,
        companyUUid: companyActiveId.value,
        method,
        callbackSuccess: (callbackDataResponse: any) => {
          data.loadingPatch = false
          userStore.setPaymentCycleDays(callbackDataResponse.paymentCycleDays ?? 0)

          if (method === 'get') {
            data.paymentCycleDays = callbackDataResponse.paymentCycleDays ?? 0
            if (callbackDataResponse.paymentCycleDays) {
              if (callbackDataResponse.paymentCycleDays === 0) {
                data.paymentCycle = 'daily'
                data.paymentCycleDays = 0
              } else if (callbackDataResponse.paymentCycleDays === 3) {
                data.paymentCycle = 'weekly'
                data.paymentCycleDays = 3
              } else if (callbackDataResponse.paymentCycleDays === 7) {
                data.paymentCycle = 'biWeekly'
                data.paymentCycleDays = 7
              } else if (callbackDataResponse.paymentCycleDays === 15) {
                data.paymentCycle = 'monthly'
                data.paymentCycleDays = 15
              } else if (callbackDataResponse.paymentCycleDays === 45) {
                data.paymentCycle = 'quarterly'
                data.paymentCycleDays = 45
              } else {
                data.paymentCycle = 'other'
                data.paymentCycleDays = callbackDataResponse.paymentCycleDays ?? 0
              }
              data.paymentCycleDaysInit = callbackDataResponse.paymentCycleDays
            } else {
              data.paymentCycle = 'daily'
              data.paymentCycleDays = 0
            }
          } else {
            data.paymentCycleDaysInit = data.paymentCycleDays
            data.isSavingPaymentCycle = false
            data.pcWithChanges = false
            data.showConfirmModal = false
            toast.success(translate.t('global.setupGlobalSuccessMsg'))
            emit('send-changes', hasAnyChanges.value)

            if (beforeLeave) {
              data.savingBeforeLeaving = false
              emit('save-n-continue')
            }
          }
        },
        callbackError: () => {
          toast.error(translate.t('global.errorSavingData'))
        },
      }
      homeStore.postCompanySettings(params)
    }

    function cancelConfirm() {
      data.clickOnCancel = true
      data.showConfirmModal = false
      emit('send-changes', hasAnyChanges.value)
    }

    onBeforeRouteLeave((to) => {
      if (hasAnyChanges.value) {
        data.saveNContinue = to
        data.showModal = true
        return false
      }
      return true
    })

    function discardChanges() {
      data.adpVisibility = data.adpVisibilityOriginal
      data.pcWithChanges = false
      cancelBuyerLeverageLimits()
      emit('send-changes', false)
      if (props.otherTab === '') {
        router.push(data.saveNContinue.fullPath)
      } else {
        emit('discard-n-continue')
      }
    }

    function cancel() {
      data.showModal = false
      emit('cancel-n-continue')
    }

    function saveChanges() {
      data.showModal = false
      if (adpWithChanges.value) {
        doSaveADPVisibility()
      }
      if (data.pcWithChanges) {
        savePaymentCycleChanges('patch')
      }
      // AF-6: Buyer Leverage Limits always needs the Current->New confirmation (AC-07) before
      // saving, never a silent auto-save - so "Save" on the generic unsaved-changes dialog opens
      // that confirmation instead of saving directly. If it can't even open (a validation error,
      // or the file started recalculating in the meantime), say so instead of silently dropping
      // these edits while ADP/payment-cycle save normally and the dialog just closes.
      if (buyerLeverageWithChanges.value) {
        if (saveBuyerLeverageLimitsDisabled.value) {
          toast.error(translate.t('home.homeCompanySettings.buyerLeverageLimits.notSavedFixFields'))
        } else {
          openSaveBuyerLeverageLimitsConfirm()
        }
      }
    }

    watch(() => props.showAlert, (newValue) => {
      data.showModal = newValue
    })

    // AB#86ak0mkx0: keeps the parent's unsaved-changes tracking in sync without an @input handler on
    // every field.
    watch(buyerLeverageWithChanges, () => {
      emit('send-changes', hasAnyChanges.value)
    })

    /**
     * WI#19582: the endpoint answers 202 and the reclassification runs on the queue, so the new limits
     * are not readable when the click returns.
     *
     * This one covers a whole spend file recalculation finishing.
     */
    watch(() => props.spendFileInrecalculation, (isRecalculating, wasRecalculating) => {
      if (wasRecalculating && !isRecalculating) {
        loadNineBoxLimits()
        // This recalculation might not be the one Buyer Leverage itself started (e.g. a 9-Box
        // reset) - re-seeding the inputs here would silently discard an in-progress, unsaved edit.
        if (!buyerLeverageWithChanges.value) {
          loadBuyerLeverageLimits()
        }
      }
    })

    /**
     * WI#19582: and this one covers our own job, which is what the buttons here actually start.
     *
     * The relabelling runs on ONE program, so it never touches the spend file status the prop above
     * reflects — the screen sat there with the old limits until a manual reload. The back end does
     * publish the program's own status ('estimating' while it runs, 'ready' when it lands) on the
     * Firestore `program/{uuid}` document, which useFirebase() pushes into subscribeStore, and the
     * two sibling Setup screens (Financing/HarmonizationGroups.vue:182, FinancingGroups.vue:272)
     * subscribe exactly like this.
     */
    watch(() => subscribeStore.refreshPrograms, (status, previousStatus) => {
      if (status === 'ready' && previousStatus !== 'ready') {
        loadNineBoxLimits()
        data.applyingBoxType = null
      }
    })

    /**
     * WI#19582: `externalFinancingEnabled` is a property of the program, not of the company, and
     * Setup does not load a program — so the two SCF rows need this one call to know whether they
     * belong in the table.
     */
    async function loadProgramFinancing() {
      if (!activeProgramUuid.value) return

      const response = await getProgram(activeProgramUuid.value)
      if (response.success) {
        data.externalFinancingEnabled = !!response.data?.externalFinancingEnabled
      }
    }

    async function loadNineBoxLimits() {
      const versionId = spendFileVersionActiveId.value
      if (!versionId) return

      const response = await getSpendFileVersion(versionId)
      if (response.success) {
        data.nineBoxThresholds = response.data?.nineBoxThresholdsActive ?? null
      }
    }

    function applyBuyerLeverageInputsFromLimits(limits: BuyerLeverageLimits) {
      // Null percent/amount means "no override recorded" - that is the default, not zero.
      data.buyerLeverageMediumPercentInput = toRoundedPercent(limits.medium.percent ?? limits.medium.defaultPercent).toFixed(2)
      data.buyerLeverageMediumAmountInput = String(limits.medium.amount ?? limits.medium.defaultAmount)
      data.buyerLeverageHighPercentInput = toRoundedPercent(limits.high.percent ?? limits.high.defaultPercent).toFixed(2)
      data.buyerLeverageHighAmountInput = String(limits.high.amount ?? limits.high.defaultAmount)
    }

    /** AB#86ak0mkx0: hidden entirely (not just disabled) for anyone who isn't Super Admin/Data - EF-4. */
    async function loadBuyerLeverageLimits() {
      if (!userIsSuperAdmin.value && !userDataRoleEnabled.value) return

      const versionId = spendFileVersionActiveId.value
      if (!versionId) return

      const response = await getBuyerLeverageLimits(versionId)
      if (response.success && response.data) {
        data.buyerLeverageLimits = response.data as BuyerLeverageLimits
        applyBuyerLeverageInputsFromLimits(data.buyerLeverageLimits)
      }
    }

    /** AF-3: puts one value back to the file's own default, as an unsaved change. */
    function resetBuyerLeverageField(level: 'high' | 'medium', field: 'percent' | 'amount') {
      const limits = data.buyerLeverageLimits
      if (!limits) return

      if (level === 'medium' && field === 'percent') data.buyerLeverageMediumPercentInput = (limits.medium.defaultPercent * 100).toFixed(2)
      if (level === 'medium' && field === 'amount') data.buyerLeverageMediumAmountInput = String(limits.medium.defaultAmount)
      if (level === 'high' && field === 'percent') data.buyerLeverageHighPercentInput = (limits.high.defaultPercent * 100).toFixed(2)
      if (level === 'high' && field === 'amount') data.buyerLeverageHighAmountInput = String(limits.high.defaultAmount)
    }

    function resetBuyerLeverageRow(level: 'high' | 'medium') {
      resetBuyerLeverageField(level, 'percent')
      resetBuyerLeverageField(level, 'amount')
    }

    /** AF-4: every value returns to the file's own defaults, as unsaved changes. */
    function resetAllBuyerLeverageLimits() {
      resetBuyerLeverageRow('medium')
      resetBuyerLeverageRow('high')
    }

    /** AF-5: discards unsaved edits, back to what's currently saved. */
    function cancelBuyerLeverageLimits() {
      if (data.buyerLeverageLimits) applyBuyerLeverageInputsFromLimits(data.buyerLeverageLimits)
    }

    function openSaveBuyerLeverageLimitsConfirm() {
      if (saveBuyerLeverageLimitsDisabled.value) return
      data.showBuyerLeverageLimitsConfirm = true
    }

    /**
     * Answers 202: the recalculation runs async (SpendFileVersionUtils::enqueueRecalculateSpendFile），
     * so all there is to show is that it started - the existing spendFileInrecalculation watcher
     * re-reads the limits once it finishes.
     */
    async function confirmSaveBuyerLeverageLimits() {
      // Re-checked here, not just on the button: the modal can stay open while the file starts
      // recalculating for an unrelated reason (e.g. a 9-Box reset), which the button's :disabled
      // alone wouldn't catch if this were fired some other way (keyboard Enter, a stale click queued
      // before the state change, etc.).
      if (saveBuyerLeverageLimitsDisabled.value) return

      const versionId = spendFileVersionActiveId.value
      if (!versionId) return

      data.savingBuyerLeverageLimits = true
      try {
        const response = await postBuyerLeverageLimits(versionId, {
          medium: {
            percent: Number(data.buyerLeverageMediumPercentInput) / 100,
            amount: Number(data.buyerLeverageMediumAmountInput),
          },
          high: {
            percent: Number(data.buyerLeverageHighPercentInput) / 100,
            amount: Number(data.buyerLeverageHighAmountInput),
          },
        })

        if (!response.success) {
          toast.error(response.data?.detail ?? translate.t('home.homeCompanySettings.buyerLeverageLimits.error'))
          return
        }

        data.showBuyerLeverageLimitsConfirm = false
        toast.success(translate.t('home.homeCompanySettings.buyerLeverageLimits.queued'))
        // Refresh the saved baseline right away - the values are already persisted synchronously by
        // the endpoint even though the recalculation they trigger is still async. Without this,
        // buyerLeverageRows keeps comparing against the pre-save values until recalculation finishes
        // (see the spendFileInrecalculation watcher below), wrongly showing unsaved changes meanwhile.
        await loadBuyerLeverageLimits()
      } finally {
        data.savingBuyerLeverageLimits = false
      }
    }

    /**
     * WI#19582: recalculate this box's limits. The back end drops the calculated pair, works out a
     * new one from the portfolio and reclassifies the box's entities with it.
     *
     * Only offered while the box is showing the platform's own pair — see `nineBoxLimitRows`.
     */
    function recalculateNineBoxLimits(boxType: NineBoxType) {
      applyNineBoxLimits({ boxType, mode: 'recalculate' })
    }

    /**
     * WI#19582: give the box back to the platform's pair, which has been kept alongside the
     * override all along — so this reclassifies immediately, with no recalculation to wait for.
     */
    function resetNineBoxLimits(boxType: NineBoxType) {
      applyNineBoxLimits({ boxType, mode: 'reset' })
    }

    function openManualNineBoxLimits(boxType: NineBoxType) {
      const row = nineBoxLimitRows.value.find((candidate) => candidate.boxType === boxType)

      data.editingBoxType = boxType
      data.editingLowerLimit = row?.rawLowerLimit == null ? '' : String(row.rawLowerLimit)
      data.editingUpperLimit = row?.rawUpperLimit == null ? '' : String(row.rawUpperLimit)
    }

    function closeManualNineBoxLimits() {
      data.editingBoxType = null
      data.editingLowerLimit = ''
      data.editingUpperLimit = ''
    }

    function saveManualNineBoxLimits() {
      if (!data.editingBoxType || manualLimitsError.value) return

      applyNineBoxLimits({
        boxType: data.editingBoxType,
        mode: 'manual',
        med: Number(data.editingLowerLimit),
        high: Number(data.editingUpperLimit),
      })
    }

    /**
     * Both buttons end here. The amounts are whatever the user is looking at, so the rate the table
     * was painted with travels along and the back end converts with that exact number.
     *
     * The answer is a 202: the reclassification runs on the 9-box queue, so all there is to show is
     * that it started. The limits are re-read when it finishes.
     */
    async function applyNineBoxLimits(
      request: { boxType: NineBoxType; mode: 'recalculate' | 'manual' | 'reset'; med?: number; high?: number },
    ) {
      const versionId = spendFileVersionActiveId.value
      if (!versionId) return

      if (!activeProgramUuid.value) {
        toast.error(translate.t('home.homeCompanySettings.nineBoxLimits.noProgram'))
        return
      }

      data.applyingBoxType = request.boxType

      try {
        const response = await postNineBoxThresholds(versionId, {
          programUuid: activeProgramUuid.value,
          boxType: request.boxType,
          mode: request.mode,
          med: request.med,
          high: request.high,
          currencyRate: useAppStore().getCurrencyAmount,
        })

        if (!response.success) {
          // API Platform puts the rejection reason in `detail`; fall back to a generic line so a
          // network failure with no body still says something.
          toast.error(response.data?.detail ?? translate.t('home.homeCompanySettings.nineBoxLimits.error'))
          return
        }

        closeManualNineBoxLimits()
        toast.success(translate.t('home.homeCompanySettings.nineBoxLimits.queued'))
      } finally {
        data.applyingBoxType = null
      }
    }

    onMounted(() => {
      loadADPVisibility()
      savePaymentCycleChanges('get')
      loadNineBoxLimits()
      loadProgramFinancing()
      loadBuyerLeverageLimits()

      // WI#19582: without this the watcher above never hears anything — nothing else on the Setup
      // screen subscribes to the program document.
      if (activeProgramUuid.value) {
        fnSetUnsubscribeProgram()
        subscribeToPrograms([activeProgramUuid.value])
      }
    })

    onUnmounted(() => {
      fnSetUnsubscribeProgram()
    })

    return {
      ...toRefs(data),
      data,
      nineBoxLimitRows,
      hasAnyNineBoxLimits,
      nineBoxLimitsDisabled,
      manualLimitsError,
      recalculateNineBoxLimits,
      resetNineBoxLimits,
      openManualNineBoxLimits,
      closeManualNineBoxLimits,
      saveManualNineBoxLimits,
      adpWithChanges,
      hasAnyChanges,
      disabledButtonSpendFileInrecalculation,
      isPaymentCycleDaysValid,
      onADPChange,
      saveADPVisibility,
      confirmADPHide,
      cancelADPHide,
      changePaymentCycle,
      handlePaymentCycleDaysOtherInput,
      savePaymentCycleChanges,
      cancelConfirm,
      discardChanges,
      cancel,
      saveChanges,
      router,
      // AB#86ak0mkx0: Buyer Leverage Limits
      userIsSuperAdmin,
      userDataRoleEnabled,
      buyerLeverageRows,
      buyerLeverageDirtyCount,
      buyerLeverageLastChangedText,
      buyerLeverageChangedRules,
      canResetAllBuyerLeverageLimits,
      saveBuyerLeverageLimitsDisabled,
      resetBuyerLeverageField,
      resetBuyerLeverageRow,
      resetAllBuyerLeverageLimits,
      cancelBuyerLeverageLimits,
      openSaveBuyerLeverageLimitsConfirm,
      confirmSaveBuyerLeverageLimits,
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

// WI#18968: readable spacing and a header rule. WI#19582 added the actions column.
.nine-box-limits-table {
  width: 100%;

  th,
  td {
    padding: 0.5rem 0.75rem;
  }

  // The two actions are peers, so they sit on one line and centred under the header. Flex rather
  // than inline-block: the buttons have different heights of text and would otherwise ride on the
  // baseline instead of lining up.
  .nine-box-limits-actions {
    white-space: nowrap;

    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
  }

  // The outlined twin of .btn-primary. The shared stylesheet only ships the gray
  // .outline-secondary-btn, and the two actions here are peers of the same weight: the pair reads as
  // one choice when they share a colour, and as "primary plus something else" when they do not.
  .outline-primary-btn {
    background-color: $color-primary-25 !important;
    border: 1px solid $color-primary-200 !important;
    color: $color-primary-700 !important;
    min-height: 32px !important;
    height: 32px !important;
    font-weight: 500;

    &:hover {
      background-color: $color-primary-50 !important;
    }

    &:disabled,
    &.disabled {
      background-color: $color-gray-100 !important;
      border-color: $color-gray-300 !important;
      color: $color-gray-500 !important;
    }
  }

  // Says at a glance whether a box is classifying against a stored pair or still waiting for its
  // first one — the dash in the value columns alone reads as missing data rather than as a state.
  .nine-box-limits-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;

    &.is-configured {
      background-color: $color-green-50;
      color: $color-green-700;
    }

    &.is-unset {
      background-color: $color-gray-100;
      color: $color-gray-600;
    }
  }

  thead th {
    border-bottom: 1px solid $color-gray-300;
    white-space: nowrap;
  }

  .text-right {
    text-align: right;
  }
}

// AB#86ak0mkx0: Buyer Leverage Limits card.
.buyer-leverage-limits-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: $color-primary-25;
  color: $color-primary-700;
  white-space: nowrap;
}

.buyer-leverage-limits-pill {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;

  &.is-high {
    background-color: #dcfce7;
    color: #166534;
  }

  &.is-medium {
    background-color: #fef9c3;
    color: #854d0e;
  }

  &.is-low {
    background-color: #fee2e2;
    color: #991b1b;
  }
}

.buyer-leverage-limits-input-group {
  display: inline-flex;
  align-items: center;

  input.form-control {
    width: 110px;
    display: inline-block;

    &.is-edited {
      border-color: $color-primary-400;
      background-color: $color-primary-25;
    }
  }
}

.buyer-leverage-limits-edited-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: $color-primary-500;
  margin-right: 0.25rem;
}

.buyer-leverage-limits-override-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: $color-gray-100;
  color: $color-gray-700;
}

.buyer-leverage-limits-footer {
  border-top: 1px solid $color-gray-200;
  padding-top: 0.75rem;
}

.buyer-leverage-limits-confirm-warning {
  color: #92400e;
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
}

.card {
  min-height: auto !important;

  &:hover {
    box-shadow: 0 1px 5px $shadow;
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

.adp-recalculation-warning {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border: 1px solid #f59e0b;
  border-radius: 0.375rem;
  background-color: #fffbeb;
  color: #92400e;
}

.row.container-form {
  width: 80%;
  margin: 0px auto;
}

.error {
  color: $color-error-600;
  font-family: "Inter var", sans-serif;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
}
</style>
