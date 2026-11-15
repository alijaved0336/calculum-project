<template>
  <main class="login-page">
    <section class="login-card">
      <div class="login-header">
        <p class="login-kicker">Calculum AI</p>
        <h1 class="login-title">Sign in</h1>
        <p class="login-copy">Enter your email and password. Tenant users will land in their workspace automatically.</p>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label class="field">
          <span>Email</span>
          <input
            v-model.trim="form.email"
            type="email"
            autocomplete="email"
            placeholder="Enter your email"
            required
          />
        </label>

        <label class="field">
          <span>Password</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter your password"
            required
          />
        </label>

        <p v-if="error" class="error-banner">{{ error }}</p>

        <button class="submit-button" type="submit" :disabled="submitting">
          {{ submitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

const form = reactive({
  email: '',
  password: '',
})

const submitting = ref(false)
const error = ref('')

async function submit() {
  submitting.value = true
  error.value = ''

  try {
    await authStore.login({
      email: form.email,
      password: form.password,
    })

    uiStore.consumePendingRedirect()
    await router.replace({ name: 'suppliers' })
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      error.value =
        typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Login failed'
    } else {
      error.value = err instanceof Error ? err.message : 'Login failed'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f3f4f6;
}

.login-card {
  margin: auto;
  width: min(100%, 420px);
  padding: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.login-header {
  margin-bottom: 24px;
}

.login-kicker {
  margin: 0 0 8px;
  color: #f97316;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.login-title {
  margin: 0;
  color: #111827;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}

.login-copy {
  margin: 10px 0 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  color: #374151;
  font-size: 14px;
  font-weight: 600;
}

.field input {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  padding: 12px 14px;
  font-size: 14px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.field input::placeholder {
  color: #9ca3af;
}

.field input:focus {
  outline: none;
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
}

.error-banner {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 14px;
}

.submit-button {
  border: 0;
  border-radius: 10px;
  padding: 12px 16px;
  background: #111827;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.16s ease, opacity 0.16s ease;
}

.submit-button:hover:not(:disabled) {
  background: #1f2937;
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 640px) {
  .login-page {
    padding: 16px;
  }

  .login-card {
    padding: 24px;
  }
}
</style>
