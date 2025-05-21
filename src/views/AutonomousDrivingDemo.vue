<template>
  <div class="detection-demo">
    <div class="road-view" ref="roadView">
      <!-- 地图容器 -->
      <div id="map" class="map-view"></div>
      <!-- 检测框 - 用于显示识别到的物体 -->
      <div
        v-for="(object, index) in detectedObjects"
        :key="index"
        class="detection-box"
        :class="object.type"
        :style="{
          left: `${object.x}px`,
          top: `${object.y}px`,
          width: `${object.width}px`,
          height: `${object.height}px`,
        }"
      >
        <div class="label">{{ object.type }} {{ Math.round(object.confidence * 100) }}%</div>
      </div>
    </div>
    <div class="map-container">
      <div class="map">
        <div class="car-position"></div>
        <div
          v-for="(object, index) in mapObjects"
          :key="index"
          class="map-object"
          :class="object.type"
          :style="{ left: `${object.x}%`, top: `${object.y}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, defineOptions } from 'vue'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// 道路视图元素的引用，用于获取视图尺寸和处理事件
const roadView = ref(null)
let map = null
let markers = [] // 存储所有标记点
let boundaryRect = null // 边界矩形
let centerMarker = null // 中心标记点

// 定义检测区域的边界（以上海某个区域为例）
const BOUNDARY = {
  northEast: [31.2354, 121.4787], // 东北角
  southWest: [31.2254, 121.4687], // 西南角
  center: [31.2304, 121.4737], // 中心点
}

// 检测到的物体数据，包含位置、尺寸、类型和置信度信息
const detectedObjects = ref([
  {
    type: '高速无人机',
    x: 150,
    y: 120,
    width: 120,
    height: 70,
    confidence: 0.92,
    direction: 1,
    latlng: [31.2304, 121.4737],
  },
  {
    type: '高速无人机',
    x: 350,
    y: 150,
    width: 120,
    height: 70,
    confidence: 0.88,
    direction: -1,
    latlng: [31.2314, 121.4747],
  },
  {
    type: '低速无人机',
    x: 280,
    y: 200,
    width: 120,
    height: 70,
    confidence: 0.75,
    direction: 1,
    latlng: [31.2294, 121.4757],
  },
  {
    type: '低速无人机',
    x: 120,
    y: 220,
    width: 120,
    height: 70,
    confidence: 0.81,
    direction: -1,
    latlng: [31.2284, 121.4727],
  },
])
// 地图对象数据 - 检测物体在地图上的简化表示
const mapObjects = ref([])

// 根据检测到的物体更新地图对象
// 将道路视图中的像素坐标转换为地图中的百分比坐标
function updateMapObjects() {
  // 如果道路视图引用不存在，则直接返回
  if (!roadView.value) return

  // 获取道路视图的尺寸
  const viewWidth = roadView.value.clientWidth
  const viewHeight = roadView.value.clientHeight
  console.log(boundaryRect)
  // 遍历所有检测物体，转换坐标系统
  mapObjects.value = detectedObjects.value.map((obj) => {
    // 将像素坐标转换为地图上的百分比坐标
    // 这样可以在不同屏幕尺寸上保持一致的显示效果
    return {
      type: obj.type, // 保留物体类型
      x: (obj.x / viewWidth) * 100, // 转换为宽度百分比
      y: (obj.y / viewHeight) * 100, // 转换为高度百分比
    }
  })
}

// 动画定时器ID，用于在组件卸载时清除
let animationInterval = null

// 将地理坐标转换为屏幕坐标
function geoToScreen(latlng) {
  if (!map) return null
  const point = map.latLngToContainerPoint(L.latLng(latlng))
  return { x: point.x, y: point.y }
}

// 检查点是否在道路上
async function isOnRoad() {
  // 这里可以使用 Overpass API 或其他地图服务来检查点是否在道路上
  // 现在先返回 true，后续可以添加实际的道路检查逻辑
  return true
}

// 检查点是否在边界内 - 考虑物体的宽度和高度
function isInBoundary(latlng, obj) {
  if (!boundaryRect || !map) return false

  // 将地理坐标转换为屏幕坐标
  const screenPos = geoToScreen(latlng)
  if (!screenPos) return false

  // 获取绿色矩形边界的屏幕坐标
  const bounds = boundaryRect.getBounds()
  const northEast = map.latLngToContainerPoint(bounds.getNorthEast())
  const southWest = map.latLngToContainerPoint(bounds.getSouthWest())

  // 计算边界矩形的宽度和高度
  const rectWidth = northEast.x - southWest.x
  const rectHeight = southWest.y - northEast.y

  // 考虑物体的宽度和高度，确保物体的右下角也在边界内
  return (
    screenPos.x >= southWest.x &&
    screenPos.y >= northEast.y &&
    screenPos.x + obj.width <= southWest.x + rectWidth &&
    screenPos.y + obj.height <= northEast.y + rectHeight
  )
}

// 模拟物体移动动画
async function animateObjects() {
  for (let i = 0; i < detectedObjects.value.length; i++) {
    const obj = detectedObjects.value[i]
    const marker = markers[i]

    const latOffset = obj.direction * (obj.type === 'car' ? 0.0001 : 0.00005)
    const lngOffset = obj.direction * (obj.type === 'car' ? 0.00015 : 0.000075)
    const newLatlng = [obj.latlng[0] + latOffset, obj.latlng[1] + lngOffset]

    // 检查是否在地图视图边界中（考虑 obj 宽高）
    if (isInBoundary(newLatlng, obj) && (await isOnRoad())) {
      obj.latlng = newLatlng
      marker.setLatLng(newLatlng)

      const screenPos = geoToScreen(newLatlng)
      if (screenPos) {
        obj.x = screenPos.x
        obj.y = screenPos.y
      }
    } else {
      obj.direction *= -1
    }
  }

  updateMapObjects()
}

