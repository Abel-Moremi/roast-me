/**
 * Animation Constants
 * Centralized animation configuration and state definitions
 */

/**
 * Available animation states and their corresponding GLTF clip names
 * @type {Object}
 */
export const ANIMATION_STATES = {
  idle: { clipName: 'idle', weight: 1.0, description: 'Standing idle' },
  walkRelaxed: { clipName: 'walk-relaxed-loop', weight: 0.8, description: 'Casual walking' },
  walk: { clipName: 'walk-relaxed-loop', weight: 0.8, description: 'Walking' },
  walkThink: { clipName: 'walk-think', weight: 0.7, description: 'Walking while thinking' },
  run: { clipName: 'aerobic-dance', weight: 0.9, description: 'Running/energetic movement' },
  relax: { clipName: 'relax', weight: 1.0, description: 'Relaxing pose' },
  sitTalk: { clipName: 'sit-talk', weight: 1.0, description: 'Sitting and talking' },
  spellcast: { clipName: 'spellcast', weight: 0.8, description: 'Spellcast gesture' },
  action: { clipName: 'Action', weight: 0.9, description: 'Action pose' },
  default: { clipName: 'Default', weight: 1.0, description: 'Default pose' }
}

/**
 * ActorCore bone naming conventions and mappings
 * Maps logical bone names to actual GLTF bone names
 * @type {Object}
 */
export const BONE_MAP = {
  // Head/Neck
  head: ['CC_Base_NeckTwist01', 'CC_Base_Head'],
  neck: ['CC_Base_Neck', 'CC_Base_NeckTwist01'],

  // Spine
  chest: ['CC_Base_Spine02', 'CC_Base_Spine'],
  spine: ['CC_Base_Spine', 'CC_Base_Spine01'],
  hip: ['CC_Base_Hip', 'CC_Base_Hips'],

  // Arms
  armL: ['CC_Base_L_Upperarm', 'CC_Base_L_UpperArm'],
  armR: ['CC_Base_R_Upperarm', 'CC_Base_R_UpperArm'],
  forearmL: ['CC_Base_L_Forearm', 'CC_Base_L_Forearm'],
  forearmR: ['CC_Base_R_Forearm', 'CC_Base_R_Forearm'],

  // Shoulders
  shoulderL: ['CC_Base_L_Clavicle'],
  shoulderR: ['CC_Base_R_Clavicle']
}

/**
 * Procedural micro-movements configuration
 * Fine-tuned breathing, sway, and bounce for natural idle animation layering
 * @type {Object}
 */
export const PROCEDURAL_CONFIG = {
  breathing: {
    enabled: true,
    bones: ['chest'],
    speed: 0.5,      // Hz
    range: 0.02,     // Radians
    axis: 'x'
  },
  headSway: {
    enabled: true,
    bones: ['head'],
    speed: 0.6,
    range: 0.03,
    axis: 'z'
  },
  shoulderBounce: {
    enabled: true,
    bones: ['shoulderL', 'shoulderR'],
    speed: 0.4,
    range: 0.02,
    axis: 'x'
  }
}

/**
 * Default animation configuration
 * @type {Object}
 */
export const DEFAULT_ANIMATION_CONFIG = {
  defaultState: 'relax',
  transitionDuration: 0.3,
  enableProcedural: true
}

/**
 * Animation manager states for internal tracking
 * @type {Object}
 */
export const ANIMATION_MANAGER_STATES = {
  UNINITIALIZED: 'uninitialized',
  READY: 'ready',
  TRANSITIONING: 'transitioning',
  ERROR: 'error'
}

/**
 * Debug mode levels
 * @type {Object}
 */
export const DEBUG_LEVELS = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  VERBOSE: 4
}
