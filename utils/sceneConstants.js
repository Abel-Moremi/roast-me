/**
 * Scene Constants
 * Centralized configuration for the 3D comedy club scene
 */

// ============================================
// STAGE & STAGE ELEMENTS
// ============================================
export const STAGE = {
  HEIGHT: 0.3,
  WIDTH: 8,
  DEPTH: 0.5,
  LENGTH: 6,
  POSITION_Z: -2
}

// ============================================
// COMEDIAN CHARACTER
// ============================================
export const COMEDIAN = {
  SCALE: 2.4,
  POSITION_Z: -1.5,
  ROTATION_Y: 0,
  MODEL_PATH: '/comedian.glb'
}

// ============================================
// SCENE COLORS & MATERIALS
// ============================================
export const COLORS = {
  SCENE_BG: 0x2a1515,
  FOG: 0x2a1515,
  WALL: 0xaa5555,
  STAGE_WOOD: 0x4a3422,
  CURTAIN: 0x8b0000,
  AUDIENCE: 0x0a0a0a,
  NEON: 0xff00ff,
  EMISSIVE_ROOM: 0x220000
}

// ============================================
// LIGHTING
// ============================================
export const LIGHTING = {
  AMBIENT: {
    COLOR: 0xffffff,
    INTENSITY: 2.5
  },
  MAIN_SPOTLIGHT: {
    COLOR: 0xffddaa,
    INTENSITY: 8,
    ANGLE: Math.PI / 4,
    PENUMBRA: 0.4,
    DECAY: 2,
    DISTANCE: 25,
    POSITION: [0, 6, 3]
  },
  PHOTO_SPOTLIGHT: {
    COLOR: 0xffffff,
    INTENSITY: 0,
    ANGLE: Math.PI / 6,
    PENUMBRA: 0.3,
    DECAY: 2,
    DISTANCE: 15,
    POSITION: [0, 5, 3]
  },
  WALL_LIGHTS: {
    COLOR: 0xff8888,
    INTENSITY: 5,
    DISTANCE: 25,
    POSITIONS: [[-4, 4, -3], [4, 4, -3]]
  }
}

// ============================================
// FOG & CAMERA
// ============================================
export const SCENE_FOG = {
  NEAR: 20,
  FAR: 40
}

export const CAMERA = {
  FOV: 50,
  NEAR_PLANE: 0.1,
  FAR_PLANE: 100,
  POSITION: [0, 2, 10],
  LOOK_AT: [0, 2.5, 0]
}

// ============================================
// CANVAS & TEXT RENDERING
// ============================================
export const TEXT_RENDERING = {
  FONT_SIZE: 32,
  FONT_COLOR: 'rgba(255, 200, 100, 0.7)',
  FONT_FAMILY: 'Arial, sans-serif',
  LINE_HEIGHT: 45,
  TEXT_ALIGN: 'center'
}

// ============================================
// TEXTURE SCALES & PATTERNS
// ============================================
export const TEXTURES = {
  BRICK_SCALE: 0.3,
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 1024,
  WOOD_PATTERN_WIDTH: 512,
  WOOD_PATTERN_HEIGHT: 512
}

// ============================================
// ANIMATION & EFFECTS
// ============================================
export const ANIMATION = {
  SCAN_DURATION: 2500,
  REVEAL_DURATION: 1500,
  HOVER_SCALE: 1.1,
  HOVER_DURATION: 0.3
}

// ============================================
// AUDIENCE SETTINGS
// ============================================
export const AUDIENCE = {
  ROW_COUNT: 5,
  PEOPLE_PER_ROW: 8,
  HEAD_SIZE_MIN: 0.3,
  HEAD_SIZE_RANGE: 0.15,
  Z_POSITION_BASE: 7,
  Z_ROW_SPACING: 0.8,
  Z_RANDOM_RANGE: 0.3
}

// ============================================
// FACIAL EXPRESSIONS
// ============================================
export const EXPRESSIONS = {
  NEUTRAL: 'neutral',
  SMILE: 'smile',
  LAUGH: 'laugh',
  SHOCKED: 'shocked',
  ANGRY: 'angry',
  CONFUSED: 'confused'
}

export const EXPRESSION_CONFIG = {
  BLEND_SPEED: 0.05,
  AUDIO_THRESHOLD_LAUGH: 0.6,
  AUDIO_THRESHOLD_SMILE: 0.3
}

// ============================================
// AUDIO ANALYSIS
// ============================================
export const AUDIO_ANALYSIS = {
  FFT_SIZE: 256,
  SMOOTHING: 0.8,
  MID_FREQ_RANGE: 0.1,
  HIGH_FREQ_RANGE: 0.4
}
