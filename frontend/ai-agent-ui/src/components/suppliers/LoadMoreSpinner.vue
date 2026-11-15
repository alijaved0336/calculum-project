<template>
  <div class="load-more-spinner" aria-label="Loading more suppliers"></div>
</template>

<style scoped>
.load-more-spinner {
  width: 28px;
  height: 28px;
  margin: 18px auto 0;
  border: 3px solid #dbeafe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
