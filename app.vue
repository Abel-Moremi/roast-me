<template>
  <div class="w-screen h-screen relative overflow-hidden">
    <NuxtRouteAnnouncer />
    <ClientOnly>
      <!-- Comedy Club 3D Scene (always visible as background) -->
      <div class="absolute inset-0 z-0">
        <ComedyClubScene 
          :capturedImage="capturedImage"
          :isAnalyzing="isAnalyzing"
          :roastReady="!!roastData"
          :roastData="roastData"
          @roastFrameClicked="showRoastModal = true"
          @photoClicked="showPhotoModal = true"
        />
      </div>
      
      <!-- Vignette overlay -->
      <div class="absolute inset-0 pointer-events-none z-5" 
           style="background: radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.6) 100%);">
      </div>
      
      <!-- Camera Controls (when not captured) -->
      <CameraCapture 
        v-if="!capturedImage"
        @imageCaptured="handleImageCaptured"
        @roastReceived="handleRoastReceived"
      />
      
      <!-- Audio Controls (when roast ready) -->
      <div v-if="roastData" class="fixed bottom-8 right-8 z-20 pointer-events-auto">
        <div class="bg-black/90 backdrop-blur-md border border-red-900/70 rounded-lg p-4 shadow-2xl w-80">
          <div class="flex flex-col gap-3">
            <!-- Progress Bar -->
            <div v-if="roastData.audio" class="space-y-2">
              <div class="flex justify-between text-xs text-gray-400">
                <span>{{ formatTime(currentTime) }}</span>
                <span>{{ formatTime(duration) }}</span>
              </div>
              <div class="relative w-full h-2 bg-gray-700 rounded-full cursor-pointer" @click="seekAudio">
                <div 
                  class="absolute top-0 left-0 h-full bg-red-600 rounded-full transition-all"
                  :style="{ width: `${(currentTime / duration) * 100}%` }"
                ></div>
              </div>
            </div>
            
            <!-- Playback Controls -->
            <div v-if="roastData.audio" class="flex items-center justify-center gap-2">
              <button 
                @click="skipBackward"
                :disabled="audioLoading || !duration"
                class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Rewind 10s"
              >
                ⏪ 10s
              </button>
              
              <button 
                @click="toggleAudio"
                :disabled="audioLoading"
                class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm flex-1"
              >
                <span v-if="audioLoading">Loading...</span>
                <span v-else-if="isPlaying">⏸ Pause</span>
                <span v-else>▶ Play</span>
              </button>
              
              <button 
                @click="skipForward"
                :disabled="audioLoading || !duration"
                class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Forward 10s"
              >
                10s ⏩
              </button>
            </div>
            
            <span v-if="audioError" class="text-red-400 text-xs text-center">{{ audioError }}</span>
            
            <!-- Action Buttons -->
            <div class="flex gap-2">
              <button 
                @click="reRoast"
                :disabled="isAnalyzing"
                class="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Get a new roast for the same photo"
              >
                🔥 Roast Again
              </button>
              
              <button 
                @click="reset"
                class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Analyzing State -->
      <div v-if="isAnalyzing" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
        <div class="bg-black/90 backdrop-blur-md border border-red-900/70 rounded-lg p-6 shadow-2xl">
          <div class="flex flex-col items-center gap-4">
            <div class="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-red-500 text-lg font-bold">ANALYZING...</p>
          </div>
        </div>
      </div>
      
      <!-- Roast Modal (zoomed in view) -->
      <div v-if="showRoastModal && roastData" class="fixed inset-0 bg-black/95 backdrop-blur-lg z-50 flex items-center justify-center p-8 pointer-events-auto">
        <div class="max-w-3xl w-full max-h-[90vh] bg-gradient-to-br from-gray-900 to-black border-8 border-yellow-600 rounded-lg shadow-2xl overflow-hidden">
          <!-- Close Button -->
          <div class="sticky top-0 bg-black/90 border-b-4 border-yellow-600 p-4 flex justify-between items-center z-10">
            <h2 class="text-3xl font-bold text-red-500 font-serif">THE ROAST</h2>
            <button 
              @click="showRoastModal = false"
              class="text-gray-400 hover:text-white text-3xl leading-none px-3"
            >
              ×
            </button>
          </div>
          
          <!-- Scrollable Content -->
          <div class="overflow-y-auto max-h-[calc(90vh-80px)] p-8 space-y-6">
            <!-- Overall Vibe -->
            <div class="text-center border-b-2 border-yellow-600/30 pb-6">
              <p class="text-2xl text-orange-300 italic font-serif">
                "{{ roastData.data.overall_vibe }}"
              </p>
            </div>
            
            <!-- Roast Lines -->
            <div class="space-y-4">
              <h3 class="text-xl font-bold text-yellow-500 mb-4">The Breakdown:</h3>
              <div v-for="(line, index) in roastData.data.roast_lines" :key="index" 
                   class="flex gap-3 text-gray-300 text-lg leading-relaxed">
                <span class="text-red-500 font-bold">•</span>
                <p>{{ line }}</p>
              </div>
            </div>
            
            <!-- One-liner -->
            <div class="text-center border-t-2 border-yellow-600/30 pt-6 mt-8">
              <p class="text-2xl font-bold text-red-400 italic font-serif">
                "{{ roastData.data.one_liner }}"
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Photo Modal (zoomed in view) -->
      <div v-if="showPhotoModal && capturedImage" class="fixed inset-0 bg-black/95 backdrop-blur-lg z-50 flex items-center justify-center p-8 pointer-events-auto" @click="showPhotoModal = false">
        <div class="max-w-4xl w-full max-h-[90vh] relative" @click.stop>
          <!-- Close Button -->
          <button 
            @click="showPhotoModal = false"
            class="absolute -top-12 right-0 text-white hover:text-red-500 text-4xl leading-none px-3 transition-colors"
          >
            ×
          </button>
          
          <!-- Image with gold frame -->
          <div class="relative border-8 border-yellow-600 rounded-lg overflow-hidden shadow-2xl bg-black">
            <img :src="capturedImage" alt="Captured photo" class="w-full h-auto" />
          </div>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const capturedImage = ref(null)
