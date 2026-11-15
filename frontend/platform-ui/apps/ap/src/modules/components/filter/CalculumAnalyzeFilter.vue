<template>
<div class="calculum-dropdown-aux-background-2" @click.self="closeRuleFilterComponent"></div>
<div class="d-flex flex-column filter_container align-items-center mt-4 justify-content-between" v-if="forUiGroups">
  <CalculumLoading v-if="!haveSomeFilterToshow" />
  <div v-else class="top_section d-flex flex-column">
    <div class="filter_title d-flex align-items-center justify-content-between">{{$t('adminBackend.uiGroupsAdmin.companiesFilterTitle')}}</div>
    <div class="allFilters_container">
      <div class="d-flex flex-column">
        <iconSearch class="search_icon"></iconSearch>
        <input class="form-control mt-2 custom_input search_input" type="text" v-model="userInputSearch" :placeholder="$t('home.analyze.search')"/>
        <div class="d-flex align-items-center mt-1">
          <iconInformation class="info_icon mr-1"></iconInformation><span class="input_msg">{{($t('adminBackend.uiGroupsAdmin.inputMessageForUiFilter'))}}</span>
        </div>
        <div class="d-flex align-items-baseline mt-4">
          <div class="form-checkout">
            <label>
              <input type="checkbox" v-model="checkAllCompanies.selected" @change="checkAll"/><span class="custom"></span><span>{{$t('home.analyze.checkAll')}}</span>
            </label>
          </div>
          <div class="d-flex align-items-center">
            <div class="company-selected-badge"><span>{{$t('global.selected')}} {{ countSelectedCompanies }}</span></div>
          </div>
        </div>
        <div class="select_options_container container_line mt-2 show-scroll">
          <div class="d-flex flex-column mt-2" v-for="(company,index) in forSpecificUiGroup ? specificUi : filteredlistOfCompanies" :key="index">
            <div class="d-flex align-items-center">
              <div class="form-checkout">
                <label>
                  <input type="checkbox" v-model="company.selected" :value="company.uuid" :checked="disableAllValues" @change="changeSelectedValueForUiGroups(company.uuid, ($event.target as HTMLInputElement).checked)"/><span class="custom"></span><span>{{company.name}}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="bottom_section">
    <div class="d-flex align-items-center justify-content-center gap-2">
      <button class="btn outline-secondary-btn font-md" @click="$emit('close')"> <span>{{$t('global.cancel')}}</span></button>
      <button class="btn btn-primary font-md save-changes-filter" @click="saveSelectedCompanies"><span>{{$t('global.save')}}</span></button>
    </div>
  </div>
</div>
<div class="d-flex flex-column filter_container align-items-center mt-4 justify-content-between" v-if="!isEditMode && !forUiGroups">
  <CalculumLoading v-if="!haveSomeFilterToshow" />
  <div v-else class="top_section d-flex flex-column w-100">
    <div class="filter_title d-flex align-items-center justify-content-between">{{ filterTitle }}</div>
    <div class="allFilters_container">
      <div class="filter_sections mb-2">
        <Dropdown data-testid="filterChooseField" :dataList="fieldArrayList" @selected-item="handleSelected" :currentOptionSelected="currentFieldSelected" :id="'field-selection'" :label="$t('home.analyze.chooseField')">  </Dropdown>
      </div>
      <div class="d-flex" v-if="validateLevelsForSelectFilter(selectedFilter) && userSelectedRuleFilter"><span class="text-sm mt-5 mr-2">{{$t('global.selectLevel')}}:</span>
        <div class="button-group" v-if="validateLevelsForSelectFilter(selectedFilter) && userSelectedRuleFilter && selectedFilter !== 'SME'">
          <input class="level-text" id="radio-sme-spend" type="radio" name="tabs" @click="selectTabLevel('spend')"/>
          <label class="button-group-item" for="radio-sme-spend" :class="selectLevel === 'spend' ? 'active' : 'level-tab-not-active'">{{$t('global.spends')}}</label>
          <input class="level-text" id="radio-sme-supplier" type="radio" name="tabs" @click="selectTabLevel('supplier')"/>
          <label class="button-group-item" for="radio-sme-supplier" :class="selectLevel === 'supplier' ? 'active' : 'level-tab-not-active'">{{$t('global.suppliers')}}</label>
          <input class="level-text" id="radio-sme-parent" type="radio" name="tabs" @click="selectTabLevel('parent')"/>
          <label class="button-group-item" for="radio-sme-parent" :class="selectLevel === 'parent' ? 'active' : 'level-tab-not-active'">{{$t('global.parents')}}</label><span class="level-glider" :class="getLevelForEditCategorize"></span>
        </div>
        <div class="button-group" v-if="validateLevelsForSelectFilter(selectedFilter) && userSelectedRuleFilter && selectedFilter === 'SME'">
          <input class="no-hover level-text" type="radio" name="tabs"/>
          <label class="button-group-item no-hover mt-1 pt-1" for="radio-sme-spend" :class="selectLevel === 'spend' ? 'active' : 'level-tab-not-active'">{{$t('global.spends')}}</label>
          <input class="level-text" id="radio-2" type="radio" name="tabs" @click="selectTabLevel('supplier')"/>
          <label class="button-group-item" for="radio-2" :class="selectLevel === 'supplier' ? 'active' : 'level-tab-not-active'">{{$t('global.suppliers')}}</label>
          <input class="no-hover level-text" type="radio" name="tabs"/>
          <label class="button-group-item no-hover mt-1 pt-1" for="radio-sme-parent" :class="selectLevel === 'parent' ? 'active' : 'level-tab-not-active'">{{$t('global.parent')}}</label><span class="level-glider supplier-level"></span>
        </div>
      </div>
      <div class="d-flex align-item-center mt-3" v-if="userSelectedRuleFilter">
        <div class="d-flex align-items-center" v-if="dataArray.values.length > 0">
          <div class="tab" @click="setTab('select')" :class="{ red_border_bottom: isTabSelect && !selectedTopRankTab || fieldHasCheckboxValues && !(fieldHasConditions) && !isTabSelectedTopRankTab || fieldHasCheckboxValues && fieldHasConditions && isTabSelect && !isTabSelectedTopRankTab }">
            <iconCheckbox class="checkbox_icon mr-2 icon-for-tab"></iconCheckbox><span>{{ $t('home.analyze.select') }}</span>
          </div>
        </div>
        <div class="d-flex align-items-center" v-if="dataArray.operators.length > 0">
          <div class="tab" @click="setTab('condition')" :class="{ red_border_bottom: isTabCondition && !selectedTopRankTab || !(fieldHasCheckboxValues) && fieldHasConditions && !selectedTopRankTab || fieldHasConditions && isTabCondition && !selectedTopRankTab }">
            <IconFilter2 class="mr-2 icon-for-tab"></IconFilter2><span>{{ $t('home.analyze.condition') }}</span>
          </div>
        </div>
        <div class="d-flex align-items-center" v-if="topRankCategoriesInAvailableFields.includes(selectedFilter)">
          <div class="tab" @click="setTab('top-rank')" :class="{ red_border_bottom: isTabTopRank && selectedTopRankTab }">
            <iconTopRank class="filter_icon mr-2"></iconTopRank><span>{{ $t('home.analyze.topRank') }}</span>
          </div>
        </div>
      </div>
      <div class="d-flex flex-column" v-if="showCheckboxSection">
        <iconSearch class="search_icon"></iconSearch>
        <input class="form-control mt-2 custom_input search_input" type="text" v-model="userInputSearch" :placeholder="$t('home.analyze.search')"/>
        <div class="select_options_container mt-3 show-scroll" v-if="ifActiveProgram">
          <div class="d-flex align-items-center">
            <div class="form-checkout">
              <label>
                <input type="checkbox" :disabled="disableAllValues" @change="checkAll" v-model="checkAllValue"/><span class="custom"></span><span>{{$t('home.analyze.checkAll')}}</span>
              </label>
            </div>
          </div>
          <div class="d-flex flex-column" v-for="(item,index) in filteredArray" :key="index" :value="index">
            <div class="form-checkout">
              <label>
                <input type="checkbox" v-model="item.selected" :disabled="disableAllValues" :value="item.value" :checked="disableAllValues" @change="changeSelectedValue"/><span class="custom"></span><span>{{item.value}}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="select_options_container mt-3 show-scroll" v-if="!ifActiveProgram && !ifSelectedFilterSME">
          <div class="d-flex align-items-center">
            <div class="form-checkout">
              <label>
                <input type="checkbox" @change="checkAll" v-model="checkAllValue"/><span class="custom"></span><span>{{$t('home.analyze.checkAll')}}</span>
              </label>
            </div>
          </div>
          <div class="d-flex flex-column" v-for="(item,index) in filteredArray" :key="index" :value="item.value">
            <div class="form-checkout">
              <label>
                <input type="checkbox" v-model="item.selected" :disabled="disableAllValues" :value="item.value" :checked="disableAllValues" @change="changeSelectedValue"/><span class="custom"></span><span>{{item.value}}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="select_options_container mt-3 show-scroll" v-if="!ifActiveProgram && ifSelectedFilterSME">
          <label class="custom-radio" v-for="(item, index) in filteredArray" :key="index">
            <input class="input-radio" :disabled="disableAllValues" type="radio" v-model="selectedRadioValue" :value="item.value" @change="selectSingleValue(item)"/><span class="radio"></span><span class="radio-text">{{ item.value }} &nbsp;</span>
          </label>
        </div>
      </div>
      <div class="d-flex flex-column" v-if="showConditionSection">
        <div class="d-flex flex-column">
          <Dropdown class="mt-2 mb-2" data-testid="filterChooseCondition1" :dataList="dataListOperators" @selected-item="(selected) => { filterRuleOneOperator = selected.key; checkOperator(); }" :currentOptionSelected="currentFilterRuleOneOperatorSelected" :id="'condition-one-selection'" :label="$t('home.analyze.chooseCondition')"></Dropdown>
          <input class="form-control mt-2 custom_input top-input" :type="returnTypeForInput('forType')" :placeholder="returnTypeForInput('forPlaceholder')" v-model="filterRuleOneValue" v-if="!showInputOne"/>
          <Dropdown class="mt-2 mb-2" data-testid="filterChooseCondition2" :dataList="logicalOperators" @selected-item="(selected) => { filterRuleCondition = selected.key; }" :currentOptionSelected="currentFilterRuleConditionSelected" :id="'condition-logical-selection'" :label="$t('home.analyze.chooseCondition')"></Dropdown>
        </div>
        <div class="d-flex flex-column">
          <Dropdown class="mt-2 mb-2" data-testid="filterChooseCondition3" :dataList="dataListOperators" @selected-item="(selected) => { filterRuleTwoOperator = selected.key; checkOperator(); }" :currentOptionSelected="currentFilterRuleTwoOperatorSelected" :id="'condition-two-selection'" :label="$t('home.analyze.chooseCondition')"></Dropdown>
          <input class="form-control mt-2 custom_input bottom-input" :type="returnTypeForInput('forType')" :placeholder="returnTypeForInput('forPlaceholder')" v-model="filterRuleTwoValue" v-if="!showInputTwo"/>
        </div>
      </div>
      <div class="d-flex flex-column mt-3" v-if="selectedTab === 'top-rank'">
        <div class="d-flex flex-column">
          <div class="d-flex align-items-center justify-content-between"><span class="choose_field">{{$t('home.analyze.rankByTop')}}:</span><span class="choose_field custom_metric">{{$t('home.analyze.metric')}}:</span></div>
          <div class="d-flex align-items-center">
            <input class="form-control mt-2 top-rank-input" type="number" min="1" v-model="selectedTopRankCategory.value" :class="{ 'error-input' : inputErrorForTopRankPercent}" required="required"/>
            <iconAlertsWarningExclamationTriangle class="error-input-icon" v-if="inputErrorForTopRankPercent"></iconAlertsWarningExclamationTriangle>
            <select class="form-control ml-2 mt-2 quantity-select" @change="errorDefaultState" v-model="selectedTopRankCategory.category">
              <option v-for="(topValueCategory, index) in topRankCategory" :key="topValueCategory" :value="topValueCategory">{{ $t('home.analyze.topRankValues.'+ topValueCategory) }}</option>
            </select>
          </div><span class="top-rank-input-text">{{$t('home.analyze.selectTheTopXValue')}} {{$t('home.analyze.spendVolume')}}</span><span class="error-text" v-if="inputErrorForTopRankPercent">{{$t('home.analyze.pleaseEnterNumberGreaterThanZeroAndLessOrEqualTo100')}}</span>
        </div>
      </div>
    </div>
  </div>
  <div class="bottom_section">
    <div class="d-flex align-items-center justify-content-center gap-2">
      <button class="btn outline-secondary-btn font-md" @click="closeRuleFilterComponent"> <span>{{$t('global.cancel')}}</span></button>
      <button class="btn btn-primary font-md save-changes-filter" @click="evaluateSavedProperties"> <span>{{ isEditMode ? $t('global.update') : $t('global.save') }}</span></button>
    </div>
  </div>
