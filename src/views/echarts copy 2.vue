<template>
  <div class="chart-container">
    <div class="chart" ref="chartRef"></div>
    <div class="stats" v-if="showStats">
      <div>显示: {{ renderedPoints.toLocaleString() }} / {{ totalPoints.toLocaleString() }} 点</div>
      <div>FPS: {{ fps }}</div>
      <div>LOD等级: {{ currentLodLevel }}</div>
    </div>
    <div class="controls">
      <div class="time-control">
        <span class="time-label">{{ currentTimeLabel }}</span>
        <button @click="togglePlayback">{{ isPlaying ? '暂停' : '播放' }}</button>
        <input type="range" min="0" max="100" v-model="timeProgress" @input="handleManualInput" />
      </div>
      <div class="settings-row">
        <label> <input type="checkbox" v-model="showStats" /> 统计信息 </label>
        <label>
          <input type="checkbox" v-model="enableLod" @change="updateLodSettings" /> LOD优化
        </label>
      </div>
      <div class="legend">
        <div class="legend-title">震级</div>
        <div class="legend-items">
          <div v-for="(item, index) in magnitudeLegend" :key="index" class="legend-item">
            <span class="color-box" :style="{ backgroundColor: item.color }"></span>
            <span class="legend-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineOptions } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

defineOptions({
  name: 'echarts-main',
})

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
// 性能统计
const showStats = ref(false)
const renderedPoints = ref(0)
const totalPoints = ref(0)
const fps = ref(0)
const enableLod = ref(true)
const currentLodLevel = ref(1)

// 性能追踪变量
let fpsTime = 0
let frameCount = 0
let lastDistanceLevel = 0

// 震级图例
const magnitudeLegend = [
  { color: '#313695', label: '< 3.0' },
  { color: '#4575b4', label: '3.0-4.0' },
  { color: '#74add1', label: '4.0-5.0' },
  { color: '#abd9e9', label: '5.0-6.0' },
  { color: '#fdae61', label: '6.0-7.0' },
  { color: '#f46d43', label: '7.0-8.0' },
  { color: '#d73027', label: '> 8.0' },
]

// LOD降采样配置
const LOD_LEVELS = [
  { distance: 1.5, step: 1 }, // 近距离：全分辨率
  { distance: 1.8, step: 5 }, // 中距离：1/5采样
  { distance: 2.2, step: 20 }, // 远距离：1/20采样
  { distance: 2.6, step: 50 }, // 更远：1/50采样
  { distance: 3.0, step: 100 }, // 最远：1/100采样
  { distance: Infinity, step: 200 }, // 超远：1/200采样
]

// 检测是否为移动设备
function checkMobile() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  isMobile.value = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase(),
  )
}

// 设置Mock
const mock = new MockAdapter(axios)
// 设置数据参数
const TOTAL_EARTHQUAKES = 1000000 // 千万级数据点
const BATCH_SIZE = 50000 // 每批次请求的地震数量
const TOTAL_BATCHES = Math.ceil(TOTAL_EARTHQUAKES / BATCH_SIZE)
const START_DATE = new Date('2023-01-01').getTime()
const END_DATE = new Date('2023-12-31').getTime()
const DATE_RANGE = END_DATE - START_DATE

