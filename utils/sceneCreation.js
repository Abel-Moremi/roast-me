/**
 * Scene Creation Utilities
 * Helper functions for building 3D scene elements
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  STAGE,
  COLORS,
  TEXTURES,
  COMEDIAN,
  AUDIENCE,
  LIGHTING
} from '@/utils/sceneConstants'

// ============================================
// TEXTURE UTILITIES
// ============================================

/**
 * Create brick texture procedurally
 * @returns {THREE.Texture} Brick pattern texture
 */
export function createBrickTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURES.CANVAS_WIDTH
  canvas.height = TEXTURES.CANVAS_HEIGHT

  const ctx = canvas.getContext('2d')
  const brickWidth = 50
  const brickHeight = 25
  const mortar = 2

  // Draw bricks
  ctx.fillStyle = '#8B4513'
  for (let y = 0; y < canvas.height; y += brickHeight + mortar) {
    for (
      let x = 0;
      x < canvas.width;
      x += brickWidth + mortar
    ) {
      const offsetX = y % (2 * (brickHeight + mortar)) === 0 ? 0 : (brickWidth + mortar) / 2
      ctx.fillRect(
        (x + offsetX) % canvas.width,
        y,
        brickWidth,
        brickHeight
      )
    }
  }

  // Draw mortar lines
  ctx.strokeStyle = '#666'
  ctx.lineWidth = mortar
  for (let y = 0; y < canvas.height; y += brickHeight + mortar) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.repeat.set(TEXTURES.BRICK_SCALE, TEXTURES.BRICK_SCALE)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * Create wood pattern texture procedurally
 * @returns {THREE.Texture} Wood pattern texture
 */
export function createWoodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURES.WOOD_PATTERN_WIDTH
  canvas.height = TEXTURES.WOOD_PATTERN_HEIGHT

  const ctx = canvas.getContext('2d')

  // Create wood grain effect
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    const x = pixelIndex % canvas.width
    const y = Math.floor(pixelIndex / canvas.width)

    // Perlin-like noise for wood grain
    const noise =
      Math.sin(x * 0.01) * 0.5 +
      Math.sin(y * 0.005) * 0.3 +
      Math.random() * 0.2

    const value = Math.floor((noise + 0.5) * 255)
    const baseColor = 74 + (value - 128) * 0.3

    data[i] = Math.max(0, Math.min(255, baseColor * 1.2))
    data[i + 1] = Math.max(0, Math.min(255, baseColor))
    data[i + 2] = Math.max(0, Math.min(255, baseColor * 0.8))
    data[i + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.repeat.set(1, 2)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

// ============================================
// STAGE CONSTRUCTION
// ============================================

/**
 * Create stage platform
 * @returns {THREE.Mesh} Stage mesh
 */
export function createStage() {
  const stageGeometry = new THREE.BoxGeometry(
    STAGE.WIDTH,
    STAGE.HEIGHT,
    STAGE.DEPTH
  )

  const stageMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.STAGE_WOOD,
    map: createWoodTexture(),
    roughness: 0.7,
    metalness: 0.1
  })

  const stage = new THREE.Mesh(stageGeometry, stageMaterial)
  stage.position.set(0, 0, STAGE.POSITION_Z)
  stage.receiveShadow = true
  stage.castShadow = true
  stage.name = 'stage'

  return stage
}

/**
 * Create stage curtains
 * @returns {THREE.Group} Group containing curtain meshes
 */
export function createCurtains() {
  const curtainsGroup = new THREE.Group()

  // Left curtain
  const leftCurtainGeometry = new THREE.PlaneGeometry(2, 5)
  const curtainMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.CURTAIN,
    side: THREE.DoubleSide,
    roughness: 0.6,
    metalness: 0
  })

  const leftCurtain = new THREE.Mesh(leftCurtainGeometry, curtainMaterial)
  leftCurtain.position.set(-4, 2.5, -2.2)
  leftCurtain.castShadow = true
  leftCurtain.receiveShadow = true
  curtainsGroup.add(leftCurtain)

  // Right curtain
  const rightCurtain = new THREE.Mesh(leftCurtainGeometry, curtainMaterial)
  rightCurtain.position.set(4, 2.5, -2.2)
  rightCurtain.castShadow = true
  rightCurtain.receiveShadow = true
  curtainsGroup.add(rightCurtain)

  curtainsGroup.name = 'curtains'
  return curtainsGroup
}

