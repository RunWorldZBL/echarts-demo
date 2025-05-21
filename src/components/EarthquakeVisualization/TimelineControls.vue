<template>
  <div class="time-control">
    <span class="time-label">{{ currentTime }}</span>
    <button @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</button>
    <input type="range" min="0" max="100" :value="timeProgress" @input="handleInput" />
  </div>
</template>

<script setup>
import { defineEmits, defineProps } from 'vue'

defineProps({
  currentTime: {
    type: String,
    required: true,
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
  timeProgress: {
    type: Number,
    required: true,
  },
  playbackSpeed: {
    type: Number,
    default: 0.2,
  },
})

const emit = defineEmits(['update:timeProgress', 'toggle-playback', 'manual-input'])

// 处理手动输入
function handleInput(event) {
  const value = Number(event.target.value)
  emit('update:timeProgress', value)
  emit('manual-input')
}

// 切换播放/暂停
function togglePlay() {
  emit('toggle-playback')
}
</script>

<style lang="scss" scoped>
// 添加移动设备的媒体查询
@media (max-width: 768px) {
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

.time-control {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 15px;

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
</style>
