import { ref, computed } from 'vue'

/**
 * Master loading state manager for scene and character initialization
 * Tracks progress through all initialization stages
 */
export const useLoadingState = () => {
  // ====== Loading Flags ======
  const isLoading = ref(true)
  const sceneLoaded = ref(false)
  const characterLoaded = ref(false)
  const animationsLoaded = ref(false)

  // ====== Progress Tracking ======
  const sceneProgress = ref(0)
  const characterProgress = ref(0)
  const animationProgress = ref(0)

  // ====== Computed ======
  const isFullyLoaded = computed(() => {
    return sceneLoaded.value && characterLoaded.value && animationsLoaded.value
  })

  const overallProgress = computed(() => {
    const avg = (sceneProgress.value + characterProgress.value + animationProgress.value) / 3
    return Math.round(avg)
  })

  // ====== Scene Loading ======
  /**
   * Mark scene initialization started
   */
  const startSceneLoading = () => {
    console.log('🎬 Loading: Scene initialization started')
    sceneProgress.value = 10
  }

  /**
   * Update scene loading progress
   * @param {number} progress - Progress percentage (0-100)
   */
  const updateSceneProgress = (progress) => {
    sceneProgress.value = Math.min(progress, 99) // Max 99 until completion
  }

  /**
   * Mark scene as loaded
   */
  const completeSceneLoading = () => {
    console.log('✅ Loading: Scene initialization complete')
    sceneProgress.value = 100
    sceneLoaded.value = true
  }

  // ====== Character Loading ======
  /**
   * Mark character loading started
   */
  const startCharacterLoading = () => {
    console.log('🎬 Loading: Character model loading started')
    characterProgress.value = 10
  }

  /**
   * Update character loading progress
   * @param {number} progress - Progress percentage (0-100)
   */
  const updateCharacterProgress = (progress) => {
    characterProgress.value = Math.min(progress, 99)
  }

  /**
   * Mark character as loaded
   */
  const completeCharacterLoading = () => {
    console.log('✅ Loading: Character model loaded')
    characterProgress.value = 100
    characterLoaded.value = true
  }

  // ====== Animation Loading ======
  /**
   * Mark animation setup started
   */
  const startAnimationSetup = () => {
    console.log('🎬 Loading: Animation setup started')
    animationProgress.value = 10
  }

  /**
   * Update animation setup progress
   * @param {number} progress - Progress percentage (0-100)
   */
  const updateAnimationProgress = (progress) => {
    animationProgress.value = Math.min(progress, 99)
  }

  /**
   * Mark animations as loaded
   */
  const completeAnimationSetup = () => {
    console.log('✅ Loading: Animation setup complete')
    animationProgress.value = 100
    animationsLoaded.value = true
  }

  // ====== Overall Loading ======
  /**
   * Mark overall loading as complete
   * Should be called after all three stages are done
   */
  const completeLoading = () => {
    if (isFullyLoaded.value) {
      console.log('🎉 Loading: Everything loaded and ready!')
      isLoading.value = false
    }
  }

  /**
   * Reset loading state (for retries or resets)
   */
  const reset = () => {
    console.log('🔄 Loading: Reset to initial state')
    isLoading.value = true
    sceneLoaded.value = false
    characterLoaded.value = false
    animationsLoaded.value = false
    sceneProgress.value = 0
    characterProgress.value = 0
    animationProgress.value = 0
  }

  /**
   * Get current loading summary for debugging
   */
  const getLoadingSummary = () => {
    return {
      isLoading: isLoading.value,
      isFullyLoaded: isFullyLoaded.value,
      overallProgress: overallProgress.value,
      scene: {
        loaded: sceneLoaded.value,
        progress: sceneProgress.value
      },
      character: {
        loaded: characterLoaded.value,
        progress: characterProgress.value
      },
      animations: {
        loaded: animationsLoaded.value,
        progress: animationProgress.value
      }
    }
  }

  return {
    // ──── Flags ────
    isLoading,
    sceneLoaded,
    characterLoaded,
    animationsLoaded,
    isFullyLoaded,

    // ──── Progress ────
    sceneProgress,
    characterProgress,
    animationProgress,
    overallProgress,

    // ──── Scene Methods ────
    startSceneLoading,
    updateSceneProgress,
    completeSceneLoading,

    // ──── Character Methods ────
    startCharacterLoading,
    updateCharacterProgress,
    completeCharacterLoading,

    // ──── Animation Methods ────
    startAnimationSetup,
    updateAnimationProgress,
    completeAnimationSetup,

    // ──── Overall Methods ────
    completeLoading,
    reset,
    getLoadingSummary
  }
}