// 使用URL.createObjectURL创建worker blob
const workerBlob = new Blob(
  [
    `
  // 地震带区域
  const EARTHQUAKE_ZONES = [
    // 环太平洋火山带
    { lat: 35, lng: 135, radius: 20, intensity: 1 }, // 日本
    { lat: -40, lng: 175, radius: 15, intensity: 0.9 }, // 新西兰
    { lat: -35, lng: -71, radius: 15, intensity: 0.9 }, // 智利
    { lat: 37, lng: -122, radius: 15, intensity: 0.9 }, // 加州
    { lat: 61, lng: -150, radius: 15, intensity: 0.9 }, // 阿拉斯加

    // 地中海-喜马拉雅带
    { lat: 28, lng: 84, radius: 15, intensity: 0.8 }, // 尼泊尔
    { lat: 39, lng: 35, radius: 15, intensity: 0.8 }, // 土耳其
    { lat: 38, lng: 15, radius: 10, intensity: 0.7 }, // 意大利

    // 其他活跃区域
    { lat: -5, lng: 150, radius: 15, intensity: 0.8 }, // 巴布亚新几内亚
    { lat: 0, lng: 100, radius: 10, intensity: 0.7 }, // 印尼
  ];

  // 计算点是否在地震带区域内及其强度权重
  function getLocationWeight(lat, lng) {
    let maxWeight = 0;

    for (const zone of EARTHQUAKE_ZONES) {
      // 简单的球面距离计算（不精确但足够用于可视化）
      const distance = Math.sqrt(
        Math.pow((lat - zone.lat) * Math.cos((lat * Math.PI) / 180), 2) + Math.pow(lng - zone.lng, 2)
      );

      if (distance < zone.radius) {
        const weight = zone.intensity * (1 - distance / zone.radius);
        maxWeight = Math.max(maxWeight, weight);
      }
    }

    return maxWeight > 0 ? maxWeight : 0.05; // 小概率的随机地震
  }

  // 格式化日期函数
  function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return \`\${year}-\${month}-\${day}\`;
  }

  // 生成一批地震数据
  function generateBatchData(startIndex, count, totalEarthquakes, startDate, dateRange, isMobile, lodStepMultiplier) {
    const data = [];
    const endIndex = Math.min(startIndex + count, totalEarthquakes);

    // 对于移动设备，或有LOD配置时使用step
    const baseStep = isMobile ? 5 : 1;
    const step = lodStepMultiplier ? baseStep * lodStepMultiplier : baseStep;

    for (let i = startIndex; i < endIndex; i += step) {
      // 基于索引生成伪随机但确定的数据
      const seed = i * 0.1;

      // 生成地理位置（更偏向地震带）
      let lat, lng, locationWeight;

      // 使用拒绝采样法生成更符合实际地震分布的位置
      do {
        lat = (Math.sin(seed * 7.3) * 0.5 + Math.sin(seed * 3.1) * 0.5) * 75;
        lng = (Math.cos(seed * 5.2) * 0.5 + Math.cos(seed * 2.9) * 0.5) * 180;
        locationWeight = getLocationWeight(lat, lng);
      } while (Math.random() > locationWeight);

      // 时间（按顺序分布，但有随机性）
      const timeProgress = i / totalEarthquakes + Math.sin(seed * 11.7) * 0.1;
      const timestamp = startDate + timeProgress * dateRange;
      const date = new Date(timestamp);

      // 深度（通常在300km以内，大部分在100km以内）
      const depth = -Math.abs(Math.pow(Math.sin(seed * 9.3), 2) * 250 + Math.random() * 50);

      // 震级（大部分在3-5之间，少数较大）
      let magnitude;
      const r = Math.random();
      if (r > 0.997)
        magnitude = 7.0 + Math.random() * 2.5; // 极大地震 (0.3%)
      else if (r > 0.97)
        magnitude = 6.0 + Math.random(); // 大地震 (2.7%)
      else if (r > 0.85)
        magnitude = 5.0 + Math.random(); // 中等地震 (12%)
      else if (r > 0.5)
        magnitude = 4.0 + Math.random(); // 小地震 (35%)
      else magnitude = 2.5 + Math.random() * 1.5; // 微小地震 (50%)

      // 提高地震带区域的震级
      magnitude += locationWeight * 0.5;

      data.push([
        lng, // 经度
        lat, // 纬度
        depth, // 深度
        magnitude, // 震级 (用于大小)
        magnitude / 10, // 震级归一化 (用于颜色)
        timestamp, // 时间戳
        formatDate(date), // 格式化日期
        magnitude.toFixed(1), // 格式化震级
      ]);
    }

    // 按时间排序
    data.sort((a, b) => a[5] - b[5]);

    return data;
  }

  // 根据时间戳过滤数据
  function filterDataByTime(allData, timestamp) {
    return allData.filter(item => item[5] <= timestamp);
  }

  // 监听消息
  self.onmessage = function(e) {
    const { type, data } = e.data;

    if (type === 'generateBatch') {
      const { startIndex, count, totalEarthquakes, startDate, dateRange, isMobile, lodStep } = data;
      const batchData = generateBatchData(startIndex, count, totalEarthquakes, startDate, dateRange, isMobile, lodStep);
      self.postMessage({ type: 'batchGenerated', data: batchData });
    }
    else if (type === 'filterByTime') {
      const { allData, timestamp } = data;
      const filteredData = filterDataByTime(allData, timestamp);
      self.postMessage({ type: 'dataFiltered', data: filteredData });
    }
  };
`,
  ],
  { type: 'application/javascript' },
)

