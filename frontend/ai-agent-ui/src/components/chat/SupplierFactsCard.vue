<template>
  <div class="facts-card" :class="{ 'facts-card--expanded': expanded }">
    <div class="facts-card-top">
      <div class="facts-identity">
        <div v-if="card.supplier_name" class="facts-supplier">
          {{ card.supplier_name }}{{ card.country_flag ? ` ${card.country_flag}` : '' }}
        </div>
        <!-- Industry shown as a key-value tile below (Carlos, 2026-09-17). -->
      </div>
      <button
        v-if="!expanded"
        class="facts-expand-btn"
        type="button"
        aria-label="Expand position summary"
        @click="emit('expand')"
      >
        <MaximizeSvg />
        <span>Expand</span>
      </button>
    </div>

    <div v-if="card.description || card.lead" class="facts-description">
      <div class="facts-section-heading">Description</div>
      <div class="facts-lead">
        <template v-for="(part, i) in emphasizeFigures(card.description || card.lead || '')" :key="'desc-' + i">
          <strong v-if="part.bold">{{ part.text }}</strong><template v-else>{{ part.text }}</template>
        </template>
      </div>
    </div>

    <div v-if="metricTiles.length" class="metrics-grid" :class="{ 'metrics-grid--expanded': expanded }">
      <div
        v-for="tile in metricTiles"
        :key="tile.label"
        class="metric-tile"
      >
        <div class="metric-tile-head">
          <component
            :is="tile.icon"
            class="metric-tile-icon"
            aria-hidden="true"
          />
          <div class="metric-tile-label">{{ tile.label }}</div>
        </div>
        <div class="metric-tile-value">{{ tile.value }}</div>
      </div>
    </div>

    <div v-if="hasTimeline" class="terms-timeline">
      <div class="terms-window">0d-{{ windowDays }}d window</div>

      <div class="terms-stage" :style="{ paddingTop: pinLaneHeight + 'px' }">
        <div class="terms-plot">
          <div class="terms-track" />
          <div class="terms-fill" :style="{ width: fillPct + '%' }" />

          <!-- Benchmark pins: pointy map pins above the track, in front of balls -->
          <div
            v-for="bench in benchmarks"
            :key="'pin-' + bench.key"
            class="terms-map-pin"
            :class="{ 'terms-map-pin--active': hoveredBenchKey === bench.key }"
            :style="{
              left: bench.pct + '%',
              color: bench.color,
              zIndex: hoveredBenchKey === bench.key ? 8 : 4,
            }"
            :title="`${bench.label} ${bench.days}d`"
            @mouseenter="hoveredBenchKey = bench.key"
            @mouseleave="hoveredBenchKey = null"
          >
            <span class="terms-map-pin-tip">{{ bench.label }} {{ bench.days }}d</span>
            <span class="terms-map-pin-shape" aria-hidden="true" />
          </div>

          <div
            v-for="mark in checkpointMarks"
            :key="mark.key"
            class="terms-checkpoint"
            :class="'terms-checkpoint--' + mark.key"
            :style="{ left: mark.rawPct + '%' }"
          >
            <div class="terms-pin">
              <div class="terms-pin-box">
                <div class="terms-pin-value">{{ mark.days }}d</div>
                <div class="terms-pin-label">{{ mark.label }}</div>
              </div>
              <div
                class="terms-pin-stem"
                :style="{ height: 10 + mark.lane * 44 + 'px' }"
              />
            </div>
            <div class="terms-ball" />
          </div>
        </div>
      </div>

      <div class="terms-axis">
        <div
          v-for="tick in axisTicks"
          :key="tick.label"
          class="terms-tick"
          :class="edgeClass(tick.pct)"
          :style="{ left: tick.pct + '%' }"
        >
          <div class="terms-tick-mark" />
          <div class="terms-tick-label">{{ tick.label }}</div>
        </div>
      </div>

      <div v-if="benchmarks.length" class="terms-benchmarks">
        <div
          v-for="bench in benchmarks"
          :key="bench.key"
          class="terms-bench"
          :class="{ 'terms-bench--active': hoveredBenchKey === bench.key }"
          @mouseenter="hoveredBenchKey = bench.key"
          @mouseleave="hoveredBenchKey = null"
        >
          <span
            class="terms-bench-pin"
            :style="{ color: bench.color }"
            aria-hidden="true"
          />
          <span>{{ bench.label }} <strong>{{ bench.days }}d</strong></span>
        </div>
      </div>

      <div v-if="timelineCaption" class="terms-caption">{{ timelineCaption }}</div>
    </div>

    <div v-if="regulatoryLine" class="facts-regulatory">
      {{ regulatoryLine }}
    </div>

    <div v-if="detailArguments.length" class="facts-details">
      <div
        v-for="(arg, i) in detailArguments"
        :key="'detail-arg-' + i"
        class="detail-line detail-line--bullet"
      >
        <template v-if="arg.title">
          <span class="detail-label">{{ arg.title }}: </span>
          <strong v-if="arg.days != null">{{ arg.days }} days</strong>
          <template v-if="arg.days != null"> - </template>
          <template v-for="(part, j) in emphasizeFigures(arg.text)" :key="'arg-' + i + '-' + j">
            <strong v-if="part.bold">{{ part.text }}</strong><template v-else>{{ part.text }}</template>
          </template>
        </template>
        <template v-else>
          <template v-for="(part, j) in emphasizeFigures(arg.text)" :key="'arg-plain-' + i + '-' + j">
            <strong v-if="part.bold">{{ part.text }}</strong><template v-else>{{ part.text }}</template>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import type { SummaryCard } from '@/types/chat'
