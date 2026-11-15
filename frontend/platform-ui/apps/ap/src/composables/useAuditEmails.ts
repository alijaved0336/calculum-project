import { ref, computed, watch, Ref } from 'vue'
import { getAuditEmails, AuditEmail, AuditEmailFilters } from '@/modules/adminBackend/api/auditEmails'

export interface AuditEmailsFiltersState {
  search?: string;
  sentAfter?: string;
  sentBefore?: string;
  status?: string;
}

export function useAuditEmails(
  filters: Ref<AuditEmailsFiltersState> = ref({}),
) {
  const emails = ref<AuditEmail[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const totalItems = ref(0)
  const currentPage = ref(1)
  const itemsPerPage = 50
  const orderField = ref<string>('created')
  const orderDir = ref<'asc' | 'desc'>('desc')

  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / itemsPerPage)))
  const hasNextPage = computed(() => currentPage.value < totalPages.value)
  const hasPreviousPage = computed(() => currentPage.value > 1)

  async function fetchEmails() {
    loading.value = true
    error.value = null

    const apiFilters: AuditEmailFilters = {
      page: currentPage.value,
      order: { field: orderField.value, dir: orderDir.value },
    }

    // Map search to both targetEmail and subject (search both, let API handle partial)
    if (filters.value.search) {
      // The API supports partial search on targetEmail and subject separately.
      // We'll search by targetEmail as the primary search field.
      apiFilters.targetEmail = filters.value.search
    }
    if (filters.value.sentAfter) apiFilters.createdAfter = filters.value.sentAfter
    if (filters.value.sentBefore) apiFilters.createdBefore = filters.value.sentBefore
    if (filters.value.status) apiFilters.status = filters.value.status as 'sent' | 'queued' | 'failed'

    try {
      const response = await getAuditEmails(apiFilters)

      if (response.success && response.data) {
        const hydraMembers: AuditEmail[] = response.data['hydra:member'] || response.data['member'] || []

        emails.value = hydraMembers
        totalItems.value = response.data['hydra:totalItems'] || response.data['totalItems'] || 0
      } else {
        emails.value = []
        totalItems.value = 0
        error.value = 'Failed to load emails'
      }
    } catch (e: any) {
      emails.value = []
      totalItems.value = 0
      error.value = e.message || 'Failed to load emails'
    } finally {
      loading.value = false
    }
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
      fetchEmails()
    }
  }

  function nextPage() {
    if (hasNextPage.value) goToPage(currentPage.value + 1)
  }

  function previousPage() {
    if (hasPreviousPage.value) goToPage(currentPage.value - 1)
  }

  function setOrder(field: string) {
    if (orderField.value === field) {
      orderDir.value = orderDir.value === 'desc' ? 'asc' : 'desc'
    } else {
      orderField.value = field
      orderDir.value = 'desc'
    }
    currentPage.value = 1
    fetchEmails()
  }

  function refresh() {
    fetchEmails()
  }

  // Watch filters and reset to page 1 with debounce for search
  watch(filters, () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
    searchDebounceTimer = setTimeout(() => {
      currentPage.value = 1
      fetchEmails()
    }, 400)
  }, { deep: true })

  // Initial fetch
  fetchEmails()

  return {
    emails,
    loading,
    error,
    totalItems,
    currentPage,
    totalPages,
    itemsPerPage,
    hasNextPage,
    hasPreviousPage,
    orderField,
    orderDir,
    goToPage,
    nextPage,
    previousPage,
    setOrder,
    refresh,
  }
}

export function formatEmailDate(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatSenderName(sender: AuditEmail['sender']): string {
  if (!sender) return '-'
  const name = [sender.firstName, sender.lastName].filter(Boolean).join(' ')
  return name || sender.email || '-'
}
