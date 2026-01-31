/**
 * useJawMovement Composable
 * Manages natural jaw movement synchronized with audio during speech
 */

import { ref } from 'vue'

export function useJawMovement() {
  // ============================================
  // CONFIGURATION
  // ============================================
  const JAW_CONFIG = {
    // MorphTarget names to look for
    JAW_MORPHS: [
      'jawOpen',
      'mouthOpen',
      'JawOpen',
      'Jaw_Open',
      'mouth_open',
      'mouthOpening',
      'jaw_open_close',
      'mouth_open_close'
    ],

    // Audio analysis
    FREQUENCY_SMOOTHING: 0.7, // Smooth jaw movement over time
    MIN_AUDIO_THRESHOLD: 0.05, // Minimum audio intensity to trigger jaw
    OPEN_RANGE: [0.1, 0.9], // Min and max jaw opening values

    // Animation
    RESPONSE_SPEED: 0.15, // How quickly jaw responds to audio (0-1, higher = faster)
    CLOSE_SPEED: 0.12 // How quickly jaw closes when silent (0-1, higher = faster)
  }

  // ============================================
  // HELPERS
  // ============================================
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
  }

  // ============================================
  // STATE VARIABLES
  // ============================================
  const jawMorphTargets = ref({}) // Maps mesh names to jaw morphTarget indices
  const jawBaselineValues = ref({}) // Baseline values for jaw morphTargets
  const currentJawOpening = ref(0) // Current jaw opening amount (0-1)
  const targetJawOpening = ref(0) // Target jaw opening (driven by audio)
  const smoothedAudioIntensity = ref(0) // Smoothed audio intensity

  // ============================================
  // INITIALIZATION
  // ============================================
  /**
   * Initialize jaw movement system by scanning for jaw morphTargets
   * @param {Array} meshes - Array of Three.js meshes to scan
   */
  function initializeJawMovement(meshes) {
    if (!meshes || meshes.length === 0) return

    jawMorphTargets.value = {}
    jawBaselineValues.value = {}

    meshes.forEach(mesh => {
      if (!mesh.morphTargetDictionary) return

      const meshName = mesh.name || 'unnamed'
      jawMorphTargets.value[meshName] = {}
      jawBaselineValues.value[meshName] = {}

      // Scan for jaw-related morphTargets
      Object.entries(mesh.morphTargetDictionary).forEach(
        ([name, index]) => {
          const lowerName = name.toLowerCase()

          // Check if this morphTarget is for jaw movement
          const isJawMorph = JAW_CONFIG.JAW_MORPHS.some(jawMorph =>
            lowerName.includes(jawMorph.toLowerCase())
          )

          if (isJawMorph) {
            const influence = mesh.morphTargetInfluences[index] || 0
            jawMorphTargets.value[meshName][name] = index
            jawBaselineValues.value[meshName][name] = influence

            console.log(
              `Found jaw morphTarget: ${meshName}.${name}`
            )
          }
        }
      )
    })

    console.log('Jaw movement system initialized')
  }

  // ============================================
  // JAW ANIMATION
  // ============================================
  /**
   * Update jaw opening based on audio frequencies
   * @param {number} delta - Delta time in seconds
   * @param {number} audioIntensity - Overall audio intensity (0-1)
   * @param {number} midFreq - Mid frequency magnitude (0-1)
   * @param {number} highFreq - High frequency magnitude (0-1)
   */
  function updateJawFromAudio(
    delta,
    audioIntensity,
    midFreq,
    highFreq
  ) {
    // Smooth audio intensity with exponential smoothing
    smoothedAudioIntensity.value =
      smoothedAudioIntensity.value * JAW_CONFIG.FREQUENCY_SMOOTHING +
      audioIntensity * (1 - JAW_CONFIG.FREQUENCY_SMOOTHING)

    // Calculate target jaw opening based on audio
    if (smoothedAudioIntensity.value > JAW_CONFIG.MIN_AUDIO_THRESHOLD) {
      // Combine mid and high frequencies for natural jaw movement
      // Mid frequencies control baseline opening
      // High frequencies add intensity (consonants, excitement)
      const baseOpening = midFreq * 0.6
      const intensityBoost = highFreq * 0.4

      targetJawOpening.value = Math.min(
        1,
        baseOpening + intensityBoost
      )
    } else {
      // Close jaw when silent
      targetJawOpening.value = 0
    }

    // Smooth jaw movement toward target
    const speed =
      targetJawOpening.value > currentJawOpening.value
        ? JAW_CONFIG.RESPONSE_SPEED
        : JAW_CONFIG.CLOSE_SPEED

    currentJawOpening.value =
      currentJawOpening.value +
      (targetJawOpening.value - currentJawOpening.value) * speed

    // Clamp to valid range
    currentJawOpening.value = clamp(
      currentJawOpening.value,
      0,
      1
    )
  }

  /**
   * Update jaw animation each frame
   * @param {number} delta - Delta time in seconds
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   */
  function updateJawAnimation(delta, meshes) {
    if (!meshes) return

    Object.entries(jawMorphTargets.value).forEach(
      ([meshName, morphMap]) => {
        const mesh = meshes[meshName]
        if (!mesh || !mesh.morphTargetInfluences) return

        Object.entries(morphMap).forEach(([morphName, morphIndex]) => {
          const baseline = jawBaselineValues.value[meshName]?.[
            morphName
          ] || 0

          // Apply current jaw opening to morphTarget
          // Range: baseline + (1 - baseline) * openAmount
          const jawValue =
            baseline +
            (1 - baseline) *
              currentJawOpening.value *
              easeInOutQuad(currentJawOpening.value)

          mesh.morphTargetInfluences[morphIndex] = clamp(
            jawValue,
            0,
            1
          )
        })
      }
    )
  }

  /**
   * Force jaw to specific opening amount
   * @param {number} amount - Opening amount (0-1)
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   */
  function setJawOpening(amount, meshes) {
    amount = clamp(amount, 0, 1)
    currentJawOpening.value = amount
    targetJawOpening.value = amount

    updateJawAnimation(0, meshes)
  }

  /**
   * Reset jaw to closed position
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   */
  function resetJaw(meshes) {
    setJawOpening(0, meshes)
  }

  /**
   * Make a quick jaw movement (like emphasis)
   * @param {number} intensity - How much to open (0-1)
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   */
  function performQuickJawMovement(intensity, meshes) {
    intensity = clamp(intensity, 0, 1)
    targetJawOpening.value = intensity
    updateJawAnimation(0, meshes)
  }

  return {
    // State
    jawMorphTargets,
    jawBaselineValues,
    currentJawOpening,
    targetJawOpening,
    smoothedAudioIntensity,

    // Methods
    initializeJawMovement,
    updateJawFromAudio,
    updateJawAnimation,
    setJawOpening,
    resetJaw,
    performQuickJawMovement,

    // Config
    JAW_CONFIG
  }
}