/**
 * Create audience seating area with silhouettes
 * @returns {THREE.Group} Group containing audience mesh
 */
export function createAudience() {
  const audienceGroup = new THREE.Group()

  for (let row = 0; row < AUDIENCE.ROW_COUNT; row++) {
    for (
      let person = 0;
      person < AUDIENCE.PEOPLE_PER_ROW;
      person++
    ) {
      const headSize =
        AUDIENCE.HEAD_SIZE_MIN +
        Math.random() * AUDIENCE.HEAD_SIZE_RANGE

      const headGeometry = new THREE.SphereGeometry(headSize, 8, 8)
      const headMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.AUDIENCE,
        roughness: 0.9,
        metalness: 0
      })

      const head = new THREE.Mesh(headGeometry, headMaterial)

      // Position in rows
      const x = (person - AUDIENCE.PEOPLE_PER_ROW / 2) * 1.2
      const z =
        AUDIENCE.Z_POSITION_BASE -
        row * AUDIENCE.Z_ROW_SPACING +
        (Math.random() - 0.5) * AUDIENCE.Z_RANDOM_RANGE
      const y = row * 0.3

      head.position.set(x, y, z)
      head.castShadow = true
      head.receiveShadow = true

      audienceGroup.add(head)
    }
  }

  audienceGroup.name = 'audience'
  return audienceGroup
}

/**
 * Create neon sign
 * @returns {THREE.Group} Group containing neon sign
 */
export function createNeonSign() {
  const neonGroup = new THREE.Group()

  // Create neon glow effect
  const signGeometry = new THREE.PlaneGeometry(3, 1)
  const signMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.NEON,
    emissive: COLORS.NEON,
    emissiveIntensity: 0.8
  })

  const sign = new THREE.Mesh(signGeometry, signMaterial)
  sign.position.set(0, 4.5, -2.9)
  neonGroup.add(sign)

  // Add glow effect using bloom/post-processing compatible material
  const glowGeometry = new THREE.PlaneGeometry(3.2, 1.2)
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.NEON,
    emissive: COLORS.NEON,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.3
  })

  const glow = new THREE.Mesh(glowGeometry, glowMaterial)
  glow.position.set(0, 4.5, -2.89)
  neonGroup.add(glow)

  neonGroup.name = 'neonSign'
  return neonGroup
}

// ============================================
// MODEL LOADING
// ============================================

/**
 * Load comedian model and scan morphTargets
 * @param {THREE.Scene} scene - Target scene
 * @returns {Promise<THREE.Group>} Loaded model group
 */
export async function loadComedianModel(scene) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()

    loader.load(
      COMEDIAN.MODEL_PATH,
      gltf => {
        const comedian = gltf.scene
        comedian.scale.set(
          COMEDIAN.SCALE,
          COMEDIAN.SCALE,
          COMEDIAN.SCALE
        )
        comedian.position.set(0, 0, COMEDIAN.POSITION_Z)
        comedian.rotation.y = COMEDIAN.ROTATION_Y
        comedian.name = 'comedian'

        // Enable shadows
        comedian.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })

        // Scan morphTargets
        const meshes = []
        comedian.traverse(child => {
          if (
            child instanceof THREE.Mesh &&
            child.morphTargetDictionary
          ) {
            meshes.push(child)
            console.log(
              `Found mesh with morphTargets: ${child.name}`,
              Object.keys(child.morphTargetDictionary)
            )
          }
        })

        scene.add(comedian)
        resolve(comedian)
      },
      undefined,
      error => {
        console.error('Error loading comedian model:', error)
        reject(error)
      }
    )
  })
}

