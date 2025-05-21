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
import { defineOptions, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'App',
})

const router = useRouter()
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
])
const selected = ref(selectList.value[0].path)

watch(selected, (val) => {
  router.push(val)
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
