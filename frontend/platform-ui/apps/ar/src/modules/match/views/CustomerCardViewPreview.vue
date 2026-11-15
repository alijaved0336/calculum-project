<template>
<CustomerCardOpportunityTabPreview :version-id="props.versionId" :buyer-id="props.buyerId" />
</template>

<script setup lang="ts">
/**
 * Preview variant of CustomerCardView: renders only the Opportunity tab
 * (CustomerCardOpportunityTabPreview), with no header and no tab bar.
 */
import CustomerCardOpportunityTabPreview from '../components/customerCard/CustomerCardOpportunityTabPreview.vue'

// props: true on the route maps :versionId/:buyerId directly here as strings.
const props = defineProps<{ versionId: string; buyerId: string }>()
</script>
