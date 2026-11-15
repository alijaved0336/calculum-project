<script setup lang="ts">
import { useSession } from "@ada/auth";

defineOptions({ name: "HomeView" });

const { session } = useSession();
</script>

<template>
  <div class="home">
    <p v-if="session?.email">
      {{ session.email }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.home {
  padding: 1.5rem;
}
</style>
