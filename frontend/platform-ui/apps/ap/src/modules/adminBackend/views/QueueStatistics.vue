<template>
<div>
  <!-- Modal para mostrar mensajes-->
  <CalculumModal v-if="showMessagesModal" @close="showMessagesModal = false" :size="'xl'" :showClose="true" :title="$t('adminBackend.statistics.queueStatistics.messages.viewMessages', { queue: selectedQueueName })">
    <template v-slot:modalContent>
      <div class="modal-loading-state" v-if="loadingMessages">
        <div class="d-flex flex-column align-items-center justify-content-center py-5">
          <div class="spinner-border" role="status"></div>
          <div class="text-muted mt-3">{{ $t('adminBackend.statistics.queueStatistics.messages.loading') }}</div>
        </div>
      </div>
      <template v-else>
        <div class="mb-3 d-flex justify-content-between align-items-center"><span class="text-muted">{{ $t('adminBackend.statistics.queueStatistics.messages.showing', { count: queueMessages.messages.length, total: queueMessages.total_messages }) }}</span><span class="text-muted" v-if="queueMessages.truncated">{{ $t('adminBackend.statistics.queueStatistics.messages.truncated') }}</span></div>
        <div class="messages-container show-scroll">
          <div class="message-item mb-3" v-for="message in queueMessages.messages" :key="message.routing_key + message.payload_bytes">
            <div class="message-header d-flex justify-content-between align-items-center mb-2">
              <div class="d-flex align-items-center"><span class="badge badge-info mr-2">{{ message.routing_key }}</span><span class="badge badge-secondary mr-2">{{ formatBytes(message.payload_bytes) }}</span><span class="badge badge-warning" v-if="message.redelivered">{{ $t('adminBackend.statistics.queueStatistics.messages.redelivered') }}</span></div><span class="text-muted small">Exchange: {{ message.exchange }}</span>
            </div>
            <div class="message-body">
              <div class="message-type mb-2" v-if="formatMessagePayload(message).messageType">
                <div class="d-flex align-items-center gap-2"><span class="badge badge-primary">{{ formatMessagePayload(message).messageType }}</span><span class="badge badge-secondary" v-if="formatMessagePayload(message).busName">{{ formatMessagePayload(message).busName }}</span></div>
              </div>
              <pre class="message-payload p-3"><code>{{ JSON.stringify(formatMessagePayload(message).data || formatMessagePayload(message), null, 2) }}</code></pre>
            </div>
          </div>
        </div>
      </template>
    </template>
  </CalculumModal>
  <section class="page-content-top pt-4 px-4">
    <div class="d-flex justify-content-between align-items-start mb-4">
      <div>
        <h5 class="mb-1">{{ $t('adminBackend.statistics.queueStatistics.title') }}</h5>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" id="showActiveQueues" v-model="showOnlyWithMessages"/>
          <label class="form-check-label text-muted small" for="showActiveQueues">{{ $t('adminBackend.statistics.queueStatistics.showOnlyWithMessages') }} ({{ queuesWithMessages }})</label>
        </div>
      </div>
      <div class="d-flex flex-column align-items-end gap-1">
        <div class="btn btn-primary btn-sm" @click="refreshStatistics" :disabled="isLoading"><i class="fa-solid fa-arrows-rotate text-base mr-2"></i>{{ $t('adminBackend.audit.actions.refresh') }}</div>
        <div class="text-muted small" :class="{ 'bg-blur': isLoading }">{{ $t('adminBackend.statistics.queueStatistics.lastUpdate') }}: {{ lastUpdate }}</div>
      </div>
    </div>
  </section>
  <section class="page-content">
    <div class="row px-4">
      <div class="col-12">
        <div class="row mb-4">
          <div class="col-6">
            <div class="small-card">
              <div class="metric-box">
                <div class="metric-label">{{ $t('adminBackend.statistics.queueStatistics.totalQueues') }}</div>
                <div class="metric-value">{{ totalQueues }}</div>
              </div>
            </div>
          </div>
          <div class="col-6">
            <div class="small-card">
              <div class="metric-box">
                <div class="metric-label">{{ $t('adminBackend.statistics.queueStatistics.totalMessages') }}</div>
                <div class="metric-value">{{ totalMessages }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-12" v-for="(queue, name) in filteredQueues" :key="name">
            <div class="small-card mb-3 w-100">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0"><span>{{ getQueueDisplayName(queue.name) }}</span><span class="queue-original-name">({{ queue.name }})</span></h6>
                <div class="badge" :class="getStatusClass(queue.status)">{{ queue.status }}</div>
              </div>
              <div class="row">
                <div class="col-md-4">
                  <div class="metric-section messages-section">
                    <div class="d-flex justify-content-between align-items-center">
                      <h6 class="mb-3">{{ $t('adminBackend.statistics.queueStatistics.messages.title') }}</h6>
                      <div class="btn outline-secondary-btn btn-xs" v-if="queue.messages.total > 0" @click="viewQueueMessages(queue.name)"><span>{{ $t('adminBackend.statistics.queueStatistics.messages.viewButton') }}</span></div>
                    </div>
                    <div class="details-grid">
                      <div class="detail-item">
                        <div class="detail-label">{{ $t('adminBackend.statistics.queueStatistics.messages.total') }}</div>
                        <div class="detail-value">{{ queue.messages.total }}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">{{ $t('adminBackend.statistics.queueStatistics.messages.ready') }}</div>
                        <div class="detail-value">{{ queue.messages.ready }}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">{{ $t('adminBackend.statistics.queueStatistics.messages.unacknowledged') }}</div>
                        <div class="detail-value">{{ queue.messages.unacknowledged }}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">{{ $t('adminBackend.statistics.queueStatistics.messages.in_memory') }}</div>
                        <div class="detail-value">{{ queue.messages.in_memory }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="metric-section consumers-section">
                    <h6 class="mb-3">{{ $t('adminBackend.statistics.queueStatistics.consumers.title') }}</h6>
                    <div class="details-grid">
                      <div class="detail-item">
                        <div class="detail-label">{{ $t('adminBackend.statistics.queueStatistics.consumers.count') }}</div>
                        <div class="detail-value">{{ queue.consumers.count }}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">{{ $t('adminBackend.statistics.queueStatistics.consumers.utilisation') }}</div>
                        <div class="detail-value">{{ formatPercentage(queue.consumers.utilisation) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="metric-section metrics-section">
                    <h6 class="mb-3">{{ $t('adminBackend.statistics.queueStatistics.metrics.title') }}</h6>
                    <div class="details-grid">
                      <div class="detail-item">
                        <div class="detail-label">{{ $t('adminBackend.statistics.queueStatistics.metrics.memory_usage') }}</div>
                        <div class="detail-value">{{ formatBytes(queue.metrics.memory_usage) }}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">{{ $t('adminBackend.statistics.queueStatistics.metrics.disk_usage') }}</div>
                        <div class="detail-value">{{ formatBytes(queue.metrics.disk_usage) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getQueueDisplayName as resolveQueueDisplayName } from '@/modules/adminBackend/utils/QueueNames';
import { getQueueStatistics, getQueueMessages, type Queue, type QueueStatisticsResponse, type QueueMessagesResponse } from '@/modules/adminBackend/api/statistics';
import CalculumModal from '@/modules/components/CalculumModal.vue';

export default defineComponent({
  name: 'QueueStatistics',
  components: {
    CalculumModal
  },
  setup() {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const isLoading = ref(false);
    const loadingMessages = ref(false);
    const queues = ref<Record<string, Queue>>({});
    const previousQueues = ref<Record<string, Queue>>({});
    const totalQueues = ref(0);
    const totalMessages = ref(0);
    const lastUpdate = ref('');
    const showOnlyWithMessages = ref(true);
    const showMessagesModal = ref(false);
    const selectedQueueName = ref('');
    const queueMessages = ref<QueueMessagesResponse>({ queue: '', messages: [], total_messages: 0, truncated: false });
    let refreshInterval: any;

    const queuesWithMessages = computed(() => {
      const count = Object.values(displayQueues.value).filter(queue => queue.messages.total > 0).length;
      return `${count} ${count === 1 ? 'queue' : 'queues'}`;
    });

    const displayQueues = computed(() => {
      return isLoading.value ? previousQueues.value : queues.value;
    });

    const filteredQueues = computed(() => {
      const queuesList = displayQueues.value;
      
      // Convertir el objeto a array para poder ordenarlo
      const queuesArray = Object.entries(queuesList).map(([, queue]) => ({
        ...queue
      }));

      // Ordenar por cantidad total de mensajes (descendente)
      queuesArray.sort((a, b) => b.messages.total - a.messages.total);

      // Filtrar si es necesario
      const filteredArray = showOnlyWithMessages.value 
        ? queuesArray.filter(queue => queue.messages.total > 0)
        : queuesArray;

      // Convertir de nuevo a objeto usando el nombre de la cola
      return filteredArray.reduce((acc, queue) => {
        acc[queue.name] = queue;
        return acc;
      }, {} as Record<string, Queue>);
    });

    const formatLastUpdate = (timestamp: string | Date): string => {
      // Asegurarnos de que la fecha se interprete como UTC
      const date = typeof timestamp === 'string' 
        ? new Date(timestamp + 'Z') // Forzar interpretación UTC si es string
        : new Date(timestamp.getTime() + timestamp.getTimezoneOffset() * 60000); // Ajustar a UTC si es Date

      // Convertir a la zona horaria local del usuario
      return new Intl.DateTimeFormat(navigator.language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timeZoneName: 'short'
      }).format(date);
    };

    const fetchStatistics = async () => {
      try {
        isLoading.value = true;
        previousQueues.value = { ...queues.value };
        
        const response = await getQueueStatistics();
        if (response.success) {
          const data = response.data as QueueStatisticsResponse;
          queues.value = data.queues;
          totalQueues.value = data.total_queues;
          totalMessages.value = data.total_messages;
          lastUpdate.value = formatLastUpdate(data.timestamp);
        } else {
          throw new Error(`Error fetching queue statistics: ${response.code}`);
        }
      } catch (error) {
        console.error('Error fetching queue statistics:', error);
        queues.value = Object.entries(previousQueues.value).reduce((acc, [name, queue]) => {
          acc[name] = {
            ...queue,
            status: 'error'
          };
          return acc;
        }, {} as Record<string, Queue>);
      } finally {
        isLoading.value = false;
      }
    };

    const getStatusClass = (status: string) => {
      return {
        'badge-success': status === 'running',
        'badge-warning': status === 'paused',
        'badge-danger': status === 'error' || status === 'stopped'
      };
    };

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatPercentage = (value: number) => {
      return `${(value * 100).toFixed(1)}%`;
    };

    /** Ver `utils/QueueNames.ts`: el endpoint lista TODAS las colas del vhost, AR incluida. */
    const getQueueDisplayName = (queueName: string): string => resolveQueueDisplayName(queueName, t);

    const viewQueueMessages = async (queueName: string) => {
      try {
        loadingMessages.value = true;
        selectedQueueName.value = queueName;
        showMessagesModal.value = true;
        
        const response = await getQueueMessages(queueName);
        if (response.success) {
          queueMessages.value = response.data as QueueMessagesResponse;
        } else {
          throw new Error(`Error fetching queue messages: ${response.code}`);
        }
      } catch (error) {
        console.error('Error fetching queue messages:', error);
        // Aquí podrías mostrar un toast o mensaje de error
      } finally {
        loadingMessages.value = false;
      }
    };

    const parsePhpSerializedPayload = (payload: string) => {
      try {
        // Primero desescapamos la cadena
        const unescapedPayload = payload.replaceAll('\\\\', '\\').replaceAll('\\"', '"');
        
        // Extraer el mensaje del envelope
        const messageMatch = unescapedPayload.match(/\0Symfony\\Component\\Messenger\\Envelope\0message";O:\d+:"([^"]+)":/);
        const messageClass = messageMatch ? messageMatch[1] : 'Unknown Message';
        
        // Extraer el bus name
        const busMatch = unescapedPayload.match(/\0Symfony\\Component\\Messenger\\Stamp\\BusNameStamp\0busName";s:\d+:"([^"]+)"/);
        const busName = busMatch ? busMatch[1] : null;

        // Extraer todos los campos y valores del mensaje
        const messageRegex = new RegExp(String.raw`${messageClass.replaceAll('\\', '\\\\')}\\0([^"]+)";([^;]+;)`, 'g');
        const fields = [...unescapedPayload.matchAll(messageRegex)];
        
        const parsedFields = fields.reduce((acc: Record<string, any>, match) => {
          const fieldName = match[1];
          const value = match[2];
          
          // Limpiar el nombre del campo
          const cleanFieldName = fieldName.split('\\').pop() || fieldName;
          
          // Parsear el valor según su tipo
          let fieldValue: any;
          if (value.startsWith('i:')) {
            fieldValue = Number.parseInt(value.substring(2));
          } else if (value.startsWith('b:')) {
            fieldValue = value.substring(2) === '1';
          } else if (value.startsWith('s:')) {
            const stringMatch = value.match(/s:\d+:"([^"]*)"/);
            fieldValue = stringMatch ? stringMatch[1] : '';
          } else if (value.startsWith('a:')) {
            // Para arrays, por ahora solo mostramos que es un array
            fieldValue = '[Array]';
          } else if (value.startsWith('O:')) {
            // Para objetos anidados, por ahora solo mostramos que es un objeto
            fieldValue = '[Object]';
          } else {
            fieldValue = value;
          }
          
          acc[cleanFieldName] = fieldValue;
          return acc;
        }, {});

        return {
          messageType: messageClass.split('\\').pop(),
          busName: busName,
          data: parsedFields
        };
      } catch (error) {
        console.error('Error parsing PHP serialized payload:', error);
        return {
          messageType: 'Error parsing message',
          data: payload
        };
      }
    };

    const formatMessagePayload = (message: any) => {
      if (message.payload_encoding === 'phpserialize') {
        return parsePhpSerializedPayload(message.payload);
      }
      try {
        return JSON.parse(message.payload);
      } catch {
        return message.payload;
      }
    };

    const refreshStatistics = () => {
      fetchStatistics();
    };

    onMounted(() => {
      fetchStatistics();
      refreshInterval = setInterval(fetchStatistics, 10000); // Refresh every 10 seconds
    });

    onUnmounted(() => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    });

    return {
      isLoading,
      loadingMessages,
      filteredQueues,
      totalQueues,
      totalMessages,
      lastUpdate,
      showOnlyWithMessages,
      showMessagesModal,
      selectedQueueName,
      queueMessages,
      getStatusClass,
      formatBytes,
      formatPercentage,
      getQueueDisplayName,
      queuesWithMessages,
      viewQueueMessages,
      formatMessagePayload,
      refreshStatistics
    };
  }
});
</script>

<style lang="scss" scoped>
.form-check.form-switch {
  .form-check-input {
    cursor: pointer;
    margin-right: 0.5rem;
    
    &:checked {
      background-color: var(--bs-primary);
      border-color: var(--bs-primary);
    }
  }

  .form-check-label {
    cursor: pointer;
    user-select: none;
  }
}

.small-card {
  background: #ffffff;
  border-radius: 0.5rem;
  padding: 1.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--bs-gray-200);
  width: fit-content;
  margin: 0 auto;

  &.w-100 {
    width: 100%;
    margin: 0;
  }
}

.metric-box {
  text-align: center;
  background: #ffffff;

  .metric-label {
    font-size: 0.875rem;
    color: var(--bs-gray-600);
    margin-bottom: 0.5rem;
    white-space: nowrap;
  }

  .metric-value {
    font-size: 1.75rem;
    font-weight: bold;
    color: var(--bs-dark);
    transition: all 0.3s ease;
  }
}

.metric-section {
  padding: 1.25rem;
  border-radius: 0.5rem;
  height: 100%;
  border: 1px solid var(--bs-gray-200);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  &.messages-section {
    background: rgba(13, 110, 253, 0.02);
    border-color: rgba(13, 110, 253, 0.1);
  }

  &.consumers-section {
    background: rgba(25, 135, 84, 0.02);
    border-color: rgba(25, 135, 84, 0.1);
  }

  &.metrics-section {
    background: rgba(102, 16, 242, 0.02);
    border-color: rgba(102, 16, 242, 0.1);
  }

  h6 {
    color: var(--bs-gray-700);
    font-size: 0.875rem;
    font-weight: 600;
  }
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;

  .detail-item {
    .detail-label {
      font-size: 0.875rem;
      color: var(--bs-gray-600);
      margin-bottom: 0.25rem;
    }

    .detail-value {
      font-size: 1rem;
      font-weight: 600;
      color: var(--bs-dark);
      transition: all 0.3s ease;
    }
  }
}

.badge {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

h6 {
  color: var(--bs-gray-700);
}

.bg-blur {
  filter: blur(2px);
}

.queue-original-name {
  font-size: 0.75rem;
  color: var(--bs-gray-500);
  font-weight: normal;
  margin-left: 0.5rem;
  font-family: monospace;
}

.messages-container {
  max-height: 60vh;
  overflow-y: auto;
  padding: 1rem;
  background: var(--bs-gray-100);
  border-radius: 0.5rem;

  &.show-scroll {
    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    &::-webkit-scrollbar-track {
      background: var(--bs-gray-200);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--bs-gray-400);
      border-radius: 4px;

      &:hover {
        background: var(--bs-gray-500);
      }
    }
  }
}

.message-item {
  background: #ffffff;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--bs-gray-200);

  .message-header {
    .badge {
      margin-right: 0.5rem;
    }
  }

  pre {
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
    font-family: monospace;
  }
}
</style> 