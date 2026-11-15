<template>
<div class="spend-file-update-banner">
  <div class="banner-content"><span class="banner-icon">⚠</span><span class="banner-text">{{ $t('spendFileUpdateBanner.message', { name: version.name, versionNumber: version.version }) }}</span>
    <button class="banner-load-btn" @click="$emit('load', version)">{{ $t('spendFileUpdateBanner.loadLink') }}</button>
  </div>
  <button class="banner-close-btn" @click="$emit('dismiss')" :aria-label="$t('global.close')">×</button>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import type { UserSessionActiveCompanySpendFileVersion } from '@/types'

export default defineComponent({
  name: 'SpendFileNewVersionBanner',
  props: {
    version: {
      type: Object as PropType<UserSessionActiveCompanySpendFileVersion>,
      required: true,
    },
  },
  emits: ['load', 'dismiss'],
})
</script>

<style lang="scss" scoped>
.spend-file-update-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: #fff8e1;
  border-bottom: 1px solid #f5c842;
  width: 100%;

  .banner-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .banner-icon {
    color: #f0a800;
    font-size: 16px;
  }

  .banner-load-btn {
    background: none;
    border: none;
    color: #0066cc;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    font-size: inherit;

    &:hover {
      color: #004499;
    }
  }

  .banner-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    color: #666;
    padding: 0 4px;
    line-height: 1;

    &:hover {
      color: #333;
    }
  }
}
</style>