</div>
<div class="calculum-dropdown-aux-background-2" @click.self="closeRuleFilterComponent"></div>
<div class="d-flex flex-column filter_container align-items-center mt-4 justify-content-between" v-if="isEditMode && !forUiGroups">
  <CalculumLoading v-if="!haveSomeFilterToshow" />
  <div v-else class="top_section d-flex flex-column">
    <div class="filter_title d-flex align-items-center justify-content-between">{{ filterTitle }}</div>
    <div class="allFilters_container">
      <div class="filter_sections">
        <Dropdown :dataList="fieldArrayList" @selected-item="handleSelected" :currentOptionSelected="currentFieldSelected" :id="'field-selection'" :label="$t('home.analyze.chooseField')"></Dropdown>
      </div>
      <div class="d-flex" v-if="validateLevelsForSelectFilter(selectedFilter) && userSelectedRuleFilter"><span class="text-sm mt-5 mr-2">{{$t('global.selectLevel')}}:</span>
        <div class="button-group" v-if="validateLevelsForSelectFilter(selectedFilter) && userSelectedRuleFilter && selectedFilter !== 'SME'">
          <input class="level-text" id="radio-1-edit" type="radio" name="tabs-edit" @click="selectTabLevel('spend')"/>
          <label class="button-group-item" for="radio-1-edit" :class="selectLevel === 'spend' ? 'active' : 'level-tab-not-active'">{{$t('global.spends')}}</label>
          <input class="level-text" id="radio-2-edit" type="radio" name="tabs-edit" @click="selectTabLevel('supplier')"/>
          <label class="button-group-item" for="radio-2-edit" :class="selectLevel === 'supplier' ? 'active' : 'level-tab-not-active'">{{$t('global.suppliers')}}</label>
          <input class="level-text" id="radio-3-edit" type="radio" name="tabs-edit" @click="selectTabLevel('parent')"/>
          <label class="button-group-item" for="radio-3-edit" :class="selectLevel === 'parent' ? 'active' : 'level-tab-not-active'">{{$t('global.parent')}}</label><span class="level-glider" :class="getLevelForEditCategorize"></span>
        </div>
        <div class="button-group" v-if="validateLevelsForSelectFilter(selectedFilter) && userSelectedRuleFilter && selectedFilter === 'SME'">
          <input class="no-hover level-text" type="radio" name="tabs-edit"/>
          <label class="button-group-item" for="radio-sme-edit-spend" :class="selectLevel === 'spend' ? 'active' : 'level-tab-not-active'">{{$t('global.spends')}}</label>
          <input class="level-text" id="radio-sme-edit-supplier" type="radio" name="tabs-edit" @click="selectTabLevel('supplier')"/>
          <label class="button-group-item" for="radio-sme-edit-supplier" :class="selectLevel === 'supplier' ? 'active' : 'level-tab-not-active'">{{$t('global.suppliers')}}</label>
          <input class="no-hover level-text" type="radio" name="tabs-edit"/>
          <label class="button-group-item" for="radio-sme-edit-parent" :class="selectLevel === 'parent' ? 'active' : 'level-tab-not-active'">{{$t('global.parent')}}</label><span class="level-glider supplier-level"></span>
        </div>
      </div>
      <div class="d-flex align-item-center mt-3" v-if="userSelectedRuleFilter">
        <div class="d-flex align-items-center" v-if="dataArray.values.length > 0">
          <div class="tab" @click="setTab('select')" :class="{ red_border_bottom: isTabSelect && !isTabSelectedTopRankTab || fieldHasCheckboxValues && !(fieldHasConditions) && !selectedTopRankTab || fieldHasCheckboxValues && fieldHasConditions  && isTabSelect && !selectedTopRankTab }">
            <iconCheckbox class="checkbox_icon mr-2 icon-for-tab"></iconCheckbox><span>{{ $t('home.analyze.select') }}</span>
          </div>
        </div>
        <div class="d-flex align-items-center" v-if="dataArray.operators.length > 0">
          <div class="tab" @click="setTab('condition')" :class="{ red_border_bottom: isTabCondition && !selectedTopRankTab || !(fieldHasCheckboxValues) && fieldHasConditions && !selectedTopRankTab || fieldHasCheckboxValues && fieldHasConditions && isTabCondition && !selectedTopRankTab }">
            <IconFilter2 class="mr-2 icon-for-tab"></IconFilter2><span>{{ $t('home.analyze.condition') }}</span>
          </div>
        </div>
        <div class="d-flex align-items-center" v-if="topRankCategoriesInAvailableFields.includes(selectedFilter)">
          <div class="tab" @click="setTab('top-rank')" :class="{ red_border_bottom: isTabTopRank && selectedTopRankTab }">
            <iconTopRank class="filter_icon mr-2"></iconTopRank><span>{{ $t('home.analyze.topRank') }}</span>
          </div>
        </div>
      </div>
      <div class="d-flex flex-column" v-if="fieldHasCheckboxValues && !(fieldHasConditions) && !selectedTopRankTab || fieldHasCheckboxValues && fieldHasConditions && isTabSelect && !selectedTopRankTab">
        <iconSearch class="search_icon"></iconSearch>
        <input class="form-control mt-2 custom_input search_input" type="text" v-model="userInputSearch" :placeholder="$t('home.analyze.search')"/>
        <div class="select_options_container mt-3 show-scroll" v-if="ifActiveProgram">
          <div class="d-flex align-items-center">
            <div class="form-checkout">
              <label>
                <input type="checkbox" @change="checkAll" v-model="checkAllValue"/><span class="custom"></span><span>{{$t('home.analyze.checkAll')}}</span>
              </label>
            </div>
          </div>
          <div class="d-flex flex-column" v-for="(item,index) in filteredArray" :key="index" :value="index">
            <div class="d-flex align-items-center">
              <div class="form-checkout">
                <label>
                  <input type="checkbox" v-model="item.selected" :disabled="disableAllValues" :value="item.value" :checked="disableAllValues" @change="changeSelectedValue"/><span class="custom"></span><span>{{item.value}}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="select_options_container mt-3 show-scroll" v-if="!ifActiveProgram && !ifSelectedFilterSME">
          <div class="d-flex align-items-center">
            <div class="form-checkout">
              <label>
                <input type="checkbox" @change="checkAll" v-model="checkAllValue"/><span class="custom"></span><span>{{$t('home.analyze.checkAll')}}</span>
              </label>
            </div>
          </div>
          <div class="d-flex flex-column" v-for="(item,index) in filteredArray" :key="index" :value="index">
            <div class="d-flex align-items-center">
              <div class="form-checkout">
                <label>
                  <input type="checkbox" v-model="item.selected" :key="index" :value="item.value" :checked="disableAllValues" @change="changeSelectedValue"/><span class="custom"></span><span>{{item.value}}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="select_options_container mt-3 show-scroll" v-if="!ifActiveProgram  && ifSelectedFilterSME">
          <label class="custom-radio" v-for="(item, index) in filteredArray" :key="index">
            <input class="input-radio" :disabled="disableAllValues" type="radio" v-model="selectedRadioValue" :value="item.value" @change="selectSingleValue(item)"/><span class="radio"></span><span class="radio-text">{{ item.value }} &nbsp;</span>
          </label>
        </div>
      </div>
      <div class="d-flex flex-column" v-if="showConditionSection">
        <div class="d-flex flex-column">
          <Dropdown class="mt-2 mb-2" :dataList="dataListOperators" @selected-item="(selected) => { filterRuleOneOperator = selected.key; checkOperator(); }" :currentOptionSelected="currentFilterRuleOneOperatorSelected" :id="'condition-one-selection'" :label="$t('home.analyze.chooseCondition')"></Dropdown>
          <input class="form-control mt-2 custom_input top-input" :type="returnTypeForInput('forType')" :placeholder="returnTypeForInput('forPlaceholder')" v-model="filterRuleOneValue" v-if="!showInputOne"/>
          <Dropdown :dataList="logicalOperators" @selected-item="(selected) => { filterRuleCondition = selected.key; }" :currentOptionSelected="currentFilterRuleConditionSelected" :id="'condition-logical-selection'" :label="$t('home.analyze.chooseCondition')"></Dropdown>
        </div>
        <div class="d-flex flex-column">
          <Dropdown class="mt-2 mb-2" :dataList="dataListOperators" @selected-item="(selected) => { filterRuleTwoOperator = selected.key; checkOperator(); }" :currentOptionSelected="currentFilterRuleTwoOperatorSelected" :id="'condition-two-selection'" :label="$t('home.analyze.chooseCondition')"></Dropdown>
          <input class="form-control mt-2 custom_input bottom-input" :type="returnTypeForInput('forType')" :placeholder="returnTypeForInput('forPlaceholder')" v-model="filterRuleTwoValue" v-if="!showInputTwo"/>
        </div>
      </div>
      <div class="d-flex flex-column mt-3" v-if="isTabTopRank">
        <div class="d-flex flex-column">
          <div class="d-flex align-items-center justify-content-between"><span class="choose_field">{{$t('home.analyze.rankByTop')}}:</span><span class="choose_field custom_metric">{{$t('home.analyze.metric')}}:</span></div>
          <div class="d-flex align-items-center">
            <input class="form-control mt-2 top-rank-input" type="number" min="1" v-model="selectedTopRankCategory.value" :class="{ 'error-input' : inputErrorForTopRankPercent}" required="required"/>
            <select class="form-control ml-2 mt-2 quantity-select" @change="errorDefaultState" v-model="selectedTopRankCategory.category">
              <option v-for="(topValueCategory, index) in topRankCategory" :key="topValueCategory" :value="topValueCategory">{{ $t('home.analyze.topRankValues.'+ topValueCategory) }}</option>
            </select>
          </div><span class="top-rank-input-text">{{$t('home.analyze.selectTheTopXValue')}} {{$t('home.analyze.spendVolume')}}</span><span class="error-text" v-if="inputErrorForTopRankPercent">{{$t('home.analyze.pleaseEnterNumberGreaterThanZeroAndLessOrEqualTo100')}}</span>
        </div>
      </div>
    </div>
  </div>
  <div class="bottom_section">
    <div class="d-flex align-items-center justify-content-center gap-2">
      <button class="btn outline-secondary-btn font-md" @click="closeRuleFilterComponent"> <span>{{$t('global.cancel')}}</span></button>
      <button class="btn btn-primary font-md save-changes-filter" @click="evaluateSavedProperties"><span>{{ isEditMode ? $t('global.update') : $t('global.save') }}</span></button>
    </div>
  </div>