import {
  ChartBarsSvg,
  CreditCardSvg,
  GaugeSvg,
  MaximizeSvg,
  ShieldSvg,
  WarnTriangleSvg,
} from '@/components/chat/icons'

const props = defineProps<{
  card: SummaryCard
  expanded?: boolean
}>()

const emit = defineEmits<{
  expand: []
}>()

/** Drop legacy " · Credit Rating: X" that old cards baked into header. */
function industryOnly(text: string): string {
  const marker = ' · Credit Rating:'
  const idx = text.indexOf(marker)
  if (idx >= 0) return text.slice(0, idx).trim()
  if (text.startsWith('Credit Rating:')) return ''
  return text.trim()
}

function creditFromHeader(header: string | null | undefined): string | null {
  if (!header) return null
  const marker = ' · Credit Rating:'
  const idx = header.indexOf(marker)
  if (idx >= 0) {
    const value = header.slice(idx + marker.length).trim()
    return value || null
  }
  if (header.startsWith('Credit Rating:')) {
    const value = header.slice('Credit Rating:'.length).trim()
    return value || null
  }
  return null
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function normalizeDashes(text: string): string {
  return text.split('—').join('-').split('–').join('-').split('→').join('-')
}

/** Bold $amounts, percentages, and "N days" / "N-day" figures. No regex. */
function emphasizeFigures(raw: string): { text: string; bold?: boolean }[] {
  const text = normalizeDashes(raw)
  const parts: { text: string; bold?: boolean }[] = []
  let i = 0
  while (i < text.length) {
    if (text[i] === '$') {
      let j = i + 1
      while (j < text.length && (isDigit(text[j]) || text[j] === '.' || text[j] === ',')) j += 1
      if (j < text.length && 'KMBkmb'.includes(text[j])) j += 1
      if (j > i + 1) {
        parts.push({ text: text.slice(i, j), bold: true })
        i = j
        continue
      }
    }
    if (isDigit(text[i])) {
      let j = i
      while (j < text.length && (isDigit(text[j]) || text[j] === '.' || text[j] === ',')) j += 1
      if (j < text.length && text[j] === '%') {
        parts.push({ text: text.slice(i, j + 1), bold: true })
        i = j + 1
        continue
      }
      if (text.slice(j, j + 5) === ' days') {
        parts.push({ text: text.slice(i, j + 5), bold: true })
        i = j + 5
        continue
      }
      if (text.slice(j, j + 4) === '-day') {
        parts.push({ text: text.slice(i, j + 4), bold: true })
        i = j + 4
        continue
      }
    }
    let j = i + 1
    while (j < text.length && text[j] !== '$' && !isDigit(text[j])) j += 1
    parts.push({ text: text.slice(i, j) })
    i = j
  }
  return parts
}

/** Industry under the name - never credit rating (that is a metric tile). */
const industryLine = computed(() => {
  const raw = props.card.industry || props.card.header || ''
  const text = industryOnly(raw)
  return text || null
})

const creditRating = computed(
  () => props.card.credit_rating || creditFromHeader(props.card.header) || null,
)

/** Strategy / argument rows under the opportunity bar (position view). */
const detailArguments = computed(() =>
  (props.card.arguments ?? []).filter(arg => Boolean(arg?.text?.trim())),
)

const timelineCaption = computed(() => {
  if (props.card.batna_note) return props.card.batna_note
  const current = props.card.current_days
  const target = props.card.target_days
  if (
    props.card.batna_days == null
    && current != null
    && target != null
    && current >= target
  ) {
    return 'No BATNA'
  }
  return null
})

const regulatoryLine = computed(() => {
  const days = props.card.regulatory_cap_days
  if (days == null) return null
  const kind = props.card.regulatory_enforced ? 'enforced by law' : 'regulatory guidance'
  return `Regulatory Cap: ${days} days (${kind}) - the target is capped to this limit.`
})

type Mark = {
  key: string
  label: string
  days: number
  rawPct: number
  pct: number
  lane: number
}

function axisMax(card: SummaryCard): number {
  const target = card.target_days
  // one 15d step past Target - no extra headroom
  if (target != null && target > 0) return target + 15

  const points = [
    card.current_days,
    card.batna_days,
    ...(card.standards ?? []).map(s => s.days),
  ].filter((n): n is number => n != null && n > 0)
  const peak = Math.max(1, ...points, 0)
  return Math.ceil(peak / 15) * 15 || 15
}

function pctOnAxis(days: number, max: number): number {
  if (max <= 0) return 0
  return Math.max(0, Math.min(100, (days / max) * 100))
}

function edgeClass(pct: number): string {
  if (pct <= 2) return 'terms-tick--start'
  if (pct >= 98) return 'terms-tick--end'
  return ''
}

/** Keep balls on rawPct; stack pin labels when two sit too close. */
function assignLanes(marks: Mark[], minGap: number): Mark[] {
  const out = marks
    .map(m => ({ ...m, pct: m.rawPct, lane: 0 }))
    .sort((a, b) => a.rawPct - b.rawPct)

  for (let i = 0; i < out.length; i += 1) {
    let lane = 0
    for (;;) {
      const conflict = out.slice(0, i).some(
        prev => prev.lane === lane && Math.abs(prev.rawPct - out[i].rawPct) < minGap,
      )
      if (!conflict) break
      lane += 1
    }
    out[i].lane = lane
  }
  return out
}

const hasTimeline = computed(() =>
  props.card.current_days != null || props.card.target_days != null || props.card.batna_days != null,
)

const windowDays = computed(() => axisMax(props.card))

const fillPct = computed(() => {
  const max = windowDays.value
  const end = props.card.target_days ?? props.card.batna_days ?? props.card.current_days ?? 0
  return pctOnAxis(end, max)
})

const checkpointMarks = computed<Mark[]>(() => {
  const max = windowDays.value
  const current = props.card.current_days
  const batna = props.card.batna_days
  const target = props.card.target_days
  const marks: Mark[] = []

  if (current != null) {
    const raw = pctOnAxis(current, max)
    marks.push({ key: 'current', label: 'Current', days: current, rawPct: raw, pct: raw, lane: 0 })
  }

  const hasBatna =
    batna != null &&
    (current == null || batna > current) &&
    (target == null || batna < target)

  if (hasBatna) {
    const raw = pctOnAxis(batna, max)
    marks.push({ key: 'batna', label: 'BATNA', days: batna, rawPct: raw, pct: raw, lane: 0 })
  }

  if (target != null) {
    const raw = pctOnAxis(target, max)
    marks.push({ key: 'target', label: 'Target', days: target, rawPct: raw, pct: raw, lane: 0 })
  }

  return assignLanes(marks, 18)
})

const pinLaneHeight = computed(() => {
  const lanes = Math.max(0, ...checkpointMarks.value.map(m => m.lane))
  return 56 + lanes * 44
})

const axisTicks = computed(() => {
  const max = windowDays.value
  const ticks: { pct: number; label: string }[] = []
  for (let days = 0; days < max; days += 15) {
    ticks.push({ pct: pctOnAxis(days, max), label: `${days}d` })
  }
  ticks.push({ pct: 100, label: `${max}d` })
  return ticks
})

const hoveredBenchKey = ref<string | null>(null)

const BENCH_COLORS: Record<string, string> = {
  peerGroupStandard: '#0d9488',
  supplierStandard: '#d97706',
  industryRegionStandard: '#059669',
  buyerStandard: '#e11d48',
  parentOrSupplierMax: '#7c3aed',
  scfPeerStandard: '#2563eb',
}
const BENCH_FALLBACK = ['#0d9488', '#d97706', '#059669', '#e11d48', '#7c3aed', '#2563eb']

const benchmarks = computed(() => {
  const max = windowDays.value
  return (props.card.standards ?? []).map((s, i) => ({
    key: s.key,
    label: s.label,
    days: s.days,
    pct: pctOnAxis(s.days, max),
    color: BENCH_COLORS[s.key] ?? BENCH_FALLBACK[i % BENCH_FALLBACK.length],
  }))
})

type MetricTile = {
  label: string
  value: string
  icon: Component
}

/** Carlos, 2026-09-17: sensitivity wording is retired from key facts. */
function stripSensitivity(text: string | null | undefined): string | null {
  if (!text) return null
  let out = text
  for (const phrase of [
    'with relatively low sensitivity to longer payment terms',
    'with moderate sensitivity to longer payment terms',
    'with high sensitivity to longer payment terms',
    'relatively low sensitivity to longer payment terms',
    'moderate sensitivity to longer payment terms',
    'high sensitivity to longer payment terms',
  ]) {
    out = out.split(phrase).join('')
  }
  return out.split(' ').filter(Boolean).join(' ').split(' .').join('.').trim() || null
}

const metricTiles = computed(() => {
  const tiles: MetricTile[] = []
  if (creditRating.value) {
    tiles.push({ label: 'Credit Rating', value: creditRating.value, icon: CreditCardSvg })
  }
  if (props.card.spend_volume) {
    tiles.push({ label: 'Spend Volume', value: props.card.spend_volume, icon: ChartBarsSvg })
  }
  const companySize = stripSensitivity(props.card.company_size)
  if (companySize) {
    tiles.push({ label: 'Supplier Company Size', value: companySize, icon: ChartBarsSvg })
  }
  if (industryLine.value) {
    tiles.push({ label: 'Industry', value: industryLine.value, icon: ChartBarsSvg })
  }
  const priority = props.card.relationship || props.card.priority
  if (priority) {
    tiles.push({ label: 'Priority', value: String(priority), icon: ShieldSvg })
  }
  if (props.card.country) {
    tiles.push({ label: 'Country', value: props.card.country, icon: ChartBarsSvg })
  }
  if (props.card.cash_flow) {
    tiles.push({ label: 'Cash Flow Opportunity', value: props.card.cash_flow, icon: GaugeSvg })
  }
  if (props.card.buyer_leverage) {
    tiles.push({
      label: 'Buyer Leverage',
      value: props.card.buyer_leverage,
      icon: ShieldSvg,
    })
  }
  if (props.card.success_probability) {
    tiles.push({
      label: 'Probability of Success',
      value: props.card.success_probability,
      icon: WarnTriangleSvg,
    })
  }
  if (props.card.financing_rate) {
    tiles.push({
      label: 'Supplier Financing Rate',
      value: props.card.financing_rate,
      icon: ChartBarsSvg,
    })
  }
  return tiles
})
</script>

<style scoped>
.facts-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px 18px 16px;
  color: #111827;
  max-width: 100%;
  overflow: hidden;
}