// 创建Web Worker
let worker = null
try {
  const workerUrl = URL.createObjectURL(workerBlob)
  worker = new Worker(workerUrl)
} catch (e) {
  console.error('Web Worker creation failed:', e)
}

// 地震数据
let allEarthquakeData = []
let filteredData = []
let currentLodStep = 1

// 模拟API请求
mock.onGet(/\/api\/earthquakes\/batch\/\d+/).reply((config) => {
  const batchNumber = parseInt(config.url.split('/').pop())

  if (batchNumber >= TOTAL_BATCHES) {
    return [200, []]
  }

  // 这里只返回批次信息，实际数据由Web Worker生成
  return [200, { batchNumber, start: batchNumber * BATCH_SIZE, count: BATCH_SIZE }]
})

// 获取图表配置选项
function getOption() {
  const mobileOptions = isMobile.value
    ? {
        title: {
          top: 10,
          textStyle: { fontSize: 16 },
          subtextStyle: { fontSize: 10 },
        },
        visualMap: [
          {
            right: 10,
            textStyle: { fontSize: 10 },
          },
        ],
        globe: {
          viewControl: {
            distance: 2,
            targetCoord: [110, 20],
          },
        },
        series: [
          {
            symbolSize: 4, // 移动端点更大更容易看清
            progressive: 10000, // 降低渐进渲染阈值提高性能
            progressiveThreshold: 3000,
          },
        ],
      }
    : {}

  return {
    backgroundColor: '#000',
    title: {
      text: '全球地震活动可视化 (2023年)',
      subtext: '数据加载中...',
      left: 'center',
      top: 20,
      textStyle: {
        color: '#fff',
        fontSize: 20,
      },
      subtextStyle: {
        color: '#ccc',
      },
      ...mobileOptions.title,
    },
    tooltip: {
      formatter: function (params) {
        return `
          <div style="font-weight:bold;margin-bottom:5px;">
            ${params.value[6]} 地震
          </div>
          <div>位置: ${params.value[1].toFixed(2)}°, ${params.value[0].toFixed(2)}°</div>
          <div>深度: ${Math.abs(params.value[2]).toFixed(1)} km</div>
          <div>震级: ${params.value[7]}</div>
        `
      },
    },
    visualMap: [
      {
        type: 'continuous',
        text: ['强', '弱'],
        right: 30,
        dimension: 4, // 将第5个维度映射到颜色
        min: 0.25,
        max: 1,
        textStyle: {
          color: '#fff',
        },
        inRange: {
          color: [
            '#313695',
            '#4575b4',
            '#74add1',
            '#abd9e9',
            '#fdae61',
            '#f46d43',
            '#d73027',
            '#a50026',
          ],
        },
        ...mobileOptions.visualMap?.[0],
      },
    ],
    globe: {
      environment: '#000',
      baseColor: '#000', // 使用纯色替代纹理
      shading: 'color', // 使用简单着色模式
      displacementScale: 0,
      displacementQuality: 'medium',
      realisticMaterial: {
        roughness: 0.8,
        metalness: 0,
      },
      postEffect: {
        enable: !isMobile.value, // 移动端禁用后期效果提升性能
        bloom: {
          enable: !isMobile.value,
          bloomIntensity: 0.2,
        },
        SSAO: {
          enable: !isMobile.value,
          quality: 'medium',
          radius: 2,
        },
      },
      temporalSuperSampling: {
        enable: !isMobile.value, // 移动端禁用超采样
      },
      light: {
        ambient: {
          intensity: 0.3,
        },
        main: {
          intensity: 2.0,
          shadow: !isMobile.value, // 移动端禁用阴影提升性能
        },
      },
      viewControl: {
        autoRotate: false,
        autoRotateSpeed: 5,
        alpha: 30,
        beta: 160,
        targetCoord: [110, 20],
        distance: 1.8,
        ...mobileOptions.globe?.viewControl,
        // 添加视图事件监听
        onViewChange: function (e) {
          handleViewChange(e)
        },
      },
    },
    series: [
      {
        type: 'scatter3D',
        coordinateSystem: 'globe',
        blendMode: 'lighter',
        symbolSize: 3.5, // 增大点的大小使其更明显
        progressive: 20000,
        progressiveThreshold: 50000,
        itemStyle: {
          opacity: 0.7, // 增加不透明度
        },
        dimensions: [
          'lng',
          'lat',
          'depth',
          'magnitude',
          'magnitudeNorm',
          'timestamp',
          'date',
          'magnitudeLabel',
        ],
        data: [],
        animation: false,
        emphasis: {
          itemStyle: {
            opacity: 0.9,
            borderWidth: 1,
            borderColor: '#fff',
          },
        },
        encode: {
          tooltip: [6, 7, 2],
        },
        ...mobileOptions.series?.[0],
      },
    ],
  }
}

