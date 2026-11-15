<template>
  <Teleport to="body">
    <div v-if="playbook" class="playbook-modal-shell" @click.self="emit('close')">
      <div class="playbook-modal">
        <div class="playbook-head">
          <div class="playbook-heading">
            <div class="playbook-icon"><DocSvg /></div>
            <div>
              <h2>{{ playbook.title }}</h2>
            </div>
          </div>

          <button class="playbook-close" type="button" @click="emit('close')">
            <CloseSvg />
          </button>
        </div>

        <div class="playbook-grid">
          <article
            v-for="section in playbook.sections"
            :key="section.index"
            class="playbook-card"
            :style="{ '--section-accent': sectionAccent(section.index) }"
          >
            <div class="playbook-card-head">
              <h3>{{ section.title }}</h3>
              <div class="playbook-card-index">{{ section.index }}</div>
            </div>
            <ul v-if="section.bullets.length" class="playbook-card-list">
              <li
                v-for="bullet in section.bullets"
                :key="bullet"
                :class="{
                  'playbook-group-heading': isPlaybookGroupHeading(bullet),
                  'playbook-nested': isPlaybookNestedBullet(bullet),
                }"
              >
                <template v-for="(part, partIndex) in formatPlaybookText(bullet)" :key="partIndex">
                  <em v-if="part.italic">{{ part.text }}</em>
                  <strong v-else-if="part.bold">{{ part.text }}</strong>
                  <span v-else>{{ part.text }}</span>
                </template>
              </li>
            </ul>
          </article>
        </div>

        <div class="playbook-foot">
          <p v-if="playbook.footer" class="playbook-footer-note">{{ playbook.footer }}</p>
          <div class="playbook-actions">
            <button class="playbook-download playbook-download-secondary" type="button" @click="downloadPlaybookText">
              <DocSvg /> Download Text
            </button>
            <button class="playbook-download" type="button" :disabled="savingPdf" @click="downloadPlaybookPdf">
              {{ savingPdf ? 'Saving...' : 'Save & Download PDF' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PlaybookData } from '@/types/chat'
import { CloseSvg, DocSvg } from '@/components/chat/icons'
import { sessionApi } from '@/api/session.api'
import {
  formatPlaybookText,
  isPlaybookGroupHeading,
  isPlaybookNestedBullet,
} from '@/utils/playbook'

const props = defineProps<{
  playbook: PlaybookData | null
}>()

const emit = defineEmits<{
  close: []
}>()

const savingPdf = ref(false)

function playbookPdfFilename(): string {
  const base =
    props.playbook?.supplierName?.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') ||
    'negotiation-playbook'
  return `${base.toLowerCase()}-playbook.pdf`
}

function triggerPdfDownload(pdfUrl: string) {
  let href = pdfUrl
  let objectUrl: string | null = null

  if (pdfUrl.startsWith('data:')) {
    const [, base64 = ''] = pdfUrl.split(',', 2)
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
    objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    href = objectUrl
  }

  const link = document.createElement('a')
  link.href = href
  link.download = playbookPdfFilename()
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  if (objectUrl) URL.revokeObjectURL(objectUrl)
}

function sectionAccent(index: number): string {
  return ['#3D78F0', '#20B37A', '#F18B2B', '#5A54F9', '#18A39A', '#E5484D'][index - 1] ?? '#3D78F0'
}

function downloadPlaybookText() {
  if (!props.playbook) return

  const blob = new Blob([props.playbook.raw], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const base =
    props.playbook.supplierName?.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') ||
    'negotiation-playbook'
  link.href = url
  link.download = `${base.toLowerCase()}-playbook.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function downloadPlaybookPdf() {
  if (!props.playbook) return

  savingPdf.value = true
  try {
    const { data } = await sessionApi.savePlaybook({
      title: props.playbook.title,
      subtitle: props.playbook.subtitle,
      supplier_name: props.playbook.supplierName,
      country_code: props.playbook.countryCode,
      footer: props.playbook.footer,
      sections: props.playbook.sections,
      raw: props.playbook.raw,
    })

    triggerPdfDownload(data.pdf_url)
  } catch (error) {
    console.error('Failed to save or download playbook PDF', error)
    window.alert('Could not save and download the playbook PDF.')
  } finally {
    savingPdf.value = false
  }
}
</script>

<style scoped>
.playbook-modal-shell {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(17, 24, 39, 0.26);
  backdrop-filter: blur(3px);
  overflow: hidden;
}

.playbook-modal {
  width: min(1080px, calc(100vw - 64px));
  max-height: min(760px, calc(100vh - 40px));
  background: #fff;
  border-radius: 20px;
  border: 1px solid #dbe4ee;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.playbook-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid #e8eef5;
  background: #fff;
}

.playbook-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.playbook-icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
  background: #eef2ff;
  flex-shrink: 0;
  line-height: 0;
}

.playbook-icon :deep(.ico) {
  display: block;
  width: 13px;
  height: 13px;
}

.playbook-heading h2 {
  margin: 0;
  font-size: 21px;
  line-height: 1.1;
  color: #202838;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.playbook-heading p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #6b7280;
}

.playbook-close {
  border: 1px solid #cfd8e3;
  background: #fff;
  color: #4b5563;
  width: 28px;
  height: 28px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.playbook-close:hover {
  background: #f8fafc;
  color: #111827;
  border-color: #b9c5d3;
}

.playbook-close :deep(.ico) {
  width: 12px;
  height: 12px;
}

.playbook-grid {
  flex: 1;
  min-height: 0;
  padding: 12px 14px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: max-content;
  align-content: start;
  gap: 14px;
  background: #fff;
}

.playbook-card {
  position: relative;
  min-height: 0;
  padding: 16px 16px 14px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #dde6ef;
  box-shadow: none;
  overflow: visible;
}

.playbook-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 12px 12px 0 0;
  background: var(--section-accent);
}

.playbook-card-head {
  display: flex;
  align-items: flex-start;
  min-height: 28px;
}

.playbook-card-index {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  line-height: 1;
  border-radius: 50%;
  background: color-mix(in srgb, var(--section-accent) 12%, white);
  color: var(--section-accent);
  font-size: 12px;
  font-weight: 800;
}

.playbook-card h3 {
  margin: 0;
  padding-right: 36px;
  font-size: 16px;
  line-height: 28px;
  color: #202838;
  font-weight: 800;
}

.playbook-card-list {
  margin: 10px 0 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.playbook-card-list li {
  font-size: 13px;
  line-height: 1.5;
  color: #202838;
}

.playbook-card-list li.playbook-group-heading {
  list-style: none;
  margin-left: -18px;
  margin-top: 8px;
  font-weight: 800;
}

.playbook-card-list li.playbook-group-heading:first-child {
  margin-top: 0;
}

.playbook-card-list li.playbook-nested {
  margin-left: 18px;
}

.playbook-card-list li::marker {
  color: var(--section-accent);
}

.playbook-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px 14px;
  border-top: 1px solid #e8eef5;
  background: #fff;
}

.playbook-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-left: auto;
}

.playbook-footer-note {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.45;
  font-style: italic;
}

.playbook-download {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid #6366f1ff;
  border-radius: 10px;
  background: #eef2ff;
  color: #6366f1ff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s, background 0.12s, border-color 0.12s;
}

.playbook-download:hover {
  transform: translateY(-1px);
  background: #dfe4ff;
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.18);
}

.playbook-download:disabled {
  cursor: wait;
  opacity: 0.72;
  transform: none;
  box-shadow: none;
}

.playbook-download :deep(.ico) {
  width: 13px;
  height: 13px;
}

.playbook-download-secondary {
  background: #fff;
  color: #334155;
  border-color: #d6dee8;
}

.playbook-download-secondary:hover {
  background: #f8fafc;
}

@media (max-width: 900px) {
  .playbook-modal {
    width: min(100vw - 24px, 900px);
  }

  .playbook-grid {
    grid-template-columns: 1fr;
    padding: 12px;
  }
}

@media (max-width: 640px) {
  .playbook-modal-shell {
    padding: 10px;
  }

  .playbook-modal {
    width: 100%;
    max-height: calc(100vh - 20px);
    border-radius: 16px;
  }

  .playbook-head,
  .playbook-grid,
  .playbook-foot {
    padding-left: 14px;
    padding-right: 14px;
  }

  .playbook-head {
    align-items: center;
  }

  .playbook-heading h2 {
    font-size: 19px;
  }

  .playbook-card h3 {
    font-size: 16px;
  }

  .playbook-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .playbook-actions {
    justify-content: stretch;
    flex-direction: column;
  }

  .playbook-download {
    width: 100%;
    justify-content: center;
  }
}
</style>
