<template>
<div class="memory-chart-container" ref="containerRef">
  <div class="chart-header">
    <h5>Memory History (Last {{ memoryLog.length }} samples)</h5>
    <button class="chart-toggle" @click="toggleLimit" :class="{ active: showLimit }" title="Toggle limit line visibility"><span class="icon">📊</span><span class="text">{{ showLimit ? 'Hide Limit' : 'Show Limit' }}</span></button>
  </div>
  <canvas ref="chartCanvas"></canvas>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue';
import type { MemoryInfo } from '@/utils/memoryMonitor';

export default defineComponent({
  name: 'MemoryMonitorChart',
  props: {
    memoryLog: {
      type: Array as () => MemoryInfo[],
      required: true
    },
    height: {
      type: Number,
      default: 150
    }
  },
  setup(props) {
    const chartCanvas = ref<HTMLCanvasElement | null>(null);
    const containerRef = ref<HTMLDivElement | null>(null);
    const canvasWidth = ref(400);
    const canvasHeight = ref(props.height);
    const showLimit = ref(false); // Hidden by default to better appreciate memory changes
    let animationFrameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    
    const toggleLimit = () => {
      showLimit.value = !showLimit.value;
      drawChart();
    };

    const updateCanvasSize = () => {
      const container = containerRef.value;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      canvasWidth.value = rect.width;
      canvasHeight.value = props.height;
      
      // Update canvas actual size
      const canvas = chartCanvas.value;
      if (canvas) {
        canvas.width = canvasWidth.value;
        canvas.height = canvasHeight.value;
      }
      
      drawChart();
    };

    const drawChart = () => {
      const canvas = chartCanvas.value;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const width = canvasWidth.value;
      const height = canvasHeight.value;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // If no data, show message
      if (props.memoryLog.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No data yet...', width / 2, height / 2);
        return;
      }

      // Get data points
      const data = props.memoryLog.slice(-50); // Last 50 samples
      const padding = 40;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;

      // Calculate scales dynamically based on what's visible
      const maxUsed = Math.max(...data.map(d => d.usedJSHeapSize));
      const minUsed = Math.min(...data.map(d => d.usedJSHeapSize));
      const maxLimit = Math.max(...data.map(d => d.jsHeapSizeLimit));
      
      // Calculate yMin and yMax for better detail
      let yMin: number;
      let yMax: number;
      
      if (showLimit.value) {
        // When limit is visible, show full range from 0 to limit
        yMin = 0;
        yMax = Math.max(maxUsed, maxLimit);
      } else {
        // When limit is hidden, zoom into used values range
        const range = maxUsed - minUsed;
        const padding = range * 0.1; // 10% padding on both sides
        yMin = Math.max(0, minUsed - padding); // Don't go below 0
        yMax = maxUsed + padding;
      }
      
      const yRange = yMax - yMin;

      // Helper function for formatting bytes
      const formatBytesCompact = (bytes: number): string => {
        if (bytes === 0) return '0';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const value = bytes / Math.pow(k, i);
        // Show 1 decimal for values < 100, otherwise show integer
        const formatted = value < 100 ? value.toFixed(1) : value.toFixed(0);
        return `${formatted} ${sizes[i]}`;
      };

      // Draw grid lines (more subtle)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // Draw axes labels
      ctx.fillStyle = '#999';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight * i) / 4;
        const value = yMin + yRange * (1 - i / 4);
        ctx.fillText(formatBytesCompact(value), padding - 5, y + 4);
      }

      // Draw limit line (red) - only if enabled
      if (showLimit.value) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        data.forEach((point, index) => {
          const x = padding + (chartWidth * index) / (data.length - 1);
          const y = padding + chartHeight - (chartHeight * (point.jsHeapSizeLimit - yMin)) / yRange;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw used heap line (gradient based on zones)
      ctx.lineWidth = 2;
      data.forEach((point, index) => {
        if (index === 0) return;

        const x1 = padding + (chartWidth * (index - 1)) / (data.length - 1);
        const y1 = padding + chartHeight - (chartHeight * (data[index - 1].usedJSHeapSize - yMin)) / yRange;
        const x2 = padding + (chartWidth * index) / (data.length - 1);
        const y2 = padding + chartHeight - (chartHeight * (point.usedJSHeapSize - yMin)) / yRange;

        // Color based on usage percentage
        const usage = point.usedJSHeapSize / point.jsHeapSizeLimit;
        if (usage >= 0.9) {
          ctx.strokeStyle = '#ef4444'; // Red
        } else if (usage >= 0.8) {
          ctx.strokeStyle = '#f59e0b'; // Orange
        } else {
          ctx.strokeStyle = '#10b981'; // Green
        }

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Draw current values indicator (last point)
      const lastPoint = data[data.length - 1];
      const lastX = padding + chartWidth;
      const lastUsedY = padding + chartHeight - (chartHeight * (lastPoint.usedJSHeapSize - yMin)) / yRange;
      
      // Draw dot for current used heap
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(lastX, lastUsedY, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw dot for current limit - only if enabled
      if (showLimit.value) {
        const lastLimitY = padding + chartHeight - (chartHeight * (lastPoint.jsHeapSizeLimit - yMin)) / yRange;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(lastX, lastLimitY, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw legend with current values
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      
      // Used heap legend with current value
      ctx.fillStyle = '#10b981';
      ctx.fillRect(padding, height - 25, 10, 2);
      ctx.fillStyle = '#ccc';
      ctx.fillText(`Used: ${formatBytesCompact(lastPoint.usedJSHeapSize)}`, padding + 15, height - 20);
      
      // Limit legend with current value - only if enabled
      if (showLimit.value) {
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding + 150, height - 24);
        ctx.lineTo(padding + 160, height - 24);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ccc';
        ctx.fillText(`Limit: ${formatBytesCompact(lastPoint.jsHeapSizeLimit)}`, padding + 165, height - 20);
      }
    };

    const scheduleRender = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(drawChart);
    };

    // Watch for data changes
    watch(() => props.memoryLog, scheduleRender, { deep: true });

    onMounted(() => {
      updateCanvasSize();
      
      // Setup ResizeObserver to handle container size changes
      if (containerRef.value) {
        resizeObserver = new ResizeObserver(() => {
          updateCanvasSize();
        });
        resizeObserver.observe(containerRef.value);
      }
    });

    onUnmounted(() => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (resizeObserver && containerRef.value) {
        resizeObserver.unobserve(containerRef.value);
        resizeObserver.disconnect();
      }
    });

    return {
      chartCanvas,
      containerRef,
      showLimit,
      toggleLimit
    };
  }
});
</script>

<style lang="scss" scoped>
.memory-chart-container {
  width: 100%;
  min-width: 300px;
  overflow: hidden;
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    
    h5 {
      margin: 0;
      font-size: 13px;
      color: #fff;
      font-weight: bold;
      flex: 1;
    }
  }
  
  .chart-toggle {
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ccc;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 10px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    
    .icon {
      font-size: 12px;
    }
    
    .text {
      font-family: monospace;
    }
    
    &:hover {
      background: rgba(0, 0, 0, 0.8);
      border-color: rgba(255, 255, 255, 0.4);
      color: #fff;
    }
    
    &.active {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #ef4444;
      
      &:hover {
        background: rgba(239, 68, 68, 0.3);
      }
    }
  }
  
  canvas {
    display: block;
    width: 100%;
    height: auto;
  }
}
</style>

