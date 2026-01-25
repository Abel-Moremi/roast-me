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
        />
      </div>
      
      <!-- Camera Overlay (when not captured) -->
      <div v-if="!capturedImage" class="absolute inset-0 pointer-events-none z-10">
        <CameraCapture 
          @imageCaptured="handleImageCaptured"
          @roastReceived="handleRoastReceived"
          class="pointer-events-auto"
        />
      </div>
      
      <!-- Results Overlay (after capture) -->
      <div v-else-if="roastData" class="absolute inset-0 flex items-end justify-center p-8 pointer-events-none z-20">
        <div class="max-w-2xl w-full bg-black/90 backdrop-blur-md border border-red-900/70 rounded-lg p-8 pointer-events-auto shadow-2xl">
          <h2 class="text-2xl font-bold mb-4 text-red-500 text-center">THE ROAST</h2>
          
          <div class="space-y-4">
            <p class="text-lg text-gray-300 italic text-center">
              "{{ roastData.data.overall_vibe }}"
            </p>
            
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <p v-for="(line, index) in roastData.data.roast_lines" :key="index" 
                 class="text-gray-400 text-sm">
                • {{ line }}
              </p>
            </div>
            
            <p class="text-xl font-bold text-red-400 italic text-center mt-4">
              "{{ roastData.data.one_liner }}"
            </p>
            
            <!-- Audio Player -->
            <div v-if="roastData.audio" class="mt-6 p-4 bg-red-950/30 border border-red-900/50 rounded-lg">
              <div class="flex items-center justify-center gap-4">
                <button 
                  @click="toggleAudio"
                  :disabled="audioLoading"
                  class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <span v-if="audioLoading">Loading...</span>
                  <span v-else-if="isPlaying">⏸ Pause Roast</span>
                  <span v-else>▶ Play Roast Audio</span>
                </button>
                <span v-if="audioError" class="text-red-400 text-sm">{{ audioError }}</span>
              </div>
            </div>
            
            <div class="flex gap-4 mt-6">
              <button 
                @click="reset"
                class="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Roast Someone Else
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Analyzing State -->
      <div v-else-if="isAnalyzing" class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div class="bg-black/90 backdrop-blur-md border border-red-900/70 rounded-lg p-8 shadow-2xl">
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-red-500 text-xl font-bold">ANALYZING YOUR FLAWS...</p>
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
let audioContext = null
let audioSource = null
let audioBuffer = null

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
  }, 1500)
}

async function toggleAudio() {
  if (isPlaying.value) {
    stopAudio()
  } else {
    await playAudio()
  }
}

async function playAudio() {
  if (!roastData.value?.audio) {
    console.log('No audio data available')
    return
  }
  
  audioLoading.value = true
  audioError.value = null
  
  try {
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
    
    // Create and start audio source
    console.log('Creating audio source...')
    audioSource = audioContext.createBufferSource()
    audioSource.buffer = audioBuffer
    audioSource.connect(audioContext.destination)
    
    audioSource.onended = () => {
      console.log('Audio playback ended')
      isPlaying.value = false
      audioSource = null
    }
    
    console.log('Starting playback...')
    audioSource.start(0)
    isPlaying.value = true
    console.log('Audio playing!')
    
  } catch (error) {
    console.error('Error playing audio:', error)
    audioError.value = 'Failed to play audio: ' + error.message
    isPlaying.value = false
  } finally {
    audioLoading.value = false
  }
}

function stopAudio() {
  if (audioSource) {
    audioSource.stop()
    audioSource = null
  }
  isPlaying.value = false
}

function reset() {
  stopAudio()
  capturedImage.value = null
  roastData.value = null
  audioBuffer = null
  audioError.value = null
}
</script>