</div>
<div class="calculum-dropdown-aux-background-2" @click.self="closeRuleFilterComponent"></div>
</template>

<script lang="ts">
import { CalculumAnalyzeFilter } from "./types";
import {
  defineComponent,
  toRefs,
  reactive,
  computed,
  onMounted,
  PropType,
  watch,
} from "vue";
import { fontIcons } from "@/resources/assets/assets";
import { translate } from "@/utils/translation";
import * as FormatData from "@/utils/FormatData";
import Dropdown from "@/modules/components/dropdown/Dropdown.vue";
import iconAlertsWarningExclamationTriangle from "@/resources/assets/images/icons/iconAlertsWarningExclamationTriangle.vue";
import iconCheckbox from "@/resources/assets/images/icons/iconCheckbox.vue";
import IconFilter2 from "@/resources/assets/images/icons/IconFilter2.vue";
import iconInformation from "@/resources/assets/images/icons/iconInformation.vue";
import iconSearch from "@/resources/assets/images/icons/iconSearch.vue";
import iconTopRank from "@/resources/assets/images/icons/iconTopRank.vue";
import { useToast } from "vue-toastification";
import { CalculumLoading } from '@ada/design-system'

export default defineComponent({
  name: "CalculumAnalyzeFilter",
  components: {
    Dropdown,
    iconAlertsWarningExclamationTriangle,
    iconCheckbox,
    IconFilter2,
    iconInformation,
    iconSearch,
    iconTopRank,
    CalculumLoading
  },
  props: {
    availableFilters: { type: Array, required: true },
    currentUiGroupObj: { type: Object, required: false, default: null },
    editFilterObj: { type: Object, required: false, default: null },
    filterTitle: { type: String, required: true, default: null },
    forEditViewUiGroup: { type: Object, required: false, default: null },
    forSpecificUiGroup: { type: Boolean, required: false, default: false },
    isEditMode: { type: Boolean, required: true },
    isForUIGroupsFilter: { type: Boolean, required: false, default: false },
    isShowing: { type: Boolean, requried: false, default: false },
    listOfCompanies: {
      type: Array as PropType<
        { name: string; uuid: string; selected: boolean }[]
      >,
      required: false,
      default: null,
    },
  },
  emits: [
    "saveChosenConditionFilter",
    "updateGridUiGroup",
    "filter-by-search",
    "updateChosenConditionFilter",
    "hide",
    "submit",
    "close",
    "saveAndCloseFilter",
  ],
  setup(props, { emit }) {
    const toast = useToast()
    interface CustomField {
      title: string;
      values: { key: string; value: string }[];
      type: string;
      operators: any[]; // Adjust the type based on the actual data
      top: any[]; // Adjust the type based on the actual data
      levels: any[]; // Adjust the type based on the actual data
    }

    interface RadioBtn {
      name: string | number;
      value: string | number;
      selected: boolean;
    }

    watch(
      () => props.listOfCompanies,
      () => {},
      { deep: true },
    );

    interface UIGroupInterface {
      listOfCompaniesSpecific: Array<any>;
      dataArray: Array<any>;
      forUiGroupsFilterArray: Array<any>;
    }
    const uiGroupInterface = reactive<UIGroupInterface>({
      listOfCompaniesSpecific: [],
      dataArray: [],
      forUiGroupsFilterArray: [],
    });
    const specificUi = computed(() => {
      if (calculumAnalyzeFilter.userInputSearch.length > 0) {
        return uiGroupInterface.dataArray.filter((item: any) =>
          item.name
            .toLowerCase()
            .includes(calculumAnalyzeFilter.userInputSearch.toLowerCase()),
        );
      }
      return uiGroupInterface.dataArray;
    });

    const countSelectedCompanies = computed(() => {
      if (props.forSpecificUiGroup) {
        const selectedValues = uiGroupInterface.dataArray.filter(
          (item: any) => item.selected,
        );
        return selectedValues.length;
      } else {
        const selectedValues = props.listOfCompanies.filter(
          (item: any) => item.selected,
        );
        return selectedValues.length;
      }
    });

    const filteredlistOfCompanies = computed(() => {
      // Validate
      if (!props.listOfCompanies) {
        return [];
      }

      if (!props.forSpecificUiGroup) {
        if (calculumAnalyzeFilter.userInputSearch.length > 0) {
          return props.listOfCompanies.filter((item: any) =>
            item.name
              .toLowerCase()
              .includes(calculumAnalyzeFilter.userInputSearch.toLowerCase()),
          ) as any[];
        }
        return props.listOfCompanies as any[];
      }
      
      // Return empty array for specific UI group case
      return [];
    });
    const getLevelForEditCategorize = computed(() => {
      if (calculumAnalyzeFilter.selectLevel === "spend") {
        return "spend-level";
      } else if (calculumAnalyzeFilter.selectLevel === "supplier") {
        return "supplier-level";
      } else {
        return "parent-level";
      }
    });
    //for filtering the search
    const filteredArray = computed(() => {
      if (calculumAnalyzeFilter.selectedFilter === "ACTIVE_PROGRAM") {
        // Create a copy of the array to avoid side effects
        const arrayCopy = [...calculumAnalyzeFilter.dataArray.values];
        
        if (calculumAnalyzeFilter.userInputSearch.length > 0) {
          const notIncludedItem = {
            name: translate.t("home.analyze.rules.notIncludedInActivePrograms"),
            value: translate.t(
              "home.analyze.rules.notIncludedInActivePrograms",
            ),
            selected: false,
          };
          
          return [notIncludedItem, ...arrayCopy].filter(
            (item: any) =>
              item.name
                .toLowerCase()
                .includes(
                  calculumAnalyzeFilter.userInputSearch.toLowerCase(),
                ) ||
              item.value
                .toLowerCase()
                .includes(calculumAnalyzeFilter.userInputSearch.toLowerCase()),
          );
        }
        
        const notIncludedItem = {
          name: translate.t("home.analyze.rules.notIncludedInActivePrograms"),
          value: translate.t("home.analyze.rules.notIncludedInActivePrograms"),
          selected: false,
        };
        
        return [notIncludedItem, ...arrayCopy];
      } else {
        if (calculumAnalyzeFilter.userInputSearch.length > 0) {
          return calculumAnalyzeFilter.dataArray.values.filter(
            (item: any) =>
              item.name
                .toLowerCase()
                .includes(
                  calculumAnalyzeFilter.userInputSearch.toLowerCase(),
                ) ||
              item.value
                .toLowerCase()
                .includes(calculumAnalyzeFilter.userInputSearch.toLowerCase()),
          );
        }
        return calculumAnalyzeFilter.dataArray.values;
      }
    });

    const calculumAnalyzeFilter = reactive<CalculumAnalyzeFilter>({
      availableFiltersData: [],
      availableSortedFilters: [],
      checkAllCompanies: {
        selected: false,
      },
      checkAllValue: false,
      dataArray: {
        type: "",
        operators: [],
        values: [
          {
            name: "",
            value: "",
            selected: false,
          },
        ],
      },
      defaultArray: [],
      disableAllValues: false,
      errorWithInputValues: false,
      filterRuleCondition: "AND",
      filterRuleOneOperator: "",
      filterRuleOneValue: "",
      filterRuleSelectedValues: [],
      filterRuleTwoOperator: "",
      filterRuleTwoValue: "",
      filteredAppliedOptions: [],
      hasCategoryLevel: false,
      hasOperatorItems: false,
      hasValueItems: false,
      ifCheckedAll: false,
      inputErrorForTopRankPercent: false,      
      listOfCompanies: [],
      resetAllCompanies: {
        selected: false,
      },
      ruleone: null,
      ruletwo: null,
      selectLevel: "spend",
      selectedConditionsTab: false,
      selectedFilter: "ACTUAL_PAYMENT_TERMS",
      selectedFilterArray: props.availableFilters,
      selectedFilterType: "",
      selectedRadioValue: null,
      selectedSelectorsTab: false,
      selectedTab: "",
      selectedTopRankCategory: {
        category: "quantity",
        value: 5,
      },
      selectedTopRankCategoryValue: 5,
      selectedTopRankTab: false,
      showInputOne: false,
      showInputTwo: false,
      topRankCategoriesInAvailableFields: ["SPEND_VOLUME"],
      topRankCategory: ["quantity", "percent"],
      topRankNotSelected: false,
      triedToSubmit: false,
      userInputSearch: "",
      userSelectedRuleFilter: false,
    });

    onMounted(() => {
      if (props.forSpecificUiGroup) {
        uiGroupInterface.listOfCompaniesSpecific =
          props.currentUiGroupObj?.companies.map((item: any) => {
            const id = item["@id"].split("/");
            const currObj = {
              uuid: id[3],
              name: item.name,
              selected: true,
            };
            return currObj;
          });
        uiGroupInterface.dataArray = [
          ...props.listOfCompanies,
          ...uiGroupInterface.listOfCompaniesSpecific,
        ];

        uiGroupInterface.dataArray = uiGroupInterface.dataArray.sort(
          (a: any, b: any) => {
            return a.name.localeCompare(b.name);
          },
        );
      }

      if (!props.isForUIGroupsFilter) {
        calculumAnalyzeFilter.availableSortedFilters = Object.keys(
          props.availableFilters,
        ).sort((a: any, b: any) => {
          return a.localeCompare(b, undefined, { numeric: true });
        });
        if (!props.isEditMode) {
          setSelectedFieldRule(props.isEditMode);
        }

        if (props.isEditMode) {
          calculumAnalyzeFilter.selectedFilter = props.editFilterObj?.field;
          if (props.editFilterObj?.field === "SME") {
            setupSMEValues();
          }
          setSelectedFieldRule(props.isEditMode);
          checkOperator();
        }
      }
    });

    function setupSMEValues() {
      calculumAnalyzeFilter.selectedRadioValue =
        props.editFilterObj?.filterOne &&
        props.editFilterObj?.filterOne?.operator === "isEqualTo"
          ? "SME"
          : props.editFilterObj?.values[0] === "SME"
            ? "SME"
            : "Non-SME";

      let editValue = {
        name: calculumAnalyzeFilter.selectedRadioValue ?? "",
        value: calculumAnalyzeFilter.selectedRadioValue ?? "",
        selected: true,
      };
      calculumAnalyzeFilter.dataArray.values[0] = {
        name: "Non-SME",
        value: "Non-SME",
        selected: false,
      };
      calculumAnalyzeFilter.dataArray.values[1] = {
        name: "SME",
        value: "SME",
        selected: false,
      };
      calculumAnalyzeFilter.filterRuleCondition = "AND";
      calculumAnalyzeFilter.filterRuleOneOperator = "";
      calculumAnalyzeFilter.filterRuleOneValue = "";
      selectSingleValue(editValue);
    }

    const sortedValues = computed(() => {
      return Object.keys(props.availableFilters).sort((a: any, b: any) => {
        return a.localeCompare(b, { numeric: true });
      });
    });

    function translateValue(item: any) {
      return translate.t(`home.analyze.${item}`);
    }

    function returnTypeForInput(valueType: string) {
      if (valueType === "forType") {
        return calculumAnalyzeFilter.dataArray.type;
      } else {
        return calculumAnalyzeFilter.dataArray.type === "number"
          ? translate.t("global.typeNumberValues")
          : translate.t("global.typeStringValues");
      }
    }

    function errorDefaultState() {
      calculumAnalyzeFilter.inputErrorForTopRankPercent = false;
    }

    function resetCheck() {
      if (props.forSpecificUiGroup) {
        calculumAnalyzeFilter.checkAllCompanies.selected = false;
        uiGroupInterface.dataArray.forEach(function (company: any) {
          company.selected = false;
        });
      } else {
        calculumAnalyzeFilter.checkAllCompanies.selected = false;
        props.listOfCompanies.forEach(function (company: any) {
          company.selected = false;
        });
      }
    }

    function selectTabLevel(level: string) {
      let myLevel = "";
      if (
        level.toLowerCase() === "provider" ||
        level.toLowerCase() === "supplier"
      ) {
        myLevel = "supplier";
        calculumAnalyzeFilter.selectLevel = myLevel;
      } else if (level.toLowerCase() === "spend") {
        myLevel = "spend";
        calculumAnalyzeFilter.selectLevel = myLevel;
      } else if (level.toLowerCase() === "parent") {
        myLevel = "parent";
        calculumAnalyzeFilter.selectLevel = myLevel;
      } else {
        calculumAnalyzeFilter.selectLevel = level;
      }
    }

    function saveSelectedCompanies() {
      const listOfSelectedValues = props.forEditViewUiGroup
        ? uiGroupInterface.dataArray.filter((item: any) => item.selected)
        : uiGroupInterface.forUiGroupsFilterArray;

      const emitEvent = props.forEditViewUiGroup
        ? "updateGridUiGroup"
        : "saveAndCloseFilter";

      if (props.forEditViewUiGroup) {
        emit(emitEvent, props.currentUiGroupObj, listOfSelectedValues);
      }

      if (props.forSpecificUiGroup) {
        emit(
          "updateGridUiGroup",
          props.currentUiGroupObj,
          listOfSelectedValues,
        );
      } else {
        emit(emitEvent, listOfSelectedValues);
      }
    }

    function checkAll() {
      if (props.isForUIGroupsFilter) {
        // For UI Groups filter, check if there's an active search
        if (calculumAnalyzeFilter.userInputSearch.length > 0) {
          // Only affect filtered/visible companies
          const searchTerm = calculumAnalyzeFilter.userInputSearch.toLowerCase();
          if (props.forSpecificUiGroup) {
            uiGroupInterface.dataArray.forEach(function (company: any) {
              if (company.name.toLowerCase().includes(searchTerm)) {
                company.selected = calculumAnalyzeFilter.checkAllCompanies.selected;
              }
            });
          } else {
            props.listOfCompanies.forEach(function (company: any) {
              if (company.name.toLowerCase().includes(searchTerm)) {
                company.selected = calculumAnalyzeFilter.checkAllCompanies.selected;
              }
            });
          }
        } else {
          // No search active, affect all items
          uiGroupInterface.dataArray.forEach(function (company: any) {
            company.selected = calculumAnalyzeFilter.checkAllCompanies.selected;
          });
          props.listOfCompanies.forEach(function (company: any) {
            company.selected = calculumAnalyzeFilter.checkAllCompanies.selected;
          });
        }
      } else {
        // For regular filter, check if there's an active search
        if (calculumAnalyzeFilter.userInputSearch.length > 0) {
          // Only affect filtered/visible items
          const searchTerm = calculumAnalyzeFilter.userInputSearch.toLowerCase();
          calculumAnalyzeFilter.dataArray.values.forEach(function (item: any) {
            if (item.name.toLowerCase().includes(searchTerm) || 
                item.value.toLowerCase().includes(searchTerm)) {
              item.selected = calculumAnalyzeFilter.checkAllValue;
            }
          });
        } else {
          // No search active, affect all items
          calculumAnalyzeFilter.dataArray.values.forEach(function (item: any) {
            item.selected = calculumAnalyzeFilter.checkAllValue;
          });
        }
      }
    }

    function checkOperator() {
      calculumAnalyzeFilter.showInputOne =
        calculumAnalyzeFilter.filterRuleOneOperator === "isNull" ||
        calculumAnalyzeFilter.filterRuleOneOperator === "isNotNull" ||
        calculumAnalyzeFilter.filterRuleOneOperator === "isEmpty" ||
        calculumAnalyzeFilter.filterRuleOneOperator === "isNotEmpty";
      calculumAnalyzeFilter.showInputTwo =
        calculumAnalyzeFilter.filterRuleTwoOperator === "isNull" ||
        calculumAnalyzeFilter.filterRuleTwoOperator === "isNotNull" ||
        calculumAnalyzeFilter.filterRuleTwoOperator === "isEmpty" ||
        calculumAnalyzeFilter.filterRuleTwoOperator === "isNotEmpty";
    }

    function checkIfSelected(item: any) {
      return props.editFilterObj?.values?.includes(item.value);
    }

    function setSelectedFieldRule(isEditMode: boolean) {
      calculumAnalyzeFilter.checkAllValue = false;
      calculumAnalyzeFilter.userSelectedRuleFilter = true;
      if (!isEditMode) {
        Object.keys(props.availableFilters).forEach(function (key: any) {
          if (key === calculumAnalyzeFilter.selectedFilter) {
            if (
              calculumAnalyzeFilter.selectedFilterArray[key].operators.length >
                0 &&
              calculumAnalyzeFilter.selectedFilterArray[key].type === "text"
            ) {
              setTab("select");
            } else if (
              calculumAnalyzeFilter.selectedFilterArray[key].operators.length >
                0 &&
              calculumAnalyzeFilter.selectedFilterArray[key].type === "number"
            ) {
              setTab("condition");
            } else {
              setTab("select");
            }

            calculumAnalyzeFilter.dataArray.type =
              calculumAnalyzeFilter.selectedFilterArray[key].type;
            calculumAnalyzeFilter.dataArray.values =
              calculumAnalyzeFilter.selectedFilterArray[key].values
                .map((item: any) => {
                  return {
                    name: item.key,
                    value: item.value,
                    selected: false,
                  };
                })
                .sort((a: any, b: any) => {
                  return a.name.localeCompare(b.name);
                });

            calculumAnalyzeFilter.dataArray.operators =
              calculumAnalyzeFilter.selectedFilterArray[key].operators.map(
                (item: any) => {
                  return {
                    name: item,
                    value: item,
                  };
                },
              );
          }
        });
      }
      if (isEditMode) {
        if (calculumAnalyzeFilter.selectedFilter !== "SPEND_VOLUME") {
          calculumAnalyzeFilter.selectedTopRankTab = false;
          setTab("select");
        }

        Object.keys(props.availableFilters).forEach(function (key: any) {
          if (key === calculumAnalyzeFilter.selectedFilter) {
            if (
              calculumAnalyzeFilter.selectedFilterArray[key] !== null &&
              calculumAnalyzeFilter.selectedFilterArray[key].operators.length >
                0 &&
              calculumAnalyzeFilter.selectedFilterArray[key].type === "text"
            ) {
              setTab("select");
            } else if (
              calculumAnalyzeFilter.selectedFilterArray[key] !== null &&
              calculumAnalyzeFilter.selectedFilterArray[key].operators.length >
                0 &&
              calculumAnalyzeFilter.selectedFilterArray[key].type === "number"
            ) {
              setTab("condition");
            } else {
              setTab("select");
            }
            calculumAnalyzeFilter.dataArray.type =
              calculumAnalyzeFilter.selectedFilterArray[key].type;
            calculumAnalyzeFilter.dataArray.values =
              calculumAnalyzeFilter.selectedFilterArray[key].values
                ?.map((item: any) => {
                  return {
                    name: item.key,
                    value: item.value,
                    selected: checkIfSelected(item),
                  };
                })
                .sort((a: any, b: any) => {
                  return a.name.localeCompare(b.name);
                });

            calculumAnalyzeFilter.dataArray.operators =
              calculumAnalyzeFilter.selectedFilterArray[key].operators?.map(
                (item: any) => {
                  return {
                    name: item,
                    value: item,
                  };
                },
              );
          }
        });
      }

      if (props.isEditMode) {
        if (props.editFilterObj?.multi === null) {
          setTab("condition");
        }
        if (props.editFilterObj?.operators === null) {
          setTab("select");
        }
        if (props.editFilterObj?.level !== null) {
          selectTabLevel(props.editFilterObj?.level);
        }
        if (
          calculumAnalyzeFilter.dataArray.type === "number" &&
          props.editFilterObj?.top !== null &&
          props.editFilterObj?.top.type.length > 0 &&
          calculumAnalyzeFilter.selectedFilter === "SPEND_VOLUME"
        ) {
          const typeTopCategory =
            getTypeForTopCategoryForSelect(props.editFilterObj?.top.type) ??
            "quantity";
          calculumAnalyzeFilter.selectedTopRankCategory.category =
            typeTopCategory ?? "quantity";
          calculumAnalyzeFilter.selectedTopRankCategory.value =
            props.editFilterObj?.top.value;
          selectTabLevel(props.editFilterObj?.level);
          setTab("top-rank");
        }
        if (props.editFilterObj?.filterOne !== null) {
          if (calculumAnalyzeFilter.selectedFilter === "SPEND_VOLUME") {
            calculumAnalyzeFilter.filterRuleCondition =
              props.editFilterObj?.condition;
            if (
              props.editFilterObj?.filterOne.operator !== null &&
              props.editFilterObj?.filterOne.value !== null
            ) {
              calculumAnalyzeFilter.filterRuleOneOperator =
                props.editFilterObj?.filterOne.operator;
              calculumAnalyzeFilter.filterRuleOneValue = FormatData.changeToUSD(
                props.editFilterObj?.filterOne.value.toString(),
              ).toFixed(0);
            }
            if (
              props.editFilterObj?.filterTwo !== null &&
              props.editFilterObj?.filterTwo.operator !== null &&
              props.editFilterObj?.filterTwo.value !== null
            ) {
              calculumAnalyzeFilter.filterRuleTwoOperator =
                props.editFilterObj?.filterTwo.operator;
              calculumAnalyzeFilter.filterRuleTwoValue = FormatData.changeToUSD(
                props.editFilterObj?.filterTwo.value.toString(),
              ).toFixed(0);
            }
          } else {
            calculumAnalyzeFilter.filterRuleCondition =
              props.editFilterObj?.condition;
            if (
              props.editFilterObj?.filterOne !== null &&
              props.editFilterObj?.filterOne.operator !== null &&
              props.editFilterObj?.filterOne.operator.length > 0
            ) {
              calculumAnalyzeFilter.filterRuleOneOperator =
                props.editFilterObj?.filterOne.operator;
            }
            if (
              props.editFilterObj?.filterOne !== null &&
              props.editFilterObj?.filterOne.operator !== null &&
              props.editFilterObj?.filterOne.value !== null
            ) {
              calculumAnalyzeFilter.filterRuleOneValue =
                props.editFilterObj?.filterOne.value;
            }
          }
        }
        if (props.editFilterObj?.filterTwo !== null) {
          if (props.editFilterObj?.filterTwo.operator !== null) {
            calculumAnalyzeFilter.filterRuleTwoOperator =
              props.editFilterObj?.filterTwo.operator;
          }
          if (props.editFilterObj?.filterTwo.value !== null) {
            calculumAnalyzeFilter.filterRuleTwoValue =
              props.editFilterObj?.filterTwo.value;
          }
        }
      }
      calculumAnalyzeFilter.hasValueItems =
        calculumAnalyzeFilter.dataArray.values.length > 0;
      calculumAnalyzeFilter.hasOperatorItems =
        calculumAnalyzeFilter.dataArray.operators.length > 0;

      if (!calculumAnalyzeFilter.hasOperatorItems) {
        calculumAnalyzeFilter.ruleone = null;
        calculumAnalyzeFilter.ruletwo = null;
      }

      if (
        calculumAnalyzeFilter.hasValueItems &&
        !calculumAnalyzeFilter.hasOperatorItems
      ) {
        calculumAnalyzeFilter.filterRuleOneOperator = "";
        calculumAnalyzeFilter.filterRuleOneValue = "";
        calculumAnalyzeFilter.filterRuleTwoOperator = "";
        calculumAnalyzeFilter.filterRuleTwoValue = "";
        calculumAnalyzeFilter.ruleone = null;
        calculumAnalyzeFilter.ruletwo = null;
      }

      if (
        calculumAnalyzeFilter.hasValueItems &&
        calculumAnalyzeFilter.hasOperatorItems
      ) {
        calculumAnalyzeFilter.ruleone = null;
        calculumAnalyzeFilter.ruletwo = null;
      }
    }

    function setTab(selected: string) {
      // Default values
      calculumAnalyzeFilter.selectedTab = "select";
      calculumAnalyzeFilter.selectedSelectorsTab = true;
      calculumAnalyzeFilter.selectedTopRankTab = false;
      calculumAnalyzeFilter.selectedConditionsTab = false;

      // Update based on selected tab
      if (selected === "condition") {
        calculumAnalyzeFilter.selectedTab = "condition";
        calculumAnalyzeFilter.selectedSelectorsTab = false;
        calculumAnalyzeFilter.selectedConditionsTab = true;
      } else if (selected === "top-rank") {
        calculumAnalyzeFilter.selectedTab = "top-rank";
        calculumAnalyzeFilter.selectedSelectorsTab = false;
        calculumAnalyzeFilter.selectedConditionsTab = false;
        calculumAnalyzeFilter.selectedTopRankTab = true;
      }
    }

    function selectedValuesCheck(dataArray: any) : Array<any> {
    
      const selectedValues = dataArray.values.filter(
        (item: any) => item.selected,
      );
      const multiValues = selectedValues.map((item: any) => item.name);
      if (multiValues.length > 0) {
        calculumAnalyzeFilter.selectedTab = "select";
      }
      return multiValues
    }

    function checkIfOnlyOneInput() : boolean {
       return (calculumAnalyzeFilter.showInputOne &&
          calculumAnalyzeFilter.filterRuleTwoOperator.length === 0 &&
          calculumAnalyzeFilter.filterRuleTwoValue.toString().length === 0) ||
        (!calculumAnalyzeFilter.showInputOne &&
          calculumAnalyzeFilter.filterRuleOneOperator.length > 0 &&
          calculumAnalyzeFilter.filterRuleOneValue.toString().length > 0 &&
          calculumAnalyzeFilter.filterRuleTwoOperator.length === 0 &&
          calculumAnalyzeFilter.filterRuleTwoValue.toString().length === 0);

    }

    function checkIfHasCondition(): boolean {
      return Boolean(calculumAnalyzeFilter?.filterRuleCondition && calculumAnalyzeFilter.filterRuleCondition.length > 0);
    }


    function checkIfTwoInputsWithoutValuesRequired() : boolean {
      return calculumAnalyzeFilter.showInputOne &&
        calculumAnalyzeFilter.showInputTwo;
    }

    function checkIfTwoInputsFirstInputNoValueRequired(hasCondition: boolean) : boolean {
      return calculumAnalyzeFilter.showInputOne &&
        !calculumAnalyzeFilter.showInputTwo &&
        calculumAnalyzeFilter.filterRuleTwoValue.toString().length > 0 &&
        hasCondition;

    }

    function checkIfTwoInputsSecondIndputNoValueRequired(hasCondition: boolean) {
      return !calculumAnalyzeFilter.showInputOne &&
        calculumAnalyzeFilter.filterRuleOneValue.toString().length > 0 &&
        calculumAnalyzeFilter.showInputTwo &&
        hasCondition;
    }

    function checkIfHasTwoInputs (hasCondition: boolean, twoInputsWithoutValuesRequired: boolean) : boolean {
      return (!calculumAnalyzeFilter.showInputOne &&
          calculumAnalyzeFilter.filterRuleOneOperator.length > 0 &&
          calculumAnalyzeFilter.filterRuleOneValue.toString().length > 0 &&
          !calculumAnalyzeFilter.showInputTwo &&
          calculumAnalyzeFilter.filterRuleTwoOperator.length > 0 &&
          calculumAnalyzeFilter.filterRuleTwoValue.toString().length > 0 &&
          hasCondition) ||
        (twoInputsWithoutValuesRequired && hasCondition);
    }

    function checkIfNumberAndIsGreaterThanZero() : boolean {
      return !isNaN(calculumAnalyzeFilter.selectedTopRankCategory.value) &&
        calculumAnalyzeFilter.selectedTopRankCategory.value > 0;
    }


    function checkIfNumberAndGreaterThanZeroTopPercent(topRankPercentSelected : boolean) : boolean {
      return !isNaN(calculumAnalyzeFilter.selectedTopRankCategory.value) &&
        calculumAnalyzeFilter.selectedTopRankCategory.value > 0 &&
        calculumAnalyzeFilter.selectedTopRankCategory.value <= 100 &&
        topRankPercentSelected;
    }


    function evaluateBeforeSaveEmit(multiValues : Array<any>, onlyFirstInput : boolean, twoInputsFirstInputNoValueRequired : boolean, twoInputsSecondInputNoValueRequired : boolean, hasTwoInputs : boolean, isNumberAndGreaterThanZeroTopRankValue : boolean, isNumberAndGreaterThanZeroAndLessThan100TopPercent : boolean, hasCondition : boolean, topRankPercentSelected: boolean ) {
      if (
        calculumAnalyzeFilter.selectedTab === "select" &&
        multiValues.length > 0
      ) {
        saveChosenFilterEmit();
      } else if (onlyFirstInput) {
        saveChosenFilterEmit();
      } else if (hasTwoInputs) {
        saveChosenFilterEmit();
      } else if (twoInputsFirstInputNoValueRequired) {
        saveChosenFilterEmit();
      } else if (twoInputsSecondInputNoValueRequired) {
        saveChosenFilterEmit();
      }  else if (
        calculumAnalyzeFilter.selectedTab === "top-rank" &&
        isNumberAndGreaterThanZeroTopRankValue &&
        calculumAnalyzeFilter.selectedTopRankCategory.category.length > 0 &&
        calculumAnalyzeFilter.selectedTopRankCategory.value &&
        calculumAnalyzeFilter.selectedTopRankCategory.category !== "percent"
      ) {
        saveChosenFilterEmit();
      } else if (isNumberAndGreaterThanZeroAndLessThan100TopPercent) {
        saveChosenFilterEmit();
      } else {
        if (!isNumberAndGreaterThanZeroTopRankValue) {
          toast.error(translate.t("home.analyze.pleaseEnterNumberOnly"));
          calculumAnalyzeFilter.triedToSubmit = true;
          
        } else if (!hasCondition && !topRankPercentSelected) {
          calculumAnalyzeFilter.triedToSubmit = true;
          toast.error(translate.t("home.analyze.pleaseSelectCondition"));
          
        } else {
          if (topRankPercentSelected) {
            calculumAnalyzeFilter.inputErrorForTopRankPercent = true;
          } else {
            toast.error(translate.t("home.analyze.pleaseSelectValue"));
            
          }
        }
      }
    }

    function checkIfTopRankSelected() : boolean {
      return calculumAnalyzeFilter.selectedTopRankCategory.category === "percent";
    }

    function evaluateSavedProperties() {

      const multiValues = selectedValuesCheck(calculumAnalyzeFilter.dataArray)
      if (calculumAnalyzeFilter.selectedTab === "condition") {
        calculumAnalyzeFilter.filterRuleOneValue =
        calculumAnalyzeFilter.filterRuleOneValue.toString();
        calculumAnalyzeFilter.filterRuleTwoValue = calculumAnalyzeFilter.filterRuleTwoValue.toString() 
      }

      const onlyFirstInput = checkIfOnlyOneInput()        
      const hasCondition = checkIfHasCondition()
      const twoInputsWithoutValuesRequired = checkIfTwoInputsWithoutValuesRequired()
      const twoInputsFirstInputNoValueRequired = checkIfTwoInputsFirstInputNoValueRequired(hasCondition)
      const twoInputsSecondInputNoValueRequired = checkIfTwoInputsSecondIndputNoValueRequired(hasCondition)
      const hasTwoInputs = checkIfHasTwoInputs(hasCondition, twoInputsWithoutValuesRequired)
      const isNumberAndGreaterThanZeroTopRankValue = checkIfNumberAndIsGreaterThanZero() 
      const topRankPercentSelected = checkIfTopRankSelected()
      const isNumberAndGreaterThanZeroAndLessThan100TopPercent = checkIfNumberAndGreaterThanZeroTopPercent(topRankPercentSelected)
  
      evaluateBeforeSaveEmit(multiValues, onlyFirstInput, twoInputsFirstInputNoValueRequired, twoInputsSecondInputNoValueRequired , hasTwoInputs, isNumberAndGreaterThanZeroTopRankValue, isNumberAndGreaterThanZeroAndLessThan100TopPercent, hasCondition, topRankPercentSelected )
      
    }

    function convertValue(val: any) {
      const myConvertedVal = FormatData.changeToCurrency(val);
      return Number(myConvertedVal).toFixed(2);
    }

    function isValuePossibleNumber(value: any) {
      if (!isNaN(Number(value)) && Number(value) > 0) {
        calculumAnalyzeFilter.errorWithInputValues = false;
        return value;
      } else {
        calculumAnalyzeFilter.errorWithInputValues = true;
        return null;
      }
    }

    function saveChosenFilterEmit() {
      if (calculumAnalyzeFilter.selectedTab === "select") {
        const selectedValues = calculumAnalyzeFilter.dataArray.values.filter(
          (item: any) => item.selected,
        );
        const multiKeys = selectedValues.map((item: any) => item.name);
        const multiValues = selectedValues.map((item: any) => item.value);

        calculumAnalyzeFilter.hasCategoryLevel = validateLevelsForSelectFilter(calculumAnalyzeFilter.selectedFilter);
        const userFilterValues = {
          field: calculumAnalyzeFilter.selectedFilter
            .toUpperCase()
            .replace(/ /g, "_"),
          filterOne: null,
          filterTwo: null,
          condition: calculumAnalyzeFilter.ruletwo,
          multi: multiKeys,
          level: calculumAnalyzeFilter.hasCategoryLevel
            ? calculumAnalyzeFilter.selectedFilter === "SME"
              ? "supplier"
              : calculumAnalyzeFilter.selectLevel
            : null,
          top: null,
          values: multiValues,
        };
        if (props.isEditMode) {
          emit("updateChosenConditionFilter", userFilterValues);
        } else {
          emit("saveChosenConditionFilter", userFilterValues);
        }
      }
      if (calculumAnalyzeFilter.selectedTab === "condition") {
        calculumAnalyzeFilter.hasCategoryLevel = validateLevelsForSelectFilter(calculumAnalyzeFilter.selectedFilter);

        if (calculumAnalyzeFilter.dataArray.type === "text") {
          calculumAnalyzeFilter.ruleone = {
            operator:
              calculumAnalyzeFilter.filterRuleOneOperator?.length > 0
                ? calculumAnalyzeFilter.filterRuleOneOperator
                : null,
            value:
              calculumAnalyzeFilter.filterRuleOneValue?.toString().length > 0
                ? calculumAnalyzeFilter.filterRuleOneValue.toString()
                : null,
          };
          calculumAnalyzeFilter.ruletwo = {
            operator:
              calculumAnalyzeFilter.filterRuleTwoOperator.length > 0
                ? calculumAnalyzeFilter.filterRuleTwoOperator
                : null,
            value:
              calculumAnalyzeFilter.filterRuleTwoValue?.toString().length > 0
                ? calculumAnalyzeFilter.filterRuleTwoValue.toString()
                : null,
          };
        }

        if (calculumAnalyzeFilter.dataArray.type === "number") {
          if (calculumAnalyzeFilter.selectedFilter === "SPEND_VOLUME") {
            calculumAnalyzeFilter.ruleone = {
              operator:
                calculumAnalyzeFilter.filterRuleOneOperator?.length > 0
                  ? calculumAnalyzeFilter.filterRuleOneOperator
                  : null,
              value:
                calculumAnalyzeFilter.filterRuleOneValue?.toString().length > 0 &&
                isValuePossibleNumber(calculumAnalyzeFilter.filterRuleOneValue)
                  ? convertValue(calculumAnalyzeFilter.filterRuleOneValue)
                  : null,
            };
            calculumAnalyzeFilter.ruletwo = {
              operator:
                calculumAnalyzeFilter.filterRuleTwoOperator.length > 0
                  ? calculumAnalyzeFilter.filterRuleTwoOperator
                  : null,
              value:
                calculumAnalyzeFilter.filterRuleTwoValue?.toString().length > 0 &&
                isValuePossibleNumber(calculumAnalyzeFilter.filterRuleTwoValue)
                  ? convertValue(calculumAnalyzeFilter.filterRuleTwoValue)
                  : null,
            };
          } else {
            calculumAnalyzeFilter.ruleone = {
              operator:
                calculumAnalyzeFilter.filterRuleOneOperator?.length > 0
                  ? calculumAnalyzeFilter.filterRuleOneOperator
                  : null,
              value:
                calculumAnalyzeFilter.filterRuleOneValue?.length > 0 &&
                isValuePossibleNumber(calculumAnalyzeFilter.filterRuleOneValue)
                  ? Number(calculumAnalyzeFilter.filterRuleOneValue)
                  : null,
            };
            calculumAnalyzeFilter.ruletwo = {
              operator:
                calculumAnalyzeFilter.filterRuleTwoOperator.length > 0
                  ? calculumAnalyzeFilter.filterRuleTwoOperator
                  : null,
              value:
                calculumAnalyzeFilter.filterRuleTwoValue?.length > 0 &&
                isValuePossibleNumber(calculumAnalyzeFilter.filterRuleTwoValue)
                  ? Number(calculumAnalyzeFilter.filterRuleTwoValue)
                  : null,
            };
          }
        }

        const userFilterValues = {
          field: calculumAnalyzeFilter.selectedFilter
            .toUpperCase()
            .replace(/ /g, "_"),
          filterOne: calculumAnalyzeFilter.ruleone,
          filterTwo:
            calculumAnalyzeFilter?.ruletwo?.operator === null
              ? null
              : calculumAnalyzeFilter.ruletwo,
          condition: calculumAnalyzeFilter.filterRuleCondition,
          multi: null,
          level: calculumAnalyzeFilter.hasCategoryLevel
            ? calculumAnalyzeFilter.selectLevel
            : null,
          top: null,
        };
        if (props.isEditMode) {
          if (calculumAnalyzeFilter.errorWithInputValues) {
            if (calculumAnalyzeFilter.dataArray.type === "number") {
              toast.error(translate.t("home.analyze.pleaseEnterNumbersOnly"));
              
            }
          } else {
            emit("updateChosenConditionFilter", userFilterValues);
          }
        } else {
          if (calculumAnalyzeFilter.errorWithInputValues) {
            if (calculumAnalyzeFilter.dataArray.type === "number") {
              toast.error(translate.t("home.analyze.pleaseEnterNumbersOnly"));
            }
          } else {
            emit("saveChosenConditionFilter", userFilterValues);
          }
        }
      } else if (calculumAnalyzeFilter.selectedTab === "top-rank") {
        calculumAnalyzeFilter.hasCategoryLevel = validateLevelsForSelectFilter(calculumAnalyzeFilter.selectedFilter);
        const userFilterValues = {
          field: calculumAnalyzeFilter.selectedFilter
            .toUpperCase()
            .replace(/ /g, "_"),
          filterOne: null,
          filterTwo: null,
          condition: null,
          multi: null,
          level: calculumAnalyzeFilter.hasCategoryLevel
            ? calculumAnalyzeFilter.selectLevel
            : null,
          top: {
            type: getTypeForTopCategory(
              calculumAnalyzeFilter.selectedTopRankCategory.category,
            ),
            value: Number(calculumAnalyzeFilter.selectedTopRankCategory.value),
            order: "DESC",
          },
        };
        if (props.isEditMode) {
          emit("updateChosenConditionFilter", userFilterValues);
        } else {
          emit("saveChosenConditionFilter", userFilterValues);
        }
      }
    }

    function getTypeForTopCategoryForSelect(val: string) {
      if (val === "topN") {
        return "quantity";
      } 
      if (val === "topP") {
        return "percent";
      }
    }

    function validateLevelsForSelectFilter(field: string) {
      const filtersByKey = props.availableFilters as unknown as Record<string, { levels?: unknown[] }>;
      const haveLevels = (filtersByKey[field]?.levels?.length ?? 0) > 0;
      if (haveLevels) {
        return true;
      } else {
        return false;
      }
    }

    function getTypeForTopCategory(val: string) {
      if (val === "quantity") {
        return "topN";
      }
      if (val === "percent") {
        return "topP";
      }
    }

    /**
     * Selects radio button item and checks
     * other radio buttons item to unchecked
     * @param item
     */

    function selectSingleValue(item: RadioBtn) {
      // make other items unchecked
      calculumAnalyzeFilter.dataArray.values.forEach((value: any) => {
        if (value.name === item.name) {
          value.selected = true;
        } else {
          value.selected = false;
        }
      });
    }

    function changeSelectedValueForUiGroups(
      companyUUID: string,
      isChecked: boolean,
    ) {
      // Find the company in the list
      let selectedCompany:
        | { name: string; uuid: string; selected: boolean }
        | undefined = props.listOfCompanies.find(
        (item: any) => item.uuid === companyUUID,
      );

      if (selectedCompany) {
        // Set the selected status of the company
        selectedCompany.selected = isChecked;

        if (isChecked) {
          // Add the newly selected company to the forUiGroupsFilterArray if not already present
          if (
            !uiGroupInterface.forUiGroupsFilterArray.some(
              (item) => item.uuid === selectedCompany?.uuid,
            )
          ) {
            uiGroupInterface.forUiGroupsFilterArray.push(selectedCompany);
          }

          // Retrieve all previously selected companies from dataArray
          const selectedCompanies = uiGroupInterface.dataArray.filter(
            (item) => item.selected,
          );

          // Merge previously selected companies into forUiGroupsFilterArray, removing duplicates
          selectedCompanies.forEach((company) => {
            if (
              !uiGroupInterface.forUiGroupsFilterArray.some(
                (item) => item.uuid === company.uuid,
              )
            ) {
              uiGroupInterface.forUiGroupsFilterArray.push(company);
            }
          });
        } else {
          // Remove the company from the array if unchecked
          uiGroupInterface.forUiGroupsFilterArray =
            uiGroupInterface.forUiGroupsFilterArray.filter(
              (item) => item.uuid !== companyUUID,
            );
        }
      }
    }

    function changeSelectedValue() {
      if (props.isForUIGroupsFilter) {
        calculumAnalyzeFilter.resetAllCompanies.selected = false;
      } else {
        const selectedValues = calculumAnalyzeFilter.dataArray.values.filter(
          (item: any) => item.selected,
        );
        if (
          selectedValues.length < calculumAnalyzeFilter.dataArray.values.length
        ) {
          calculumAnalyzeFilter.checkAllValue = false;
        } else {
          calculumAnalyzeFilter.checkAllValue = true;
        }
      }
    }

    function closeRuleFilterComponent() {
      calculumAnalyzeFilter.selectedFilter = "";
      calculumAnalyzeFilter.selectedFilterArray = [];
      calculumAnalyzeFilter.filterRuleOneOperator = "";
      calculumAnalyzeFilter.filterRuleOneValue = "";
      calculumAnalyzeFilter.filterRuleCondition = "AND";
      calculumAnalyzeFilter.filterRuleTwoOperator = "";
      calculumAnalyzeFilter.filterRuleTwoValue = "";
      calculumAnalyzeFilter.triedToSubmit = false;
      emit("close", props.isEditMode);
    }

    function getTranslatedValue(field: any) {
      if (field.includes("CUSTOM_FIELD_")) {
        let keyField = props.availableFilters[field] as CustomField;
        let title: string = keyField.title;
        return title.includes("CUSTOM_FIELD_")
          ? translate.t("home.analyze.rules." + title)
          : title;
      } else {
        return translate.t("home.analyze.rules." + field);
      }
    }

    function handleSelected(selected: { key: string; value: string }) {
      calculumAnalyzeFilter.selectedFilter = selected.key;
      setSelectedFieldRule(false);
    }

    function handleOperatorSelected(selected: { key: string; value: string }) {
      calculumAnalyzeFilter.filterRuleOneOperator = selected.key;
      checkOperator();
    }

    const currentFieldSelected = computed(() => {
      return calculumAnalyzeFilter.selectedFilter;
    });

    const currentFilterRuleOneOperatorSelected = computed(() => {
      return calculumAnalyzeFilter.filterRuleOneOperator.length > 0
        ? calculumAnalyzeFilter.filterRuleOneOperator
        : "";
    });

    const currentFilterRuleConditionSelected = computed(() => {
      return calculumAnalyzeFilter.filterRuleCondition.length > 0
        ? calculumAnalyzeFilter.filterRuleCondition
        : "";
    });

    const currentFilterRuleTwoOperatorSelected = computed(() => {
      return calculumAnalyzeFilter.filterRuleTwoOperator.length > 0
        ? calculumAnalyzeFilter.filterRuleTwoOperator
        : "";
    });

    const showConditionSection = computed(() => {
      return (
        (!calculumAnalyzeFilter.hasValueItems &&
          calculumAnalyzeFilter.hasOperatorItems &&
          !calculumAnalyzeFilter.selectedTopRankTab) ||
        (calculumAnalyzeFilter.hasValueItems &&
          calculumAnalyzeFilter.hasOperatorItems &&
          calculumAnalyzeFilter.selectedTab === "condition" &&
          !calculumAnalyzeFilter.selectedTopRankTab)
      );
    });

    const showCheckboxSection = computed(() => {
      return (
        (calculumAnalyzeFilter.hasValueItems &&
          !calculumAnalyzeFilter.hasOperatorItems &&
          !calculumAnalyzeFilter.selectedTopRankTab) ||
        (calculumAnalyzeFilter.hasValueItems &&
          calculumAnalyzeFilter.hasOperatorItems &&
          calculumAnalyzeFilter.selectedTab === "select" &&
          !calculumAnalyzeFilter.selectedTopRankTab)
      );
    });

    const ifActiveProgram = computed(() => {
      return calculumAnalyzeFilter.selectedFilter === "ACTIVE_PROGRAM";
    });

    const ifSelectedFilterSME = computed(() => {
      return calculumAnalyzeFilter.selectedFilter === "SME";
    });

    const isTabSelect = computed(() => {
      return calculumAnalyzeFilter.selectedTab === "select";
    });

    const isTabCondition = computed(() => {
      return calculumAnalyzeFilter.selectedTab === "condition";
    });

    const isTabTopRank = computed(() => {
      return calculumAnalyzeFilter.selectedTab === "top-rank";
    });

    const isTabSelectedTopRankTab = computed(() => {
      return calculumAnalyzeFilter.selectedTopRankTab;
    });

    const fieldHasCheckboxValues = computed(() => {
      return calculumAnalyzeFilter.dataArray.values.length > 0;
    });

    const fieldHasConditions = computed(() => {
      return calculumAnalyzeFilter.dataArray.operators.length > 0;
    });

    const dataListOperators = computed(() => {
      return calculumAnalyzeFilter.dataArray["operators"].map(
        (operatorItem: any) => {
          return {
            key: operatorItem.name,
            value: translateValue(operatorItem.name),
          };
        },
      );
    });

    const fieldArrayList = computed(() => {
      let data = Object.keys(props.availableFilters)
      .map((fieldItem: any) => {
        return {
          key: fieldItem,
          value: getTranslatedValue(fieldItem), // Translate the key for sorting
        };
      })
      .sort((a, b) => {
        // Sort based on the translated values
        return a.value.localeCompare(b.value, undefined, { numeric: true });
      });

        return data;

    });

    const logicalOperators = computed(() => {
      return [
        {
          key: "AND",
          value: translate.t("global.logicalOperators.and"),
        },
        {
          key: "OR",
          value: translate.t("global.logicalOperators.or"),
        },
      ];
    });

    const forUiGroups = computed(() => {
      return props.forSpecificUiGroup || props.isForUIGroupsFilter;
    });

    const haveSomeFilterToshow = computed(() => {
      // UI Groups picker feeds from listOfCompanies, not availableFilters
      if (forUiGroups.value) return (props.listOfCompanies?.length ?? 0) > 0;
      const filters = props.availableFilters;
      if (Array.isArray(filters)) return filters.length > 0;
      return Object.keys(filters).length > 0;
    });

    return {
      ...toRefs(uiGroupInterface),
      ...toRefs(calculumAnalyzeFilter),
      changeSelectedValue,
      changeSelectedValueForUiGroups,
      checkAll,
      checkOperator,
      closeRuleFilterComponent,
      countSelectedCompanies,
      currentFieldSelected,
      currentFilterRuleConditionSelected,
      currentFilterRuleOneOperatorSelected,
      currentFilterRuleTwoOperatorSelected,
      dataListOperators,
      errorDefaultState,
      evaluateSavedProperties,
      fieldArrayList,
      fieldHasCheckboxValues,
      fieldHasConditions,
      filteredArray,
      filteredlistOfCompanies,
      fontIcons,
      FormatData,
      forUiGroups,
      getLevelForEditCategorize,
      getTranslatedValue,
      handleOperatorSelected,
      handleSelected,
      iconCheckbox,
      ifActiveProgram,
      ifSelectedFilterSME,
      isTabCondition,
      isTabSelect,
      isTabSelectedTopRankTab,
      isTabTopRank,
      logicalOperators,
      resetCheck,
      returnTypeForInput,
      saveSelectedCompanies,
      selectSingleValue,
      selectTabLevel,
      setSelectedFieldRule,
      setTab,
      showCheckboxSection,
      showConditionSection,
      sortedValues,
      specificUi,
      translateValue,
      validateLevelsForSelectFilter,
      haveSomeFilterToshow
    };
  },
});
</script>

<style lang="scss" scoped>

@import "src/resources/assets/styles/variables/_colors.scss";
@import "../filter/style.scss";


.form-checkout {
  margin-bottom: 5px !important;
}


</style>