// 更新LOD设置
function updateLodSettings() {
  if (!chart) return

  // 如果禁用LOD，重新加载原始数据
  if (!enableLod.value) {
    currentLodLevel.value = 1
    updateVisualization(getCurrentTimestamp())
    return
  }

  // 获取当前视图状态
  const viewControl = chart.getOption().globe[0].viewControl
  if (viewControl) {
    applyLodByDistance(viewControl.distance)
  }
}

// 根据观察距离应用LOD
function applyLodByDistance(distance) {
  if (!enableLod.value) return 1

  let lodLevel = 1
  let lodStep = 1

  for (let i = 0; i < LOD_LEVELS.length; i++) {
    if (distance <= LOD_LEVELS[i].distance) {
      lodStep = LOD_LEVELS[i].step
      lodLevel = i + 1
      break
    }
  }

  // 避免不必要的更新
  if (currentLodStep !== lodStep) {
    currentLodStep = lodStep
    currentLodLevel.value = lodLevel

    // 重新应用过滤
    if (filteredData.length > 0) {
      reloadWithCurrentLod()
    }
  }

  return lodStep
}

// 使用当前LOD级别重新加载数据
function reloadWithCurrentLod() {
  if (!worker || allEarthquakeData.length === 0) return

  const timestamp = getCurrentTimestamp()
  loadFilteredDataFromWorker(timestamp)
}

// 处理视图变化事件
function handleViewChange(e) {
  if (!chart || !enableLod.value) return

  // 防抖：仅当距离变化明显时更新
  const distanceThreshold = 0.1
  const distance = e.viewGL?.camera?.viewDistance || e.viewGL?.camera?.distance || null

  if (distance && Math.abs(distance - lastDistanceLevel) > distanceThreshold) {
    lastDistanceLevel = distance
    applyLodByDistance(distance)
  }

  // 更新FPS
  updateFps()
}

