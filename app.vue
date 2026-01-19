<template>
  <div class="w-screen h-screen bg-black dark:bg-gray-950">
    <NuxtRouteAnnouncer />
    <ClientOnly>
      <ThreeScene :width="windowWidth" :height="windowHeight" />
    </ClientOnly>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const windowWidth = ref(800)
const windowHeight = ref(600)

const updateDimensions = () => {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
}

onMounted(() => {
  updateDimensions()
  window.addEventListener('resize', updateDimensions)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateDimensions)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
