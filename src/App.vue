<template>
  <router-view />
</template>

<script setup>
import { defineOptions } from 'vue'

defineOptions({
  name: 'App',
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
</style>
