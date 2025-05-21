import { createRouter, createWebHistory } from 'vue-router'
import echarts from '../views/echarts.vue'
import AutonomousDrivingDemo from '@/views/AutonomousDrivingDemo.vue'
import SatelliteMap from '@/views/satellite-map/satellite-map.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/auto',
    },
    {
      path: '/echarts',
      name: 'echarts-main',
      component: echarts,
    },
    {
      path: '/auto',
      name: 'auto-a',
      component: AutonomousDrivingDemo,
    },
    {
      path: '/satellite-map',
      name: 'satellite-map',
      component: SatelliteMap,
    },
  ],
})

export default router
