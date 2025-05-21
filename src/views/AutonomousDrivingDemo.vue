<template>
  <div class="detection-demo">
    <div class="road-view" ref="roadView">
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

// 道路视图元素的引用，用于获取视图尺寸和处理事件
const roadView = ref(null)

// 检测到的物体数据，包含位置、尺寸、类型和置信度信息
const detectedObjects = ref([
  {
    type: 'car',
    x: 150,
    y: 120,
    width: 120,
    height: 70,
    confidence: 0.92,
    direction: 1, // 移动方向：1表示向右，-1表示向左
  },
  {
    type: 'car', // 物体类型：汽车
    x: 350,
    y: 150,
    width: 100,
    height: 60,
    confidence: 0.88,
    direction: -1, // 向左移动
  },
  {
    type: 'person', // 物体类型：行人
    x: 280,
    y: 200,
    width: 40,
    height: 80,
    confidence: 0.75,
    direction: 1, // 向右移动
  },
  {
    type: 'person', // 物体类型：行人
    x: 120,
    y: 220,
    width: 30,
    height: 70,
    confidence: 0.81,
    direction: -1, // 向左移动
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

// 模拟物体移动动画
// 根据物体类型和方向更新位置，并在碰到边缘时改变方向
function animateObjects() {
  detectedObjects.value.forEach((obj) => {
    // 根据物体类型和方向更新水平位置
    // 汽车移动速度是行人的2倍
    obj.x += obj.direction * (obj.type === 'car' ? 2 : 1)

    // 边界检测 - 当碰到视图边缘时改变方向
    if (roadView.value) {
      // 计算视图右边界位置（考虑物体宽度）
      const maxX = roadView.value.clientWidth - obj.width
      if (obj.x > maxX) {
        // 到达右边界，位置修正并反向移动
        obj.x = maxX
        obj.direction = -1
      } else if (obj.x < 0) {
        // 到达左边界，位置修正并反向移动
        obj.x = 0
        obj.direction = 1
      }
    }
  })

  // 位置更新后，同步更新地图上的物体位置
  updateMapObjects()
}

onMounted(() => {
  updateMapObjects()

  animationInterval = setInterval(animateObjects, 50)

  window.addEventListener('resize', updateMapObjects)
})

onUnmounted(() => {
  clearInterval(animationInterval)
  window.removeEventListener('resize', updateMapObjects)
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
  background-color: #333;
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.3)),
    linear-gradient(90deg, transparent 80%, #555 80%, #555 100%),
    linear-gradient(90deg, #555 0%, #555 20%, transparent 20%),
    linear-gradient(#fff 50%, transparent 50%);
  background-size:
    auto,
    20%,
    20%,
    50px 10px;
  background-position:
    0 0,
    0 0,
    0 0,
    center;
  background-repeat: no-repeat, repeat-y, repeat-y, repeat-x;
  overflow: hidden;
}
.detection-box {
  position: absolute;
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
.car {
  border-color: #42b983;
  background-color: rgba(66, 185, 131, 0.2);
}
.car .label {
  background-color: #42b983;
}
.person {
  border-color: #f59e42;
  background-color: rgba(245, 158, 66, 0.2);
}
.person .label {
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
.map-object.car {
  background-color: #42b983;
}
.map-object.person {
  background-color: #f59e42;
}
</style>
