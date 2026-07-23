/**
 * useAnimationManager - Nuxt Composition API
 * 
 * Manages GLTF model animations with state machine transitions
 * Features:
 *  - Baked animation playback with smooth transitions
 *  - Procedural micro-movements (breathing, sway, bounce)
 *  - Head tracking and lookAt functionality
 *  - Comprehensive debug logging
 * 
 * @usage
 * const { initialize, setState, update } = useAnimationManager()
 * 
 * // On model load
 * initialize(gltfObject)
 * 
 * // In animation loop
 * update(deltaTime)
 * 
 * // State transitions
 * setState('walk', 0.3)  // 0.3 second transition
 */

import { ref, computed } from 'vue'
import * as THREE from 'three'
import { 
  ANIMATION_STATES, 
  BONE_MAP, 
  PROCEDURAL_CONFIG, 
  DEFAULT_ANIMATION_CONFIG 
} from './animationConstants'
import { 
  isValidAnimationState, 
  getAnimationClip,
  getBone,
  calculateTransitionProgress,
  isAnimationPlaying 
} from './animationUtils'

export function useAnimationManager() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const model = ref(null)
  const mixer = ref(null)
  const bones = ref({})
  const boneBaseRotations = ref({})
  const animations = ref({})

  // Animation state tracking
  const currentState = ref(DEFAULT_ANIMATION_CONFIG.defaultState)
  const targetState = ref(DEFAULT_ANIMATION_CONFIG.defaultState)
  const transitionSpeed = ref(DEFAULT_ANIMATION_CONFIG.transitionDuration)
  const isTransitioning = ref(false)
  const isStateLocked = ref(false)

  // Procedural animation time tracking
  const time = ref(0)
  const audioIntensity = ref(0)
  const isEnabled = ref(true)

  // Tracks the currently playing THREE.AnimationAction so transitions can
  // crossfade out of it instead of leaving it running at full weight
  let currentAction = null

  // ============================================
  // COMPUTED PROPERTIES
  // ============================================
  const canTransition = computed(() => !isStateLocked.value && !isTransitioning.value)
  const animationCount = computed(() => Object.keys(animations.value).length)
  const boneCount = computed(() => Object.keys(bones.value).length)

  // ============================================
  // INITIALIZATION
  // ============================================
  /**
   * Initialize animation manager with GLTF data
   * Handles both GLTF result objects and Scene objects
   * 
   * @param {THREE.Scene|Object} input - GLTF result or Scene object
   * @returns {boolean} Success status
   */
  function initialize(input) {
    try {
      if (!input) {
        console.error('❌ AnimationManager: No input provided')
        return false
      }

      let modelRef = input
      let animationClips = null

      // Detect GLTF result object (has animations array)
      if (input.animations && Array.isArray(input.animations) && input.animations.length > 0) {
        animationClips = input.animations
        modelRef = input.scene || input
        console.log('📹 Detected GLTF result with animations')
      }
      // Detect Scene object with animations
      else if ((input.type === 'Scene' || input.type === 'Group') && input.animations) {
        animationClips = input.animations
        console.log('📹 Detected Scene with animations')
      }

      if (!animationClips || animationClips.length === 0) {
        console.warn('⚠️ AnimationManager: No animation clips found')
        return false
      }

      // Create mixer
      model.value = modelRef
      mixer.value = new THREE.AnimationMixer(modelRef)
      console.log(`✅ AnimationManager initialized with mixer`)

      // Cache all animation clips
      cacheAnimationClips(animationClips)

      // Cache bone references
      cacheBones(modelRef)

      console.log(`✅ AnimationManager ready: ${animationCount.value} animations, ${boneCount.value} bones`)
      return true
    } catch (error) {
      console.error('❌ AnimationManager initialization failed:', error)
      return false
    }
  }

  /**
   * Cache animation clips for quick access
   * @private
   * @param {Array} clips - THREE.AnimationClip array
   */
  function cacheAnimationClips(clips) {
    console.log(`📹 Caching ${clips.length} animation clips:`)
    clips.forEach((clip, idx) => {
      animations.value[clip.name] = {
        clip,
        action: null,
        weight: 0
      }
      console.log(`  [${idx}] "${clip.name}" (${clip.duration.toFixed(2)}s)`)
    })
  }

  /**
   * Cache bone references using BONE_MAP
   * @private
   * @param {THREE.Scene|THREE.Object3D} modelRef - Model to search
   */
  function cacheBones(modelRef) {
    console.log('🦴 Caching bones...')
    let found = 0

    Object.entries(BONE_MAP).forEach(([logicalName, variants]) => {
      const names = Array.isArray(variants) ? variants : [variants]
      for (const name of names) {
        const bone = modelRef.getObjectByName(name)
        if (bone && bone.isBone) {
          bones.value[logicalName] = bone
          boneBaseRotations.value[logicalName] = {
            x: bone.rotation.x,
            y: bone.rotation.y,
            z: bone.rotation.z
          }
          console.log(`  ✓ ${logicalName} → ${name}`)
          found++
          break  // Found this bone, move to next logical name
        }
      }
    })

    console.log(`✅ Cached ${found} bones`)
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  /**
   * Transition to a new animation state
   * 
   * @param {string} newState - Target state (from ANIMATION_STATES)
   * @param {number} speed - Transition duration in seconds
   * @returns {boolean} Success status
   */
  function setState(newState, speed = DEFAULT_ANIMATION_CONFIG.transitionDuration) {
    // Validate state
    if (!isValidAnimationState(newState, ANIMATION_STATES)) {
      console.warn(`⚠️ AnimationManager: Unknown state "${newState}"`)
      return false
    }

    // Check if locked
    if (isStateLocked.value) {
      console.log(`🔒 AnimationManager: State is locked, transition blocked`)
      return false
    }

    // Check if already in target state
    const forcePlay = currentState.value === newState && speed === 0
    if (currentState.value === newState && !forcePlay) {
      return true  // Already in this state
    }

    // Begin transition
    console.log(`🎬 Transitioning: ${currentState.value} → ${newState}`)
    targetState.value = newState
    transitionSpeed.value = speed
    isTransitioning.value = true

    // Play animation clip
    const stateConfig = ANIMATION_STATES[newState]
    const clipName = stateConfig.clipName

    if (playAnimationClip(clipName, speed)) {
      console.log(`  ✓ Animation started: "${clipName}"`)
      return true
    } else {
      console.warn(`  ✗ Failed to play: "${clipName}"`)
      return false
    }
  }

  /**
   * Play an animation clip with fade transition
   * 
   * @private
   * @param {string} clipName - Name of the clip to play
   * @param {number} fadeDuration - Fade duration in seconds
   * @returns {boolean} Success status
   */
  function playAnimationClip(clipName, fadeDuration = 0.3) {
    if (!mixer.value) {
      console.error('❌ AnimationManager: Mixer not initialized')
      return false
    }

    const animData = getAnimationClip(animations.value, clipName)
    if (!animData) {
      console.warn(`⚠️ AnimationManager: Clip not found "${clipName}"`)
      return false
    }

    // Create action if needed
    if (!animData.action) {
      animData.action = mixer.value.clipAction(animData.clip)
      animData.action.loop = THREE.LoopRepeat
      animData.action.clampWhenFinished = false
    }

    const newAction = animData.action
    const previousAction = currentAction

    if (previousAction && previousAction !== newAction && fadeDuration > 0) {
      // Crossfade: ease the old action's weight to 0 while easing the new
      // one to 1, so both actions blend smoothly instead of the old one
      // continuing to play at full weight indefinitely.
      previousAction.fadeOut(fadeDuration)
      newAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fadeDuration).play()
    } else {
      if (previousAction && previousAction !== newAction) {
        previousAction.stop()
      }
      newAction.reset().setEffectiveWeight(1).play()
    }

    currentAction = newAction
    return true
  }

  /**
   * Lock the current state to prevent transitions
   * Useful for enforcing a constant animation state
   * 
   * @param {string} stateToHold - State to lock to
   */
  function holdState(stateToHold) {
    if (!isValidAnimationState(stateToHold, ANIMATION_STATES)) {
      console.warn(`⚠️ AnimationManager: Cannot hold invalid state "${stateToHold}"`)
      return
    }

    targetState.value = stateToHold
    currentState.value = stateToHold
    isTransitioning.value = false
    isStateLocked.value = true

    console.log(`🔒 State locked: ${stateToHold}`)
  }

  /**
   * Unlock state to allow transitions
   */
  function unlockState() {
    isStateLocked.value = false
    console.log(`🔓 State unlocked`)
  }

  /**
   * Get current animation state
   * 
   * @returns {string} Current state
   */
  function getState() {
    return currentState.value
  }

  // ============================================
  // PROCEDURAL ANIMATIONS
  // ============================================
  /**
   * Apply procedural micro-movements
   * Called AFTER mixer.update() for layering effects
   * 
   * @private
   * @param {number} delta - Delta time in seconds
   */
  function applyProceduralOverrides(delta) {
    if (!isEnabled.value || !mixer.value) return

    time.value += delta

    // Apply each configured procedural movement
    applyBreathing()
    applyHeadSway()
    applyShoulderBounce()
  }

  /**
   * Apply breathing animation to chest
   * @private
   */
  function applyBreathing() {
    const config = PROCEDURAL_CONFIG.breathing
    if (!config.enabled) return

    const bone = getBone(bones.value, config.bones[0])
    if (!bone) return

    const sine = Math.sin(time.value * config.speed * Math.PI * 2)
    const baseRotation = boneBaseRotations.value[config.bones[0]]
    bone.rotation[config.axis] = baseRotation[config.axis] + sine * config.range
  }

  /**
   * Apply head sway animation
   * @private
   */
  function applyHeadSway() {
    const config = PROCEDURAL_CONFIG.headSway
    if (!config.enabled) return

    const bone = getBone(bones.value, config.bones[0])
    if (!bone) return

    const sine = Math.sin(time.value * config.speed * Math.PI * 2)
    const baseRotation = boneBaseRotations.value[config.bones[0]]
    bone.rotation[config.axis] = baseRotation[config.axis] + sine * config.range
  }

  /**
   * Apply shoulder bounce animation
   * @private
   */
  function applyShoulderBounce() {
    const config = PROCEDURAL_CONFIG.shoulderBounce
    if (!config.enabled) return

    config.bones.forEach((boneName) => {
      const bone = getBone(bones.value, boneName)
      if (!bone) return

      const sine = Math.sin(time.value * config.speed * Math.PI * 2)
      const baseRotation = boneBaseRotations.value[boneName]
      bone.rotation[config.axis] = baseRotation[config.axis] + sine * config.range
    })
  }

  // ============================================
  // CONTROL & UPDATE
  // ============================================
  /**
   * Main update function - call every frame
   * 
   * @param {number} delta - Delta time in seconds
   * @param {number} audioIntensityValue - Audio intensity for reactive animation (0-1)
   */
  function update(delta, audioIntensityValue = 0) {
    if (!mixer.value || !isEnabled.value) return

    // Update audio intensity
    audioIntensity.value = audioIntensityValue

    // Update mixer (plays baked animations)
    mixer.value.update(delta)

    // Handle state transitions
    if (isTransitioning.value) {
      if (targetState.value === currentState.value) {
        isTransitioning.value = false
      }
    }

    // Ensure current state matches target
    currentState.value = targetState.value

    // Apply procedural overlays
    applyProceduralOverrides(delta)
  }

  /**
   * Enable animation updates
   */
  function enable() {
    isEnabled.value = true
    console.log('✓ AnimationManager enabled')
  }

  /**
   * Disable animation updates
   */
  function disable() {
    isEnabled.value = false
    console.log('✗ AnimationManager disabled')
  }

  // ============================================
  // DEBUG & INTROSPECTION
  // ============================================
  /**
   * Print current animation manager state
   */
  function debugState() {
    console.log('🎬 AnimationManager State:')
    console.log(`  Current: ${currentState.value}`)
    console.log(`  Target: ${targetState.value}`)
    console.log(`  Transitioning: ${isTransitioning.value}`)
    console.log(`  Locked: ${isStateLocked.value}`)
    console.log(`  Animations: ${animationCount.value}`)
    console.log(`  Bones: ${boneCount.value}`)

    if (animationCount.value > 0) {
      console.log('  🎬 Playing:')
      Object.entries(animations.value).forEach(([name, data]) => {
        if (isAnimationPlaying(data.action)) {
          console.log(`    - ${name}`)
        }
      })
    }
  }

  /**
   * Print all cached bones
   */
  function debugBones() {
    console.log('🦴 Cached Bones:')
    Object.entries(bones.value).forEach(([logicalName, bone]) => {
      console.log(`  ${logicalName}: ${bone.name}`)
    })
  }

  /**
   * Print all available animation states and their mappings
   */
  function debugAvailableStates() {
    console.log('📋 Available Animation States:')
    console.log('='.repeat(60))
    Object.entries(ANIMATION_STATES).forEach(([stateKey, config]) => {
      console.log(`  window.setAnimationState('${stateKey}')`)
      console.log(`    └─ Plays: "${config.clipName}" - ${config.description}`)
    })
    console.log('='.repeat(60))
  }

  /**
   * Print loaded animations from model
   */
  function debugModel() {
    console.log('📦 Model Debug Info:')
    if (model.value) {
      console.log(`  Model: ${model.value.name || 'unnamed'}`)
      console.log(`  Animations loaded: ${animationCount.value}`)

      if (animationCount.value > 0) {
        console.log('  📹 Animation clips:')
        Object.entries(animations.value).forEach(([name, data]) => {
          const duration = data.clip ? data.clip.duration.toFixed(2) : '?'
          console.log(`    - "${name}" (${duration}s)`)
        })
      }
    } else {
      console.warn('  ⚠️ No model loaded')
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================
  return {
    // State properties
    currentState,
    targetState,
    isEnabled,
    isStateLocked,

    // Core methods
    initialize,
    setState,
    getState,
    holdState,
    unlockState,
    update,
    enable,
    disable,

    // Debug methods
    debugState,
    debugBones,
    debugModel,
    debugAvailableStates,

    // Computed properties
    canTransition,
    animationCount,
    boneCount
  }
}
