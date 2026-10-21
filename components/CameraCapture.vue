<template>
  <div class="fixed inset-0 flex flex-col items-center justify-center pointer-events-auto z-10">
    <!-- Camera View with CCTV Overlay -->
    <div class="relative w-full max-w-2xl rounded-lg">
      <!-- Viewfinder Frame -->
      <div class="absolute inset-0 pointer-events-none z-10">
        <div class="absolute inset-8 border-4 border-red-500/50 rounded-lg">
          <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500"></div>
          <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500"></div>
          <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500"></div>
          <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500"></div>
        </div>
        
        <!-- CCTV Style Label -->
        <div class="absolute top-4 left-4 bg-red-600 px-3 py-1 text-white text-xs font-mono">
          <span class="inline-block w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
          REC
        </div>
        
        <!-- Capture Instructions -->
        <div class="absolute bottom-4 left-0 right-0 text-center">
          <p class="text-white text-sm bg-black/50 px-4 py-2 inline-block rounded-lg">
            Position yourself in the frame
          </p>
        </div>
      </div>
      
      <video
        ref="videoRef"
        class="w-full h-auto rounded-lg opacity-70"
        autoplay
        playsinline
      ></video>
    </div>
    
    <!-- Capture Button -->
    <div class="mt-8 relative z-20">
      <button
        @click="captureImage"
        :disabled="loading"
        class="relative group"
      >
        <!-- Outer Ring -->
        <div class="w-24 h-24 rounded-full border-4 border-white/50 flex items-center justify-center group-hover:border-red-500 transition-colors">
          <!-- Inner Button -->
          <div class="w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-700 transition-colors flex items-center justify-center">
            <span v-if="loading" class="text-white text-xs">...</span>
          </div>
        </div>
      </button>
      
      <p class="text-white text-sm mt-4 text-center">
        {{ loading ? 'Processing...' : 'Click to capture' }}
      </p>
    </div>
    
    <!-- Hidden Canvas -->
    <canvas ref="canvasRef" class="hidden"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const videoRef = ref(null)
const canvasRef = ref(null)
const loading = ref(false)
let stream = null

const emit = defineEmits(['imageCaptured'])

onMounted(async () => {
  try {
    // Request camera access
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user', // Front camera
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    })
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }
  } catch (error) {
    console.error('Error accessing camera:', error)
    alert('Unable to access camera. Please grant camera permissions.')
  }
})

onBeforeUnmount(() => {
  stopCamera()
})

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
}

async function captureImage() {
  if (!videoRef.value || !canvasRef.value || loading.value) return
  
  loading.value = true
  
  try {
    const video = videoRef.value
    const canvas = canvasRef.value
    
    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw current video frame to canvas
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Convert to base64 and hand it to the app, which sends it to the API
    const base64Image = canvas.toDataURL('image/jpeg', 0.9)
    emit('imageCaptured', base64Image)
  } catch (error) {
    console.error('Error capturing image:', error)
    alert('Failed to capture image. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
video {
  transform: scaleX(-1); /* Mirror the video for selfie effect */
}
</style>
