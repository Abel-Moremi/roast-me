<template>
  <div class="fixed inset-0 flex flex-col items-center justify-center pointer-events-auto z-10 px-4">
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
        <div v-if="!previewImage" class="absolute top-4 left-4 bg-red-600 px-3 py-1 text-white text-xs font-mono">
          <span class="inline-block w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
          REC
        </div>
        <div v-else class="absolute top-4 left-4 bg-yellow-600 px-3 py-1 text-white text-xs font-mono">
          YOUR PHOTO
        </div>

        <!-- Countdown -->
        <div v-if="countdown > 0" class="absolute inset-0 flex items-center justify-center">
          <span :key="countdown" class="text-white text-8xl font-bold drop-shadow-lg countdown-pop">{{ countdown }}</span>
        </div>

        <!-- Capture Instructions -->
        <div class="absolute bottom-4 left-0 right-0 text-center px-4">
          <p class="text-white text-sm bg-black/50 px-4 py-2 inline-block rounded-lg">
            {{ frameHint }}
          </p>
        </div>
      </div>

      <!-- Review: the exact image that will be sent (not mirrored) -->
      <img
        v-if="previewImage"
        :src="previewImage"
        alt="Your photo"
        class="w-full h-auto rounded-lg"
      />

      <!-- Camera unavailable: explain and offer upload -->
      <div
        v-else-if="cameraError"
        class="w-full aspect-video rounded-lg bg-black/70 flex items-center justify-center p-8"
      >
        <p class="text-gray-300 text-sm text-center max-w-sm">{{ cameraError }}</p>
      </div>

      <video
        v-show="!previewImage && !cameraError"
        ref="videoRef"
        class="w-full h-auto rounded-lg opacity-70"
        autoplay
        playsinline
        muted
      ></video>
    </div>

    <!-- Review controls -->
    <div v-if="previewImage" class="mt-8 flex flex-col items-center gap-3 relative z-20">
      <div class="flex gap-3">
        <button
          @click="retake"
          class="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          ↺ Retake
        </button>
        <button
          @click="confirmPhoto"
          class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
        >
          🔥 Roast this photo
        </button>
      </div>
      <p class="text-gray-400 text-xs text-center max-w-xs">
        Only this single photo gets roasted. The camera turns off once you confirm.
      </p>
    </div>

    <!-- Capture controls -->
    <div v-else class="mt-8 relative z-20 flex flex-col items-center">
      <template v-if="!cameraError">
        <button
          @click="startCountdown"
          :disabled="!cameraReady || countdown > 0"
          class="relative group disabled:opacity-50"
          aria-label="Take photo"
        >
          <!-- Outer Ring -->
          <div class="w-24 h-24 rounded-full border-4 border-white/50 flex items-center justify-center group-hover:border-red-500 transition-colors">
            <!-- Inner Button -->
            <div class="w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-700 transition-colors"></div>
          </div>
        </button>

        <p class="text-white text-sm mt-4 text-center">
          {{ countdown > 0 ? 'Get ready...' : 'Click to take your photo' }}
        </p>
        <p class="text-gray-400 text-xs mt-1 text-center max-w-xs">
          You'll get a 3-second countdown, then a chance to retake.
        </p>
      </template>

      <button
        @click="fileInputRef?.click()"
        :disabled="countdown > 0"
        :class="cameraError
          ? 'px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg'
          : 'mt-3 text-gray-400 hover:text-white text-xs underline'"
        class="transition-colors"
      >
        {{ cameraError ? '📁 Upload a photo' : 'or upload a photo instead' }}
      </button>
      <p v-if="uploadError" class="text-red-400 text-xs mt-2 text-center max-w-xs">{{ uploadError }}</p>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelected"
    />

    <!-- Hidden Canvas -->
    <canvas ref="canvasRef" class="hidden"></canvas>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// Uploads are scaled down to this before sending. The backend resizes to
// 1024 anyway, so anything bigger only costs upload time.
const MAX_UPLOAD_DIMENSION = 1280
const COUNTDOWN_SECONDS = 3

const videoRef = ref(null)
const canvasRef = ref(null)
const fileInputRef = ref(null)
const cameraReady = ref(false)
const cameraError = ref(null)
const uploadError = ref(null)
const countdown = ref(0)
const previewImage = ref(null)
let stream = null
let countdownTimer = null

const emit = defineEmits(['imageCaptured'])

const frameHint = computed(() => {
  if (previewImage.value) return 'This is the photo that will be roasted'
  if (cameraError.value) return 'No camera? Upload a photo instead'
  return 'Position yourself in the frame, then snap one photo'
})

onMounted(async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user', // Front camera
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    })

    if (videoRef.value) {
      videoRef.value.onloadedmetadata = () => { cameraReady.value = true }
      videoRef.value.srcObject = stream
    }
  } catch (error) {
    console.warn('Camera unavailable:', error)
    cameraError.value = error?.name === 'NotAllowedError'
      ? 'Camera access was blocked. Allow it in your browser settings and reload, or upload a photo instead.'
      : "We couldn't open a camera on this device. You can upload a photo instead."
  }
})

onBeforeUnmount(() => {
  clearInterval(countdownTimer)
  stopCamera()
})

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
}

function startCountdown() {
  if (!cameraReady.value || countdown.value > 0) return
  uploadError.value = null
  countdown.value = COUNTDOWN_SECONDS
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
      captureFrame()
    }
  }, 1000)
}

function captureFrame() {
  const video = videoRef.value
  const canvas = canvasRef.value
  if (!video || !canvas) return

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  previewImage.value = canvas.toDataURL('image/jpeg', 0.9)
}

function retake() {
  previewImage.value = null
  uploadError.value = null
}

function confirmPhoto() {
  if (!previewImage.value) return
  // The parent unmounts this component as soon as it has a photo, which
  // stops the camera (onBeforeUnmount)
  emit('imageCaptured', previewImage.value)
}

/**
 * Load an uploaded file, scale it down and re-encode it as JPEG, so any
 * format the browser can decode is sent the same way as a camera snapshot.
 */
function handleFileSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // lets the same file be chosen again
  if (!file) return
  uploadError.value = null

  if (!file.type.startsWith('image/')) {
    uploadError.value = "That file isn't an image."
    return
  }

  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(img.width, img.height))
    const canvas = canvasRef.value
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    previewImage.value = canvas.toDataURL('image/jpeg', 0.9)
    URL.revokeObjectURL(url)
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    uploadError.value = "Couldn't read that image. Try a JPEG or PNG."
  }
  img.src = url
}
</script>

<style scoped>
video {
  transform: scaleX(-1); /* Mirror the video for selfie effect */
}

@keyframes countdown-pop {
  0% { transform: scale(1.4); opacity: 0; }
  30% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}
.countdown-pop {
  animation: countdown-pop 0.9s ease-out;
}
</style>
