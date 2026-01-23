<template>
  <div class="w-screen h-screen bg-black dark:bg-gray-950">
    <NuxtRouteAnnouncer />
    <ClientOnly>
      <!-- Show camera if not captured yet -->
      <CameraCapture 
        v-if="!capturedImage"
        @imageCaptured="handleImageCaptured"
        @roastReceived="handleRoastReceived"
      />
      
      <!-- Show results after capture -->
      <div v-else class="flex items-center justify-center h-full p-8">
        <div class="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg p-8">
          <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Your Roast</h2>
          
          <img :src="capturedImage" alt="Captured" class="w-full rounded-lg mb-4" />
          
          <div v-if="roastData" class="space-y-4">
            <p class="text-lg text-gray-700 dark:text-gray-300">
              {{ roastData.data.overall_vibe }}
            </p>
            
            <div class="space-y-2">
              <p v-for="(line, index) in roastData.data.roast_lines" :key="index" 
                 class="text-gray-600 dark:text-gray-400">
                {{ line }}
              </p>
            </div>
            
            <p class="text-xl font-bold text-gray-900 dark:text-white italic">
              "{{ roastData.data.one_liner }}"
            </p>
            
            <!-- Audio Player -->
            <div v-if="roastData.audio" class="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div class="flex items-center gap-4">
                <button 
                  @click="toggleAudio"
                  :disabled="audioLoading"
                  class="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <span v-if="audioLoading">Loading...</span>
                  <span v-else-if="isPlaying">⏸ Pause</span>
                  <span v-else>▶ Play Roast Audio</span>
                </button>
                <span v-if="audioError" class="text-red-500 text-sm">{{ audioError }}</span>
              </div>
            </div>
          </div>
          
          <button 
            @click="reset"
            class="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Take Another Photo
          </button>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const capturedImage = ref(null)
const roastData = ref(null)
const audioLoading = ref(false)
const isPlaying = ref(false)
const audioError = ref(null)
let audioContext = null
let audioSource = null
let audioBuffer = null

function handleImageCaptured(base64Image) {
  capturedImage.value = base64Image
}

function handleRoastReceived(data) {
  roastData.value = data
  audioError.value = null
  audioBuffer = null
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