// 更新FPS统计
function updateFps() {
  if (!showStats.value) return

  const now = performance.now()
  frameCount++

  if (now - fpsTime >= 1000) {
    fps.value = Math.round((frameCount * 1000) / (now - fpsTime))
    frameCount = 0
    fpsTime = now

    // 同时更新显示的点数
    renderedPoints.value = filteredData.length
    totalPoints.value = allEarthquakeData.length
  }
}

// 获取当前时间戳
function getCurrentTimestamp() {
  if (allEarthquakeData.length === 0) return START_DATE

  const progress = timeProgress.value / 100
  const minTime = allEarthquakeData[0][5]
  const maxTime = allEarthquakeData[allEarthquakeData.length - 1][5]
  return minTime + progress * (maxTime - minTime)
}

// 新增：处理手动输入
function handleManualInput() {
  isManualChange = true
  onTimelineChange()
}

// 从Worker加载过滤后的数据
function loadFilteredDataFromWorker(timestamp) {
  if (!worker) return

  worker.postMessage({
    type: 'generateBatch',
    data: {
      startIndex: 0,
      count: TOTAL_EARTHQUAKES,
      totalEarthquakes: TOTAL_EARTHQUAKES,
      startDate: START_DATE,
      dateRange: DATE_RANGE,
      isMobile: isMobile.value,
      lodStep: currentLodStep,
    },
  })
}

// 根据时间戳更新可视化
function updateVisualization(timestamp) {
  if (!worker) {
    // 如果worker不可用，使用主线程过滤
    const data = allEarthquakeData.filter((item) => item[5] <= timestamp)
    updateChart(data)
    return
  }

  worker.postMessage({
    type: 'filterByTime',
    data: {
      allData: allEarthquakeData,
      timestamp,
    },
  })
}

// 更新图表数据
function updateChart(data) {
  if (!chart) return

  filteredData = data

  // 获取当前日期
  if (filteredData.length > 0) {
    const lastItem = filteredData[filteredData.length - 1]
    currentTimeLabel.value = lastItem[6] // 使用格式化的日期
  }

  // 更新图表数据
  chart.setOption({
    series: [
      {
        data: filteredData,
      },
    ],
  })

  // 更新统计信息
  renderedPoints.value = filteredData.length
}

// 处理时间轴变化
function onTimelineChange() {
  const timestamp = getCurrentTimestamp()
  updateVisualization(timestamp)

  // 只有在手动调整且正在播放时才暂停
  if (isManualChange && isPlaying.value) {
    togglePlayback()
  }

  // 重置标志
  isManualChange = false
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

// 处理窗口大小变化
function handleResize() {
  checkMobile() // 检查设备类型
  chart && chart.resize()
}

// 初始化Worker事件监听
function setupWorkerListeners() {
  if (!worker) return

  worker.onmessage = function (e) {
    const { type, data } = e.data

    if (type === 'batchGenerated') {
      // 初始加载数据
      allEarthquakeData = data
      totalPoints.value = data.length

      // 设置初始视图
      const startTimestamp = data[0][5]
      updateVisualization(startTimestamp)

      // 更新加载状态
      chart.setOption({
        title: {
          subtext: '拖动时间轴或点击播放来查看地震演变',
        },
      })
    } else if (type === 'dataFiltered') {
      updateChart(data)
    }
  }

  worker.onerror = function (e) {
    console.error('Worker error:', e)
  }
}

// 开始加载数据（使用Worker）
function fetchDataWithWorker() {
  // 显示加载状态
  chart.setOption({
    title: {
      subtext: '正在生成地震数据...',
    },
  })

  // 使用Worker生成所有数据
  worker.postMessage({
    type: 'generateBatch',
    data: {
      startIndex: 0,
      count: TOTAL_EARTHQUAKES,
      totalEarthquakes: TOTAL_EARTHQUAKES,
      startDate: START_DATE,
      dateRange: DATE_RANGE,
      isMobile: isMobile.value,
      lodStep: currentLodStep,
    },
  })
}

// 启动性能监控
function startPerformanceMonitoring() {
  if (!showStats.value) return

  fpsTime = performance.now()
  frameCount = 0

  // 定期更新FPS即使没有视图变化
  setInterval(() => {
    updateFps()
  }, 1000)
}

onMounted(() => {
  // 检查设备类型
  checkMobile()

  if (chartRef.value) {
    // 初始化图表
    chart = echarts.init(chartRef.value, null, {
      renderer: 'webgl',
      useDirtyRect: false,
    })

    // 设置初始选项
    chart.setOption(getOption())

    // 设置Worker监听器
    if (worker) {
      setupWorkerListeners()
      fetchDataWithWorker()
    } else {
      // 如果Worker不可用，回退到传统方法
      console.warn('Web Worker不可用，使用主线程处理数据')
      chart.setOption({
        title: {
          subtext: 'Web Worker不可用，性能可能受限',
        },
      })
    }

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)

    // 启动性能监控
    startPerformanceMonitoring()
  }
})

