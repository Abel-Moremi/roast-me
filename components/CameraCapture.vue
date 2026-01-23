<template>
  <div class="fixed inset-0 flex flex-col items-center justify-center bg-black">
    <!-- Camera View -->
    <div class="relative w-full h-full max-w-4xl">
      <video
        ref="videoRef"
        class="w-full h-full object-cover"
        autoplay
        playsinline
      ></video>
      
      <!-- Overlay UI -->
      <div class="absolute inset-0 pointer-events-none">
        <!-- Top Bar -->
        <div class="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <h1 class="text-white text-2xl font-bold text-center">Roast Me</h1>
        </div>
        
        <!-- Capture Frame -->
        <div class="absolute inset-0 flex items-center justify-center p-8">
          <div class="w-full max-w-md aspect-square border-4 border-white/30 rounded-lg"></div>
        </div>
      </div>
      
      <!-- Bottom Controls -->
      <div class="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/50 to-transparent pointer-events-auto">
        <div class="flex items-center justify-center gap-4">
          <!-- Capture Button -->
          <button
            @click="captureImage"
            :disabled="loading"
            class="w-20 h-20 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 active:scale-95 transition-transform disabled:opacity-50"
          >
            <div class="w-full h-full rounded-full bg-red-500"></div>
          </button>
        </div>
        
        <!-- Loading State -->
        <div v-if="loading" class="mt-4 text-center">
          <p class="text-white text-lg">Processing your roast...</p>
        </div>
      </div>
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
      emit('roastReceived', mockResponse)
    } else {
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
