<template>
<td v-if="behavior === 'enforcedPromoted'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.enforcedPromoted)" :title="dataItem?.enforcedPromoted">{{ dataItem?.enforcedPromoted ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.enforcedPromoted ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'regulatoryTerms'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.regulatoryTerms)" :title="dataItem?.regulatoryTerms">{{ dataItem?.regulatoryTerms ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.regulatoryTerms ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'address'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text pointer" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.address)" :title="dataItem?.address">{{ dataItem?.address ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.address ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'planListSupplierIndustryName'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.industryName)" :title="dataItem?.industryName">{{ dataItem?.industryName ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.industryName ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'suppliersReceivedOriginalCommodity'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalCommodity)" :title="dataItem?.originalCommodity">{{ dataItem?.originalCommodity ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalCommodity ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'suppliersReceivedUltimateParent'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalParentCompanyName)" :title="dataItem?.originalParentCompanyName">{{ dataItem?.originalParentCompanyName ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalParentCompanyName ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'suppliersReceivedAddress'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalAddress)" :title="dataItem?.originalAddress">{{ dataItem?.originalAddress ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalAddress ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'supplierNameMatchListUltimateParent'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.parentCompanyName)" :title="dataItem?.parentCompanyName">{{ dataItem?.parentCompanyName ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.parentCompanyName ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'nameMatchList'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.name)" :title="dataItem?.name">{{ dataItem?.name ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.name ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'originalParentCompanyNameMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalParentCompanyName)" :title="dataItem?.originalParentCompanyName">{{ dataItem?.originalParentCompanyName ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalParentCompanyName ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'originalSupplierNameMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalSupplierName)" :title="dataItem?.originalSupplierName">{{ dataItem?.originalSupplierName ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalSupplierNameMatch ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'cityMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.city)" :title="dataItem?.city">{{ dataItem?.city ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.city ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'originalPaymentTermDescriptionMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalPaymentTermDescription)" :title="dataItem?.originalPaymentTermDescription">{{ dataItem?.originalPaymentTermDescription ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalPaymentTermDescription ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'originalZipCodeMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalZipCode)" :title="dataItem?.originalZipCode">{{ dataItem?.originalZipCode ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalZipCode ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'originalStateMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalState)" :title="dataItem?.originalState">{{ dataItem?.originalState ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalState ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'originalCityMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalCity)" :title="dataItem?.originalCity">{{ dataItem?.originalCity ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalCity ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'stateMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.state)" :title="dataItem?.state">{{ dataItem?.state ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.state ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'originalAddressMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalAddress)" :title="dataItem?.originalAddress">{{ dataItem?.originalAddress ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalAddress ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'zipCodeMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.zipCode)" :title="dataItem?.zipCode">{{ dataItem?.zipCode ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.zipCode ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'currencyMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.currency)" :title="dataItem?.currency">{{ dataItem?.currency ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.currency ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'domainMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.domain)" :title="dataItem?.domain">{{ dataItem?.domain ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.domain ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'commodityMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.commodity)" :title="dataItem?.commodity">{{ dataItem?.commodity ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.commodity ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'alpha3CodeMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.alpha3Code)" :title="dataItem?.alpha3Code">{{ dataItem?.alpha3Code ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.alpha3Code ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'countryMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.country)" :title="dataItem?.country">{{ dataItem?.country ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.country ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'originalIdNumberMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalIdNumber)" :title="dataItem?.originalIdNumber">{{ dataItem?.originalIdNumber ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalIdNumberMatch ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'aggregatedLinesCountMatch'" :class="sticky ? 'k-grid-content-sticky' : ''">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.aggregatedLinesCount)" :title="dataItem?.aggregatedLinesCount">{{ dataItem?.aggregatedLinesCount ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.aggregatedLinesCount ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'suppliersReceivedName'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalSupplierName)" :title="dataItem?.originalSupplierName">{{ dataItem?.originalSupplierName ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalSupplierName ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'spendCommodity'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.commodity)" :title="dataItem?.commodity">{{ dataItem?.commodity ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.commodity ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'spendBuyerEntity'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.buyer.name)" :title="dataItem?.buyer.name">{{ dataItem?.buyer.name ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.buyer.name ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'supplierCommodity'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.commodities)" :title="dataItem?.commodities">{{ dataItem?.commodities ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.commodities ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'spendOriginalName'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalSupplierName)" :title="dataItem?.originalSupplierName">{{ dataItem?.originalSupplierName ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalSupplierName ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'spendTeam' || behavior === 'supplierTeam' || behavior === 'spendTeamProgramList' || behavior === 'parentTeam'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.team)" :title="dataItem?.team">{{ dataItem?.team ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.team ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'supplierOriginalName'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalSupplierName)" :title="dataItem?.originalSupplierName">{{ dataItem?.originalSupplierName ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalSupplierName ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'defaultTeamName'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.spend?.provider?.team?.name)" :title="dataItem?.spend?.provider?.team?.name">{{ dataItem?.spend?.provider?.team?.name ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.spend?.provider?.team?.name ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'supplierOriginalNameProgramList'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalSupplierName)" :title="dataItem?.originalSupplierName">{{ dataItem?.originalSupplierName ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalSupplierName ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'supplierBuyerEntity'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.buyer?.list)" :title="dataItem?.buyer?.list">{{ dataItem?.buyer?.list ?? '-' }} </p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.buyer?.list ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'parentOriginalName'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.originalSupplierName)" :title="dataItem?.originalSupplierName">{{ dataItem?.originalSupplierName ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.originalSupplierName ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'entityOriginalName'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.entityOriginalName)" :title="dataItem?.entityOriginalName">{{ dataItem?.entityOriginalName ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.entityOriginalName ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'year'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.year)" :title="dataItem?.year">{{ dataItem?.year ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.year ?? '-' }} </p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterIdPeerGroup' || behavior === 'clusterIdSupplierStandard'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.clusterId)" :title="getClusterType(dataItem?.clusterId)">{{ getClusterType(dataItem?.clusterId)  }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ getClusterType(dataItem?.clusterId)  }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterSupplierCountryCode'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.supplierCountryCode)" :title="dataItem?.supplierCountryCode">{{ dataItem?.supplierCountryCode ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.supplierCountryCode ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterBuyerCountryCode'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.buyerCountryCode)" :title="dataItem?.buyerCountryCode">{{  dataItem?.buyerCountryCode ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{  dataItem?.buyerCountryCode ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterSimilarityRateText'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-capitalize text-column-cell__name" v-if="checkPropValue(dataItem?.similarityRateText)" :title="dataItem?.similarityRateText">{{ dataItem?.similarityRateText ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.similarityRateText ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterSupplierRegion'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.supplierRegion)" :title="dataItem?.supplierRegion">{{ dataItem?.supplierRegion ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.supplierRegion ??  '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterBuyerLeverage'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.buyerLeverage)" :title="dataItem?.buyerLeverage">{{ dataItem?.buyerLeverage ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.buyerLeverage ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterNaicsCode'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.naicsCode)" :title="dataItem?.naicsCode">{{ dataItem?.naicsCode ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.naicsCode ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterFirstQuartile'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.firstQuartile)" :title="dataItem?.firstQuartile">{{ dataItem?.firstQuartile ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.firstQuartile ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterMedian'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.median)" :title="dataItem?.median">{{ dataItem?.median ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.median ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterThirdQuartile'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.thirdQuartile)" :title="dataItem?.thirdQuartile">{{ dataItem?.thirdQuartile ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.thirdQuartile ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterNinety'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.ninety)" :title="dataItem?.ninety">{{ dataItem?.ninety ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.ninety ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterOccurrences'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.occurrences)" :title="dataItem?.occurrences">{{ dataItem?.occurrences ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.occurrences ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterMin'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.min)" :title="dataItem?.min">{{ dataItem?.min ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.min ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterMax'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.max)" :title="dataItem?.max">{{ dataItem?.max ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.max ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterInfo'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.clusterInfo)" :title="dataItem?.clusterInfo">{{ dataItem?.clusterInfo ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.clusterInfo ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterAverage'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.average)" :title="dataItem?.average">{{ dataItem?.average ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.average ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterVersion'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text center" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 center text-column-cell__name" v-if="checkPropValue(dataItem?.clusterVersion)" :title="dataItem?.clusterVersion">{{ dataItem?.clusterVersion ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.clusterVersion ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterBuyerRegion'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.buyerRegion)" :title="dataItem?.buyerRegion">{{ dataItem?.buyerRegion ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.buyerRegion ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterCompaniesCount'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.companiesCount)" :title="dataItem?.companiesCount">{{ dataItem?.companiesCount ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.companiesCount ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterParentName'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.parentName)" :title="dataItem?.parentName">{{ dataItem?.parentName ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.parentName ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterSupplierName'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.supplierName)" :title="dataItem?.supplierName">{{ dataItem?.supplierName ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.supplierName ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterCompanies'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.companies)" :title="getCompaniesText(dataItem?.companies)">{{ dataItem?.companies ? getCompaniesText(dataItem?.companies) : '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.companies ? getCompaniesText(dataItem?.companies) : '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterSuppliers'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.suppliers)" :title="getCompaniesText(dataItem?.suppliers)">{{ dataItem?.suppliers ? getCompaniesText(dataItem?.suppliers) : '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.suppliers ? getCompaniesText(dataItem?.suppliers) : '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'clusterParents'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.parents)" :title="getCompaniesText(dataItem?.parents)">{{ dataItem?.parents ? getCompaniesText(dataItem?.parents) : '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.parents ? getCompaniesText(dataItem?.parents) : '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'statusDescription'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.statusDescription)" :title="dataItem?.statusDescription">{{ dataItem?.statusDescription ?? '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.statusDescription ?? '-' }}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'statusRecalculation'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.statusRecalculation)" :title="dataItem?.statusRecalculation">{{ dataItem?.statusRecalculation !== null || dataItem?.statusRecalculation !== undefined || dataItem?.statusRecalculation !== ''  ? dataItem?.statusRecalculation : '-' }}</p>
        <p class="ml-2 ms-2 text-column-cell__name" v-else>{{ dataItem?.statusRecalculation !== null || dataItem?.statusRecalculation !== undefined || dataItem?.statusRecalculation !== '' || dataItem?.statusRecalculation.length > 0 ? dataItem?.statusRecalculation : '-'}}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'recalculationDateSpendFiles'">
  <div class="text-column-cell">
    <div class="text-column-cell__name-wrap">
      <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <p class="ml-2 ms-2 text-column-cell__name" v-if="checkPropValue(dataItem?.recalculationDate)" :title="dataItem?.recalculationDate">{{ dataItem?.recalculationDate !== null || dataItem?.recalculationDate !== undefined || dataItem?.recalculationDate !== ''  ? dataItem?.recalculationDate : '-' }}</p>
        <p class="ml-2 ms-2 text-center text-column-cell__name" v-else>{{ dataItem?.recalculationDate ??  '-'}}</p>
      </Tooltip>
    </div>
  </div>
</td>
<td v-if="behavior === 'aggreatedLinesCountMatchFooter'">
  <p>{{  total }}</p>
</td>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { checkPropValue } from "../../../utils";
import { useI18n } from "vue-i18n";
export default defineComponent({
  name: "TooltipText",
  components: {
    Tooltip
  },
  props: {
    behavior: { type: String, required: true },
    dataItem: { type: Object, required: true },
    sticky: { type: Boolean, required: false, default: false },
    dataSet: { type: Object, required: false, default: null },
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    function getCompaniesText(companies: any) {
      if (
        companies === null ||
        companies === undefined ||
        companies.length === 0
      ) {
        return "-";
      }

      let companiesText = "";
      //split string by , and add it ot the string,
      // last item does not have a comma
      for (let i = 0; i < companies.length; i++) {
        if (i === companies.length - 1) {
          companiesText += companies[i];
        } else {
          companiesText += companies[i] + ", ";
        }
      }

      return companiesText;
    }

    const total = computed(() => {
      // Ensure dataSet exists and is an array
      if (!props.dataSet || props.dataSet.length === 0) {
        return "-";
      }

      // Calculate the total sum using reduce
      const result = props.dataSet.reduce((acc: number, element: any) => {
        const value = element['aggregatedLinesCount'];
        return value == null || isNaN(value) ? acc : acc + Number(value);
      }, 0);

      // Return '-' if the result is zero
      return result === 0 ? "-" : result;
    });

    /**
     * returns the string equavalent of the cluster type
     * @param id
     */
    function getClusterType(id: number) {
      if (id === null || id === undefined) {
        return "-";
      }

      return translate.t(
        `adminBackend.adminClusters.clusterIdTextConversion.${props.behavior}.type${id}`
      );
    }

    return {
      checkPropValue,
      getClusterType,
      getCompaniesText,
      total,
    };
  }
});
</script>

<style scoped>
/* AB#20356: same fix as TextColumn.vue's .text-column-cell, generalized to every behavior branch
   here instead of the single 'aggregatedLinesCountMatch' branch it was first scoped to - the old
   pt-3 (padding-top: 1rem) on the <p> pushed the text down inside the cell instead of centering it. */
.text-column-cell {
  display: flex;
  align-items: center;
  height: 100%;
}

/* AB#20356 follow-up: same fix as TextColumn.vue's .text-column-cell__name-wrap - without a
   deterministic width to shrink against, a flex item's default `min-width: auto` refuses to shrink
   below its `white-space: nowrap` content's own width, so long values overflow past the column
   instead of truncating. */
.text-column-cell__name-wrap {
  flex: 1 1 0%;
  min-width: 0;
  overflow: hidden;
}

/* AB#20356 follow-up: same fix as TextColumn.vue's .text-column-cell__name - resets the browser's
   own <p> margin (0 top / 1em bottom), which .text-column-cell__name-wrap's `overflow: hidden`
   otherwise traps, growing the wrap's height and pinning the text to the top of the cell instead of
   centering it; also provides the truncation the removed `.ellipsis_custom` class used to. */
.text-column-cell__name {
  display: block;
  overflow: hidden;
  margin: 7px 0px;
  white-space: nowrap;
  text-overflow: ellipsis;

  /* Every <Tooltip> above (unlike TextColumn.vue's) carries `ellipsis_tooltip_custom_text`
     (_layout.scss) - Vue 3 always forwards a component's `class` onto its rendered root regardless
     of `inheritAttrs`, so that class lands on the <div> Kendo's Tooltip wraps this <p> in, and its
     `line-height: 1.25rem` cascades down onto this <p> (which never set its own), inflating the
     cell above what TextColumn.vue's ambient, unforced line-height renders. An explicit declaration
     on the element itself always wins over an inherited one, so this reclaims the cell's height
     regardless of what the Tooltip wrapper forces. */
  line-height: normal;
}
</style>