/**
 * Create microphone stand
 * @returns {THREE.Group} Microphone stand group
 */
export function createMicrophoneStand() {
  const micGroup = new THREE.Group()

  // Stand base
  const baseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.2, 16)
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.8,
    roughness: 0.2
  })

  const base = new THREE.Mesh(baseGeometry, metalMaterial)
  base.position.y = 0.1
  base.castShadow = true
  base.receiveShadow = true
  micGroup.add(base)

  // Stand pole
  const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 16)
  const pole = new THREE.Mesh(poleGeometry, metalMaterial)
  pole.position.y = 1
  pole.castShadow = true
  pole.receiveShadow = true
  micGroup.add(pole)

  // Microphone head
  const headGeometry = new THREE.SphereGeometry(0.15, 16, 16)
  const head = new THREE.Mesh(headGeometry, metalMaterial)
  head.position.set(0, 2, 0)
  head.castShadow = true
  head.receiveShadow = true
  micGroup.add(head)

  // Microphone grill
  const grillGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16)
  const grillMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.6,
    roughness: 0.3
  })

  const grill = new THREE.Mesh(grillGeometry, grillMaterial)
  grill.position.set(0, 1.9, 0)
  grill.castShadow = true
  grill.receiveShadow = true
  micGroup.add(grill)

  micGroup.name = 'microphone'
  return micGroup
}

// ============================================
// WALL TEXTURING
// ============================================

/**
 * Create textured back wall
 * @param {THREE.Scene} scene - Target scene
 * @returns {THREE.Mesh} Wall mesh
 */
export function createBackWall(scene) {
  const wallGeometry = new THREE.PlaneGeometry(10, 6)
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.WALL,
    map: createBrickTexture(),
    roughness: 0.8,
    metalness: 0,
    emissive: COLORS.EMISSIVE_ROOM,
    emissiveIntensity: 0.2
  })

  const wall = new THREE.Mesh(wallGeometry, wallMaterial)
  wall.position.set(0, 2.5, -3)
  wall.receiveShadow = true
  wall.name = 'backWall'

  scene.add(wall)
  return wall
}

/**
 * Create textured floor
 * @param {THREE.Scene} scene - Target scene
 * @returns {THREE.Mesh} Floor mesh
 */
export function createFloor(scene) {
  const floorGeometry = new THREE.PlaneGeometry(12, 10)
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a0f0f,
    roughness: 0.6,
    metalness: 0.1
  })

  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.5
  floor.receiveShadow = true
  floor.name = 'floor'

  scene.add(floor)
  return floor
}

// ============================================
// TEXT CANVAS CREATION
// ============================================

/**
 * Create canvas texture with text
 * @param {string} text - Text to display
 * @param {Object} options - Rendering options (fontSize, color, width, height)
 * @returns {THREE.CanvasTexture} Text texture
 */
export function createTextTexture(
  text,
  options = {}
) {
  const {
    fontSize = 32,
    color = 'rgba(255, 200, 100, 0.7)',
    width = 1024,
    height = 1024,
    fontFamily = 'Arial, sans-serif'
  } = options

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0, 0, 0, 0)'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = color
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Handle multi-line text
  const lines = text.split('\n')
  const lineHeight = fontSize * 1.5
  const totalHeight = lines.length * lineHeight
  const startY = (height - totalHeight) / 2

  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight)
  })

  return new THREE.CanvasTexture(canvas)
}

/**
 * Create mesh from text texture
 * @param {string} text - Text to display
 * @param {Object} options - Mesh and texture options
 * @returns {THREE.Mesh} Text mesh
 */
export function createTextMesh(text, options = {}) {
  const {
    width = 4,
    height = 2,
    ...textureOptions
  } = options

  const geometry = new THREE.PlaneGeometry(width, height)
  const material = new THREE.MeshBasicMaterial({
    map: createTextTexture(text, textureOptions),
    transparent: true,
    side: THREE.DoubleSide
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'textMesh'

  return mesh
}
