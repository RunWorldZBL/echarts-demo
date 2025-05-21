<template>
  <div class="chart-container">
    <div class="chart" ref="chartRef"></div>
    <div class="controls">
      <TimelineControls
        :current-time="currentTimeLabel"
        :is-playing="isPlaying"
        :time-progress="timeProgress"
        @update:time-progress="timeProgress = $event"
        @toggle-playback="togglePlayback"
        @manual-input="handleManualInput"
      />
      <MagnitudeLegend :legend-items="magnitudeLegend" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'
import TimelineControls from './TimelineControls.vue'
import MagnitudeLegend from './MagnitudeLegend.vue'
import { isMobileDevice, handleResize } from '@/utils/deviceUtils'
import {
  magnitudeLegend,
  getChartOptions,
  updateChartData,
  setLoadedSubtitle,
} from '@/utils/chartConfig'
import {
  setupMockData,
  fetchDataInBatches,
  updateDataByTime,
  getCurrentDateLabel,
  TOTAL_EARTHQUAKES,
} from '@/utils/mockData'

// 引用DOM元素和状态变量
const chartRef = ref(null)
let chart = null
const timeProgress = ref(0)
const isPlaying = ref(false)
const currentTimeLabel = ref('2023-01-01')
let playbackInterval = null
// 添加一个标志来区分手动调整和自动播放
let isManualChange = false
// 是否为移动设备
const isMobile = ref(false)

// 变量声明
let allEarthquakeData = []
let mock = null

// 根据时间戳更新可视化
function updateVisualization(timestamp) {
  const filteredData = updateDataByTime(allEarthquakeData, timestamp)

  // 更新日期标签
  currentTimeLabel.value = getCurrentDateLabel(filteredData)

  // 更新图表数据
  updateChartData(chart, filteredData)
}

// 处理时间轴变化
function onTimelineChange() {
  if (allEarthquakeData.length === 0) return

  // 计算对应的时间戳
  const progress = timeProgress.value / 100
  const minTime = allEarthquakeData[0][5]
  const maxTime = allEarthquakeData[allEarthquakeData.length - 1][5]
  const timestamp = minTime + progress * (maxTime - minTime)

  updateVisualization(timestamp)

  // 只有在手动调整且正在播放时才暂停
  if (isManualChange && isPlaying.value) {
    togglePlayback()
  }

  // 重置标志
  isManualChange = false
}

// 新增：处理手动输入
function handleManualInput() {
  isManualChange = true
  onTimelineChange()
}

// 切换播放/暂停
function togglePlayback() {
  isPlaying.value = !isPlaying.value

  if (isPlaying.value) {
    // 开始播放
    playbackInterval = setInterval(
      () => {
        if (timeProgress.value >= 100) {
          // 结束播放
          clearInterval(playbackInterval)
          isPlaying.value = false
          return
        }

        // 更新进度，移动端速度稍慢
        timeProgress.value = Number(timeProgress.value) + (isMobile.value ? 0.1 : 0.2)
        onTimelineChange()
      },
      isMobile.value ? 100 : 50,
    ) // 移动端更新间隔更长
  } else {
    // 暂停播放
    clearInterval(playbackInterval)
  }
}

// 更新加载进度的回调函数
function updateLoadingProgress(totalEarthquakes, progress) {
  chart.setOption({
    title: {
      subtext: `数据加载: ${totalEarthquakes.toLocaleString()} / ${TOTAL_EARTHQUAKES.toLocaleString()} (${progress}%)`,
    },
  })
}

// 初始化图表
async function initializeChart() {
  // 检查设备类型
  isMobile.value = isMobileDevice()

  // 设置模拟数据
  mock = setupMockData(isMobile.value)

  if (chartRef.value) {
    // 初始化图表
    chart = echarts.init(chartRef.value, null, {
      renderer: 'webgl',
      useDirtyRect: false,
    })

    // 设置初始选项
    chart.setOption(getChartOptions(isMobile.value))

    // 开始加载数据
    allEarthquakeData = await fetchDataInBatches(isMobile.value, updateLoadingProgress)

    // 加载完成后初始化时间轴和显示
    if (allEarthquakeData.length > 0) {
      setLoadedSubtitle(chart)

      // 显示起始数据
      const startTimestamp = allEarthquakeData[0][5]
      updateVisualization(startTimestamp)
    }
  }
}

// 监听时间进度变化
watch(timeProgress, onTimelineChange)

onMounted(() => {
  // 初始化图表
  initializeChart()

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    const needsReconfigure = handleResize(chart, isMobile)
    if (needsReconfigure && chart) {
      // 需要重新配置图表
      chart.setOption(getChartOptions(isMobile.value))
    }
  })
})

onUnmounted(() => {
  // 清除定时器
  if (playbackInterval) {
    clearInterval(playbackInterval)
  }

  // 移除事件监听
  window.removeEventListener('resize', handleResize)

  // 销毁Mock
  if (mock) {
    mock.restore()
  }

  // 销毁图表实例
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<style lang="scss" scoped>
// 添加移动设备的媒体查询
@media (max-width: 768px) {
  .controls {
    width: 95% !important;
    padding: 10px !important;
    bottom: 10px !important;
  }
}

.chart-container {
  width: 100%;
  height: 100vh;
  background-color: #000;
  position: relative;
  overflow: hidden;
}

.chart {
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 10px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
}

// 添加触摸事件优化
* {
  touch-action: manipulation;
}
</style>
