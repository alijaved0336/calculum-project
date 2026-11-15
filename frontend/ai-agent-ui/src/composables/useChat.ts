import { onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { MessageMetadata } from '@/types/chat'
import { normalizeSummaryCard } from '@/utils/summaryCard'

type MessageCallback = (text: string, isDone: boolean, metadata?: MessageMetadata) => void

const WS_BASE = import.meta.env.DEV
  ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
  : import.meta.env.VITE_NEGOTIATION_BACKEND_URL_WS || "";

type IncomingPayload = {
  text: string
  isDone: boolean
  metadata?: MessageMetadata
}

const RECONNECT_DELAY = 2500
// Keep-alive interval to prevent production load balancer idle timeout (5 min)
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000

function asMetadata(value: unknown): MessageMetadata | undefined {
  if (!value || typeof value !== 'object') return undefined

  const candidate = value as {
    source?: MessageMetadata['source']
    rag_sources?: MessageMetadata['rag_sources']
    usage?: MessageMetadata['usage']
    timing?: MessageMetadata['timing']
    is_playbook?: MessageMetadata['is_playbook']
    summary_card?: MessageMetadata['summary_card']
    follow_ups?: MessageMetadata['follow_ups']
    thread_id?: MessageMetadata['thread_id']
  }

  if (
    candidate.source === undefined &&
    candidate.rag_sources === undefined &&
    candidate.usage === undefined &&
    candidate.timing === undefined &&
    candidate.is_playbook === undefined &&
    candidate.summary_card === undefined &&
    candidate.follow_ups === undefined &&
    candidate.thread_id === undefined
  ) {
    return undefined
  }

  return {
    source: candidate.source,
    rag_sources: Array.isArray(candidate.rag_sources) ? candidate.rag_sources : undefined,
    usage: candidate.usage,
    timing: candidate.timing,
    is_playbook: candidate.is_playbook,
    summary_card: normalizeSummaryCard(candidate.summary_card) ?? undefined,
    follow_ups: Array.isArray(candidate.follow_ups) ? candidate.follow_ups : undefined,
    thread_id: typeof candidate.thread_id === 'string' ? candidate.thread_id : undefined,
  }
}

function pickText(value: unknown): string {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  const candidates = [
    record.data,
    record.token,
    record.text,
    record.content,
    record.message,
    record.generated_message,
    record.delta,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string') return candidate
  }

  return ''
}

function normalizeIncomingPayload(raw: string): IncomingPayload {
  try {
    const parsed = JSON.parse(raw) as unknown

    if (typeof parsed === 'string') {
      return { text: parsed, isDone: false }
    }

    if (!parsed || typeof parsed !== 'object') {
      return { text: '', isDone: false }
    }

    const record = parsed as Record<string, unknown>
    const nested =
      record.data && typeof record.data === 'object'
        ? (record.data as Record<string, unknown>)
        : null
    const type = typeof record.type === 'string' ? record.type.toLowerCase() : ''

    if (type === 'token') {
      return { text: pickText(nested) || pickText(record), isDone: false }
    }

    if (type === 'done') {
      const metadata = asMetadata(nested) ?? asMetadata(record.metadata) ?? asMetadata(record)
      return { text: '', isDone: true, metadata }
    }

    if (type === 'error') {
      return { text: `Error: ${pickText(nested) || pickText(record)}`, isDone: true }
    }

    return {
      text: pickText(nested) || pickText(record),
      isDone: false,
      metadata: asMetadata(nested) ?? asMetadata(record.metadata) ?? asMetadata(record),
    }
  } catch {
    return { text: raw, isDone: true }
  }
}

export function useChat(
  sessionId: Ref<string | null>,
  token: Ref<string | null>,
  recoverSession?: () => Promise<void>,
) {
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const wsError = ref<string | null>(null)

  let ws: WebSocket | null = null
  let messageCallback: MessageCallback = () => {}
  let intentional = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let failedReconnects = 0
  let recovering = false

  function clearTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function dropSocket() {
    if (!ws) return
    ws.onopen = null
    ws.onmessage = null
    ws.onclose = null
    ws.onerror = null
    if (ws.readyState !== WebSocket.CLOSED) ws.close()
    ws = null
  }

  function connect(id: string, tok: string) {
    clearTimer()
    dropSocket()
    intentional = false
    isConnecting.value = true
    wsError.value = null

    const socket = new WebSocket(`${WS_BASE}/${id}/negotiation/chat?token=${tok}`)
    ws = socket

    socket.onopen = () => {
      if (ws !== socket) return
      isConnected.value = true
      isConnecting.value = false
      wsError.value = null
      failedReconnects = 0
      startHeartbeat()
    }

    socket.onmessage = (event: MessageEvent<string>) => {
      if (ws !== socket) return
      const { text, isDone, metadata } = normalizeIncomingPayload(event.data)
      if (text || isDone || metadata) {
        messageCallback(text, isDone, metadata)
      }
    }

    socket.onclose = () => {
      if (ws !== socket) return
      isConnected.value = false
      isConnecting.value = false
      ws = null
      stopHeartbeat()

      if (!intentional) {
        messageCallback('', true)
        failedReconnects += 1
        wsError.value = failedReconnects > 1
          ? 'Session expired — starting a new session…'
          : 'Connection lost — reconnecting…'
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          void attemptReconnect()
        }, RECONNECT_DELAY)
      }
    }

    socket.onerror = () => {
      if (ws !== socket) return
      wsError.value = 'WebSocket error'
      isConnected.value = false
      isConnecting.value = false
    }
  }

  async function attemptReconnect() {
    if (intentional) return

    const nextSessionId = sessionId.value
    const nextToken = token.value

    if (failedReconnects <= 1) {
      if (nextSessionId && nextToken) connect(nextSessionId, nextToken)
      return
    }

    if (!recoverSession || recovering) return

    recovering = true
    try {
      await recoverSession()
    } catch {
      wsError.value = 'Failed to restore session'
    } finally {
      recovering = false
    }
  }

  function disconnect() {
    intentional = true
    clearTimer()
    stopHeartbeat()
    dropSocket()
    isConnected.value = false
    isConnecting.value = false
    wsError.value = null
  }

  function send(message: string, tone?: string | null, strategy?: string | null) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        message,
        thread_tone: tone ?? null,
        negotiation_strategy: strategy ?? null,
      }))
    }
  }

  function stop() {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stop' }))
    }
  }

  function onMessage(cb: MessageCallback) {
    messageCallback = cb
  }

  watch([sessionId, token], ([id, tok]) => {
    failedReconnects = 0
    if (id && tok) connect(id, tok)
    else disconnect()
  })

  onUnmounted(() => disconnect())

  return { isConnected, isConnecting, wsError, send, stop, onMessage, disconnect }
}
