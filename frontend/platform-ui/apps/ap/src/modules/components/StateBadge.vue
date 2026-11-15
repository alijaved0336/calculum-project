<template>
  <span class="state-badge" :class="`state-badge--${state}`">
    <span class="state-badge__dot"></span>
    <span>{{ label }}</span>
  </span>
</template>

<script lang="ts">
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";
import type { ProcessClassification } from "@/modules/adminBackend/api/processMonitor";

export default {
  name: "StateBadge",
  props: {
    state: {
      type: String as PropType<ProcessClassification | "cancelling">,
      required: true
    }
  },
  setup(props: { state: ProcessClassification | "cancelling" }) {
    const translate = useI18n({ useScope: "global" });
    const label = computed(() =>
      translate.t(`adminBackend.adminProcess.monitor.state.${props.state}`)
    );
    return { label };
  }
};
</script>

<style scoped>
.state-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}
.state-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.state-badge--queued {
  color: #47566c;
  background: #eceff4;
}
.state-badge--running {
  color: #15803d;
  background: #dcf3e3;
}
@media (prefers-reduced-motion: no-preference) {
  .state-badge--running .state-badge__dot {
    animation: state-badge-pulse 1.6s ease-in-out infinite;
  }
  @keyframes state-badge-pulse {
    50% {
      opacity: 0.35;
    }
  }
}
.state-badge--stalled {
  color: #9a5b00;
  background: #fbeed7;
}
.state-badge--error {
  color: #b3261e;
  background: #fbe4e2;
}
.state-badge--cancelling {
  color: #6d28a8;
  background: #f0e6fa;
}
</style>
