<script setup lang="ts">
import { computed, ref, watch } from "vue";
import InlineSvg from "vue-inline-svg";
import { resolveSvgAsset } from "@ada/design-system/utils/svgAssets";
import BodyText from "../primitives/typography/body-text/Index.vue";
import CustomBadge from "../primitives/custom-badge/Index.vue";
import CustomButton from "../primitives/custom-button/Index.vue";
import DropdownPanel from "../primitives/dropdown-panel/Index.vue";
import DropdownMenuItem from "../primitives/dropdown-menu-item/Index.vue";
import {
  SUPPLIER_CARD_ACCENTS,
  SUPPLIER_CARD_DEFAULT_LABELS,
  resolveSupplierCardAccentKind,
  type SupplierCardEmits,
  type SupplierCardProps,
  type SupplierCardSupplierItem,
} from "./types";

defineOptions({
  name: "SupplierCard",
});

const props = withDefaults(defineProps<SupplierCardProps>(), {
  legalName: "",
  logoSrc: "",
  logoFallback: "",
  flagSrc: "",
  countryName: "",
  types: () => [],
  smeTitle: "",
  metrics: () => ({}),
  parentsValue: "",
  parentsLabel: SUPPLIER_CARD_DEFAULT_LABELS.parents,
  showParentLink: false,
  showClose: true,
  suppliers: () => [],
  suppliersLabel: SUPPLIER_CARD_DEFAULT_LABELS.suppliers,
  disabled: false,
});

const emit = defineEmits<SupplierCardEmits>();

const brokenLogo = ref(false);
const brokenFlag = ref(false);
const suppliersOpen = ref(false);

watch(
  () => props.logoSrc,
  () => {
    brokenLogo.value = false;
  },
);

watch(
  () => props.flagSrc,
  () => {
    brokenFlag.value = false;
  },
);

watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) {
      suppliersOpen.value = false;
    }
  },
);

const accentKind = computed(() => resolveSupplierCardAccentKind(props.types));

const accent = computed(() => {
  const kind = accentKind.value;
  return kind ? SUPPLIER_CARD_ACCENTS[kind] : undefined;
});

const hasSme = computed(() => props.types.includes("sme"));
const hasPotential = computed(() => props.types.includes("potential"));
const hasParent = computed(() => props.types.includes("parent"));

const resolvedLogoFallback = computed(() => {
  const explicit = props.logoFallback?.trim();
  if (explicit) {
    return explicit;
  }
  return props.name.trim().charAt(0);
});

const showLogoImage = computed(
  () => Boolean(props.logoSrc) && !brokenLogo.value,
);

const showFlag = computed(() => Boolean(props.flagSrc) && !brokenFlag.value);

const showLegalName = computed(() => Boolean(props.legalName.trim()));

const metricRows = computed(() =>
  Object.entries(props.metrics).filter(([, value]) => Boolean(value.trim())),
);

const showParents = computed(() => Boolean(props.parentsValue.trim()));

const showMetrics = computed(
  () => metricRows.value.length > 0 || showParents.value,
);

const supplierItems = computed(() => props.suppliers ?? []);

const resolvedSuppliersCount = computed(() => {
  if (props.suppliersCount != null) {
    return props.suppliersCount;
  }
  return supplierItems.value.length;
});

const showFooter = computed(
  () => resolvedSuppliersCount.value > 0 || supplierItems.value.length > 0,
);

const suppliersPillLabel = computed(
  () => `${props.suppliersLabel} (${resolvedSuppliersCount.value})`,
);

const chevronSrc = computed(() => resolveSvgAsset("icon-arrow-down"));
const parentLinkSrc = computed(() => resolveSvgAsset("external-link"));

function onLogoError() {
  brokenLogo.value = true;
}

function onFlagError() {
  brokenFlag.value = true;
}

function onRootClick(event: MouseEvent) {
  if (props.disabled) {
    return;
  }
  emit("click", event);
}

function onCloseClick(event: MouseEvent) {
  event.stopPropagation();
  if (props.disabled) {
    return;
  }
  emit("close", event);
}

function onParentClick(event: MouseEvent) {
  event.stopPropagation();
  if (props.disabled) {
    return;
  }
  emit("parentClick", event);
}

function onSuppliersTriggerClick(toggle: () => void) {
  if (props.disabled) {
    return;
  }
  toggle();
}

function onSupplierClick(item: SupplierCardSupplierItem, event: MouseEvent) {
  event.stopPropagation();
  if (props.disabled) {
    return;
  }
  suppliersOpen.value = false;
  emit("supplierClick", item, event);
}
</script>

