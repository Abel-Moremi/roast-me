/**
 * useFacialExpressions Composable
 * Manages facial expression system with morphTarget animation blending
 */

import { ref, watch } from 'vue'
import { EXPRESSIONS, EXPRESSION_CONFIG } from '@/utils/sceneConstants'

export function useFacialExpressions() {
  // ============================================
  // STATE VARIABLES
  // ============================================
  const mouthMorphTargets = ref({})
  const morphStateBaseline = ref({})
  const morphStateCurrent = ref({})
  const currentExpression = ref(EXPRESSIONS.NEUTRAL)
  const targetExpression = ref(EXPRESSIONS.NEUTRAL)
  const expressionBlendFactor = ref(0)

  // ============================================
  // EXPRESSION CONFIGURATION
  // ============================================
  const expressionConfigs = {
    [EXPRESSIONS.NEUTRAL]: {
      description: 'Default neutral expression',
      morphMods: {
        mouthOpen: 0,
        mouthSmile: 0,
        eyeBrowRaise_L: 0,
        eyeBrowRaise_R: 0,
        eyeWide_L: 0,
        eyeWide_R: 0,
        cheekRaise_L: 0,
        cheekRaise_R: 0
      }
    },

    [EXPRESSIONS.SMILE]: {
      description: 'Happy smile expression',
      morphMods: {
        mouthOpen: 0.1,
        mouthSmile: 0.8,
        eyeBrowRaise_L: 0.3,
        eyeBrowRaise_R: 0.3,
        eyeWide_L: 0.2,
        eyeWide_R: 0.2,
        cheekRaise_L: 0.4,
        cheekRaise_R: 0.4
      }
    },

    [EXPRESSIONS.LAUGH]: {
      description: 'Laugh/strong smile expression',
      morphMods: {
        mouthOpen: 0.6,
        mouthSmile: 1,
        eyeBrowRaise_L: 0.5,
        eyeBrowRaise_R: 0.5,
        eyeWide_L: 0.4,
        eyeWide_R: 0.4,
        cheekRaise_L: 0.7,
        cheekRaise_R: 0.7
      }
    },

    [EXPRESSIONS.SHOCKED]: {
      description: 'Shocked/surprised expression',
      morphMods: {
        mouthOpen: 0.8,
        mouthSmile: 0,
        eyeBrowRaise_L: 0.9,
        eyeBrowRaise_R: 0.9,
        eyeWide_L: 0.8,
        eyeWide_R: 0.8,
        cheekRaise_L: 0,
        cheekRaise_R: 0
      }
    },

    [EXPRESSIONS.ANGRY]: {
      description: 'Angry expression',
      morphMods: {
        mouthOpen: 0.4,
        mouthSmile: 0,
        eyeBrowRaise_L: -0.5,
        eyeBrowRaise_R: -0.5,
        eyeWide_L: 0.3,
        eyeWide_R: 0.3,
        cheekRaise_L: 0.2,
        cheekRaise_R: 0.2
      }
    },

    [EXPRESSIONS.CONFUSED]: {
      description: 'Confused/questioning expression',
      morphMods: {
        mouthOpen: 0.2,
        mouthSmile: -0.2,
        eyeBrowRaise_L: 0.4,
        eyeBrowRaise_R: -0.2,
        eyeWide_L: 0.3,
        eyeWide_R: 0.3,
        cheekRaise_L: 0.1,
        cheekRaise_R: 0.1
      }
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  /**
   * Initialize facial expression system by scanning morphTargets
   * @param {Array} meshes - Array of Three.js meshes to scan
   */
  function initializeFacialExpressionSystem(meshes) {
    if (!meshes || meshes.length === 0) return

    mouthMorphTargets.value = {}
    morphStateBaseline.value = {}
    morphStateCurrent.value = {}

    meshes.forEach(mesh => {
      if (!mesh.morphTargetInfluences) return

      const meshName = mesh.name || 'unnamed'
      mouthMorphTargets.value[meshName] = {}
      morphStateBaseline.value[meshName] = {}
      morphStateCurrent.value[meshName] = {}

      if (mesh.morphTargetDictionary) {
        Object.entries(mesh.morphTargetDictionary).forEach(
          ([name, index]) => {
            const influence = mesh.morphTargetInfluences[index] || 0
            mouthMorphTargets.value[meshName][name] = index
            morphStateBaseline.value[meshName][name] = influence
            morphStateCurrent.value[meshName][name] = influence
          }
        )
      }
    })
  }

  // ============================================
  // EXPRESSION CONTROL
  // ============================================
  /**
   * Set target expression for blending
   * @param {string} expressionName - Name of expression from EXPRESSIONS
   * @param {boolean} immediate - Skip blending and apply immediately
   */
  function setExpression(expressionName, immediate = false) {
    if (!Object.values(EXPRESSIONS).includes(expressionName)) {
      console.warn(`Invalid expression: ${expressionName}`)
      return
    }

    targetExpression.value = expressionName

    if (immediate) {
      currentExpression.value = expressionName
      expressionBlendFactor.value = 1
    } else {
      expressionBlendFactor.value = 0
    }
  }

  /**
   * Update expression blending each frame
   * @param {number} delta - Delta time since last frame
   */
  function updateFacialExpression(delta) {
    const isBlending =
      currentExpression.value !== targetExpression.value &&
      expressionBlendFactor.value < 1

    if (isBlending) {
      expressionBlendFactor.value = Math.min(
        1,
        expressionBlendFactor.value +
          EXPRESSION_CONFIG.BLEND_SPEED
      )

      if (expressionBlendFactor.value >= 1) {
        currentExpression.value = targetExpression.value
      }
    }

    applyCurrentExpression()
  }

  /**
   * Apply current expression to morphTargets with blending
   */
  function applyCurrentExpression() {
    const currentConfig = expressionConfigs[currentExpression.value]
    const targetConfig = expressionConfigs[targetExpression.value]

    if (!currentConfig || !targetConfig) return

    Object.entries(mouthMorphTargets.value).forEach(
      ([meshName, morphMap]) => {
        const currentMods = currentConfig.morphMods
        const targetMods = targetConfig.morphMods

        // Blend current and target mods based on blend factor
        const blendedMods = {}
        Object.keys(currentMods).forEach(morphName => {
          const current = currentMods[morphName] || 0
          const target = targetMods[morphName] || 0
          blendedMods[morphName] = Three.MathUtils.lerp(
            current,
            target,
            expressionBlendFactor.value
          )
        })

        applyExpressionMods(
          meshName,
          morphMap,
          blendedMods,
          1
        )
      }
    )
  }

  /**
   * Apply morphTarget modifications to a specific mesh
   * @param {string} meshName - Name of the mesh
   * @param {Object} morphMap - Map of morphTarget names to indices
   * @param {Object} mods - Modifications to apply
   * @param {number} blendAmount - Blend intensity (0-1)
   */
  function applyExpressionMods(meshName, morphMap, mods, blendAmount) {
    if (!morphMap) return

    Object.entries(mods).forEach(([morphName, targetValue]) => {
      const morphIndex = morphMap[morphName]
      if (morphIndex === undefined) return

      const baselineValue = morphStateBaseline.value[meshName]?.[morphName] || 0
      const current = morphStateCurrent.value[meshName]?.[morphName] || 0
      const newValue = baselineValue + targetValue * blendAmount

      morphStateCurrent.value[meshName][morphName] = newValue
    })
  }

  // ============================================
  // LIP-SYNC ANIMATION
  // ============================================
  /**
   * Update lip-sync from audio frequencies
   * @param {number} midFreq - Mid frequency magnitude (0-1)
   * @param {number} highFreq - High frequency magnitude (0-1)
   * @param {Object} meshes - Map of mesh names to Three.js meshes
   */
  function updateLipSyncFromAudio(midFreq, highFreq, meshes) {
    if (!meshes) return

    // Calculate mouth opening from frequency blend
    const mouthOpening = 0.7 * midFreq + 0.3 * highFreq

    // Apply to all meshes
    Object.entries(meshes).forEach(([meshName, mesh]) => {
      if (!mesh.morphTargetInfluences) return

      const morphMap = mouthMorphTargets.value[meshName]
      if (!morphMap) return

      // Update mouth opening
      const mouthOpenIndex = morphMap.mouthOpen
      if (mouthOpenIndex !== undefined) {
        mesh.morphTargetInfluences[mouthOpenIndex] = Math.min(
          1,
          mouthOpening
        )
      }
    })

    // Auto-transition expressions based on frequency
    if (highFreq > EXPRESSION_CONFIG.AUDIO_THRESHOLD_LAUGH) {
      setExpression(EXPRESSIONS.LAUGH)
    } else if (highFreq > EXPRESSION_CONFIG.AUDIO_THRESHOLD_SMILE) {
      setExpression(EXPRESSIONS.SMILE)
    } else if (currentExpression.value !== EXPRESSIONS.NEUTRAL) {
      setExpression(EXPRESSIONS.NEUTRAL)
    }
  }

  return {
    // State
    mouthMorphTargets,
    morphStateBaseline,
    morphStateCurrent,
    currentExpression,
    targetExpression,
    expressionBlendFactor,

    // Methods
    initializeFacialExpressionSystem,
    setExpression,
    updateFacialExpression,
    applyExpressionMods,
    updateLipSyncFromAudio,

    // Config
    expressionConfigs,
    EXPRESSIONS
  }
}