// 创建自定义图标
function createIcon(type) {
  const color = type === '高速无人机' ? '#42b983' : '#f59e42'
  return L.divIcon({
    className: `detection-marker ${type}`,
    html: `<div style="background-color: ${color}"></div>`,
    iconSize: type === '高速无人机' ? [24, 24] : [16, 16],
  })
}

// 初始化地图标记
function initializeMarkers() {
  // 清除现有标记
  markers.forEach((marker) => marker.remove())
  markers = []

  // 为每个检测对象创建标记
  detectedObjects.value.forEach((obj) => {
    const marker = L.marker(obj.latlng, {
      icon: createIcon(obj.type),
    }).addTo(map)
    markers.push(marker)
  })

  // 添加中心标记
  if (centerMarker) centerMarker.remove()
  centerMarker = L.marker(BOUNDARY.center, {
    icon: L.divIcon({
      className: 'center-marker',
      html: '<div></div>',
      iconSize: [32, 32],
    }),
  }).addTo(map)

  // 添加边界矩形
  if (boundaryRect) boundaryRect.remove()
  boundaryRect = L.rectangle([BOUNDARY.southWest, BOUNDARY.northEast], {
    color: '#42b983',
    weight: 2,
    fillColor: '#42b983',
    fillOpacity: 0.1,
  }).addTo(map)
}

// 获取绿色矩形边界的宽度和高度
function getRectangleDimensions() {
  if (!boundaryRect || !map) return { width: 0, height: 0 }

  const bounds = boundaryRect.getBounds()
  const northEast = map.latLngToContainerPoint(bounds.getNorthEast())
  const southWest = map.latLngToContainerPoint(bounds.getSouthWest())

  const width = northEast.x - southWest.x
  const height = southWest.y - northEast.y

  console.log('绿色边界矩形尺寸:', { width, height, bounds })
  return { width, height }
}

onMounted(() => {
  // 初始化地图
  map = L.map('map', {
    center: BOUNDARY.center,
    zoom: 16,
    zoomControl: false,
  })

  // 添加高德地图切片图层
  L.tileLayer(
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    {
      attribution: '© 高德地图',
      maxZoom: 19,
      subdomains: '1234',
    },
  ).addTo(map)

  // 初始化标记
  initializeMarkers()

  // 获取绿色边界信息
  getRectangleDimensions()

  // 设置地图边界
  map.setMaxBounds([
    [BOUNDARY.southWest[0] - 0.01, BOUNDARY.southWest[1] - 0.01],
    [BOUNDARY.northEast[0] + 0.01, BOUNDARY.northEast[1] + 0.01],
  ])

  updateMapObjects()
  animationInterval = setInterval(animateObjects, 50)
  window.addEventListener('resize', updateMapObjects)
})

onUnmounted(() => {
  clearInterval(animationInterval)
  window.removeEventListener('resize', updateMapObjects)
  if (map) {
    map.remove()
    map = null
  }
})

defineOptions({
  name: 'auto-a',
})
</script>
<style scoped>
.detection-demo {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: #222;
}
.road-view {
  flex: 3;
  position: relative;
  overflow: hidden;
}

.map-view {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
.detection-box {
  position: absolute;
  z-index: 999;
  border: 2px solid;
  border-radius: 3px;
  box-sizing: border-box;
  opacity: 0.7;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}
.label {
  background-color: inherit;
  color: white;
  font-size: 12px;
  padding: 2px 5px;
  border-radius: 3px;
  margin-top: -20px;
  white-space: nowrap;
}
.高速无人机 {
  border-color: #42b983;
  background-color: rgba(66, 185, 131, 0.2);
}
.高速无人机 .label {
  background-color: #42b983;
}
.低速无人机 {
  border-color: #f59e42;
  background-color: rgba(245, 158, 66, 0.2);
}
.低速无人机 .label {
  background-color: #f59e42;
}
.map-container {
  flex: 1;
  background-color: #333;
  padding: 10px;
  border-top: 1px solid #555;
}
.map {
  height: 100%;
  background-color: #1a1a1a;
  border-radius: 5px;
  position: relative;
  background-image:
    linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px);
  background-size: 20px 20px;
}
.car-position {
  position: absolute;
  width: 15px;
  height: 15px;
  background-color: #42b983;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px #42b983;
}
.map-object {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.map-object.高速无人机 {
  background-color: #42b983;
}
.map-object.低速无人机 {
  background-color: #f59e42;
}

/* 修复 Leaflet 图标问题 */
.leaflet-default-icon-path {
  background-image: url('https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png');
}

.leaflet-control-container .leaflet-control {
  z-index: 3;
}

/* 自定义标记样式 */
.detection-marker {
  border: none;
  background: none;
}

.detection-marker div {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

.detection-marker.高速无人机 div {
  background-color: rgba(66, 185, 131, 0.7);
}

.detection-marker.低速无人机 div {
  background-color: rgba(245, 158, 66, 0.7);
}

.center-marker {
  border: none;
  background: none;
}

.center-marker div {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid #42b983;
  box-shadow: 0 0 15px rgba(66, 185, 131, 0.5);
  background-color: rgba(66, 185, 131, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  70% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(0.8);
    opacity: 1;
  }
}
</style>
