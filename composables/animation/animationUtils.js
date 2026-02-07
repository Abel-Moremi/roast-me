/**
 * Animation Utility Functions
 * Helper functions for animation operations and logging
 */

/**
 * Safe get animation clip from animations object
 * @param {Object} animations - Animations reference object
 * @param {string} clipName - Name of the animation clip
 * @returns {Object|null} Animation data or null if not found
 */
export function getAnimationClip(animations, clipName) {
  if (!animations || !clipName) return null
  return animations[clipName] || null
}

/**
 * Safe get bone from bones object
 * @param {Object} bones - Bones reference object
 * @param {string} boneName - Name of the bone
 * @returns {Object|null} Bone or null if not found
 */
export function getBone(bones, boneName) {
  if (!bones || !boneName) return null
  return bones[boneName] || null
}

/**
 * Format animation clip information for display
 * @param {string} name - Clip name
 * @param {number} duration - Clip duration in seconds
 * @returns {string} Formatted string
 */
export function formatAnimationInfo(name, duration) {
  return `${name} (${duration.toFixed(2)}s)`
}

/**
 * Format animation state information
 * @param {Object} state - State object with name and weight
 * @returns {string} Formatted string
 */
export function formatStateInfo(stateName, stateConfig) {
  return `${stateName}: "${stateConfig.clipName}" [${stateConfig.description}]`
}

/**
 * Validate animation state
 * @param {string} state - State to validate
 * @param {Object} validStates - Valid states object
 * @returns {boolean} True if valid
 */
export function isValidAnimationState(state, validStates) {
  return state && validStates && validStates[state] ? true : false
}

/**
 * Calculate transition progress
 * @param {number} elapsed - Elapsed time in seconds
 * @param {number} duration - Total duration in seconds
 * @returns {number} Progress between 0 and 1
 */
export function calculateTransitionProgress(elapsed, duration) {
  if (duration <= 0) return 1
  return Math.min(elapsed / duration, 1)
}

/**
 * Check if animation action is playing
 * @param {Object} action - Three.js AnimationAction
 * @returns {boolean} True if running
 */
export function isAnimationPlaying(action) {
  return action && action.isRunning ? action.isRunning() : false
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
