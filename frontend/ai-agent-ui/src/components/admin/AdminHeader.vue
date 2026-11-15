<template>
  <header class="header">
    <div class="brand">
      <div class="brand-mark">C</div>
      <span class="brand-name">calculum</span>
    </div>

    <div class="field">
      <span class="field-label">Search</span>
      <div class="search-box">
        <SearchSvg />
        <input type="text" placeholder="Search by Supplier Name" />
      </div>
    </div>

    <div class="field">
      <span class="field-label">Spend File (Version)</span>
      <button class="dropdown-btn">
        DemoAccount_20260309.xlsx (Ver. 1)
        <ChevronDownSvg />
      </button>
    </div>

    <div class="spacer" />

    <div class="date-range">02/16/2025 – 02/16/2026</div>

    <div class="field currency">
      <span class="field-label">Currency</span>
      <button class="dropdown-btn small">
        CNY
        <ChevronDownSvg />
      </button>
    </div>

    <div class="header-icons">
      <a-tooltip title="Help"><button class="icon-btn"><HelpCircleSvg /></button></a-tooltip>
      <a-tooltip title="Notifications"><button class="icon-btn"><BellSvg /></button></a-tooltip>
      <a-tooltip title="Filter"><button class="icon-btn"><FilterSvg /></button></a-tooltip>
      <div class="avatar">CC</div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { SearchSvg, ChevronDownSvg, HelpCircleSvg, BellSvg, FilterSvg } from '@/components/admin/icons'
</script>

<style scoped>
.header {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  padding: 14px 24px;
  background: #fff;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
}

.brand-mark {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--teal);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 11px;
  color: var(--muted);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 7px 10px;
  width: 260px;
  color: var(--muted);
}

.search-box :deep(.ico) {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.search-box input {
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--ink);
  width: 100%;
}

.dropdown-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 7px 10px;
  background: #fff;
  font-size: 13px;
  color: var(--ink-2);
  cursor: pointer;
  white-space: nowrap;
}

.dropdown-btn :deep(.ico) {
  width: 12px;
  height: 12px;
  color: var(--muted);
}

.dropdown-btn.small {
  min-width: 70px;
  justify-content: space-between;
}

.spacer {
  flex: 1;
}

.date-range {
  font-size: 13px;
  color: var(--ink-2);
  padding-bottom: 8px;
  white-space: nowrap;
}

.header-icons {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 4px;
}

.icon-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--muted);
  border-radius: 6px;
  cursor: pointer;
}

.icon-btn:hover {
  background: var(--line-2);
  color: var(--ink);
}

.icon-btn :deep(.ico) {
  width: 16px;
  height: 16px;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--teal-100);
  color: var(--teal-700);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
}
</style>
