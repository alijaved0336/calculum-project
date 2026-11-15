import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'ant-design-vue/dist/reset.css'
import '@/styles/chat.css'
import '@/styles/admin.css'
import '@/styles/support-tokens.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth.store'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
useAuthStore(pinia).init()
app.use(router)
app.mount('#app')
