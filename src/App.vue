<template>
  <router-view />
  <div class="select">
    <select v-model="selected" class="select-item">
      <option v-for="item in selectList" :key="item.name" :value="item.path">
        {{ item.title }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { defineOptions, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

defineOptions({
  name: 'App',
})

const router = useRouter()
const route = useRoute()
const selectList = ref([
  {
    title: '图表',
    name: 'echarts-main',
    path: '/echarts',
  },
  {
    title: '自动驾驶',
    name: 'auto-a',
    path: '/auto',
  },
  {
    title: '卫星地图',
    name: 'satellite-map',
    path: '/satellite-map',
  },
])
const selected = ref('')

// 初始化时设置 selected
onMounted(() => {
  selected.value = route.path
})

// 监听路由变化，动态更新 selected
watch(
  () => route.path,
  (val) => {
    selected.value = val
  },
)

// 监听 select 变化，跳转路由
watch(selected, (val) => {
  if (val !== route.path) {
    router.push(val)
  }
})
</script>

<style lang="scss">
html {
  font-size: 16px;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.select {
  width: 140px;
  height: 30px;
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 1000;
  .select-item {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    text-align: center;
  }
}
</style>