onUnmounted(() => {
  // 清除定时器
  if (playbackInterval) {
    clearInterval(playbackInterval)
  }

  // 移除事件监听
  window.removeEventListener('resize', handleResize)

  // 销毁Mock
  mock.restore()

  // 终止Worker
  if (worker) {
    worker.terminate()
    worker = null
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

  .time-control {
    flex-wrap: wrap;

    .time-label {
      width: auto !important;
      margin-right: 8px !important;
      font-size: 14px !important;
    }

    button {
      padding: 6px 12px !important;
      font-size: 12px !important;
      margin-right: 8px !important;
    }

    input[type='range'] {
      width: 100%;
      margin-top: 8px;
    }
  }

  .legend {
    .legend-title {
      font-size: 12px !important;
    }

    .legend-items {
      gap: 5px !important;
    }

    .legend-item {
      margin-right: 5px !important;

      .color-box {
        width: 12px !important;
        height: 12px !important;
      }

      .legend-label {
        font-size: 10px !important;
      }
    }
  }

  .stats {
    font-size: 10px !important;
    padding: 5px 8px !important;
    top: 5px !important;
    right: 5px !important;
  }
}

// 添加触摸优化
@media (pointer: coarse) {
  .time-control {
    input[type='range'] {
      height: 20px !important;
    }

    button {
      padding: 10px 15px !important;
    }
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

.stats {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8px 12px;
  border-radius: 5px;
  font-family: monospace;
  font-size: 12px;
  z-index: 10;
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

.time-control {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 10px;

  .time-label {
    color: #fff;
    font-size: 16px;
    margin-right: 15px;
    width: 100px;
  }

  button {
    background: #1a73e8;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 15px;
    font-size: 14px;

    &:hover {
      background: #1557b0;
    }
  }

  input[type='range'] {
    flex-grow: 1;
    height: 8px;
  }
}

.settings-row {
  display: flex;
  width: 100%;
  margin-bottom: 10px;
  justify-content: flex-start;
  gap: 15px;

  label {
    color: #fff;
    font-size: 14px;
    display: flex;
    align-items: center;
    cursor: pointer;

    input {
      margin-right: 5px;
    }
  }
}

.legend {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;

  .legend-title {
    color: #fff;
    margin-bottom: 10px;
    font-size: 14px;
  }

  .legend-items {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    margin-right: 10px;

    .color-box {
      width: 15px;
      height: 15px;
      display: inline-block;
      margin-right: 5px;
    }

    .legend-label {
      color: #fff;
      font-size: 12px;
    }
  }
}

// 添加触摸事件优化
* {
  touch-action: manipulation;
}

// 添加移动端viewport设置
html {
  font-size: 16px;
}

// 添加移动端适配
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
