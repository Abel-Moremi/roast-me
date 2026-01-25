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
import { ref, onMounted, onBeforeUnmount, defineEmits } from 'vue'

const videoRef = ref(null)
const canvasRef = ref(null)
const loading = ref(false)
let stream = null

const emit = defineEmits(['imageCaptured', 'roastReceived'])
const { loadMockData } = useMockRoast()

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
    
    // Convert to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.9)
    
    // Send to API
    await sendToAPI(base64Image)
    
    emit('imageCaptured', base64Image)
  } catch (error) {
    console.error('Error capturing image:', error)
    alert('Failed to capture image. Please try again.')
  } finally {
    loading.value = false
  }
}

async function sendToAPI(base64Image) {
  try {
    // Mock API endpoint - replace with your actual endpoint
    const response = await fetch('https://your-api-endpoint.com/roast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image
      })
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('API Response:', data)
    
    // Emit the response data
    emit('roastReceived', data)
    
  } catch (error) {
    console.error('Error sending to API:', error)
    // For now, use mock response from mock/output.txt
    console.log('Using mock response for development')
    
    // Load actual mock data from file
    const mockResponse = await loadMockData()
    
    if (mockResponse) {
      console.log('Mock data loaded successfully')
      console.log('Audio field exists:', !!mockResponse.audio)
      console.log('Audio length:', mockResponse.audio?.length || 0)
      emit('roastReceived', mockResponse)
    } else {
      console.error('Failed to load mock data from file')
      // Fallback mock response if file loading fails
      const fallbackResponse = {
        success: true,
        data: {
          confidence_rating: 10,
          one_liner: "You look like a Muppet that's been through a dryer on the 'high heat' setting for three days straight.",
          overall_vibe: "A chaotic, high-energy ball of red yarn having an existential crisis in a blank void.",
          roast_lines: [
            "Look at that mouth... it's not even a smile, it's just a structural failure... a total black hole right in the middle of your face.",
            "Your eyes are doing that thing where one's looking at me... and the other's looking for a better career path.",
          ],
          style_tags: ["chaotic", "fuzzy", "existential", "loud"]
        },
        audioMimeType: "audio/L16;codec=pcm;rate=24000",
        audio: null
      }
      emit('roastReceived', fallbackResponse)
    }
  }
}
</script>

<style scoped>
video {
  transform: scaleX(-1); /* Mirror the video for selfie effect */
}
</style>
