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
    idle: { name: 'Idle', weight: 1.0 },
    walk: { name: 'Walk', weight: 0.5 },
    run: { name: 'Run', weight: 0.7 },
    custom: { name: 'Custom', weight: 0.0 }
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

  const currentState = ref('idle')
  const targetState = ref('idle')
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
   * @param {THREE.Object3D} modelRef - The loaded model
   */
  function initialize(modelRef) {
    if (!modelRef) {
      console.error('❌ No model provided to animation manager')
      return
    }

    model.value = modelRef
    console.log('🎬 Initializing ActorCore Animation Manager...')
    console.log(`   Model object: ${modelRef.name || 'unnamed'}`)
    console.log(`   Model has animations property: ${modelRef.animations ? 'yes' : 'no'}`)
    console.log(`   Animation count: ${modelRef.animations ? modelRef.animations.length : 0}`)

    // Create mixer
    mixer.value = new THREE.AnimationMixer(modelRef)
    console.log('✓ Animation mixer created')

    // Try to find animations
    let animationClips = null
    
    // First check the model itself
    if (modelRef.animations && modelRef.animations.length > 0) {
      animationClips = modelRef.animations
      console.log(`📹 Found ${animationClips.length} animation clip(s) on model`)
    } else {
      // Check if it's a GLTF result object
      if (modelRef.animations) {
        animationClips = modelRef.animations
        console.log(`📹 Found ${animationClips.length} animation clip(s) on GLTF object`)
      } else {
        console.warn('⚠️ No animations found!')
        console.log('   This model has no animation clips loaded.')
        return
      }
    }

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
      console.log(`Total stored: ${Object.keys(animations.value).length}`)
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

    if (currentState.value === newState && !isTransitioning.value) {
      return  // Already in this state
    }

    console.log(`🎬 Transitioning: ${currentState.value} → ${newState}`)

    targetState.value = newState
    transitionSpeed.value = speed
    isTransitioning.value = true

    const stateName = ANIMATION_STATES[newState].name
    console.log(`  Looking for animation: "${stateName}"`)
    console.log(`  Available animations: ${Object.keys(animations.value).join(', ')}`)

    if (animations.value[stateName]) {
      console.log(`  ✓ Found animation: ${stateName}`)
      playAnimationClip(stateName, speed)
    } else {
      console.warn(`  ✗ Animation not found: ${stateName}`)
      
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
    applyProceduralOverrides,

    // Debug
    debugState,
    debugBones,
    debugModel,

    // Config (exported for customization)
    BONE_MAP,
    ANIMATION_STATES,
    PROCEDURAL_CONFIG
  }
}
