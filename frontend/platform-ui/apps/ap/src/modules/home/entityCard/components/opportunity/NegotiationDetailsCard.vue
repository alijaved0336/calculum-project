<script setup lang="ts">
import { Skeleton } from "@progress/kendo-vue-indicators";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import type { EntityCardNegotiation } from "@/modules/home/entityCard/types";
import { formatDetailsItems } from "@/utils";

defineProps<{
  hasVCard: boolean | null;
  entityDetails: Record<string, any> | null;
  spendDetails: EntityCardNegotiation["spendDetails"];
  isLoadingEntityDetails: boolean;
  selectedTabIndex: number;
  companyType: string;
  buyingEntityCountryLabelEntity: string;
  buyingEntityCountryLabelSpend: string;
}>();
</script>

<template>
  <div class="col-xl-3 col-lg-3">
    <div
      v-if="isLoadingEntityDetails && hasVCard === null"
      class="card shadow-none"
    >
      <div class="card-body d-flex flex-column justify-content-between">
        <div class="row">
          <div class="col-6 col-lg-6">
            <Skeleton
              class="skeletons-bg mt-2 text-center"
              :shape="'rectangle'"
              :style="{ width: '100%', height: '36px', borderRadius: '50px' }"
            ></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-6 col-lg-6">
            <Skeleton
              class="skeletons-bg mt-2 text-center"
              :shape="'rectangle'"
              :style="{ width: '100%', height: '16px', borderRadius: '50px' }"
            ></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-6 col-lg-6">
            <Skeleton
              class="skeletons-bg mt-2 text-center"
              :shape="'rectangle'"
              :style="{ width: '100%', height: '36px', borderRadius: '50px' }"
            ></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-6 col-lg-6">
            <Skeleton
              class="skeletons-bg mt-2 text-center"
              :shape="'rectangle'"
              :style="{ width: '100%', height: '16px', borderRadius: '50px' }"
            ></Skeleton>
          </div>
          <div class="col-6 col-lg-6">
            <Skeleton
              class="skeletons-bg mt-2 text-center"
              :shape="'rectangle'"
              :style="{ width: '100%', height: '16px', borderRadius: '50px' }"
            ></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-6 col-lg-6">
            <Skeleton
              class="skeletons-bg mt-2 text-center"
              :shape="'rectangle'"
              :style="{ width: '100%', height: '36px', borderRadius: '50px' }"
            ></Skeleton>
          </div>
        </div>
        <div class="col-6 col-lg-6">
          <Skeleton
            class="skeletons-bg mt-2 text-center"
            :shape="'rectangle'"
            :style="{ width: '100%', height: '36px', borderRadius: '50px' }"
          ></Skeleton>
        </div>
      </div>
    </div>
    <div
      v-else
      class="card shadow-none"
    >
      <div class="card-body">
        <div class="row">
          <div class="col-12 col-lg-12 d-flex justify-content-between">
            <h5 class="mb-2 text-base font-bold">{{ $t("global.details") }}</h5>
          </div>
        </div>
        <template v-if="selectedTabIndex === 0">
          <div class="row mb-1">
            <div class="col-12 col-lg-12">
              <h6 class="mb-1 text-xs text-gray-400">
                {{
                  companyType === "potential-parent" || companyType === "parent"
                    ? $t("home.entityCard.details.buyingEntityparent")
                    : $t("home.entityCard.details.buyingEntitysupplier")
                }}
              </h6>
            </div>
            <div class="col-12 col-lg-12">
              <Tooltip
                :open-delay="100"
                :anchor-element="'target'"
                :position="'top'"
              >
                <span
                  class="mb-1 font-semibold text-gray-700 text-sm truncate capitalize"
                  :title="entityDetails?.buyerName ?? ''"
                  >{{
                    formatDetailsItems({
                      items: entityDetails?.buyerName,
                      maxItems: 3,
                    })
                  }}</span
                >
              </Tooltip>
            </div>
          </div>
          <div class="row mb-1">
            <div class="col-12 col-lg-12">
              <h6 class="mb-1 text-xs text-gray-400">
                {{ $t("global.ultimateParent") }}
              </h6>
            </div>
            <div class="col-12 col-lg-12">
              <Tooltip
                :open-delay="100"
                :anchor-element="'target'"
                :position="'top'"
              >
                <span
                  class="mb-1 font-semibold text-gray-700 text-sm truncate capitalize"
                  :title="entityDetails?.ultimateParentCompanyName ?? ''"
                  >{{
                    formatDetailsItems({
                      items: entityDetails?.ultimateParentCompanyName,
                      maxItems: 3,
                    })
                  }}</span
                >
              </Tooltip>
            </div>
          </div>
          <div class="row mb-1">
            <div class="col-6 col-lg-6">
              <div class="row">
                <div class="col-12">
                  <h6 class="mb-1 text-xs text-gray-400">
                    {{ buyingEntityCountryLabelEntity }}
                  </h6>
                </div>
                <div class="col-12 col-lg-12">
                  <Tooltip
                    :open-delay="100"
                    :anchor-element="'target'"
                    :position="'top'"
                  >
                    <span
                      class="mb-1 font-semibold text-gray-700 text-sm truncate capitalize"
                      :title="entityDetails?.buyerCountries ?? ''"
                      >{{
                        formatDetailsItems({
                          items: entityDetails?.buyerCountries,
                          maxItems: 3,
                        })
                      }}</span
                    >
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-12">
              <h6 class="mb-1 text-xs text-gray-400">
                {{ $t("global.currencyS") }}
              </h6>
            </div>
            <div class="col-12">
              <Tooltip
                :open-delay="100"
                :anchor-element="'target'"
                :position="'top'"
              >
                <span
                  class="mb-1 font-semibold text-gray-700 text-sm truncate capitalize"
                  :title="entityDetails?.currencies ?? ''"
                  >{{
                    formatDetailsItems({
                      items: entityDetails?.currencies,
                      maxItems: 3,
                    })
                  }}</span
                >
              </Tooltip>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="row mb-1">
            <div class="col-12">
              <h6 class="mb-1 text-xs text-gray-400">
                {{ $t("global.buyingEntityS") }}
              </h6>
            </div>
            <div class="col-12">
              <Tooltip
                :open-delay="100"
                :anchor-element="'target'"
                :position="'top'"
              >
                <span
                  class="mb-1 font-semibold text-gray-700 text-sm truncate capitalize"
                  :title="spendDetails?.buyer ?? ''"
                  >{{
                    formatDetailsItems({
                      items: spendDetails?.buyer,
                      maxItems: 3,
                    })
                  }}</span
                >
              </Tooltip>
            </div>
          </div>
          <div class="row mb-1">
            <div class="col-12">
              <h6 class="mb-1 text-xs text-gray-400">
                {{ $t("global.ultimateParent") }}
              </h6>
            </div>
            <div class="col-12">
              <Tooltip
                :open-delay="100"
                :anchor-element="'target'"
                :position="'top'"
              >
                <span
                  class="mb-1 font-semibold text-gray-700 text-sm truncate capitalize"
                  :title="entityDetails?.ultimateParentCompanyName ?? ''"
                  >{{
                    formatDetailsItems({
                      items: entityDetails?.ultimateParentCompanyName,
                      maxItems: 3,
                    })
                  }}</span
                >
              </Tooltip>
            </div>
          </div>
          <div class="row mb-1">
            <div class="col-6">
              <div class="row">
                <div class="col-12">
                  <h6 class="mb-1 text-xs text-gray-400">
                    {{ buyingEntityCountryLabelSpend }}
                  </h6>
                </div>
                <div class="col-12">
                  <Tooltip
                    :open-delay="100"
                    :anchor-element="'target'"
                    :position="'top'"
                  >
                    <span
                      class="mb-1 font-semibold text-gray-700 text-sm truncate capitalize"
                      :title="spendDetails?.country ?? ''"
                      >{{
                        formatDetailsItems({
                          items: spendDetails?.country,
                          maxItems: 3,
                        })
                      }}</span
                    >
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
          <div class="row mb-1">
            <div class="col-6">
              <div class="row">
                <div class="col-12">
                  <h6 class="mb-1 text-xs text-gray-400">
                    {{ $t("global.currencyS") }}
                  </h6>
                </div>
              </div>
              <div class="row">
                <div class="col-12">
                  <Tooltip
                    :open-delay="100"
                    :anchor-element="'target'"
                    :position="'top'"
                  >
                    <span
                      class="mb-1 font-semibold text-gray-700 text-sm truncate capitalize"
                      :title="spendDetails?.currency ?? ''"
                      >{{
                        formatDetailsItems({
                          items: spendDetails?.currency,
                          maxItems: 3,
                        })
                      }}</span
                    >
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 240px;
  width: 100%;
}

.card-body {
  padding: 24px;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
</style>
