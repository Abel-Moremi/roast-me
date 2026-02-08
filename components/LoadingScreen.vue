<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-500"
      leave-active-class="transition-opacity duration-500"
      enter-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="isVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      >
        <!-- Main Loading Container -->
        <div class="flex flex-col items-center justify-center gap-8">
          <!-- Animated Logo/Icon -->
          <div class="relative w-24 h-24">
            <!-- Outer spinning ring -->
            <div 
              class="absolute inset-0 rounded-full border-4 border-transparent border-t-red-600 border-r-red-500"
              :style="{ 
                animation: 'spin 2s linear infinite',
                filter: 'drop-shadow(0 0 20px rgba(220, 38, 38, 0.5))'
              }"
            ></div>
            
            <!-- Middle pulsing ring -->
            <div 
              class="absolute inset-2 rounded-full border-2 border-red-600/40"
              :style="{ 
                animation: 'pulse-ring 2s ease-in-out infinite',
                filter: 'drop-shadow(0 0 10px rgba(220, 38, 38, 0.3))'
              }"
            ></div>
            
            <!-- Center icon with glow -->
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-4xl animate-bounce" style="animation-duration: 1.5s">
                🎭
              </div>
            </div>
          </div>

          <!-- Status Text -->
          <div class="text-center">
            <h2 class="text-2xl font-bold text-white mb-2">
              {{ currentStatus.title }}
            </h2>
            <p class="text-gray-400 text-sm h-6">
              {{ currentStatus.message }}
            </p>
          </div>

          <!-- Progress Indicator with Dots -->
          <div class="flex gap-2 h-2">
            <div 
              v-for="(dot, index) in 3" 
              :key="index"
              class="w-2 h-2 rounded-full bg-red-600/50 transition-all duration-300"
              :class="{ 'bg-red-600 scale-125 shadow-lg shadow-red-600': isLoading && index === (animationFrame % 3) }"
            ></div>
          </div>

          <!-- Detailed Progress -->
          <div class="w-64 space-y-3 text-xs">
            <!-- Scene Loading -->
            <div class="space-y-1">
              <div class="flex items-center gap-2 text-gray-300">
                <span v-if="sceneLoaded" class="text-green-500">✓</span>
                <span v-else class="text-gray-500">○</span>
                <span>Scene Initialization</span>
              </div>
              <div v-if="!sceneLoaded" class="ml-5 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-red-600 to-red-500"
                  :style="{ 
                    width: `${sceneProgress}%`,
                    animation: 'shimmer 2s infinite'
                  }"
                ></div>
              </div>
            </div>

            <!-- Character Loading -->
            <div class="space-y-1">
              <div class="flex items-center gap-2 text-gray-300">
                <span v-if="characterLoaded" class="text-green-500">✓</span>
                <span v-else class="text-gray-500">○</span>
                <span>Character Loading</span>
              </div>
              <div v-if="!characterLoaded" class="ml-5 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-red-600 to-red-500"
                  :style="{ 
                    width: `${characterProgress}%`,
                    animation: 'shimmer 2s infinite'
                  }"
                ></div>
              </div>
            </div>

            <!-- Animation Setup -->
            <div class="space-y-1">
              <div class="flex items-center gap-2 text-gray-300">
                <span v-if="animationsLoaded" class="text-green-500">✓</span>
                <span v-else class="text-gray-500">○</span>
                <span>Animation Setup</span>
              </div>
              <div v-if="!animationsLoaded" class="ml-5 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-red-600 to-red-500"
                  :style="{ 
                    width: `${animationProgress}%`,
                    animation: 'shimmer 2s infinite'
                  }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Overall Progress Bar -->
          <div class="w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 transition-all duration-300"
              :style="{ 
                width: `${overallProgress}%`,
                animation: 'shimmer 2s infinite'
              }"
            ></div>
          </div>

          <!-- Overall Percentage -->
          <div class="text-gray-400 text-sm">
            {{ Math.round(overallProgress) }}%
          </div>

          <!-- Tip/Quote -->
          <div class="text-center text-gray-500 text-xs italic mt-4 w-64">
            "{{ randomTip }}"
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ============================================
// PROPS
// ============================================
const props = defineProps({
  isLoading: {
    type: Boolean,
    default: true
  },
  sceneLoaded: {
    type: Boolean,
    default: false
  },
  characterLoaded: {
    type: Boolean,
    default: false
  },
  animationsLoaded: {
    type: Boolean,
    default: false
  },
  sceneProgress: {
    type: Number,
    default: 0
  },
  characterProgress: {
    type: Number,
    default: 0
  },
  animationProgress: {
    type: Number,
    default: 0
  }
})

// ============================================
// EMITS
// ============================================
const emit = defineEmits(['loadingComplete'])

// ============================================
// STATE
// ============================================
const animationFrame = ref(0)
const tipIndex = ref(0)

const tips = [
  'The best comedians are great observers of human nature.',
  'Timing is everything in comedy.',
  'A good roast is like a well-crafted joke - it needs setup and payoff.',
  'Laughter is the best medicine... and the best response to a roast.',
  'Comedy is tragedy plus time... but we\'re skipping the time.',
  'The art of roasting: taking truth and making it funny.',
  'Every great comedian started as an audience member.',
  'A roast without heart is just cruelty. A roast with heart? Comedy gold.'
]

// ============================================
// COMPUTED
// ============================================
const isVisible = computed(() => props.isLoading)

const overallProgress = computed(() => {
  return Math.max(
    props.sceneProgress,
    props.characterProgress,
    props.animationProgress
  )
})

const randomTip = computed(() => tips[tipIndex.value])

const currentStatus = computed(() => {
  if (!props.sceneLoaded) {
    return { title: 'Setting up Stage...', message: 'Building the comedy club' }
  }
  if (!props.characterLoaded) {
    return { title: 'Summoning Performer...', message: 'Loading the character model' }
  }
  if (!props.animationsLoaded) {
    return { title: 'Teaching Moves...', message: 'Preparing animations' }
  }
  return { title: 'Ready!', message: 'Let the roasting begin' }
})

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  // Animate dots
  const dotInterval = setInterval(() => {
    animationFrame.value = (animationFrame.value + 1) % 3
  }, 600)

  // Rotate tips
  const tipInterval = setInterval(() => {
    tipIndex.value = (tipIndex.value + 1) % tips.length
  }, 5000)

  // Watch for completion
  const completionWatcher = setInterval(() => {
    if (
      props.sceneLoaded &&
      props.characterLoaded &&
      props.animationsLoaded &&
      props.isLoading
    ) {
      // Wait a bit before emitting to show completion
      setTimeout(() => {
        emit('loadingComplete')
      }, 1000)
      clearInterval(completionWatcher)
    }
  }, 100)

  return () => {
    clearInterval(dotInterval)
    clearInterval(tipInterval)
    clearInterval(completionWatcher)
  }
})
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse-ring {
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.1);
    opacity: 0.5;
  }
}

@keyframes shimmer {
  0%, 100% { 
    background: linear-gradient(90deg, rgb(220, 38, 38), rgb(239, 68, 68));
  }
  50% { 
    background: linear-gradient(90deg, rgb(239, 68, 68), rgb(220, 38, 38));
  }
}
</style>
