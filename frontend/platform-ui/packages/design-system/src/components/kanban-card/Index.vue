<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BodyText from "../primitives/typography/body-text/Index.vue";
import CustomBadge from "../primitives/custom-badge/Index.vue";
import type { CustomBadgeVariant } from "../primitives/custom-badge/types";
import {
  KANBAN_CARD_STATUS_ACCENTS,
  type KanbanCardAvatar,
  type KanbanCardProps,
  type KanbanCardStatus,
} from "./types";

defineOptions({
  name: "KanbanCard",
});

const AVATAR_VISIBLE_MAX = 3;

const STATUS_BADGE_VARIANT: Record<KanbanCardStatus, CustomBadgeVariant> = {
  analyzed: "analyzed",
  onHold: "warning",
  planned: "planned",
  contacted: "contacted",
  agreed: "missed",
  agreedExtended: "agreed",
};

const props = withDefaults(defineProps<KanbanCardProps>(), {
  status: "analyzed",
  logoSrc: "",
  flagSrc: "",
  countryName: "",
  spendLabel: "Spend Line:",
  spendValue: "",
  paymentTermsLabel: "Payment Terms (days):",
  paymentTermsValue: "",
  cashFlowLabel: "Cash Flow Target:",
  cashFlowValue: "",
  rebateLabel: "Rebate Target:",
  rebateValue: "",
  teamLabel: "",
  partialLabel: "",
  updatedAt: "",
  statusLabel: "",
  plans: () => [],
  commentCount: null,
  avatars: () => [],
  disabled: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const brokenLogo = ref(false);
const brokenFlag = ref(false);
const brokenAvatars = ref(new Set<number>());

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
  () => props.avatars,
  () => {
    brokenAvatars.value = new Set();
  },
);

const accent = computed(() => KANBAN_CARD_STATUS_ACCENTS[props.status]);

const statusBadgeVariant = computed(() => STATUS_BADGE_VARIANT[props.status]);

const resolvedLogoFallback = computed(() => {
  const explicit = props.logoFallback?.trim();
  if (explicit) {
    return explicit;
  }
  return props.entityName.trim().charAt(0);
});

const showLogoImage = computed(
  () => Boolean(props.logoSrc) && !brokenLogo.value,
);

const showFlag = computed(() => Boolean(props.flagSrc) && !brokenFlag.value);

const showRebate = computed(() => Boolean(props.rebateValue.trim()));

const hasExtraRow = computed(
  () => Boolean(props.updatedAt) || Boolean(props.statusLabel),
);

const hasPlans = computed(() => props.plans.length > 0);

const hasFooter = computed(
  () =>
    props.commentCount !== null ||
    props.avatars.length > 0 ||
    Boolean(props.teamLabel),
);

const visibleAvatars = computed(() =>
  props.avatars.slice(0, AVATAR_VISIBLE_MAX),
);

const avatarOverflow = computed(() =>
  Math.max(0, props.avatars.length - AVATAR_VISIBLE_MAX),
);

const showTeamFallback = computed(
  () => props.avatars.length === 0 && Boolean(props.teamLabel),
);

function avatarInitials(avatar: KanbanCardAvatar): string {
  if (avatar.initials?.trim()) {
    return avatar.initials.trim();
  }
  const name = avatar.name?.trim() ?? "";
  return name.charAt(0);
}

function showAvatarImage(avatar: KanbanCardAvatar, index: number): boolean {
  return Boolean(avatar.src) && !brokenAvatars.value.has(index);
}

function onLogoError() {
  brokenLogo.value = true;
}

function onFlagError() {
  brokenFlag.value = true;
}

function onAvatarError(index: number) {
  const next = new Set(brokenAvatars.value);
  next.add(index);
  brokenAvatars.value = next;
}

function onRootClick(event: MouseEvent) {
  if (props.disabled) {
    return;
  }
  emit("click", event);
}
</script>

<template>
  <article
    class="kanban-card"
    :class="{ 'kanban-card--disabled': disabled }"
    :style="{ '--kanban-card-accent': accent }"
    :aria-disabled="disabled || undefined"
    @click="onRootClick"
  >
    <div
      v-if="hasExtraRow"
      class="kanban-card__extra"
    >
      <BodyText
        v-if="updatedAt"
        class="kanban-card__updated"
        variant="xs"
        weight="regular"
        as="span"
      >
        {{ updatedAt }}
      </BodyText>
      <CustomBadge
        v-if="statusLabel"
        :text="statusLabel"
        :variant="statusBadgeVariant"
      />
    </div>

    <div class="kanban-card__surface">
      <div class="kanban-card__header">
        <div class="kanban-card__logo">
          <img
            v-if="showLogoImage"
            class="kanban-card__logo-image"
            :src="logoSrc"
            :alt="entityName"
            loading="lazy"
            @error="onLogoError"
          />
          <span
            v-else
            class="kanban-card__logo-fallback"
            aria-hidden="true"
          >
            {{ resolvedLogoFallback }}
          </span>
        </div>

        <BodyText
          class="kanban-card__name"
          variant="sm"
          weight="semibold"
          as="span"
          :title="entityName"
        >
          {{ entityName }}
        </BodyText>

        <span
          v-if="showFlag"
          class="kanban-card__flag-wrap"
        >
          <img
            class="kanban-card__flag"
            :src="flagSrc"
            :alt="countryName"
            :title="countryName"
            loading="lazy"
            @error="onFlagError"
          />
        </span>
      </div>

      <CustomBadge
        v-if="partialLabel"
        class="kanban-card__partial"
        :text="partialLabel"
        variant="warning"
        :dot="false"
      />

      <div class="kanban-card__metrics">
        <div class="kanban-card__row">
          <BodyText
            class="kanban-card__label"
            variant="xs"
            weight="regular"
            as="span"
          >
            {{ spendLabel }}
          </BodyText>
          <BodyText
            class="kanban-card__value"
            variant="sm"
            weight="semibold"
            as="span"
          >
            {{ spendValue }}
          </BodyText>
        </div>
        <div class="kanban-card__row">
          <BodyText
            class="kanban-card__label"
            variant="xs"
            weight="regular"
            as="span"
          >
            {{ paymentTermsLabel }}
          </BodyText>
          <BodyText
            class="kanban-card__value"
            variant="sm"
            weight="semibold"
            as="span"
          >
            {{ paymentTermsValue }}
          </BodyText>
        </div>
        <div class="kanban-card__row">
          <BodyText
            class="kanban-card__label"
            variant="xs"
            weight="regular"
            as="span"
          >
            {{ cashFlowLabel }}
          </BodyText>
          <BodyText
            class="kanban-card__value"
            variant="sm"
            weight="semibold"
            as="span"
          >
            {{ cashFlowValue }}
          </BodyText>
        </div>
        <div
          v-if="showRebate"
          class="kanban-card__row"
        >
          <BodyText
            class="kanban-card__label"
            variant="xs"
            weight="regular"
            as="span"
          >
            {{ rebateLabel }}
          </BodyText>
          <BodyText
            class="kanban-card__value"
            variant="sm"
            weight="semibold"
            as="span"
          >
            {{ rebateValue }}
          </BodyText>
        </div>
      </div>

      <div
        v-if="hasPlans"
        class="kanban-card__plans"
      >
        <CustomBadge
          v-for="(plan, planIndex) in plans"
          :key="`${plan}-${planIndex}`"
          :text="plan"
          icon="calendar"
          variant="analyzed"
        />
      </div>

      <div
        v-if="hasFooter"
        class="kanban-card__divider"
      />

      <div
        v-if="hasFooter"
        class="kanban-card__footer"
      >
        <CustomBadge
          v-if="commentCount !== null"
          :text="String(commentCount)"
          icon="comment"
          variant="analyzed"
        />

        <div
          v-if="avatars.length > 0"
          class="kanban-card__people"
        >
          <span
            v-for="(avatar, avatarIndex) in visibleAvatars"
            :key="`${avatar.name ?? avatar.initials ?? avatar.src ?? avatarIndex}`"
            class="kanban-card__avatar-wrap"
          >
            <span
              class="kanban-card__avatar"
              :title="avatar.name"
            >
              <img
                v-if="showAvatarImage(avatar, avatarIndex)"
                class="kanban-card__avatar-image"
                :src="avatar.src"
                :alt="avatar.name || avatarInitials(avatar)"
                loading="lazy"
                @error="onAvatarError(avatarIndex)"
              />
              <span
                v-else
                class="kanban-card__avatar-fallback"
              >
                {{ avatarInitials(avatar) }}
              </span>
            </span>
          </span>
          <span
            v-if="avatarOverflow > 0"
            class="kanban-card__avatar-wrap"
          >
            <span class="kanban-card__avatar kanban-card__avatar--overflow">
              +{{ avatarOverflow }}
            </span>
          </span>
        </div>
        <div
          v-else-if="showTeamFallback"
          class="kanban-card__people"
        >
          <span class="kanban-card__avatar-wrap">
            <span
              class="kanban-card__avatar"
              :title="teamLabel"
            >
              <span class="kanban-card__avatar-fallback">
                {{ teamLabel }}
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  </article>
</template>

<style lang="scss" scoped>
@use "@ada/design-system/styles/disabled-state.scss" as *;

.kanban-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  cursor: pointer;

  &--disabled {
    @include ds-disabled-state;

    &,
    & * {
      @include ds-disabled-interaction;
    }
  }

  &__extra {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  &__updated {
    color: var(--color-text-3);
    min-width: 0;
  }

  &__surface {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    padding: 0.75rem 1rem;
    background: var(--bg-surface);
    border: 1px solid var(--border-color-default);
    border-inline-start: 3px solid var(--kanban-card-accent);
    border-radius: var(--border-radius-default);
    // box-shadow: 0 2px 8px
    //   color-mix(in srgb, var(--neutral-900) 10%, transparent);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  &__logo {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border-radius: var(--border-radius-2);
    overflow: hidden;
    outline: 1px solid var(--border-color-default);
  }

  &__logo-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
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

  &__name {
    min-width: 0;
    flex: 1;
    color: var(--color-text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__flag-wrap {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    overflow: hidden;
    border-radius: 50%;
    outline: 1px solid var(--border-color-default);
  }

  &__flag {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__partial {
    align-self: flex-start;
  }

  &__metrics {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    min-width: 0;
  }

  &__label {
    min-width: 0;
    color: var(--color-text-3);
  }

  &__value {
    flex-shrink: 0;
    color: var(--color-text-1);
    text-align: right;
  }

  &__plans {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  &__divider {
    border-top: 1px dashed var(--border-color-default);
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  &__people {
    display: flex;
    align-items: center;
    margin-left: auto;
  }

  &__avatar-wrap {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    overflow: hidden;
    border: 2px solid var(--bg-surface);
    border-radius: 50%;
    outline: 1px solid var(--border-color-default);
    box-sizing: border-box;

    & + & {
      margin-left: -0.375rem;
    }
  }

  &__avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: var(--bg-surface-subtle-1);
    color: var(--color-text-2);
    font-size: 0.625rem;
    font-weight: 600;
    line-height: 1;

    &--overflow {
      color: var(--color-text-3);
    }
  }

  &__avatar-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-inline: 0.125rem;
  }
}
</style>