.facts-card--expanded {
  border: none;
  border-radius: 0;
  padding: 0 4px;
  overflow: visible;
}

.facts-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.facts-card--expanded .facts-card-top {
  margin-bottom: 18px;
}

.facts-card--expanded .facts-supplier {
  font-size: 20px;
}

.facts-expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  border: 1px solid #c7c9f5;
  background: #eef2ff;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #3730a3;
  cursor: pointer;
  min-height: 36px;
}

.facts-expand-btn :deep(svg) {
  width: 14px;
  height: 14px;
}

.facts-expand-btn:hover {
  background: #e0e7ff;
  border-color: #a5b4fc;
}

.facts-lead {
  font-size: 15px;
  line-height: 1.55;
  color: #1f2937;
  margin-bottom: 0;
}

.facts-description {
  margin-bottom: 16px;
}

.facts-section-heading {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  letter-spacing: 0.01em;
  margin-bottom: 6px;
}

.facts-lead strong,
.detail-line strong {
  font-weight: 700;
  color: #6366f1;
}

.terms-caption {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}

.facts-regulatory {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.45;
  color: #78350f;
  background: #fffbeb;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 10px 12px;
}

.facts-identity {
  min-width: 0;
}

.facts-supplier {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.facts-header {
  font-size: 14px;
  color: #4b5563;
  margin-top: 4px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.facts-card--expanded .facts-header {
  font-size: 15px;
  margin-top: 6px;
}

.terms-timeline {
  margin-bottom: 20px;
  padding: 0 8px;
}

.facts-card--expanded .terms-timeline {
  padding: 0 10px;
}

.terms-window {
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}

.terms-stage {
  margin: 0 4px 6px;
}

.terms-plot {
  position: relative;
  height: 12px;
}

.terms-map-pin {
  position: absolute;
  bottom: calc(50% + 6px);
  transform: translateX(-50%);
  z-index: 4;
  pointer-events: auto;
  cursor: pointer;
  width: 18px;
  height: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.terms-map-pin-tip {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  padding: 4px 8px;
  border-radius: 6px;
  background: #111827;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.terms-map-pin-shape {
  width: 14px;
  height: 14px;
  background: currentColor;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  box-shadow: 0 0 0 2px #fff, 0 1px 4px rgba(15, 23, 42, 0.28);
  flex-shrink: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.terms-map-pin:hover .terms-map-pin-shape,
.terms-map-pin--active .terms-map-pin-shape {
  transform: rotate(-45deg) scale(1.35);
  box-shadow: 0 0 0 2px #fff, 0 3px 10px rgba(15, 23, 42, 0.4);
}

.terms-map-pin:hover .terms-map-pin-tip,
.terms-map-pin--active .terms-map-pin-tip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.terms-track {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 8px;
  border-radius: 999px;
  background: #e5e7eb;
  transform: translateY(-50%);
}

.terms-fill {
  position: absolute;
  left: 0;
  top: 50%;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #a5b4fc 0%, #6366f1 100%);
  transform: translateY(-50%);
  max-width: 100%;
}

.terms-checkpoint {
  position: absolute;
  top: 50%;
  transform: translateX(-50%);
  z-index: 2;
  width: 0;
  height: 0;
}

.terms-ball {
  position: absolute;
  left: 50%;
  top: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-sizing: border-box;
  background: #fff;
  border: 2px solid #6b7280;
}

.terms-checkpoint--batna .terms-ball {
  border-color: #9ca3af;
}

.terms-checkpoint--target .terms-ball {
  background: #6366f1;
  border-color: #6366f1;
}

.terms-pin {
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.terms-pin-box {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  padding: 5px 8px;
  text-align: center;
  min-width: 52px;
  white-space: nowrap;
}

.terms-checkpoint--target .terms-pin-box {
  border-color: #6366f1;
}

.terms-pin-value {
  font-size: 13px;
  font-weight: 400;
  color: #111827;
  line-height: 1.2;
}

.terms-checkpoint--target .terms-pin-value {
  color: #4f46e5;
}

.terms-pin-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #9ca3af;
  line-height: 1.2;
  margin-top: 1px;
}

.terms-checkpoint--target .terms-pin-label {
  color: #6366f1;
}

.terms-pin-stem {
  width: 1px;
  flex-shrink: 0;
  background: #d1d5db;
}

.terms-axis {
  position: relative;
  height: 28px;
  margin: 0 4px 10px;
  border-top: 1px solid #e5e7eb;
}

.terms-tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  text-align: center;
}

.terms-tick--start {
  transform: translateX(0);
  text-align: left;
}

.terms-tick--end {
  transform: translateX(-100%);
  text-align: right;
}

.terms-tick-mark {
  width: 1px;
  height: 6px;
  margin: 0 auto;
  background: #d1d5db;
}

.terms-tick--start .terms-tick-mark,
.terms-tick--end .terms-tick-mark {
  margin: 0;
}

.terms-tick--end .terms-tick-mark {
  margin-left: auto;
}

.terms-tick-label {
  margin-top: 4px;
  font-size: 11px;
  color: #9ca3af;
  line-height: 1;
  white-space: nowrap;
}

.terms-benchmarks {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
  margin: 0 4px 4px;
}

.terms-bench {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.3;
  cursor: pointer;
  border-radius: 6px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: color 0.15s ease, background 0.15s ease;
}

.terms-bench:hover,
.terms-bench--active {
  color: #111827;
  background: #f3f4f6;
}

.terms-bench strong {
  font-weight: 700;
  color: #6366f1;
}

.terms-bench-pin {
  width: 9px;
  height: 9px;
  background: currentColor;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.terms-bench:hover .terms-bench-pin,
.terms-bench--active .terms-bench-pin {
  transform: rotate(-45deg) scale(1.25);
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.metrics-grid--expanded {
  grid-template-columns: 1fr 1fr 1fr 1fr;
}

.metric-tile {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 14px;
  min-width: 0;
}

.metric-tile-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  min-width: 0;
}

.metric-tile-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: #6b7280;
}

.metric-tile-label {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  line-height: 1.3;
}

.metric-tile-value {
  font-size: 12px;
  font-weight: 400;
  color: #111827;
  letter-spacing: -0.01em;
  line-height: 1.3;
  overflow-wrap: anywhere;
  padding-left: 1.25rem;
}

.facts-details {
  padding-top: 4px;
  margin-bottom: 12px;
}

.detail-line {
  font-size: 14px;
  line-height: 1.55;
  color: #1f2937;
  margin-bottom: 10px;
  overflow-wrap: anywhere;
}

.detail-line--bullet {
  padding-left: 0.9em;
  text-indent: -0.9em;
}

.detail-line--bullet::before {
  content: '•';
  margin-right: 0.35em;
}

.detail-label {
  font-weight: 700;
  color: #6b7280;
}
</style>