<template>
  <article
    class="supplier-card"
    :class="{
      'supplier-card--disabled': disabled,
      'supplier-card--accent': accentKind != null,
    }"
    :style="accent ? { '--supplier-card-accent': accent } : undefined"
    :aria-disabled="disabled || undefined"
    @click="onRootClick"
  >
    <div class="supplier-card__content">
      <div class="supplier-card__header">
        <div class="supplier-card__logo">
          <img
            v-if="showLogoImage"
            class="supplier-card__logo-image"
            :src="logoSrc"
            :alt="name"
            loading="lazy"
            @error="onLogoError"
          />
          <span
            v-else
            class="supplier-card__logo-fallback"
            aria-hidden="true"
          >
            {{ resolvedLogoFallback }}
          </span>
        </div>

        <div class="supplier-card__identity">
          <div class="supplier-card__title-row">
            <BodyText
              class="supplier-card__name"
              variant="sm"
              weight="bold"
              as="span"
              :title="name"
            >
              {{ name }}
            </BodyText>
            <div class="supplier-card__badges">
              <CustomBadge
                v-if="hasSme"
                text="SME"
                variant="sme"
                :dot="false"
                :title="smeTitle || undefined"
              />
              <CustomBadge
                v-if="hasPotential"
                text="POTENTIAL"
                variant="potential"
                :dot="false"
              />
              <CustomBadge
                v-if="hasParent"
                text="PARENT"
                variant="parent"
                :dot="false"
              />
            </div>
          </div>
          <BodyText
            v-if="showLegalName"
            class="supplier-card__legal"
            variant="xs"
            weight="regular"
            as="span"
            :title="legalName"
          >
            {{ legalName }}
          </BodyText>
        </div>

        <div class="supplier-card__actions">
          <img
            v-if="showFlag"
            class="supplier-card__flag"
            :src="flagSrc"
            :alt="countryName"
            :title="countryName"
            loading="lazy"
            @error="onFlagError"
          />
          <CustomButton
            v-if="showClose"
            class="supplier-card__close"
            text="Close"
            variant="plain"
            icon="cross"
            :show-label="false"
            :disabled="disabled"
            @click="onCloseClick"
          />
        </div>
      </div>

      <div
        v-if="showMetrics"
        class="supplier-card__metrics"
      >
        <div
          v-for="[label, value] in metricRows"
          :key="label"
          class="supplier-card__row"
        >
          <BodyText
            class="supplier-card__label"
            variant="xs"
            weight="regular"
            as="span"
          >
            {{ label }}
          </BodyText>
          <BodyText
            class="supplier-card__value"
            variant="sm"
            weight="semibold"
            as="span"
          >
            {{ value }}
          </BodyText>
        </div>
        <div
          v-if="showParents"
          class="supplier-card__row"
        >
          <BodyText
            class="supplier-card__label"
            variant="xs"
            weight="regular"
            as="span"
          >
            {{ parentsLabel }}
          </BodyText>
          <span class="supplier-card__parents-value">
            <BodyText
              class="supplier-card__value"
              variant="sm"
              weight="semibold"
              as="span"
            >
              {{ parentsValue }}
            </BodyText>
            <button
              v-if="showParentLink"
              type="button"
              class="supplier-card__parent-link"
              :disabled="disabled"
              :aria-label="parentsValue"
              @click="onParentClick"
            >
              <InlineSvg
                class="supplier-card__parent-link-icon"
                :src="parentLinkSrc"
                width="14"
                height="14"
                aria-hidden="true"
              />
            </button>
          </span>
        </div>
      </div>

      <template v-if="showFooter">
        <div class="supplier-card__divider" />
        <div
          class="supplier-card__footer"
          @click.stop
        >
          <BodyText
            class="supplier-card__footer-label"
            variant="xs"
            weight="regular"
            as="span"
          >
            {{ suppliersLabel }}
          </BodyText>
          <DropdownPanel
            v-model:open="suppliersOpen"
            class="supplier-card__suppliers"
            align="end"
          >
            <template #trigger="{ toggle, open: isOpen }">
              <button
                type="button"
                class="supplier-card__pill"
                :class="{ 'supplier-card__pill--open': isOpen }"
                :disabled="disabled"
                :aria-expanded="isOpen"
                aria-haspopup="listbox"
                @click="onSuppliersTriggerClick(toggle)"
              >
                <BodyText
                  class="supplier-card__pill-label"
                  variant="xs"
                  weight="medium"
                  as="span"
                >
                  {{ suppliersPillLabel }}
                </BodyText>
                <InlineSvg
                  class="supplier-card__pill-chevron"
                  :src="chevronSrc"
                  width="12"
                  height="12"
                  aria-hidden="true"
                />
              </button>
            </template>
            <ul
              class="ds-dropdown-surface__list"
              role="listbox"
              :aria-label="suppliersLabel"
            >
              <li
                v-for="(item, itemIndex) in supplierItems"
                :key="item.id ?? `${item.label}-${itemIndex}`"
              >
                <DropdownMenuItem
                  :label="item.label"
                  @click="onSupplierClick(item, $event)"
                />
              </li>
            </ul>
          </DropdownPanel>
        </div>
      </template>
    </div>
  </article>