const roastData = ref(null)
const isAnalyzing = ref(false)
const audioLoading = ref(false)
const isPlaying = ref(false)
const audioError = ref(null)
const showRoastModal = ref(false)
const showPhotoModal = ref(false)
const currentTime = ref(0)
const duration = ref(0)
let audioContext = null
let audioSource = null
let audioBuffer = null
let startTime = 0
let pausedAt = 0
let animationFrameId = null
let isTransitioning = false

function handleImageCaptured(base64Image) {
  capturedImage.value = base64Image
  isAnalyzing.value = true
}

function handleRoastReceived(data) {
  // 1.5 second delay for comedic timing
  setTimeout(() => {
    roastData.value = data
    isAnalyzing.value = false
    audioError.value = null
    audioBuffer = null
    pausedAt = 0
    currentTime.value = 0
    duration.value = 0
  }, 1500)
}

async function reRoast() {
  if (!capturedImage.value || isAnalyzing.value) return
  
  // Stop any playing audio
  if (audioSource) {
    try {
      audioSource.stop()
      audioSource.onended = null
    } catch (e) {
      // Source might already be stopped
    }
    audioSource.disconnect()
    audioSource = null
  }
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  // Clear current roast data and reset audio state
  roastData.value = null
  isPlaying.value = false
  audioBuffer = null
  audioError.value = null
  audioLoading.value = false
  pausedAt = 0
  currentTime.value = 0
  duration.value = 0
  showRoastModal.value = false
  
  // Trigger re-analysis with the same image
  isAnalyzing.value = true
  
  // Call the mock API again (or real API in production)
  const { loadMockData } = useMockRoast()
  const data = await loadMockData()
  handleRoastReceived(data)
}

