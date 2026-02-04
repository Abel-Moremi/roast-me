/**
 * useBodyRigging Composable
 * IMPROVED FOR ACTORCORE: Full skeleton control with smooth blending
 * Prevents jittering by properly accumulating and applying bone transforms
 *
 * Layer 1: Baseline (ActorCore model's default stance)
 * Layer 2: Idle Animations (continuous subtle movements)
 * Layer 3: Action Animations (specific comedy gestures)
 */

import { ref } from 'vue'

export function useBodyRigging() {
  // ============================================
  // IDLE ANIMATIONS (continuous, low intensity)
  // ============================================
  const IDLE_ANIMATIONS = {
    // Gentle sway while standing - WHOLE BODY
    bodySway: {
      speed: 0.8,           // Hz (slower for stability)
      range: 0.06,          // Radians (smaller for smoother)
      bonePatterns: ['Spine', 'Hips', 'Root'],
      axis: 'z',            // Side to side
      description: 'Natural weight shifting side to side'
    },

    // Subtle head movement following body
    headFollow: {
      speed: 0.8,
      range: 0.03,
      bonePatterns: ['Head', 'Neck'],
      axis: 'z',
      description: 'Head follows body sway'
    },

    // Gentle breathing motion
    breathing: {
      speed: 0.5,
      range: 0.015,
      bonePatterns: ['Chest', 'UpperTorso'],
      axis: 'y',            // Up/down
      description: 'Subtle chest breathing'
    },

    // Occasional head nod
    thoughtfulNod: {
      speed: 0.2,
      range: 0.04,
      bonePatterns: ['Head'],
      axis: 'x',
      description: 'Occasional thoughtful nod'
    }
  }

  // ============================================
  // ACTION ANIMATIONS (specific comedy moments)
  // ============================================
  const ACTION_ANIMATIONS = {
    // Emphasize a point - lean forward with head
    emphasizePoint: {
      duration: 0.6,
      movements: [
        { bonePattern: 'Spine', axis: 'x', target: 0.15, duration: 0.3 },
        { bonePattern: 'Head', axis: 'x', target: 0.1, duration: 0.3 }
      ]
    },

    // Surprised reaction
    surprised: {
      duration: 0.4,
      movements: [
        { bonePattern: 'Head', axis: 'x', target: -0.1, duration: 0.2 },
        { bonePattern: 'Chest', axis: 'x', target: 0.08, duration: 0.2 }
      ]
    },

    // Confused head tilt
    confused: {
      duration: 0.5,
      movements: [
        { bonePattern: 'Head', axis: 'z', target: 0.15, duration: 0.25 }
      ]
    },

    // Exasperated - lean back with head shake
    exasperated: {
      duration: 0.6,
      movements: [
        { bonePattern: 'Spine', axis: 'x', target: -0.1, duration: 0.3 }
      ]
    },

    // Laughing response
    laughing: {
      duration: 0.8,
      movements: [
        { bonePattern: 'Chest', axis: 'x', target: -0.1, duration: 0.4 }
      ]
    },

    // Shoulder shrug
    shrug: {
      duration: 0.4,
      movements: [
        { bonePattern: 'Shoulder', axis: 'x', target: 0.2, duration: 0.2 }
      ]
    }
  }

  // ============================================
  // ANIMATION SEQUENCES
  // ============================================
  const SEQUENCES = {
    // Setup joke - lean in, more engaged
    setupJoke: {
      duration: 1.5,
      animations: ['emphasizePoint'],
      description: 'Lean forward while delivering setup'
    },

    // Punchline - exaggerated reaction
    punchlineReaction: {
      duration: 1.0,
      animations: ['laughing'],
      description: 'React to own punchline'
    },

    // Curious moment - tilt head
    curious: {
      duration: 1.2,
      animations: ['confused', 'thoughtfulNod'],
      description: 'Express curiosity or confusion'
    }
  }

  // ============================================
  // HELPERS
  // ============================================
  function lerp(start, end, t) {
    return start + (end - start) * t
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  /**
   * Find bones matching a pattern (case-insensitive)
   */
  function findBonesByPattern(pattern, allBones) {
    const lowerPattern = pattern.toLowerCase()
    return Object.entries(allBones).filter(([name]) =>
      name.toLowerCase().includes(lowerPattern)
    )
  }

  // ============================================
  // STATE VARIABLES
  // ============================================
  const bones = ref({})
  const boneBaseRotations = ref({})
  const boneBasePositions = ref({})

  const time = ref(0)
  const audioIntensity = ref(0)
  const isMovingEnabled = ref(true)
  const activeActions = ref([])
  const restPose = ref({})  // Store a natural rest pose
  const hasAppliedNaturalStance = ref(false)  // Track if we've applied stance

  // ============================================
  // INITIALIZATION
  // ============================================
  /**
   * Initialize body rigging by scanning skeleton
   * @param {THREE.Object3D} model - The 3D model/comedian
   */
  function initializeBodyRigging(model) {
    console.log('🎭 Initializing ActorCore body rigging...')

    if (!model) {
      console.error('No model provided for body rigging')
      return
    }

    bones.value = {}
    boneBaseRotations.value = {}
    boneBasePositions.value = {}

    // Scan for bones in skeleton
    model.traverse((node) => {
      if (node.isBone) {
        const boneName = node.name
        bones.value[boneName] = node

        // Store baseline transforms - EXACT COPIES
        boneBaseRotations.value[boneName] = {
          x: node.rotation.x,
          y: node.rotation.y,
          z: node.rotation.z,
          order: node.rotation.order
        }
        boneBasePositions.value[boneName] = {
          x: node.position.x,
          y: node.position.y,
          z: node.position.z
        }

        console.log(`  ✓ ${boneName}`)
      }
    })

    // Try SkinnedMesh if no bones found
    if (Object.keys(bones.value).length === 0) {
      console.warn('⚠️ No bones found, searching for SkinnedMesh...')
      let skinnedMesh = null
      model.traverse((node) => {
        if (node.isSkinnedMesh && !skinnedMesh) {
          skinnedMesh = node
        }
      })

      if (skinnedMesh && skinnedMesh.skeleton) {
        console.log('✓ Found SkinnedMesh skeleton')
        skinnedMesh.skeleton.bones.forEach((bone) => {
          bones.value[bone.name] = bone
          boneBaseRotations.value[bone.name] = {
            x: bone.rotation.x,
            y: bone.rotation.y,
            z: bone.rotation.z,
            order: bone.rotation.order
          }
          boneBasePositions.value[bone.name] = {
            x: bone.position.x,
            y: bone.position.y,
            z: bone.position.z
          }
          console.log(`  ✓ ${bone.name}`)
        })
      }
    }

    const boneCount = Object.keys(bones.value).length
    console.log(`✅ ActorCore rigging ready: ${boneCount} bones`)
  }

  /**
   * Capture current model pose as the rest pose
   * Call this after model is loaded to save its natural stance
   */
  function captureRestPose() {
    console.log('📸 Capturing rest pose from current model state...')
    
    Object.entries(bones.value).forEach(([boneName, bone]) => {
      restPose.value[boneName] = {
        x: bone.rotation.x,
        y: bone.rotation.y,
        z: bone.rotation.z
      }
    })
    
    console.log(`✅ Rest pose captured for ${Object.keys(restPose.value).length} bones`)
  }

  /**
   * Apply natural standing posture adjustments
   * Reduces T-pose stiffness
   */
  function applyNaturalStance() {
    console.log('🧍 Applying natural standing stance...')
    
    // Relax arms from T-pose
    const armBones = findBonesByPattern('Arm', bones.value)
    armBones.forEach(([boneName, bone]) => {
      const baseRot = boneBaseRotations.value[boneName]
      if (baseRot) {
        // Update baseline to new relaxed position
        baseRot.x = baseRot.x - 0.3  // Lower from shoulder
        baseRot.z = baseRot.z + (boneName.includes('Left') ? 0.15 : -0.15)  // Angle inward slightly
        
        // Apply to bone immediately
        bone.rotation.x = baseRot.x
        bone.rotation.z = baseRot.z
        console.log(`  ✓ Arm relaxed: ${boneName}`)
      }
    })

    // Relax shoulders
    const shoulderBones = findBonesByPattern('Shoulder', bones.value)
    shoulderBones.forEach(([boneName, bone]) => {
      const baseRot = boneBaseRotations.value[boneName]
      if (baseRot) {
        // Update baseline
        baseRot.x = baseRot.x - 0.1  // Drop shoulders slightly
        
        // Apply to bone
        bone.rotation.x = baseRot.x
        console.log(`  ✓ Shoulder relaxed: ${boneName}`)
      }
    })

    // Slightly forward lean
    const spineBones = findBonesByPattern('Spine', bones.value)
    spineBones.forEach(([boneName, bone]) => {
      const baseRot = boneBaseRotations.value[boneName]
      if (baseRot) {
        // Update baseline
        baseRot.x = baseRot.x + 0.05  // Slight forward lean
        
        // Apply to bone
        bone.rotation.x = baseRot.x
        console.log(`  ✓ Spine adjusted: ${boneName}`)
      }
    })

    hasAppliedNaturalStance.value = true
    console.log('✅ Natural stance applied - baselines updated')
  }

  /**
   * Reset to captured rest pose
   */
  function resetToRestPose() {
    if (Object.keys(restPose.value).length === 0) {
      console.warn('⚠️ No rest pose captured yet')
      return
    }

    console.log('🔄 Resetting to captured rest pose...')
    Object.entries(restPose.value).forEach(([boneName, rot]) => {
      const bone = bones.value[boneName]
      if (bone) {
        bone.rotation.set(rot.x, rot.y, rot.z)
      }
    })
  }

  // ============================================
  // UPDATE IDLE ANIMATIONS
  // ============================================
  /**
   * Update all idle animations for this frame
   * @param {number} delta - Delta time in seconds
   */
  function updateIdleAnimations(delta) {
    time.value += delta

    // For each idle animation, apply its effect to matching bones
    Object.entries(IDLE_ANIMATIONS).forEach(([name, anim]) => {
      // Find bones matching this animation's pattern
      const matchedBones = []
      anim.bonePatterns.forEach((pattern) => {
        matchedBones.push(...findBonesByPattern(pattern, bones.value))
      })

      // Apply animation to each matched bone
      matchedBones.forEach(([boneName, bone]) => {
        const baseRot = boneBaseRotations.value[boneName]
        if (!baseRot) return

        // Calculate sine wave value
        const phaseValue = Math.sin(time.value * anim.speed * Math.PI * 2) * anim.range

        // Get current rotation and add animation delta on top
        const newRot = { ...baseRot }
        newRot[anim.axis] = baseRot[anim.axis] + phaseValue

        // Apply directly to bone
        bone.rotation.set(newRot.x, newRot.y, newRot.z)
      })
    })
  }

  // ============================================
  // UPDATE ACTION ANIMATIONS
  // ============================================
  /**
   * Trigger an action animation
   * @param {string} actionName - Name of action
   */
  function triggerAction(actionName) {
    const action = ACTION_ANIMATIONS[actionName]
    if (!action) {
      console.warn(`Unknown action: ${actionName}`)
      return
    }

    const startTime = time.value
    activeActions.value.push({
      name: actionName,
      startTime,
      duration: action.duration,
      movements: action.movements,
      completed: false
    })

    console.log(`🎬 Action: ${actionName}`)
  }

  /**
   * Update all active actions
   * @param {number} currentTime - Current time
   */
  function updateActiveActions(currentTime) {
    activeActions.value = activeActions.value.filter((action) => {
      const elapsed = currentTime - action.startTime
      const progress = Math.min(1, elapsed / action.duration)

      if (progress >= 1) {
        return false
      }

      // Apply each movement in the action
      action.movements.forEach((movement) => {
        // Find bones matching pattern
        const matchedBones = findBonesByPattern(movement.bonePattern, bones.value)

        matchedBones.forEach(([boneName, bone]) => {
          const baseRot = boneBaseRotations.value[boneName]
          if (!baseRot) return

          const eased = easeInOutCubic(progress)
          const newValue = lerp(baseRot[movement.axis], movement.target, eased)

          const rot = {
            x: baseRot.x,
            y: baseRot.y,
            z: baseRot.z
          }
          rot[movement.axis] = newValue

          bone.rotation.set(rot.x, rot.y, rot.z)
        })
      })

      return true
    })
  }

  // ============================================
  // SEQUENCE SYSTEM
  // ============================================
  /**
   * Play an animation sequence
   * @param {string} sequenceName - Name of sequence
   */
  function playSequence(sequenceName) {
    const sequence = SEQUENCES[sequenceName]
    if (!sequence) {
      console.warn(`Unknown sequence: ${sequenceName}`)
      return
    }

    console.log(`▶️ Sequence: ${sequenceName}`)
    sequence.animations.forEach((animName) => {
      triggerAction(animName)
    })
  }

  // ============================================
  // MAIN UPDATE
  // ============================================
  /**
   * Main update function - called every frame
   * @param {number} delta - Delta time
   * @param {number} audioIntensityValue - Audio intensity (0-1)
   */
  function updateBodyMovements(delta, audioIntensityValue = 0) {
    if (!isMovingEnabled.value || Object.keys(bones.value).length === 0) {
      return
    }

    audioIntensity.value = audioIntensityValue

    // Update idle animations (continuous)
    updateIdleAnimations(delta)

    // Update active actions on top of idle animations
    updateActiveActions(time.value)
  }

  // ============================================
  // CONTROL METHODS
  // ============================================
  /**
   * Enable or disable body movements
   */
  function setMovementEnabled(enabled) {
    isMovingEnabled.value = enabled

    if (!enabled) {
      // Reset all bones to baseline
      Object.entries(bones.value).forEach(([boneName, bone]) => {
        const baseRot = boneBaseRotations.value[boneName]
        const basePos = boneBasePositions.value[boneName]

        if (baseRot) {
          bone.rotation.set(baseRot.x, baseRot.y, baseRot.z)
        }
        if (basePos) {
          bone.position.set(basePos.x, basePos.y, basePos.z)
        }
      })
    }
  }

  /**
   * Get list of available actions
   */
  function getAvailableActions() {
    return Object.keys(ACTION_ANIMATIONS)
  }

  /**
   * Get list of available sequences
   */
  function getAvailableSequences() {
    return Object.keys(SEQUENCES)
  }

  /**
   * Get list of available idle animations
   */
  function getAvailableIdleAnimations() {
    return Object.keys(IDLE_ANIMATIONS)
  }

  // ============================================
  // DEBUG
  // ============================================
  /**
   * Log bone hierarchy for debugging
   */
  function debugBoneHierarchy() {
    console.log('🦴 Bone Hierarchy:')
    Object.keys(bones.value).forEach((boneName) => {
      console.log(`  - ${boneName}`)
    })
  }

  /**
   * Log current rotations of key bones
   */
  function debugBoneRotations() {
    console.log('🔄 Current Bone Rotations:')
    const keyBones = ['Arm.L', 'Arm.R', 'Shoulder.L', 'Shoulder.R', 'Spine', 'Chest']
    
    Object.entries(bones.value).forEach(([boneName, bone]) => {
      // Check if this bone matches any key pattern
      const isKey = keyBones.some(key => boneName.toLowerCase().includes(key.toLowerCase()))
      if (isKey) {
        const baseRot = boneBaseRotations.value[boneName]
        console.log(`${boneName}:`)
        console.log(`  Current: x=${bone.rotation.x.toFixed(3)}, y=${bone.rotation.y.toFixed(3)}, z=${bone.rotation.z.toFixed(3)}`)
        if (baseRot) {
          console.log(`  Baseline: x=${baseRot.x.toFixed(3)}, y=${baseRot.y.toFixed(3)}, z=${baseRot.z.toFixed(3)}`)
        }
      }
    })
  }

  return {
    // State
    bones,
    time,
    audioIntensity,
    isMovingEnabled,
    activeActions,
    restPose,

    // Methods
    initializeBodyRigging,
    updateBodyMovements,
    triggerAction,
    playSequence,
    setMovementEnabled,
    captureRestPose,
    applyNaturalStance,
    resetToRestPose,
    getAvailableActions,
    getAvailableSequences,
    getAvailableIdleAnimations,
    debugBoneHierarchy,
    debugBoneRotations,

    // Config
    IDLE_ANIMATIONS,
    ACTION_ANIMATIONS,
    SEQUENCES
  }
}
