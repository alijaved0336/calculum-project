<template>
  <footer class="page-footer">
    <span>© Calculum, Inc. All Rights Reserved Version: 1.96.0 - 20260515</span>
    <div class="footer-links">
      <a href="#">Term of Service</a>
      <a href="#">Manage Cookies</a>
      <a href="#">Privacy Policy</a>
    </div>
  </footer>
</template>

<style scoped>
.page-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 22px 0 6px;
  color: #94a3b8;
  font-size: 12px;
  border-top: 1px solid #e5e7eb;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.footer-links a {
  color: inherit;
  text-decoration: none;
}

.footer-links a:hover {
  color: #64748b;
}

@media (max-width: 760px) {
  .page-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
