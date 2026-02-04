/**
 * useProceduralAnimations Composable
 * Generates procedural animations for ActorCore models without baked animation clips
 * Creates Idle, Walk, and Run animations by manipulating bone transforms
 */

import { ref } from 'vue'

export function useProceduralAnimations() {
  // ============================================
  // ANIMATION DEFINITIONS - Procedural
  // ============================================
  const ANIMATIONS = {
    idle: {
      name: 'Idle',
      duration: 2.0,
      movements: {
        'Spine': {
          x: { amplitude: 0.02, frequency: 0.5, offset: 0 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: 0.04, frequency: 0.6, offset: 0 }
        },
        'Chest': {
          x: { amplitude: 0.01, frequency: 0.7, offset: 0 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: 0.02, frequency: 0.8, offset: 0 }
        },
        'Head': {
          x: { amplitude: 0.015, frequency: 0.4, offset: 0 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: 0.03, frequency: 0.5, offset: 0 }
        },
        'L_Upperarm': {
          x: { amplitude: 0.01, frequency: 0.3, offset: 0 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: 0.015, frequency: 0.4, offset: 0 }
        },
        'R_Upperarm': {
          x: { amplitude: 0.01, frequency: 0.3, offset: 0.5 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: -0.015, frequency: 0.4, offset: 0.5 }
        }
      }
    },

    walk: {
      name: 'Walk',
      duration: 0.8,
      movements: {
        'Hip': {
          x: { amplitude: 0.05, frequency: 1.5, offset: 0 },
          y: { amplitude: 0.02, frequency: 1.5, offset: 0 },
          z: { amplitude: 0.03, frequency: 1.5, offset: 0 }
        },
        'Spine': {
          x: { amplitude: 0.08, frequency: 1.5, offset: 0 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: 0.06, frequency: 1.5, offset: 0 }
        },
        'Chest': {
          x: { amplitude: 0.05, frequency: 1.5, offset: 0 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: 0.04, frequency: 1.5, offset: 0 }
        },
        'Head': {
          x: { amplitude: 0.02, frequency: 1.5, offset: 0 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: 0.05, frequency: 1.5, offset: 0 }
        },
        'L_Upperarm': {
          x: { amplitude: 0.3, frequency: 1.5, offset: 0 },
          y: { amplitude: 0.1, frequency: 1.5, offset: 0 },
          z: { amplitude: 0.2, frequency: 1.5, offset: 0 }
        },
        'R_Upperarm': {
          x: { amplitude: 0.3, frequency: 1.5, offset: Math.PI },
          y: { amplitude: 0.1, frequency: 1.5, offset: Math.PI },
          z: { amplitude: -0.2, frequency: 1.5, offset: Math.PI }
        }
      }
    },

    run: {
      name: 'Run',
      duration: 0.5,
      movements: {
        'Hip': {
          x: { amplitude: 0.1, frequency: 2.5, offset: 0 },
          y: { amplitude: 0.05, frequency: 2.5, offset: 0 },
          z: { amplitude: 0.08, frequency: 2.5, offset: 0 }
        },
        'Spine': {
          x: { amplitude: 0.12, frequency: 2.5, offset: 0 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: 0.1, frequency: 2.5, offset: 0 }
        },
        'Chest': {
          x: { amplitude: 0.08, frequency: 2.5, offset: 0 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: 0.08, frequency: 2.5, offset: 0 }
        },
        'Head': {
          x: { amplitude: 0.03, frequency: 2.5, offset: 0 },
          y: { amplitude: 0, frequency: 0, offset: 0 },
          z: { amplitude: 0.08, frequency: 2.5, offset: 0 }
        },
        'L_Upperarm': {
          x: { amplitude: 0.6, frequency: 2.5, offset: 0 },
          y: { amplitude: 0.2, frequency: 2.5, offset: 0 },
          z: { amplitude: 0.3, frequency: 2.5, offset: 0 }
        },
        'R_Upperarm': {
          x: { amplitude: 0.6, frequency: 2.5, offset: Math.PI },
          y: { amplitude: 0.2, frequency: 2.5, offset: Math.PI },
          z: { amplitude: -0.3, frequency: 2.5, offset: Math.PI }
        }
      }
    }
  }

  // ============================================
  // STATE VARIABLES
  // ============================================
  const bones = ref({})
  const boneBaseRotations = ref({})
  const boneNaturalStance = ref({}) // Override T-pose with natural stance
  const currentAnimation = ref('idle')
  const animationTime = ref(0)
  const transitionProgress = ref(1)
  const targetAnimation = ref('idle')
  const transitionDuration = ref(0.3)
  const debugMode = ref(false)

  // ============================================
  // INITIALIZATION
  // ============================================
  /**
   * Initialize procedural animations
   */
  function initialize(model) {
    console.log('🎬 Initializing Procedural Animation System...')

    if (!model) {
      console.error('❌ No model provided')
      return
    }

    bones.value = {}
    boneBaseRotations.value = {}
    boneNaturalStance.value = {}

    // Scan and cache bones
    const boneList = []
    model.traverse((node) => {
      if (node.isBone) {
        bones.value[node.name] = node
        boneBaseRotations.value[node.name] = {
          x: node.rotation.x,
          y: node.rotation.y,
          z: node.rotation.z
        }
        boneList.push(node.name)
      }
    })

    console.log(`✅ Procedural animation system ready: ${boneList.length} bones`)
    console.log('📋 Bones found:', boneList.slice(0, 10).join(', '))

    // Apply natural stance overrides for ActorCore models
    applyNaturalStance()
  }

  /**
   * Apply natural stance to override T-pose
   */
  function applyNaturalStance() {
    // Define natural stance adjustments for common ActorCore bones
    const naturalStanceAdjustments = {
      'CC_Base_L_Clavicle': { x: 0, y: 0, z: -0.1 },
      'CC_Base_R_Clavicle': { x: 0, y: 0, z: 0.1 },
      'CC_Base_L_Upperarm': { x: 0, y: 0, z: -0.3 },
      'CC_Base_R_Upperarm': { x: 0, y: 0, z: 0.3 },
      'CC_Base_L_Forearm': { x: 0, y: 0, z: -0.1 },
      'CC_Base_R_Forearm': { x: 0, y: 0, z: 0.1 },
      'CC_Base_Spine': { x: 0, y: 0, z: 0 },
      'CC_Base_Spine01': { x: 0, y: 0, z: 0 },
      'CC_Base_Spine02': { x: 0, y: 0, z: 0 },
    }

    // Apply natural stance adjustments
    Object.entries(naturalStanceAdjustments).forEach(([boneName, adjustment]) => {
      const bone = bones.value[boneName]
      if (bone) {
        const baseRot = boneBaseRotations.value[boneName]
        boneNaturalStance.value[boneName] = {
          x: baseRot.x + adjustment.x,
          y: baseRot.y + adjustment.y,
          z: baseRot.z + adjustment.z
        }
        console.log(`  📍 Natural stance: ${boneName}`)
      }
    })

    console.log(`✅ Natural stance applied to ${Object.keys(boneNaturalStance.value).length} bones`)
  }

  // ============================================
  // ANIMATION CALCULATION
  // ============================================
  /**
   * Calculate animated value using sine wave
   */
  function calculateAnimationValue(time, movementConfig) {
    const x = Math.sin(time * movementConfig.frequency * Math.PI * 2 + movementConfig.offset)
    return x * movementConfig.amplitude
  }

  /**
   * Find bone by pattern name
   */
  function findBone(pattern) {
    const lowerPattern = pattern.toLowerCase()
    return Object.entries(bones.value).find(([name]) =>
      name.toLowerCase().includes(lowerPattern)
    )?.[1] || null
  }

  /**
   * Apply animation to bones
   */
  function applyAnimation(animationName, blendFactor = 1.0) {
    const animConfig = ANIMATIONS[animationName]
    if (!animConfig) return

    Object.entries(animConfig.movements).forEach(([boneName, axes]) => {
      const bone = findBone(boneName)
      if (!bone) {
        if (debugMode.value) console.log(`⚠️ Bone not found: ${boneName}`)
        return
      }

      // Use natural stance if available, otherwise use base rotation
      const baseRot = boneNaturalStance.value[bone.name] || boneBaseRotations.value[bone.name]
      if (!baseRot) {
        if (debugMode.value) console.log(`⚠️ No base rotation for: ${bone.name}`)
        return
      }

      // Calculate new rotations for each axis
      const newRot = { ...baseRot }

      Object.entries(axes).forEach(([axis, config]) => {
        if (config.frequency > 0) {
          const delta = calculateAnimationValue(animationTime.value, config)
          newRot[axis] = baseRot[axis] + delta * blendFactor
        }
      })

      // Apply to bone
      bone.rotation.set(newRot.x, newRot.y, newRot.z)
    })
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  /**
   * Set animation state
   */
  function setAnimation(animationName, duration = 0.3) {
    if (!ANIMATIONS[animationName]) {
      console.warn(`⚠️ Unknown animation: ${animationName}`)
      return
    }

    console.log(`🎬 Animation transition: ${currentAnimation.value} → ${animationName}`)
    targetAnimation.value = animationName
    transitionDuration.value = duration
    transitionProgress.value = 0
  }

  /**
   * Get current animation
   */
  function getAnimation() {
    return currentAnimation.value
  }

  // ============================================
  // UPDATE LOOP
  // ============================================
  /**
   * Update procedural animations
   * Call every frame
   */
  function update(delta) {
    animationTime.value += delta

    // Handle transition
    if (transitionProgress.value < 1) {
      transitionProgress.value += delta / transitionDuration.value
      if (transitionProgress.value >= 1) {
        transitionProgress.value = 1
        currentAnimation.value = targetAnimation.value
      }
    } else {
      currentAnimation.value = targetAnimation.value
    }

    // Blend between current and target animations
    const blend = transitionProgress.value

    if (blend >= 1) {
      // Full target animation
      applyAnimation(currentAnimation.value, 1.0)
    } else {
      // Blend current and target
      applyAnimation(currentAnimation.value, 1 - blend)
      applyAnimation(targetAnimation.value, blend)
    }
  }

  // ============================================
  // DEBUG
  // ============================================
  function debugAnimations() {
    console.log('🎬 Procedural Animation System:')
    console.log(`  Current: ${currentAnimation.value}`)
    console.log(`  Target: ${targetAnimation.value}`)
    console.log(`  Transition: ${(transitionProgress.value * 100).toFixed(1)}%`)
    console.log(`  Available animations: ${Object.keys(ANIMATIONS).join(', ')}`)
    console.log(`  Cached bones: ${Object.keys(bones.value).length}`)
    console.log(`  Natural stance bones: ${Object.keys(boneNaturalStance.value).length}`)
  }

  function debugBones() {
    console.log('📋 Bone Information:')
    const sampleBones = Object.entries(bones.value).slice(0, 5)
    sampleBones.forEach(([name, bone]) => {
      const baseRot = boneBaseRotations.value[name]
      const naturalRot = boneNaturalStance.value[name]
      console.log(`  ${name}:`)
      console.log(`    Base: x=${baseRot.x.toFixed(3)}, y=${baseRot.y.toFixed(3)}, z=${baseRot.z.toFixed(3)}`)
      if (naturalRot) {
        console.log(`    Natural: x=${naturalRot.x.toFixed(3)}, y=${naturalRot.y.toFixed(3)}, z=${naturalRot.z.toFixed(3)}`)
      }
    })
  }

  function enableDebugMode() {
    debugMode.value = true
    console.log('✅ Debug mode enabled')
  }

  function disableDebugMode() {
    debugMode.value = false
    console.log('✅ Debug mode disabled')
  }

  // ============================================
  // RETURN API
  // ============================================
  return {
    // State
    currentAnimation,
    animationTime,
    transitionProgress,

    // Methods
    initialize,
    setAnimation,
    getAnimation,
    update,
    debugAnimations,
    debugBones,
    enableDebugMode,
    disableDebugMode,

    // Config
    ANIMATIONS
  }
}