async function toggleAudio() {
  if (isPlaying.value) {
    pauseAudio()
  } else {
    await playAudio()
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function seekAudio(event) {
  if (!audioBuffer || audioLoading.value || isTransitioning) return
  
  const rect = event.currentTarget.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const seekTime = percentage * duration.value
  
  isTransitioning = true
  
  const wasPlaying = isPlaying.value
  
  // Stop and fully clean up current audio source
  if (audioSource) {
    try {
      audioSource.stop()
      audioSource.onended = null // Remove event handler
    } catch (e) {
      // Source might already be stopped
    }
    audioSource.disconnect()
    audioSource = null
  }
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  // Update position
  pausedAt = seekTime
  currentTime.value = seekTime
  
  // Restart if was playing
  if (wasPlaying) {
    setTimeout(async () => {
      if (!audioSource) {
        // Recreate audio source and start from new position
        audioSource = audioContext.createBufferSource()
        audioSource.buffer = audioBuffer
        audioSource.connect(audioContext.destination)
        
        audioSource.onended = () => {
          console.log('Audio playback ended')
          isPlaying.value = false
          audioSource = null
          pausedAt = 0
          currentTime.value = 0
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
          }
        }
        
        audioSource.start(0, pausedAt)
        startTime = audioContext.currentTime - pausedAt
        updateProgress()
      }
      isTransitioning = false
    }, 20)
  } else {
    isTransitioning = false
  }
}

async function skipBackward() {
  if (!audioBuffer || audioLoading.value || isTransitioning) return
  
  isTransitioning = true
  
  try {
    const wasPlaying = isPlaying.value
    const currentPos = wasPlaying ? (audioContext.currentTime - startTime) : pausedAt
    const newTime = Math.max(0, currentPos - 10)
    
    // Stop and fully clean up current audio source
    if (audioSource) {
      try {
        audioSource.stop()
        audioSource.onended = null // Remove event handler
      } catch (e) {
        // Source might already be stopped
      }
      audioSource.disconnect()
      audioSource = null
    }
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    
    // Update position
    pausedAt = newTime
    currentTime.value = newTime
    
    // Wait for complete cleanup
    await new Promise(resolve => setTimeout(resolve, 20))
    
    // Only restart if was playing and we don't already have a source
    if (wasPlaying && !audioSource) {
      // Recreate audio source and start from new position
      audioSource = audioContext.createBufferSource()
      audioSource.buffer = audioBuffer
      audioSource.connect(audioContext.destination)
      
      audioSource.onended = () => {
        console.log('Audio playback ended')
        isPlaying.value = false
        audioSource = null
        pausedAt = 0
        currentTime.value = 0
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId)
          animationFrameId = null
        }
      }
      
      audioSource.start(0, pausedAt)
      startTime = audioContext.currentTime - pausedAt
      updateProgress()
    }
  } finally {
    isTransitioning = false
  }
}

async function skipForward() {
  if (!audioBuffer || audioLoading.value || isTransitioning) return
  
  isTransitioning = true
  
  try {
    const wasPlaying = isPlaying.value
    const currentPos = wasPlaying ? (audioContext.currentTime - startTime) : pausedAt
    const newTime = Math.min(duration.value, currentPos + 10)
    
    // Stop and fully clean up current audio source
    if (audioSource) {
      try {
        audioSource.stop()
        audioSource.onended = null // Remove event handler
      } catch (e) {
        // Source might already be stopped
      }
      audioSource.disconnect()
      audioSource = null
    }
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    
    // Update position
    pausedAt = newTime
    currentTime.value = newTime
    
    // Wait for complete cleanup
    await new Promise(resolve => setTimeout(resolve, 20))
    
    // Only restart if was playing and we don't already have a source
    if (wasPlaying && !audioSource) {
      // Recreate audio source and start from new position
      audioSource = audioContext.createBufferSource()
      audioSource.buffer = audioBuffer
      audioSource.connect(audioContext.destination)
      
      audioSource.onended = () => {
        console.log('Audio playback ended')
        isPlaying.value = false
        audioSource = null
        pausedAt = 0
        currentTime.value = 0
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId)
          animationFrameId = null
        }
      }
      
      audioSource.start(0, pausedAt)
      startTime = audioContext.currentTime - pausedAt
      updateProgress()
    }
  } finally {
    isTransitioning = false
  }
}

