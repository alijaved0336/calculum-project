<template>
  <div class="signout">
    <p>Signing out…</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { authLogout, configureAuth, useSession } from '@ada/auth'

configureAuth(import.meta.env.VITE_BASE_URL)

onMounted(async () => {
  const { clearSession } = useSession()
  clearSession()
  await authLogout()
})
</script>
