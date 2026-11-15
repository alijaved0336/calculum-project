<template>
  <div class="page" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="chat-panel" :class="{ 'panel-closing': closingSession }">
      <div v-if="closingSession" class="closing-overlay">
        <a-spin size="large" />
        <span class="closing-label">Saving session…</span>
      </div>

      <ChatHeader
        :activeTab="activeTab"
        :isFullscreen="isFullscreen"
        :historyOpen="historyOpen"
        :copied="copied"
        :showCopyButton="
          activeTab === 'assistant' && !historyOpen && messages.length > 0
        "
        :isConnecting="chatWs.isConnecting.value"
        :isConnected="chatWs.isConnected.value"
        :wsError="chatWs.wsError.value"
        @update:activeTab="activeTab = $event"
        @update:isFullscreen="isFullscreen = $event"
        @toggle-history="openHistory"
        @open-goals="goalsModalOpen = true"
        @copy-conversation="copyConversation"
        @new-chat="newChat"
        @go-back="goBack"
      />

      <ActiveGoalStrip
        v-if="activeTab === 'assistant' && sessionStore.supplierData"
        :goalTitle="selectedGoal.title"
        @open-goals="goalsModalOpen = true"
      />

      <SessionStatusBar
        :loading="sessionStore.loading"
        :error="sessionStore.error"
      />

      <ChatScrollArea
        v-if="activeTab === 'assistant' && !historyOpen"
        ref="chatScrollRef"
        :messages="messages"
        :loading="loading"
        :threadMessagesLoading="threadMessagesLoading"
        :showSummary="!!activeSummary"
        :parsedSummary="parsedSummary"
        :pinnedSummaryBullets="pinnedSummaryBullets"
        :isSummaryPinned="isActiveSummaryPinned"
        :sessionLoading="sessionStore.loading"
        :forceScrollKey="forceScrollKey"
        :starterQuestions="sessionStore.starterQuestions"
        v-model:wrapupDone="wrapupDone"
        @follow-up="onFollowUp"
        @edit-prefill="onEditPrefill"
        @open-playbook="openPlaybook"
        @open-summary-card="openSummaryCard"
        @toggle-summary-pin="toggleSummaryPin"
        @submit-wrapup="submitWrapup"
        @dismiss-wrapup="dismissWrapup"
        :visual-context="visualContext"
        :can-view-data-inputs="canViewDataInputs"
      />

      <ThreadHistoryPanel
        v-if="historyOpen && activeTab === 'assistant'"
        :threads="threads"
        :loading="threadsLoading"
        :search="threadSearch"
        :filteredThreads="filteredThreads"
        @update:search="threadSearch = $event"
        @load-thread="loadThreadMessages"
        @pin-thread="(id, pinned) => pinThread(id, pinned)"
        @rename-thread="renameThread"
        @delete-thread="deleteThread"
        @new-chat="newChat"
        @close="historyOpen = false"
      />

      <ChatActivityPanel
        v-if="activeTab === 'activity'"
        :threads="filteredThreads"
        :loading="threadsLoading"
        :search="threadSearch"
        @refresh="loadThreads"
        @update:search="threadSearch = $event"
        @open-thread="openActivityThread"
      />

      <MessageComposer
        v-if="activeTab === 'assistant' && !historyOpen"
        v-model="input"
        v-model:selectedTone="selectedTone"
        :loading="replyInProgress"
        :sessionLoading="sessionStore.loading"
        :isConnected="chatWs.isConnected.value"
        :tones="TONES"
        :recommendedTone="RECOMMENDED_TONE"
        :availableTones="availableTones"
        :disabled="wrapupDone"
        @send="send"
        @stop="stopReply"
      />
    </div>
  </div>

  <GoalsModal
    v-model="goalsModalOpen"
    :goals="GOALS"
    :selectedGoalId="selectedGoal.id"
    :availableGoalIds="availableGoalIds"
    @select="selectGoal"
  />

  <PlaybookModal :playbook="activePlaybook" @close="activePlaybook = null" />
  <SummaryFactsModal :card="activeSummaryCard" @close="activeSummaryCard = null" />
</template>

<script setup lang="ts">
import { useChatView } from '@/composables/useChatView'
import { GOALS, RECOMMENDED_TONE, TONES } from './chatView.constants'

const {
  activeSummary,
  activeTab,
  availableGoalIds,
  availableTones,
  canViewDataInputs,
  chatWs,
  closingSession,
  copied,
  copyConversation,
  filteredThreads,
  forceScrollKey,
  goalsModalOpen,
  goBack,
  activePlaybook,
  activeSummaryCard,
  historyOpen,
  input,
  isActiveSummaryPinned,
  isFullscreen,
  loadThreadMessages,
  loadThreads,
  loading,
  replyInProgress,
  messages,
  newChat,
  onEditPrefill,
  onFollowUp,
  openPlaybook,
  openSummaryCard,
  openActivityThread,
  openHistory,
  parsedSummary,
  pinThread,
  pinnedSummaryBullets,
  renameThread,
  deleteThread,
  selectGoal,
  selectedGoal,
  selectedTone,
  send,
  stopReply,
  sessionStore,
  submitWrapup,
  dismissWrapup,
  threadMessagesLoading,
  threadSearch,
  threads,
  threadsLoading,
  toggleSummaryPin,
  visualContext,
  wrapupDone,
} = useChatView(GOALS, RECOMMENDED_TONE)
</script>

<style scoped src="./ChatView.css"></style>
