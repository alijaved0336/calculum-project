<template>
<div class="potential-requests">
    <div class="pr-header">
      <div>
        <h5 class="pr-header__title">{{ $t('home.potentialSupplierRequest.title') }}</h5>
        <p class="pr-header__subtitle">
          {{ $t('home.potentialSupplierRequest.subtitle') }}
        </p>
      </div>
      <div ref="splitBtnRef" class="pr-split-btn">
        <button
          class="btn btn-primary pr-split-btn__main font-md"
          type="button"
          :disabled="!allowedCreatePotentials"
          @click="$emit('new-request')"
        >
          {{ $t('home.potentialSupplierRequest.newRequest') }}
        </button>        
        <div v-if="dropdownOpen && dropdownItems.length" class="pr-split-btn__dropdown">
          <div
            v-for="item in dropdownItems"
            :key="item.key"
            class="pr-split-btn__dropdown-item"
            @click="handleDropdownItem(item)"
          >
            {{ item.value }}
          </div>
        </div>
      </div>
    </div>

   

    <div class="pr-stats">
      <div class="pr-stat-card">
        <div class="pr-stat-card__header">
          <span class="pr-stat-card__label">{{ $t('home.potentialSupplierRequest.stats.totalRequests') }}</span>
          <div class="pr-stat-card__icon-wrapper">
            <RequestsIcon />
          </div>
        </div>
        <div class="pr-stat-card__value-row">
          <span class="pr-stat-card__value">{{ formatNumber(totalRequests) }}</span>
          <span v-if="totalRequestsDelta" class="pr-stat-card__badge pr-stat-card__badge--success">
            {{ totalRequestsDelta }}
          </span>
        </div>
        <span class="pr-stat-card__subtitle">{{ $t('home.potentialSupplierRequest.stats.totalRequestsSubtitle') }}</span>
      </div>

      <div class="pr-stat-card">
        <div class="pr-stat-card__header">
          <span class="pr-stat-card__label">{{ $t('home.potentialSupplierRequest.stats.ready') }}</span>
          <div class="pr-stat-card__icon-wrapper">
            <i class="fa-solid fa-check text-xl text-gray-500"></i>
          </div>
        </div>
        <div class="pr-stat-card__value-row">
          <span class="pr-stat-card__value">{{ formatNumber(readyCount) }}</span>
          <span v-if="readyStatus" class="pr-stat-card__badge pr-stat-card__badge--warning">
            {{ readyStatus }}
          </span>
        </div>
        <span class="pr-stat-card__subtitle">{{ $t('home.potentialSupplierRequest.stats.readySubtitle') }}</span>
      </div>

      <div class="pr-stat-card">
        <div class="pr-stat-card__header">
          <span class="pr-stat-card__label">{{ $t('home.potentialSupplierRequest.stats.inProcess') }}</span>
          <div class="pr-stat-card__icon-wrapper">
            <i class="fa-regular fa-clock text-xl text-gray-500"></i>
          </div>
        </div>
        <div class="pr-stat-card__value-row">
          <span class="pr-stat-card__value">{{ formatNumber(inProcessCount) }}</span>
          <span v-if="inProcessStatus" class="pr-stat-card__badge pr-stat-card__badge--info">
            {{ inProcessStatus }}
          </span>
        </div>
        <span class="pr-stat-card__subtitle">{{ $t('home.potentialSupplierRequest.stats.inProcessSubtitle') }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

import { defineComponent, ref, onMounted, onUnmounted, PropType } from "vue";
import type { DropdownOption } from "@/types";
import RequestsIcon from '@/resources/assets/images/icons/Requests.vue'

export default defineComponent({
  name: "PotentialRequestsCards",
  components: {
    RequestsIcon
  },
  props: {
    totalRequests: { type: Number, default: 0 },
    totalRequestsDelta: { type: String, default: "" },
    readyCount: { type: Number, default: 0 },
    readyStatus: { type: String, default: "" },
    inProcessCount: { type: Number, default: 0 },
    inProcessStatus: { type: String, default: "" },
    dropdownItems: {
      type: Array as PropType<DropdownOption[]>,
      default: () => [],
    },
    allowedCreatePotentials: { type: Boolean, default: true}
  },
  emits: ["new-request", "dropdown-item-click"],
  setup(_props, { emit }) {
    const dropdownOpen = ref(false);
    const splitBtnRef = ref<HTMLElement | null>(null);    
    function handleDropdownItem(item: DropdownOption) {
      dropdownOpen.value = false;
      emit("dropdown-item-click", item);
    }

    function handleClickOutside(event: MouseEvent) {
      if (splitBtnRef.value && !splitBtnRef.value.contains(event.target as Node)) {
        dropdownOpen.value = false;
      }
    }

    onMounted(() => {
      document.addEventListener("click", handleClickOutside);
    });
    onUnmounted(() => document.removeEventListener("click", handleClickOutside));

    return { dropdownOpen, splitBtnRef, formatNumber, handleDropdownItem };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";

.potential-requests {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

// ─── Header ───────────────────────────────────────────────────────────────────

.pr-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;

  &__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: $color-gray-900;
    margin-bottom: 0.25rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: $color-gray-500;
    margin: 0;
  }
}

// ─── Split Button ─────────────────────────────────────────────────────────────

.pr-split-btn {
  position: relative;
  display: flex;
  flex-shrink: 0;

  &__main {
    border-right: 1px solid rgba(255, 255, 255, 0.3) !important;
    padding: 0 1rem;
    font-weight: 600;
    white-space: nowrap;
  }

  &__toggle {
    border-radius: 0 8px 8px 0 !important;
    padding: 0 0.625rem;
    min-height: 36px;

    i {
      font-size: 0.75rem;
      transition: transform 0.2s ease;
    }

    &.active i {
      transform: rotate(180deg);
    }
  }

  &__dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 180px;
    background: #fff;
    border: 1px solid $color-gray-200;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 100;
    overflow: hidden;
  }

  &__dropdown-item {
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    color: $color-gray-700;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: $color-gray-50;
    }

    & + & {
      border-top: 1px solid $color-gray-100;
    }
  }
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────

.pr-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.pr-stat-card {
  background: #fff;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__label {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: $color-gray-500;
  }

  &__icon-wrapper {
    width: 28px;
    height: 28px;
    border: 1px solid $color-gray-200;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;

    i {
      font-size: 0.75rem;
      color: $color-gray-400;
    }
  }

  &__value-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  &__value {
    font-size: 1.875rem;
    font-weight: 700;
    color: $color-gray-900;
    line-height: 1.2;
  }

  &__badge {
    font-size: 0.8125rem;
    font-weight: 600;

    &--success {
      color: $color-success-500;
    }

    &--warning {
      color: $color-warning-500;
    }

    &--info {
      color: #2e90fa;
    }
  }

  &__subtitle {
    font-size: 0.8125rem;
    color: $color-gray-500;
  }
}
</style>
