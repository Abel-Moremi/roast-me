/**
 * useMouthAnimation Composable
 * 
 * Master mouth animation system that coordinates:
 * - Jaw opening/closing based on audio
 * - Lip shapes based on phonemes and expressions
 * - Teeth visibility based on mouth openness
 * 
 * This creates a natural, coordinated mouth movement system
 */

import { ref, computed } from 'vue'

export function useMouthAnimation() {
  // ============================================
  // CONFIGURATION
  // ============================================
  const MOUTH_CONFIG = {
    // Jaw opening thresholds for different mouth states
    JAW_CLOSED: 0.0,      // Mouth completely closed
    JAW_SLIGHTLY_OPEN: 0.15,  // Just barely open
    JAW_OPEN: 0.4,        // Normal open mouth
    JAW_WIDE_OPEN: 0.75,  // Very wide open (shouting, laughing)

    // Teeth visibility thresholds
    TEETH_SHOW_START: 0.1,    // Teeth start becoming visible
    TEETH_FULL_VISIBLE: 0.3,  // Teeth fully visible

    // Animation speeds (lower = smoother, higher = faster)
    // Much faster for natural variation and to prevent freezing
    JAW_SMOOTH_SPEED: 0.5,
    LIP_SMOOTH_SPEED: 0.35,
    TEETH_SMOOTH_SPEED: 0.5,

    // Lip shape priorities (some morph targets matter more)
    LIP_SHAPE_MORPHS: {
      // Core mouth shapes
      'Mouth_Open': { weight: 1.0, jawDependent: true },
      'A25_Jaw_Open': { weight: 1.0, jawDependent: true },
      
      // Lip positions
      'Mouth_Lips_Open': { weight: 0.8, jawDependent: true },
      'Mouth_Lips_Part': { weight: 0.6, jawDependent: true },
      
      // Smile/expression
      'Mouth_Smile': { weight: 0.7, jawDependent: false },
      'Mouth_Smile_L': { weight: 0.7, jawDependent: false },
      'Mouth_Smile_R': { weight: 0.7, jawDependent: false },

      // Other mouth shapes (less important for basic speech)
      'Mouth_Widen': { weight: 0.2, jawDependent: true },
      'Mouth_Pucker': { weight: 0.1, jawDependent: false },
      'Mouth_Blow': { weight: 0.3, jawDependent: false },
      'Mouth_Frown': { weight: 0.4, jawDependent: false }
    },

    // Teeth visibility morphs
    TEETH_VISIBILITY_MORPHS: [
      'V_Open',
      'V_Explosive',
      'V_Dental_Lip',
      'V_Tight-O',
      'V_Tight',
      'V_Wide',
      'V_Affricate',
      'V_Lip_Open'
    ]
  }

  // ============================================
  // STATE
  // ============================================
  const mouthState = ref({
    jawOpen: 0,           // 0-1: how open the jaw is
    targetJawOpen: 0,     // Target jaw opening from audio
    jawVelocity: 0,       // Direction and speed of jaw movement

    teethVisible: 0,      // 0-1: teeth visibility factor
    lipShapeBlend: 0,     // 0-1: blend factor for lip shapes

    audioIntensity: 0,    // Current audio intensity
    isSpeaking: false,    // Is there audio currently?
  })

  // References to morph target data (set by initialization)
  let mouthMorphTargets = null
  let teethMorphTargets = []

  // ============================================
  // INITIALIZATION
  // ============================================
  function initialize(morphTargets, teethMorphs) {
    mouthMorphTargets = morphTargets
    teethMorphTargets = teethMorphs || []
    console.log('✅ Mouth animation system initialized')
  }

  // ============================================
  // CORE MOUTH ANIMATION
  // ============================================

  /**
   * Update mouth based on audio frequencies
   * Drives jaw opening, lip shapes, and teeth visibility
   */
  function updateFromAudio(audioIntensity, midFreq, highFreq) {
    if (!mouthMorphTargets) return

    const audioThreshold = 0.05
    const wasNotSpeaking = !mouthState.value.isSpeaking
    mouthState.value.isSpeaking = audioIntensity > audioThreshold
    mouthState.value.audioIntensity = audioIntensity

    // ========== JAW ANIMATION ==========
    // Determine target jaw opening based on audio frequencies
    if (mouthState.value.isSpeaking) {
      // Scale jaw opening based on audio frequency content
      // Low/mid frequencies = more consistent opening
      // High frequencies = more articulation/movement
      // Very relaxed multipliers to prevent freezing at high sustained frequencies
      const baselineOpen = Math.max(0.15, midFreq * 0.25)
      const articulation = highFreq * 0.25  // Greatly reduced to prevent locking
      // Add natural variation to prevent freezing at exact same value
      const naturalVariation = Math.sin(Date.now() * 0.003) * 0.05
      mouthState.value.targetJawOpen = Math.min(0.70, baselineOpen + articulation + naturalVariation)
    } else {
      mouthState.value.targetJawOpen = 0
    }

    // Smoothly animate jaw toward target
    const jawDiff = mouthState.value.targetJawOpen - mouthState.value.jawOpen
    const jawSpeed = jawDiff > 0 
      ? MOUTH_CONFIG.JAW_SMOOTH_SPEED * 1.2  // Open faster
      : MOUTH_CONFIG.JAW_SMOOTH_SPEED * 1.0   // Close at normal speed

    mouthState.value.jawOpen += jawDiff * jawSpeed
    mouthState.value.jawOpen = Math.max(0, Math.min(1, mouthState.value.jawOpen))

    // ========== TEETH VISIBILITY ==========
    // Teeth should follow jaw opening with slight lag for natural feel
    updateTeethVisibility(mouthState.value.jawOpen)

    // ========== LIP SHAPES ==========
    // Update lip morphs based on jaw position
    updateLipShapes(mouthState.value.jawOpen)
  }

  /**
   * Update teeth visibility based on jaw opening
   * Only affects the V_ (visibility) morphs
   */
  function updateTeethVisibility(jawOpenAmount) {
    if (teethMorphTargets.length === 0) return

    // Calculate target teeth visibility
    let targetTeethVisible = 0
    if (jawOpenAmount > MOUTH_CONFIG.TEETH_SHOW_START) {
      // Ramp up from TEETH_SHOW_START to TEETH_FULL_VISIBLE
      const range = MOUTH_CONFIG.TEETH_FULL_VISIBLE - MOUTH_CONFIG.TEETH_SHOW_START
      targetTeethVisible = Math.min(
        1,
        (jawOpenAmount - MOUTH_CONFIG.TEETH_SHOW_START) / range
      )
    }

    // Smooth transition to target
    const diff = targetTeethVisible - mouthState.value.teethVisible
    mouthState.value.teethVisible += diff * MOUTH_CONFIG.TEETH_SMOOTH_SPEED

    // Apply to all teeth visibility morphs
    teethMorphTargets.forEach(({ meshName, morphIndex }) => {
      const meshData = mouthMorphTargets[meshName]
      if (!meshData || !meshData.mesh) return

      const influences = meshData.mesh.morphTargetInfluences
      if (!influences) return

      influences[morphIndex] = Math.max(0, Math.min(1, mouthState.value.teethVisible))
    })
  }

  /**
   * Update lip shape morphs based on jaw opening
   * Creates natural lip movements that follow jaw position
   * NOW SUPPORTS KEYWORD MATCHING for flexibility with different models
   */
  function updateLipShapes(jawOpenAmount) {
    if (!mouthMorphTargets) return

    Object.entries(mouthMorphTargets).forEach(([meshName, meshData]) => {
      if (!meshData.mesh || !meshData.targetNames) return

      const influences = meshData.mesh.morphTargetInfluences
      if (!influences) return

      // For each lip shape morph, update based on jaw and expression
      meshData.targetNames.forEach((morphName, morphIndex) => {
        if (!morphName) return

        // Check if exact match exists in config
        let morphConfig = MOUTH_CONFIG.LIP_SHAPE_MORPHS[morphName]
        
        // If no exact match, try keyword matching based on morph name
        if (!morphConfig) {
          const nameLower = morphName.toLowerCase()
          
          // Detect jaw-opening morphs by keyword
          if (nameLower.includes('jaw') && nameLower.includes('open')) {
            morphConfig = { weight: 1.0, jawDependent: true }
          } else if (nameLower.includes('mouth') && nameLower.includes('open')) {
            morphConfig = { weight: 1.0, jawDependent: true }
          } else if (nameLower.includes('lip') && (nameLower.includes('open') || nameLower.includes('part'))) {
            morphConfig = { weight: 0.8, jawDependent: true }
          } else if (nameLower.includes('mouth') && nameLower.includes('widen')) {
            morphConfig = { weight: 0.5, jawDependent: true }
          } else if (nameLower.includes('smile')) {
            morphConfig = { weight: 0.7, jawDependent: false }
          } else if (nameLower.includes('pucker')) {
            morphConfig = { weight: 0.5, jawDependent: true }
          } else if (nameLower.includes('frown')) {
            morphConfig = { weight: 0.4, jawDependent: false }
          }
        }
        
        // Skip if still no config found
        if (!morphConfig) return

        // If this is a jaw-dependent morph, tie it to jaw opening
        if (morphConfig.jawDependent) {
          const currentValue = influences[morphIndex] || 0
          let targetValue = 0

          // Different morphs respond differently to jaw opening
          const nameLower = morphName.toLowerCase()
          
          if (nameLower.includes('jaw') || (nameLower.includes('mouth') && nameLower.includes('open'))) {
            // Main jaw/mouth open morphs follow jaw opening directly
            targetValue = jawOpenAmount * morphConfig.weight
          } else if (nameLower.includes('lip') && (nameLower.includes('open') || nameLower.includes('part'))) {
            // Lip opening morphs - keep lips relaxed and open
            targetValue = Math.max(0.2, (jawOpenAmount - 0.05) * 2.0 * morphConfig.weight)
          } else if (nameLower.includes('widen')) {
            // Widening happens with more open mouth
            targetValue = Math.max(0, jawOpenAmount * 0.7 * morphConfig.weight)
          } else if (nameLower.includes('pucker')) {
            // Minimize puckering - much less aggressive
            targetValue = Math.max(0, (1 - jawOpenAmount) * 0.2 * morphConfig.weight)
          } else {
            // Default: scale by jaw opening
            targetValue = jawOpenAmount * morphConfig.weight
          }

          // Smooth update
          const diff = targetValue - currentValue
          influences[morphIndex] = currentValue + diff * MOUTH_CONFIG.LIP_SMOOTH_SPEED
          influences[morphIndex] = Math.max(0, Math.min(1, influences[morphIndex]))
        }
      })
    })
  }

  /**
   * Apply expression modifiers to lips
   * Expressions can modify lip morphs on top of jaw movement
   */
  function applyExpressionToMouth(expressionMods, blendAmount = 1.0) {
    if (!mouthMorphTargets || !expressionMods) return

    Object.entries(mouthMorphTargets).forEach(([meshName, meshData]) => {
      if (!meshData.mesh || !meshData.targetNames) return

      const influences = meshData.mesh.morphTargetInfluences
      if (!influences) return

      meshData.targetNames.forEach((morphName, morphIndex) => {
        if (!morphName) return

        // Check if exact match exists in config
        let morphConfig = MOUTH_CONFIG.LIP_SHAPE_MORPHS[morphName]
        
        // If no exact match, try keyword matching
        if (!morphConfig) {
          const nameLower = morphName.toLowerCase()
          
          if (nameLower.includes('smile')) {
            morphConfig = { weight: 0.7, jawDependent: false }
          } else if (nameLower.includes('frown')) {
            morphConfig = { weight: 0.4, jawDependent: false }
          } else if (nameLower.includes('pucker')) {
            morphConfig = { weight: 0.5, jawDependent: true }
          }
        }
        
        // Skip if still no config or if it's jaw-dependent
        if (!morphConfig || morphConfig.jawDependent) return

        // Apply expression modifications - these blend with jaw movement
        if (expressionMods[morphName]) {
          const currentValue = influences[morphIndex] || 0
          const expressionValue = expressionMods[morphName] * blendAmount

          // Blend expression on top of current state
          const diff = expressionValue - currentValue
          influences[morphIndex] = currentValue + diff * 0.2 // Slow blend with expression

          influences[morphIndex] = Math.max(0, Math.min(1, influences[morphIndex]))
        }
      })
    })
  }

  // ============================================
  // GETTERS
  // ============================================
  const jawOpening = computed(() => mouthState.value.jawOpen)
  const teethVisibility = computed(() => mouthState.value.teethVisible)
  const isSpeaking = computed(() => mouthState.value.isSpeaking)

  // ============================================
  // DEBUG
  // ============================================
  function debug() {
    console.log('🗣️ Mouth Animation State:')
    console.log(`  Jaw Opening: ${(mouthState.value.jawOpen * 100).toFixed(0)}%`)
    console.log(`  Target Jaw: ${(mouthState.value.targetJawOpen * 100).toFixed(0)}%`)
    console.log(`  Teeth Visible: ${(mouthState.value.teethVisible * 100).toFixed(0)}%`)
    console.log(`  Audio Intensity: ${(mouthState.value.audioIntensity * 100).toFixed(0)}%`)
    console.log(`  Speaking: ${mouthState.value.isSpeaking}`)
  }

  // ============================================
  // EXPORTS
  // ============================================
  return {
    initialize,
    updateFromAudio,
    updateTeethVisibility,
    updateLipShapes,
    applyExpressionToMouth,
    
    jawOpening,
    teethVisibility,
    isSpeaking,

    debug,
    mouthState: computed(() => mouthState.value)
  }
}
