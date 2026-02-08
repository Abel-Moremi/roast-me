import { ref, computed } from 'vue'

/**
 * Master sync controller that coordinates audio playback with animation timeline
 * 
 * Ensures character animations and expressions stay synchronized with audio playback.
 * Manages timeline frame transitions, animation state, and facial expressions.
 * 
 * @returns {Object} Sync controller API with state refs and control methods
 * 
 * @example
 * const { initialize, update, currentAnimation } = useAnimationAudioSync()
 * initialize(animationScript, duration)
 * update(currentTime) // Called each frame during playback
 */
export const useAnimationAudioSync = () => {
  // ====== Constants ======
  const DEFAULT_ANIMATION = 'idle'
  const DEFAULT_EXPRESSION = 'neutral'
  const DEFAULT_INTENSITY = 0.5
  const TRANSITION_THRESHOLD = 0.95 // Trigger transition at 95% through frame
  const DEBUG_MODE = false // Toggle for detailed logging

  // ====== State: Animation Script ======
  const animationScript = ref(null)
  
  // ====== State: Playback ======
  const currentTime = ref(0)
  const isPlaying = ref(false)
  const duration = ref(0)
  
  // ====== State: Current Animation ======
  const currentFrame = ref(null)
  const nextFrame = ref(null)
  const currentAnimation = ref(DEFAULT_ANIMATION)
  const currentExpression = ref(DEFAULT_EXPRESSION)
  const currentIntensity = ref(DEFAULT_INTENSITY)
  
  // ====== Computed Properties ======
  const timelineProgress = computed(() => {
    return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  })

  // ====== Validation ======
  /**
   * Validates that animation script has required structure
   * @param {Object} script - Animation script to validate
   * @returns {boolean} True if script is valid
   */
  const isValidScript = (script) => {
    return (
      script &&
      typeof script === 'object' &&
      Array.isArray(script.timeline) &&
      script.timeline.length > 0 &&
      script.timeline.every(frame => 
        frame.animation &&
        typeof frame.startTime === 'number' &&
        typeof frame.endTime === 'number' &&
        frame.startTime < frame.endTime
      )
    )
  }

  /**
   * Validates that duration is a positive number
   * @param {number} dur - Duration in seconds
   * @returns {boolean} True if valid
   */
  const isValidDuration = (dur) => {
    return typeof dur === 'number' && dur > 0
  }
  
  // ====== Utility Functions ======
  /**
   * Convert kebab-case animation names to camelCase
   * 
   * Converts animation names from timeline format to animation manager format:
   * walk-think → walkThink, sit-talk → sitTalk, etc.
   * 
   * @param {string} name - Animation name in kebab-case
   * @returns {string} Animation name in camelCase, or 'idle' if invalid
   */
  const normalizeAnimationName = (name) => {
    if (!name || typeof name !== 'string') return DEFAULT_ANIMATION
    return name.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
  }

  /**
   * Safe logging utility - respects DEBUG_MODE
   * @param {string} context - Function context (e.g., '[update]')
   * @param {string} message - Log message
   * @param {*} data - Optional data to log
   */
  const log = (context, message, data = null) => {
    if (!DEBUG_MODE) return
    const prefix = `🎬 ${context}`
    if (data !== null) {
      console.log(prefix, message, data)
    } else {
      console.log(prefix, message)
    }
  }

  // ====== Initialization ======
  /**
   * Initialize the sync controller with animation script and duration
   * 
   * Must be called before any playback. Sets up the animation timeline
   * and resets all playback state.
   * 
   * @param {Object} script - Animation script with timeline frames
   * @param {number} audioDuration - Audio duration in seconds
   * @throws {Error} If script or duration are invalid
   */
  const initialize = (script, audioDuration) => {
    if (!isValidScript(script)) {
      console.error('🎬 [initialize] Invalid animation script', script)
      throw new Error('Animation script must have valid timeline array')
    }

    if (!isValidDuration(audioDuration)) {
      console.error('🎬 [initialize] Invalid duration', audioDuration)
      throw new Error('Duration must be a positive number')
    }

    // Reset state
    animationScript.value = script
    duration.value = audioDuration
    currentTime.value = 0
    isPlaying.value = false
    currentFrame.value = null
    nextFrame.value = null
    currentAnimation.value = DEFAULT_ANIMATION
    currentExpression.value = DEFAULT_EXPRESSION
    currentIntensity.value = DEFAULT_INTENSITY

    console.log(`🎬 [initialize] Sync controller initialized: ${script.timeline.length} frames, ${audioDuration.toFixed(2)}s duration`)
  }

  // ====== Timeline Navigation ======
  /**
   * Find the animation frame(s) at a given time
   * 
   * Searches timeline for the frame containing the given time.
   * Also returns the next frame for lookahead transitions.
   * 
   * @param {number} time - Elapsed time in seconds
   * @returns {Object} Object with { current, next } frame references (or null if not found)
   * @private
   */
  const getCurrentFrame = (time) => {
    if (!animationScript.value?.timeline) {
      log('[getCurrentFrame]', 'No timeline available')
      return { current: null, next: null }
    }

    const timeline = animationScript.value.timeline

    // Find frame containing this time
    for (let i = 0; i < timeline.length; i++) {
      const frame = timeline[i]
      if (time >= frame.startTime && time < frame.endTime) {
        const next = timeline[i + 1] || null
        log('[getCurrentFrame]', `Found frame at ${time.toFixed(2)}s: ${frame.animation}`)
        return { current: frame, next }
      }
    }

    // Handle time before first frame
    if (timeline.length > 0 && time < timeline[0].startTime) {
      const current = timeline[0]
      const next = timeline[1] || null
      log('[getCurrentFrame]', `Time before first frame, using: ${current.animation}`)
      return { current, next }
    }

    log('[getCurrentFrame]', `No frame found at time ${time.toFixed(2)}s`)
    return { current: null, next: null }
  }

  /**
   * Calculate progress within the current frame (0-1)
   * 
   * @param {Object} frame - Timeline frame
   * @param {number} time - Current elapsed time
   * @returns {number} Progress 0-1 clamped
   * @private
   */
  const calculateFrameProgress = (frame, time) => {
    const duration = frame.endTime - frame.startTime
    if (duration <= 0) return 0
    const progress = (time - frame.startTime) / duration
    return Math.max(0, Math.min(1, progress))
  }

  // ====== Update & Synchronization ======
  /**
   * Update sync controller based on current audio time
   * 
   * Called each frame during audio playback to:
   * - Find current timeline frame
   * - Update animation state
   * - Track frame progress
   * - Signal when to transition animations
   * 
   * @param {number} audioTime - Current audio time in seconds
   * @returns {Object|null} Sync state with animation/expression info, or null if no timeline
   */
  const update = (audioTime) => {
    currentTime.value = audioTime

    // Guard: No timeline available
    if (!animationScript.value?.timeline) {
      log('[update]', `No timeline at ${audioTime.toFixed(2)}s`)
      return null
    }

    const { current, next } = getCurrentFrame(audioTime)

    // Guard: No frame found at this time
    if (!current) {
      log('[update]', `No frame at ${audioTime.toFixed(2)}s`)
      return null
    }

    // Update state from current frame
    currentFrame.value = current
    nextFrame.value = next
    const normalizedAnimation = normalizeAnimationName(current.animation)
    currentAnimation.value = normalizedAnimation
    currentExpression.value = current.expression || DEFAULT_EXPRESSION
    currentIntensity.value = current.intensity || DEFAULT_INTENSITY

    // Calculate progress within frame
    const frameProgress = calculateFrameProgress(current, audioTime)
    const shouldTransition = frameProgress > TRANSITION_THRESHOLD && next

    log('[update]', `Time: ${audioTime.toFixed(2)}s | Animation: ${normalizedAnimation} | Progress: ${frameProgress.toFixed(2)}`)

    return {
      animation: normalizedAnimation,
      expression: currentExpression.value,
      intensity: currentIntensity.value,
      frameProgress,
      notes: current.notes,
      shouldTransition,
      currentFrame: current,
      nextFrame: next
    }
  }

  // ====== Playback Control ======
  /**
   * Set playback state
   * @param {boolean} playing - True if audio is playing
   */
  const setPlaying = (playing) => {
    isPlaying.value = Boolean(playing)
  }

  /**
   * Seek to a specific time in the timeline
   * 
   * Clamps time to valid range [0, duration] and updates sync state.
   * 
   * @param {number} time - Target time in seconds
   * @returns {Object|null} Updated sync state after seeking
   */
  const seek = (time) => {
    if (!isValidDuration(duration.value)) {
      console.warn('🎬 [seek] Duration not set')
      return null
    }

    const clampedTime = Math.max(0, Math.min(time, duration.value))
    currentTime.value = clampedTime
    return update(clampedTime)
  }

  // ====== Debugging & Inspection ======
  /**
   * Get overview of entire timeline for debugging
   * 
   * @returns {Array} Array of frame info objects
   */
  const getTimelineOverview = () => {
    if (!animationScript.value?.timeline) return []

    return animationScript.value.timeline.map((frame, i) => ({
      index: i,
      animation: frame.animation,
      expression: frame.expression || DEFAULT_EXPRESSION,
      startTime: frame.startTime.toFixed(2),
      endTime: frame.endTime.toFixed(2),
      duration: (frame.endTime - frame.startTime).toFixed(2),
      intensity: frame.intensity?.toFixed(2) || DEFAULT_INTENSITY,
      notes: frame.notes || ''
    }))
  }

  /**
   * Log current controller state for debugging
   */
  const debugState = () => {
    console.log('🎬 ═══ AnimationAudioSync State ═══')
    console.log(`   ⏱️  Time: ${currentTime.value.toFixed(2)}s / ${duration.value.toFixed(2)}s`)
    console.log(`   📊 Progress: ${timelineProgress.value.toFixed(1)}%`)
    console.log(`   ▶️  Playing: ${isPlaying.value}`)
    console.log(`   🎭 Animation: ${currentAnimation.value}`)
    console.log(`   😊 Expression: ${currentExpression.value}`)
    console.log(`   🔊 Intensity: ${currentIntensity.value.toFixed(2)}`)
    if (currentFrame.value) {
      console.log(`   📍 Frame: ${currentFrame.value.animation} (${currentFrame.value.startTime.toFixed(2)}s–${currentFrame.value.endTime.toFixed(2)}s)`)
    }
    if (nextFrame.value) {
      console.log(`   ⏭️  Next: ${nextFrame.value.animation}`)
    }
    console.log(`   📜 Timeline: ${animationScript.value?.timeline?.length || 0} frames`)
    console.log('🎬 ═════════════════════════════════')
  }

  // ====== Public API ======
  return {
    // ──── State References (read from watchers) ────
    animationScript,      // Entire animation script object
    currentTime,          // Current playback time (seconds)
    isPlaying,            // Playback state
    duration,             // Total duration (seconds)
    currentFrame,         // Current timeline frame object
    nextFrame,            // Next timeline frame (for lookahead)
    currentAnimation,     // Current animation name (normalized)
    currentExpression,    // Current facial expression
    currentIntensity,     // Current intensity (0-1)
    timelineProgress,     // Overall progress (0-100%)

    // ──── Control Methods ────
    initialize,           // Initialize with script and duration
    update,               // Update state based on audio time (call each frame)
    setPlaying,           // Set playback state
    seek,                 // Seek to specific time

    // ──── Inspection Methods ────
    getCurrentFrame,      // Get frame at time (internal use)
    getTimelineOverview,  // Get all frames for debugging
    debugState            // Log state snapshot
  }
}
