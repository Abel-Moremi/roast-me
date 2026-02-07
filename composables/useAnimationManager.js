/**
 * useAnimationManager Composable
 * Hybrid State Machine for ActorCore models
 * Handles baked animations + procedural overrides with smooth transitions
 */

import { ref } from 'vue'
import * as THREE from 'three'

export function useAnimationManager() {
  // ============================================
  // BONE MAPPING - CC_Base_ Hierarchy
  // ============================================
  const BONE_MAP = {
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

  // ============================================
  // ANIMATION STATE DEFINITION
  // ============================================
  const ANIMATION_STATES = {
    idle: { clipName: 'idle', weight: 1.0 },
    walkRelaxed: { clipName: 'walk-relaxed-loop', weight: 0.8 },
    walk: { clipName: 'walk-relaxed-loop', weight: 0.8 },
    walkThink: { clipName: 'walk-think', weight: 0.7 },
    run: { clipName: 'aerobic-dance', weight: 0.9 },
    relax: { clipName: 'relax', weight: 1.0 },
    sitTalk: { clipName: 'sit-talk', weight: 1.0 },
    spellcast: { clipName: 'spellcast', weight: 0.8 },
    action: { clipName: 'Action', weight: 0.9 },
    default: { clipName: 'Default', weight: 1.0 }
  }

  // ============================================
  // PROCEDURAL MICRO-MOVEMENTS CONFIG
  // ============================================
  const PROCEDURAL_CONFIG = {
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

  // ============================================
  // STATE VARIABLES
  // ============================================
  const model = ref(null)
  const mixer = ref(null)
  const bones = ref({})
  const boneBaseRotations = ref({})
  const animations = ref({})

  const currentState = ref('relax')
  const targetState = ref('relax')
  const transitionSpeed = ref(0.3)  // Seconds
  const isTransitioning = ref(false)

  const time = ref(0)
  const audioIntensity = ref(0)
  const isEnabled = ref(true)

  // Track active actions
  const activeActions = ref({})

  // ============================================
  // INITIALIZATION
  // ============================================
  /**
   * Initialize animation manager
   * Can accept either a model (scene) or a GLTF result object
   */
  function initialize(input) {
    if (!input) {
      console.error('❌ No model provided to animation manager')
      return
    }

    let modelRef = input
    let animationClips = null
    
    console.log('🎬 Initializing ActorCore Animation Manager...')
    
    // Check if input has animations array (GLTF result)
    if (input.animations && Array.isArray(input.animations) && input.animations.length > 0) {
      animationClips = input.animations
      // Use scene for mixer if available, otherwise input
      if (input.scene) {
        modelRef = input.scene
        console.log('📹 Detected GLTF result object with gltf.scene')
      }
      console.log(`📹 Found ${animationClips.length} animation clip(s)`)
    }
    // Check if it's a scene/model with animations
    else if (input.type === 'Scene' || input.type === 'Group') {
      modelRef = input
      if (input.animations && input.animations.length > 0) {
        animationClips = input.animations
        console.log(`📹 Found ${animationClips.length} animation clip(s) on scene`)
      }
    }
    
    if (!modelRef || !animationClips || animationClips.length === 0) {
      console.warn('⚠️ No animations found or invalid input')
      return
    }

    model.value = modelRef
    console.log(`   Model object: ${modelRef.name || 'unnamed'}`)

    // Create mixer
    mixer.value = new THREE.AnimationMixer(modelRef)
    console.log('✓ Animation mixer created')

    // Try to find animations
    let processedClips = 0
    // Cache all animations
    if (animationClips && animationClips.length > 0) {
      console.log(`📹 Processing ${animationClips.length} animation clip(s):`)
      animationClips.forEach((clip, idx) => {
        console.log(`  [${idx}] Name: "${clip.name}", Duration: ${clip.duration.toFixed(2)}s`)
        animations.value[clip.name] = {
          clip,
          action: null,
          weight: 0
        }
        console.log(`      ✓ Stored in animations.value`)
      })
      console.log(`✅ Total animations loaded: ${Object.keys(animations.value).length}`)
    }

    // Cache bones using bone map
    cacheBones(modelRef)

    console.log(`✅ Animation manager ready with ${Object.keys(bones.value).length} cached bones`)
  }

  /**
   * Cache bone references to avoid repeated lookups
   */
  function cacheBones(modelRef) {
    console.log('🔍 Caching bones...')

    Object.entries(BONE_MAP).forEach(([key, nameVariants]) => {
      const names = Array.isArray(nameVariants) ? nameVariants : [nameVariants]

      for (const name of names) {
        const bone = modelRef.getObjectByName(name)
        if (bone && bone.isBone) {
          bones.value[key] = bone
          boneBaseRotations.value[key] = {
            x: bone.rotation.x,
            y: bone.rotation.y,
            z: bone.rotation.z
          }
          console.log(`  ✓ ${key} → ${name}`)
          break
        }
      }
    })
  }

  // ============================================
  // STATE MACHINE
  // ============================================
  /**
   * Transition to a new animation state
   * @param {string} newState - Target state (idle, walk, run)
   * @param {number} speed - Transition duration in seconds
   */
  function setState(newState, speed = 0.3) {
    if (!ANIMATION_STATES[newState]) {
      console.warn(`⚠️ Unknown state: ${newState}`)
      return
    }

    // For initialization (when both current and target are same), force it
    const forcePlay = currentState.value === newState && targetState.value === newState && !isTransitioning.value && speed === 0

    if (currentState.value === newState && !isTransitioning.value && !forcePlay) {
      return  // Already in this state
    }

    console.log(`🎬 Transitioning: ${currentState.value} → ${newState}`)

    targetState.value = newState
    transitionSpeed.value = speed
    isTransitioning.value = true

    const clipName = ANIMATION_STATES[newState].clipName
    console.log(`  Looking for animation: "${clipName}"`)
    console.log(`  Available animations: ${Object.keys(animations.value).join(', ')}`)

    if (animations.value[clipName]) {
      console.log(`  ✓ Found animation: ${clipName}`)
      playAnimationClip(clipName, speed)
    } else {
      console.warn(`  ✗ Animation not found: ${clipName}`)
      
      // Try to find any animation that contains this word
      const fuzzyMatch = Object.keys(animations.value).find(name =>
        name.toLowerCase().includes(newState.toLowerCase())
      )
      if (fuzzyMatch) {
        console.log(`  📍 Found similar: ${fuzzyMatch}`)
        playAnimationClip(fuzzyMatch, speed)
      }
    }
  }

  /**
   * Play an animation clip with crossfade
   */
  function playAnimationClip(clipName, fadeDuration = 0.3) {
    console.log(`📹 playAnimationClip called with: "${clipName}"`)
    
    const animData = animations.value[clipName]
    if (!animData) {
      console.warn(`⚠️ Animation data not found: ${clipName}`)
      return
    }

    if (!mixer.value) {
      console.error('❌ Mixer not initialized!')
      return
    }

    if (!animData.action) {
      console.log(`  Creating action for: ${clipName}`)
      animData.action = mixer.value.clipAction(animData.clip)
      animData.action.loop = THREE.LoopRepeat
      animData.action.clampWhenFinished = false
    }

    animData.action.reset()
    animData.action.play()
    console.log(`  ✓ Playing: ${clipName}`)
  }

  /**
   * Hold a state and prevent transitions
   */
  function holdState(stateToHold) {
    targetState.value = stateToHold
    currentState.value = stateToHold
    isTransitioning.value = false
    console.log(`🔒 Holding state: ${stateToHold}`)
  }

  /**
   * Get current state
   */
  function getState() {
    return currentState.value
  }

  // ============================================
  // PROCEDURAL OVERRIDES (Applied after mixer)
  // ============================================
  /**
   * Apply procedural micro-movements
   * IMPORTANT: Called AFTER mixer.update()
   */
  function applyProceduralOverrides(delta) {
    if (!isEnabled.value) return

    time.value += delta

    // Apply breathing
    if (PROCEDURAL_CONFIG.breathing.enabled && bones.value['chest']) {
      const config = PROCEDURAL_CONFIG.breathing
      const phaseValue = Math.sin(time.value * config.speed * Math.PI * 2) * config.range
      const bone = bones.value['chest']
      const baseRot = boneBaseRotations.value['chest']

      if (bone && baseRot) {
        const newRot = { ...baseRot }
        newRot[config.axis] = baseRot[config.axis] + phaseValue
        bone.rotation.set(newRot.x, newRot.y, newRot.z)
      }
    }

    // Apply head sway
    if (PROCEDURAL_CONFIG.headSway.enabled && bones.value['head']) {
      const config = PROCEDURAL_CONFIG.headSway
      const phaseValue = Math.sin(time.value * config.speed * Math.PI * 2) * config.range
      const bone = bones.value['head']
      const baseRot = boneBaseRotations.value['head']

      if (bone && baseRot) {
        const newRot = { ...baseRot }
        newRot[config.axis] = baseRot[config.axis] + phaseValue
        bone.rotation.set(newRot.x, newRot.y, newRot.z)
      }
    }

    // Apply shoulder bounce
    if (PROCEDURAL_CONFIG.shoulderBounce.enabled) {
      const config = PROCEDURAL_CONFIG.shoulderBounce
      const phaseValue = Math.sin(time.value * config.speed * Math.PI * 2) * config.range

      config.bones.forEach((boneName) => {
        const bone = bones.value[boneName]
        const baseRot = boneBaseRotations.value[boneName]

        if (bone && baseRot) {
          const newRot = { ...baseRot }
          newRot[config.axis] = baseRot[config.axis] + phaseValue
          bone.rotation.set(newRot.x, newRot.y, newRot.z)
        }
      })
    }
  }

  /**
   * Direct bone control (e.g., head tracking)
   */
  function setBoneRotation(boneName, x, y, z) {
    const bone = bones.value[boneName]
    if (bone) {
      bone.rotation.set(x, y, z)
    }
  }

  /**
   * Look at a target (head/eye tracking)
   */
  function lookAt(position) {
    const headBone = bones.value['head']
    if (headBone && position) {
      // Simple look-at: calculate angle to target
      const direction = new THREE.Vector3()
      direction.subVectors(position, headBone.getWorldPosition(new THREE.Vector3()))
      direction.normalize()

      // Apply subtle head rotation toward target
      const targetRot = new THREE.Euler().setFromVector3(direction)
      const baseRot = boneBaseRotations.value['head']

      // Blend toward target (40% toward, 60% baseline to keep natural)
      headBone.rotation.x = baseRot.x + (targetRot.x - baseRot.x) * 0.4
      headBone.rotation.y = baseRot.y + (targetRot.y - baseRot.y) * 0.4
    }
  }

  // ============================================
  // MAIN UPDATE LOOP
  // ============================================
  /**
   * Update - MUST BE CALLED EVERY FRAME
   * @param {number} delta - Delta time
   * @param {number} audioIntensityValue - Optional audio intensity for reactive animations
   */
  function update(delta, audioIntensityValue = 0) {
    if (!mixer.value || !isEnabled.value) return

    audioIntensity.value = audioIntensityValue

    // 1. Update mixer (plays baked animations)
    mixer.value.update(delta)

    // 2. Handle state transitions
    if (isTransitioning.value) {
      // Transition complete
      if (targetState.value === currentState.value) {
        isTransitioning.value = false
      }
    }

    // Update to actual state after transition
    currentState.value = targetState.value

    // 3. Apply procedural overrides AFTER mixer (this is crucial!)
    applyProceduralOverrides(delta)
  }

  // ============================================
  // CONTROL METHODS
  // ============================================
  function enable() {
    isEnabled.value = true
    console.log('✓ Animation manager enabled')
  }

  function disable() {
    isEnabled.value = false
    console.log('✗ Animation manager disabled')
  }

  // ============================================
  // DEBUG
  // ============================================
  function debugState() {
    console.log('🎬 Animation Manager State:')
    console.log(`  Current: ${currentState.value}`)
    console.log(`  Target: ${targetState.value}`)
    console.log(`  Transitioning: ${isTransitioning.value}`)
    console.log(`  Mixer exists: ${mixer.value ? 'yes' : 'no'}`)
    console.log(`  Cached Bones: ${Object.keys(bones.value).length}`)
    console.log(`  Available Animations: ${Object.keys(animations.value).length}`)
    
    if (Object.keys(animations.value).length > 0) {
      console.log(`  Animation clips:`)
      Object.entries(animations.value).forEach(([name, data]) => {
        console.log(`    - ${name}: action=${data.action ? 'created' : 'not created'}, playing=${data.action?.isRunning() ? 'yes' : 'no'}`)
      })
    } else {
      console.warn('  ⚠️ No animations loaded!')
    }
  }

  function debugBones() {
    console.log('🦴 Cached Bones:')
    Object.entries(bones.value).forEach(([key, bone]) => {
      console.log(`  ${key}: ${bone.name}`)
    })
  }

  /**
   * Print all available animation states
   */
  function debugAvailableStates() {
    console.log('📋 Available Animation States:')
    console.log('=' .repeat(50))
    Object.entries(ANIMATION_STATES).forEach(([stateKey, stateConfig]) => {
      console.log(`  window.setAnimationState('${stateKey}')`)
      console.log(`    └─ Plays: "${stateConfig.clipName}"`)
    })
    console.log('=' .repeat(50))
  }

  /**
   * Check what's loaded in the model
   */
  function debugModel() {
    console.log('📦 Model Debug Info:')
    if (model.value) {
      console.log(`  Model name: ${model.value.name}`)
      console.log(`  Direct animations: ${model.value.animations ? model.value.animations.length : 0}`)
      
      if (model.value.animations && model.value.animations.length > 0) {
        console.log(`  Animation names:`)
        model.value.animations.forEach(clip => {
          console.log(`    - "${clip.name}"`)
        })
      }
    } else {
      console.log('  No model loaded yet')
    }
    
    console.log(`  Stored animations count: ${Object.keys(animations.value).length}`)
    if (Object.keys(animations.value).length > 0) {
      console.log(`  Stored animation names:`)
      Object.keys(animations.value).forEach(name => {
        console.log(`    - "${name}"`)
      })
    }
  }

  // ============================================
  // RETURN API
  // ============================================
  return {
    // State
    currentState,
    targetState,
    isEnabled,
    mixer,
    bones,
    animations,

    // Methods
    initialize,
    setState,
    getState,
    update,
    enable,
    disable,
    setBoneRotation,
    lookAt,
    holdState,
    applyProceduralOverrides,

    // Debug
    debugState,
    debugBones,
    debugModel,
    debugAvailableStates,

    // Config (exported for customization)
    BONE_MAP,
    ANIMATION_STATES,
    PROCEDURAL_CONFIG
  }
}