</template>

<style lang="scss" scoped>
@use "@ada/design-system/styles/disabled-state.scss" as *;

.supplier-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  height: auto;
  min-height: min-content;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-surface);
  border: 1px solid var(--border-color-default);
  border-radius: var(--border-radius-default);
  // box-shadow: 0 2px 8px color-mix(in srgb, var(--neutral-900) 10%, transparent);

  &--accent::before {
    content: "";
    display: block;
    height: 4px;
    background: var(--supplier-card-accent);
  }

  &--disabled {
    @include ds-disabled-state;

    &,
    & * {
      @include ds-disabled-interaction;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    padding: 1rem 1.25rem 1.25rem;
  }

  &__header {
    display: flex;
    flex-wrap: wrap;
    flex-shrink: 0;
    align-items: start;
    gap: 0.75rem;
    min-width: 0;
  }

  &__logo {
    flex: 0 0 auto;
    width: 2.5rem;
    height: 2.5rem;
    overflow: hidden;
    border: 1px solid var(--border-color-default);
    border-radius: var(--border-radius-2);
    background: var(--bg-surface);
    box-sizing: border-box;
  }

  &__logo-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &__logo-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: var(--bg-surface-subtle-1);
    color: var(--color-text-1);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
    text-transform: uppercase;
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1 1 8rem;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
  }

  &__name {
    flex: 1 1 4rem;
    min-width: 4rem;
    max-width: 100%;
    color: var(--color-text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__badges {
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    max-width: 100%;
  }

  &__legal {
    min-width: 0;
    color: var(--color-text-4);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  &__flag {
    flex: 0 0 auto;
    width: 1.5rem;
    height: 1.5rem;
    object-fit: cover;
    border-radius: 50%;
  }

  &__close {
    :deep(.custom-button__icon) {
      color: var(--color-text-3);
    }
  }

  &__metrics {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 0.5rem;
    min-width: 0;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    column-gap: 0.75rem;
    row-gap: 0.125rem;
    min-width: 0;
  }

  &__label {
    flex: 1 1 auto;
    min-width: 0;
    color: var(--color-text-3);
    overflow: visible;
    overflow-wrap: break-word;
    white-space: normal;
  }

  &__value {
    flex: 1 1 auto;
    min-width: 0;
    color: var(--color-text-1);
    text-align: right;
    overflow: visible;
    overflow-wrap: break-word;
    word-break: break-word;
    white-space: normal;
  }

  &__parents-value {
    display: inline-flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.25rem;
    min-width: 0;

    .supplier-card__value {
      flex: 1 1 auto;
      min-width: 0;
      overflow: visible;
      text-overflow: unset;
      white-space: normal;
    }
  }

  &__parent-link {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-text-3);
    cursor: pointer;

    &:disabled {
      cursor: not-allowed;
    }
  }

  &__parent-link-icon {
    display: flex;
    width: 0.875rem;
    height: 0.875rem;
    pointer-events: none;
  }

  &__divider {
    flex-shrink: 0;
    border-top: 1px dashed var(--border-color-default);
  }

  &__footer {
    display: flex;
    flex-wrap: wrap;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    column-gap: 0.75rem;
    row-gap: 0.375rem;
    min-width: 0;
  }

  &__footer-label {
    flex: 0 1 auto;
    min-width: 0;
    color: var(--color-text-3);
    overflow: visible;
    overflow-wrap: break-word;
    white-space: normal;
  }

  &__suppliers {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    margin-inline-start: auto;
  }

  &__pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    max-width: 100%;
    min-width: 0;
    margin: 0;
    padding: 0.25rem 0.625rem;
    border: 1px solid var(--border-color-default);
    border-radius: 100vmax;
    background: var(--bg-surface);
    color: var(--color-text-1);
    cursor: pointer;

    &:disabled {
      cursor: not-allowed;
    }
  }

  &__pill-label {
    min-width: 0;
    color: var(--color-text-1);
    overflow: visible;
    white-space: normal;
  }

  &__pill--open &__pill-chevron {
    transform: rotate(180deg);
  }

  &__pill-chevron {
    display: flex;
    flex-shrink: 0;
    width: 0.75rem;
    height: 0.75rem;
    color: var(--color-text-3);
    pointer-events: none;
  }
}
</style>