async function playAudio() {
  if (!roastData.value?.audio) {
    console.log('No audio data available')
    return
  }
  
  // Prevent multiple simultaneous playback attempts
  if (audioLoading.value || isTransitioning) {
    console.log('Audio already loading or transitioning, ignoring play request')
    return
  }
  
  audioLoading.value = true
  audioError.value = null
  
  try {
    // Clean up any existing audio source first
    await stopAudioSource()
    
    console.log('Starting audio playback...')
    console.log('Audio data length:', roastData.value.audio.length)
    
    // Initialize AudioContext if needed
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      console.log('AudioContext created, sample rate:', audioContext.sampleRate)
    }
    
    // Decode base64 to ArrayBuffer if not already done
    if (!audioBuffer) {
      const base64Audio = roastData.value.audio
      console.log('Decoding base64 audio...')
      
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      console.log('Decoded bytes:', bytes.length)
      
      // Convert PCM bytes to Float32Array for AudioBuffer
      // Audio is 16-bit PCM at 24kHz, mono
      const sampleRate = 24000
      const numSamples = bytes.length / 2 // 16-bit = 2 bytes per sample
      
      console.log('Creating audio buffer with', numSamples, 'samples at', sampleRate, 'Hz')
      
      audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate)
      const channelData = audioBuffer.getChannelData(0)
      
      console.log('Audio duration:', audioBuffer.duration, 'seconds')
      
      // Convert 16-bit PCM to float32 (-1.0 to 1.0)
      const view = new DataView(bytes.buffer)
      for (let i = 0; i < numSamples; i++) {
        const sample = view.getInt16(i * 2, true) // true for little-endian
        channelData[i] = sample / 32768.0 // Normalize to -1.0 to 1.0
      }
      
      console.log('Audio buffer populated successfully')
    }
    
    // Set duration
    duration.value = audioBuffer.duration
    
    // Create and start audio source
    console.log('Creating audio source...')
    audioSource = audioContext.createBufferSource()
    audioSource.buffer = audioBuffer
    audioSource.connect(audioContext.destination)
    
    audioSource.onended = () => {
      console.log('Audio playback ended')
      isPlaying.value = false
      audioSource = null
      pausedAt = 0
      currentTime.value = 0
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }
    
    console.log('Starting playback from:', pausedAt, 'seconds')
    
    // Set playing state BEFORE starting to prevent race conditions
    isPlaying.value = true
    
    audioSource.start(0, pausedAt)
    startTime = audioContext.currentTime - pausedAt
    
    // Start progress tracking
    updateProgress()
    
    console.log('Audio playing!')
    
  } catch (error) {
    console.error('Error playing audio:', error)
    audioError.value = 'Failed to play audio: ' + error.message
    isPlaying.value = false
  } finally {
    audioLoading.value = false
  }
}

function updateProgress() {
  if (isPlaying.value && audioContext) {
    currentTime.value = audioContext.currentTime - startTime
    if (currentTime.value < duration.value) {
      animationFrameId = requestAnimationFrame(updateProgress)
    }
  }
}

function pauseAudio() {
  stopAudioSource()
  isPlaying.value = false
}

async function stopAudioSource() {
  // Stop and clean up the audio source without changing play state
  if (audioSource) {
    try {
      audioSource.stop()
    } catch (e) {
      // Source might already be stopped
    }
    audioSource.disconnect()
    audioSource = null
  }
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  if (audioContext && isPlaying.value) {
    // Save current position only if we're playing
    pausedAt = audioContext.currentTime - startTime
  }
  
  // Small delay to ensure cleanup is complete
  await new Promise(resolve => setTimeout(resolve, 10))
}

function reset() {
  // Clean up audio source
  if (audioSource) {
    try {
      audioSource.stop()
      audioSource.onended = null
    } catch (e) {
      // Source might already be stopped
    }
    audioSource.disconnect()
    audioSource = null
  }
  
  // Cancel animation frame
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  // Reset all state - this will trigger scene cleanup via watchers
  isPlaying.value = false
  isTransitioning = false
  isAnalyzing.value = false
  capturedImage.value = null
  roastData.value = null
  audioBuffer = null
  audioError.value = null
  audioLoading.value = false
  pausedAt = 0
  currentTime.value = 0
  duration.value = 0
  startTime = 0
  showRoastModal.value = false
  showPhotoModal.value = false
}
</script>
