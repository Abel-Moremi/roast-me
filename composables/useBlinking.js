/**
 * useBlinking Composable
 * Manages natural eye blinking animations for character
 */

import { ref } from 'vue'

export function useBlinking() {
  // ============================================
  // CONFIGURATION (MUST BE FIRST)
  // ============================================
  const BLINK_CONFIG = {
    // Timing
    MIN_INTERVAL: 2500, // 2.5 seconds min between blinks
    MAX_INTERVAL: 5000, // 5 seconds max between blinks
    CLOSE_DURATION: 150, // ms to close eyes
    OPEN_DURATION: 100, // ms to open eyes

    // Eye morphTargets to look for (common names)
    EYE_MORPHS: [
      'eyeClose',
      'eyeBlink',
      'eyeCloseL',
      'eyeCloseR',
      'Blink',
      'blink_left',
      'blink_right',
      'EyeClose_L',
      'EyeClose_R'
    ],

    // Eye open morphTargets to fully open
    EYE_OPEN_MORPHS: [
      'eyeOpen',
      'eyeOpenL',
      'eyeOpenR',
      'EyeOpen_L',
      'EyeOpen_R'
    ]
  }

  // ============================================
  // HELPERS
  // ============================================
  function getRandomBlinkInterval() {
    return (
      Math.random() *
        (BLINK_CONFIG.MAX_INTERVAL - BLINK_CONFIG.MIN_INTERVAL) +
      BLINK_CONFIG.MIN_INTERVAL
    )
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  // ============================================
  // STATE VARIABLES
  // ============================================
  const blinkState = ref('closed') // 'open', 'closing', 'opening', 'closed'
  const blinkProgress = ref(0) // 0-1 for animation
  const timeSinceLastBlink = ref(0)
  const nextBlinkTime = ref(getRandomBlinkInterval())

  const eyeMorphTargets = ref({}) // Maps mesh names to eye morphTarget indices
  const eyeBaselineValues = ref({}) // Store baseline values for eyes

  // ============================================
  // INITIALIZATION
  // ============================================
  /**
   * Initialize blinking system by scanning for eye morphTargets
   * @param {Array} meshes - Array of Three.js meshes to scan
   */
  function initializeBlinking(meshes) {
    if (!meshes || meshes.length === 0) return

    eyeMorphTargets.value = {}
    eyeBaselineValues.value = {}

    meshes.forEach(mesh => {
      if (!mesh.morphTargetDictionary) return

      const meshName = mesh.name || 'unnamed'
      eyeMorphTargets.value[meshName] = {}
      eyeBaselineValues.value[meshName] = {}

      // Scan for eye-related morphTargets
      Object.entries(mesh.morphTargetDictionary).forEach(
        ([name, index]) => {
          const lowerName = name.toLowerCase()

          // Check if this morphTarget is for eye blinking
          const isEyeMorph = BLINK_CONFIG.EYE_MORPHS.some(eyeMorph =>
            lowerName.includes(eyeMorph.toLowerCase())
          )

          if (isEyeMorph) {
            const influence = mesh.morphTargetInfluences[index] || 0
            eyeMorphTargets.value[meshName][name] = {
              index,
              isOpen: false
            }
            eyeBaselineValues.value[meshName][name] = influence

            console.log(
              `Found eye morphTarget: ${meshName}.${name}`
            )
          }
        }
      )
    })
  }

  // ============================================
  // BLINKING LOGIC
  // ============================================
  /**
   * Update blinking animation each frame
   * @param {number} delta - Delta time in seconds
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   */
  function updateBlinking(delta, meshes) {
    if (!meshes) return

    timeSinceLastBlink.value += delta * 1000 // Convert to ms

    // Check if it's time for a new blink
    if (timeSinceLastBlink.value >= nextBlinkTime.value) {
      startBlink()
    }

    // Update current blink animation
    updateBlinkAnimation(delta, meshes)
  }

  /**
   * Start a new blink cycle
   */
  function startBlink() {
    blinkState.value = 'closing'
    blinkProgress.value = 0
    timeSinceLastBlink.value = 0
    nextBlinkTime.value = getRandomBlinkInterval()
  }

  /**
   * Update blink animation state and apply to morphTargets
   * @param {number} delta - Delta time in seconds
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   */
  function updateBlinkAnimation(delta, meshes) {
    const deltaMs = delta * 1000

    if (blinkState.value === 'closing') {
      blinkProgress.value += deltaMs / BLINK_CONFIG.CLOSE_DURATION

      if (blinkProgress.value >= 1) {
        blinkProgress.value = 1
        blinkState.value = 'closed'
      }

      applyBlinkInfluence(meshes, easeInOutQuad(blinkProgress.value), true)
    } else if (blinkState.value === 'closed') {
      // Hold eyes closed briefly (blink is instant, so immediately open)
      blinkState.value = 'opening'
      blinkProgress.value = 0
    } else if (blinkState.value === 'opening') {
      blinkProgress.value += deltaMs / BLINK_CONFIG.OPEN_DURATION

      if (blinkProgress.value >= 1) {
        blinkProgress.value = 0
        blinkState.value = 'open'
        applyBlinkInfluence(meshes, 0, true) // Fully open
      } else {
        applyBlinkInfluence(
          meshes,
          1 - easeInOutQuad(blinkProgress.value),
          true
        )
      }
    } else if (blinkState.value === 'open') {
      // Eyes are open, do nothing
      applyBlinkInfluence(meshes, 0, true) // Ensure fully open
    }
  }

  /**
   * Apply blink influence to eye morphTargets
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   * @param {number} blinkInfluence - 0 = fully open, 1 = fully closed
   * @param {boolean} force - Force apply even if state is 'open'
   */
  function applyBlinkInfluence(meshes, blinkInfluence, force = false) {
    if (!force && blinkState.value === 'open') return

    Object.entries(eyeMorphTargets.value).forEach(
      ([meshName, morphsMap]) => {
        const mesh = meshes[meshName]
        if (!mesh || !mesh.morphTargetInfluences) return

        Object.entries(morphsMap).forEach(([morphName, morphInfo]) => {
          const { index } = morphInfo
          const baseline = eyeBaselineValues.value[meshName]?.[
            morphName
          ] || 0

          // Apply blinking: 0 = open (baseline), 1 = closed (max influence)
          mesh.morphTargetInfluences[index] =
            baseline + blinkInfluence * (1 - baseline)
        })
      }
    )
  }

  /**
   * Force open eyes immediately
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   */
  function forceOpenEyes(meshes) {
    blinkState.value = 'open'
    blinkProgress.value = 0
    applyBlinkInfluence(meshes, 0, true)
  }

  /**
   * Force close eyes immediately
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   */
  function forceCloseEyes(meshes) {
    blinkState.value = 'closed'
    blinkProgress.value = 1
    applyBlinkInfluence(meshes, 1, true)
  }

  /**
   * Perform a quick blink animation
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   */
  function performQuickBlink(meshes) {
    startBlink()
    updateBlinkAnimation(0.001, meshes) // Tiny update to start animation
  }

  return {
    // State
    blinkState,
    blinkProgress,
    timeSinceLastBlink,
    nextBlinkTime,
    eyeMorphTargets,

    // Methods
    initializeBlinking,
    updateBlinking,
    performQuickBlink,
    forceOpenEyes,
    forceCloseEyes,

    // Config
    BLINK_CONFIG
  }
}
