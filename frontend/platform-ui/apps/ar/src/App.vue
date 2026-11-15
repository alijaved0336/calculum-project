<template>
  <RouterView />
  <CustomerCardModal />
  <DisclaimerAcknowledgementModal />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useSessionKeepAlive } from '@/composables/useSessionKeepAlive'
import CustomerCardModal from '@/modules/buyers/components/customerCard/CustomerCardModal.vue'
import { useEntityLogoCustomerCard } from '@/modules/buyers/composables/useEntityLogoCustomerCard'
import DisclaimerAcknowledgementModal from '@/components/DisclaimerAcknowledgementModal.vue'
import './styles/_app.scss'

// UC-ENT-08, and HERE rather than in a route guard: a guard runs on every navigation, so each one
// would start another timer against the same session. The application is mounted once.
const keepAlive = useSessionKeepAlive()

onMounted(keepAlive.start)
onUnmounted(keepAlive.stop)

// Grid entity cells (design-system's EntityLogoColumn) open the Customer Card modal above.
useEntityLogoCustomerCard()
</script>
