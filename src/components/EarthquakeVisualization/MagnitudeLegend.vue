<template>
  <div class="legend">
    <div class="legend-title">震级</div>
    <div class="legend-items">
      <div v-for="(item, index) in legendItems" :key="index" class="legend-item">
        <span class="color-box" :style="{ backgroundColor: item.color }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

defineProps({
  legendItems: {
    type: Array,
    required: true,
  },
})
</script>

<style lang="scss" scoped>
// 添加移动设备的媒体查询
@media (max-width: 768px) {
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
</style>
