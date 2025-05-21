import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

// Constants
export const TOTAL_EARTHQUAKES = 100000 // 十万次地震数据
export const BATCH_SIZE = 1000000 // 每批次请求的地震数量
export const TOTAL_BATCHES = Math.ceil(TOTAL_EARTHQUAKES / BATCH_SIZE)
export const START_DATE = new Date('2023-01-01').getTime()
export const END_DATE = new Date('2023-12-31').getTime()
export const DATE_RANGE = END_DATE - START_DATE

// 重要地震带区域（环太平洋火山带、地中海-喜马拉雅带等）
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
]

// 计算点是否在地震带区域内及其强度权重
function getLocationWeight(lat, lng) {
  let maxWeight = 0

  for (const zone of EARTHQUAKE_ZONES) {
    // 简单的球面距离计算（不精确但足够用于可视化）
    const distance = Math.sqrt(
      Math.pow((lat - zone.lat) * Math.cos((lat * Math.PI) / 180), 2) + Math.pow(lng - zone.lng, 2),
    )

    if (distance < zone.radius) {
      const weight = zone.intensity * (1 - distance / zone.radius)
      maxWeight = Math.max(maxWeight, weight)
    }
  }

  return maxWeight > 0 ? maxWeight : 0.05 // 小概率的随机地震
}

// 格式化日期
export function formatDate(date) {
  return date.getFullYear() + '-' + padZero(date.getMonth() + 1) + '-' + padZero(date.getDate())
}

function padZero(num) {
  return num < 10 ? '0' + num : num
}

// 设置模拟数据
export function setupMockData(isMobile) {
  const mock = new MockAdapter(axios)

  mock.onGet(/\/api\/earthquakes\/batch\/\d+/).reply((config) => {
    const batchNumber = parseInt(config.url.split('/').pop())

    if (batchNumber >= TOTAL_BATCHES) {
      return [200, []]
    }

    const data = []
    const startIndex = batchNumber * BATCH_SIZE
    const endIndex = Math.min(startIndex + BATCH_SIZE, TOTAL_EARTHQUAKES)

    // 对于移动设备，减少每批次数据量以提高性能
    const stride = isMobile ? 5 : 1

    for (let i = startIndex; i < endIndex; i += stride) {
      // 基于索引生成伪随机但确定的数据
      const seed = i * 0.1

      // 生成地理位置（更偏向地震带）
      let lat, lng, locationWeight

      // 使用拒绝采样法生成更符合实际地震分布的位置
      do {
        lat = (Math.sin(seed * 7.3) * 0.5 + Math.sin(seed * 3.1) * 0.5) * 75
        lng = (Math.cos(seed * 5.2) * 0.5 + Math.cos(seed * 2.9) * 0.5) * 180
        locationWeight = getLocationWeight(lat, lng)
      } while (Math.random() > locationWeight)

      // 时间（按顺序分布，但有随机性）
      const timeProgress = i / TOTAL_EARTHQUAKES + Math.sin(seed * 11.7) * 0.1
      const timestamp = START_DATE + timeProgress * DATE_RANGE
      const date = new Date(timestamp)

      // 深度（通常在300km以内，大部分在100km以内）
      const depth = -Math.abs(Math.pow(Math.sin(seed * 9.3), 2) * 250 + Math.random() * 50)

      // 震级（大部分在3-5之间，少数较大）
      let magnitude
      const r = Math.random()
      if (r > 0.997)
        magnitude = 7.0 + Math.random() * 2.5 // 极大地震 (0.3%)
      else if (r > 0.97)
        magnitude = 6.0 + Math.random() // 大地震 (2.7%)
      else if (r > 0.85)
        magnitude = 5.0 + Math.random() // 中等地震 (12%)
      else if (r > 0.5)
        magnitude = 4.0 + Math.random() // 小地震 (35%)
      else magnitude = 2.5 + Math.random() * 1.5 // 微小地震 (50%)

      // 提高地震带区域的震级
      magnitude += locationWeight * 0.5

      data.push([
        lng, // 经度
        lat, // 纬度
        depth, // 深度
        magnitude, // 震级 (用于大小)
        magnitude / 10, // 震级归一化 (用于颜色)
        timestamp, // 时间戳
        formatDate(date), // 格式化日期
        magnitude.toFixed(1), // 格式化震级
      ])
    }

    // 按时间排序
    data.sort((a, b) => a[5] - b[5])

    return [200, data]
  })

  return mock
}

// 根据时间戳过滤数据
export function updateDataByTime(allData, timestamp) {
  return allData.filter((item) => item[5] <= timestamp)
}

// 获取当前显示的日期标签
export function getCurrentDateLabel(filteredData) {
  if (filteredData.length > 0) {
    const lastItem = filteredData[filteredData.length - 1]
    return lastItem[6] // 使用格式化的日期
  }
  return ''
}

// 分批次加载数据
export async function fetchDataInBatches(isMobile, updateLoadingProgress) {
  let batchNumber = 0
  let totalEarthquakes = 0
  const allEarthquakeData = []

  while (true) {
    try {
      const response = await axios.get(`/api/earthquakes/batch/${batchNumber}`)
      const batchData = response.data
      console.log(response)

      if (!batchData || batchData.length === 0) {
        break
      }

      // 添加数据到内存中
      allEarthquakeData.push(...batchData)
      totalEarthquakes += batchData.length

      // 更新加载进度
      const progress = Math.min(100, Math.round((totalEarthquakes / TOTAL_EARTHQUAKES) * 100))
      updateLoadingProgress(totalEarthquakes, progress)

      // 移动端减少更新频率，稍微降低性能压力
      await new Promise((resolve) => setTimeout(resolve, isMobile ? 50 : 10))
      batchNumber++
    } catch (error) {
      console.error('加载数据错误:', error)
      break
    }
  }

  return allEarthquakeData
}
