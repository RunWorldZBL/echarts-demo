<template>
  <div class="detection-demo">
    <div class="road-view" ref="roadView">
      <!-- Detection Boxes -->
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
// import { ref, onMounted, onUnmounted } from 'vue' // Reference to road view elementconst roadView = ref(null)// Detected objects dataconst detectedObjects = ref([  {     type: 'car',     x: 150,     y: 120,     width: 120,     height: 70,     confidence: 0.92,    direction: 1 // direction of movement  },  {     type: 'car',     x: 350,     y: 150,     width: 100,     height: 60,     confidence: 0.88,    direction: -1  },  {     type: 'person',     x: 280,     y: 200,     width: 40,     height: 80,     confidence: 0.75,    direction: 1  },  {     type: 'person',     x: 120,     y: 220,     width: 30,     height: 70,     confidence: 0.81,    direction: -1  }])// Map objects (simplified representation of detected objects)const mapObjects = ref([])// Update map objects based on detected objectsfunction updateMapObjects() {  if (!roadView.value) return    const viewWidth = roadView.value.clientWidth  const viewHeight = roadView.value.clientHeight    mapObjects.value = detectedObjects.value.map(obj => {    // Convert road view coordinates to map coordinates (percentages)    return {      type: obj.type,      x: (obj.x / viewWidth) * 100,      y: (obj.y / viewHeight) * 100    }  })}// Animation interval IDlet animationInterval = null// Animate objects to simulate movementfunction animateObjects() {  detectedObjects.value.forEach(obj => {    // Move objects horizontally    obj.x += obj.direction * (obj.type === 'car' ? 2 : 1)        // Boundary check - reverse direction when hitting edges    if (roadView.value) {      const maxX = roadView.value.clientWidth - obj.width      if (obj.x > maxX) {        obj.x = maxX        obj.direction = -1      } else if (obj.x < 0) {        obj.x = 0        obj.direction = 1      }    }  })    // Update map objects  updateMapObjects()}onMounted(() => {  // Initialize map  updateMapObjects()    // Set up animation  animationInterval = setInterval(animateObjects, 50)    // Add resize listener to update map when window resizes  window.addEventListener('resize', updateMapObjects)})onUnmounted(() => {  // Clear animation interval  clearInterval(animationInterval)    // Remove resize listener  window.removeEventListener('resize', updateMapObjects)})
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
