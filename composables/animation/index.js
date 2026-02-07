/**
 * Animation Module Index
 * Exports all animation-related composables, utilities, and constants
 */

export { useAnimationManager } from './useAnimationManager'
export {
  ANIMATION_STATES,
  BONE_MAP,
  PROCEDURAL_CONFIG,
  DEFAULT_ANIMATION_CONFIG,
  ANIMATION_MANAGER_STATES,
  DEBUG_LEVELS
} from './animationConstants'
export {
  getAnimationClip,
  getBone,
  formatAnimationInfo,
  formatStateInfo,
  isValidAnimationState,
  calculateTransitionProgress,
  isAnimationPlaying,
  clamp
} from './animationUtils'
