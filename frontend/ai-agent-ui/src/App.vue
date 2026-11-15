<template>
  <RouterView />
  <AppToast />
  <SupportChatWidget v-if="showWidget" accent="#6366f1" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppToast from '@/components/common/AppToast.vue'
import SupportChatWidget from '@/components/support/chat/SupportChatWidget.vue'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const authStore = useAuthStore()

// Floating support widget: on every page once logged in (not on the login screen).
const showWidget = computed(() => authStore.isAuthenticated && route.name !== 'login')
</script>
