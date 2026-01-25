<template>
  <div ref="containerRef" class="absolute inset-0 z-0">
    <canvas ref="canvasRef" class="w-full h-full"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  capturedImage: String,
  isAnalyzing: Boolean,
  roastReady: Boolean,
  roastData: Object
})

const emit = defineEmits(['roastFrameClicked', 'photoClicked'])

const containerRef = ref(null)
const canvasRef = ref(null)

let scene, camera, renderer
let spotlightMain, spotlightPhoto, ambientLight
let microphone, micStand, backgroundWall
let photoTexture, photoMaterial
let roastFrameMesh = null
let photoGroup = null
let animationId
let clock
let raycaster, mouse

onMounted(() => {
  console.log('ComedyClubScene mounted')
  console.log('Canvas ref:', canvasRef.value)
  initScene()
  animate()
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('click', onCanvasClick)
  window.addEventListener('mousemove', onCanvasMouseMove)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('click', onCanvasClick)
  window.removeEventListener('mousemove', onCanvasMouseMove)
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
})

// Watch for captured image to project it
watch(() => props.capturedImage, (newImage, oldImage) => {
  if (newImage) {
    projectImageOnWall(newImage)
  } else if (oldImage && !newImage) {
    // Reset: Remove photo from scene
    if (photoGroup) {
      scene.remove(photoGroup)
      photoGroup = null
    }
    if (spotlightPhoto) {
      spotlightPhoto.intensity = 0
    }
  }
})

// Watch for analysis state to trigger spotlight scanning
watch(() => props.isAnalyzing, (analyzing) => {
  if (analyzing && spotlightPhoto) {
    startAnalysisAnimation()
  }
})

// Watch for roast ready to trigger reveal
watch(() => props.roastReady, (ready, wasReady) => {
  if (ready && props.roastData) {
    // Remove old roast frame if it exists
    if (roastFrameMesh) {
      scene.remove(roastFrameMesh)
      roastFrameMesh = null
    }
    roastRevealAnimation()
    displayRoastText(props.roastData)
  } else if (wasReady && !ready) {
    // Reset: Remove roast frame from scene
    if (roastFrameMesh) {
      scene.remove(roastFrameMesh)
      roastFrameMesh = null
    }
  }
})

function initScene() {
  console.log('Initializing 3D scene...')
  clock = new THREE.Clock()
  
  // Initialize raycaster and mouse for click detection
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()
  
  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x2a1515) // Much brighter red-tinted background
  scene.fog = new THREE.Fog(0x2a1515, 20, 40)
  console.log('Scene created with background:', scene.background)
  
  // Camera
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  )
  camera.position.set(0, 2, 10)
  camera.lookAt(0, 2.5, 0)
  console.log('Camera position:', camera.position)
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ 
    canvas: canvasRef.value,
    antialias: true 
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  console.log('Renderer initialized')
  
  // Lights - MUCH BRIGHTER
  ambientLight = new THREE.AmbientLight(0xffffff, 2.5) // Bright white ambient
  scene.add(ambientLight)
  
  // Main stage spotlight
  spotlightMain = new THREE.SpotLight(0xffddaa, 8)
  spotlightMain.position.set(0, 6, 3)
  spotlightMain.angle = Math.PI / 4
  spotlightMain.penumbra = 0.4
  spotlightMain.decay = 2
  spotlightMain.distance = 25
  spotlightMain.castShadow = true
  scene.add(spotlightMain)
  
  // Photo spotlight (initially off)
  spotlightPhoto = new THREE.SpotLight(0xffffff, 0)
  spotlightPhoto.position.set(0, 5, 3)
  spotlightPhoto.angle = Math.PI / 6
  spotlightPhoto.penumbra = 0.3
  spotlightPhoto.decay = 2
  spotlightPhoto.distance = 15
  scene.add(spotlightPhoto)
  
  // Additional wall lights to illuminate the brick texture
  const wallLight1 = new THREE.PointLight(0xff8888, 5, 25)
  wallLight1.position.set(-4, 4, -3)
  scene.add(wallLight1)
  
  const wallLight2 = new THREE.PointLight(0xff8888, 5, 25)
  wallLight2.position.set(4, 4, -3)
  scene.add(wallLight2)
  
  console.log('Lights added')
  
  // Brick wall background
  const wallGeometry = new THREE.PlaneGeometry(18, 12)
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xaa5555,
    roughness: 0.9,
    metalness: 0.02,
    emissive: 0x220000,
    emissiveIntensity: 0.1 // Subtle screen glow reflection
  })
  backgroundWall = new THREE.Mesh(wallGeometry, wallMaterial)
  backgroundWall.position.set(0, 3, -6)
  backgroundWall.receiveShadow = true
  scene.add(backgroundWall)
  console.log('Wall created at position:', backgroundWall.position)
  
  // Add brick texture effect
  addBrickTexture()
  
  // Floor
  const floorGeometry = new THREE.PlaneGeometry(25, 25)
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a1a1a,
    roughness: 0.9
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  
  // Stage platform
  createStage()
  
  // Stage curtains
  createCurtains()
  
  // Audience crowd
  createAudience()
  
  // Neon sign
  createNeonSign()
  
  // Microphone stand
  createMicrophoneStand()
  
  console.log('Scene initialization complete. Objects in scene:', scene.children.length)
}

function addBrickTexture() {
  // Create a simple brick pattern using a canvas texture
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  
  // Background brick color
  ctx.fillStyle = '#aa5555'
  ctx.fillRect(0, 0, 1024, 1024)
  
  // Draw brick pattern with color variation
  const brickWidth = 120
  const brickHeight = 60
  
  for (let y = 0; y < 1024; y += brickHeight) {
    for (let x = 0; x < 1024; x += brickWidth) {
      const offset = (y / brickHeight) % 2 === 0 ? 0 : brickWidth / 2
      
      // Random color variation for each brick
      const variation = Math.random() * 30 - 15
      const r = Math.max(0, Math.min(255, 119 + variation))
      const g = Math.max(0, Math.min(255, 34 + variation))
      const b = Math.max(0, Math.min(255, 34 + variation))
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      
      ctx.fillRect(x + offset, y, brickWidth - 4, brickHeight - 4)
    }
  }
  
  // Add grout lines
  ctx.strokeStyle = '#551111'
  ctx.lineWidth = 3
  for (let y = 0; y < 1024; y += brickHeight) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(1024, y)
    ctx.stroke()
  }
  for (let x = 0; x < 1024; x += brickWidth) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 1024)
    ctx.stroke()
  }
  
  // Add subtle noise for realism
  const imageData = ctx.getImageData(0, 0, 1024, 1024)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20
    imageData.data[i] += noise     // R
    imageData.data[i + 1] += noise // G
    imageData.data[i + 2] += noise // B
  }
  ctx.putImageData(imageData, 0, 0)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  
  backgroundWall.material.map = texture
  backgroundWall.material.needsUpdate = true
}

function createStage() {
  const stageGroup = new THREE.Group()
  
  // Stage platform - wooden stage
  const stageHeight = 0.3
  const stageWidth = 8
  const stageDepth = 5
  
  const stageGeometry = new THREE.BoxGeometry(stageWidth, stageHeight, stageDepth)
  const stageMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3422,  // Dark wood color
    roughness: 0.8,
    metalness: 0.1
  })
  
  const stage = new THREE.Mesh(stageGeometry, stageMaterial)
  stage.position.set(0, stageHeight / 2, -2)  // Centered, slightly raised, toward back
  stage.castShadow = true
  stage.receiveShadow = true
  stageGroup.add(stage)
  
  // Add wood grain texture effect
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  
  // Wood base color
  ctx.fillStyle = '#4a3422'
  ctx.fillRect(0, 0, 512, 512)
  
  // Wood grain lines
  ctx.strokeStyle = '#3a2412'
  ctx.lineWidth = 2
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * 512
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(128, y + Math.random() * 20 - 10, 384, y + Math.random() * 20 - 10, 512, y)
    ctx.stroke()
  }
  
  // Add some darker planks
  ctx.strokeStyle = '#2a1812'
  ctx.lineWidth = 1
  for (let x = 64; x < 512; x += 128) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 512)
    ctx.stroke()
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  
  stage.material.map = texture
  stage.material.needsUpdate = true
  
  scene.add(stageGroup)
}

function createCurtains() {
  // Rich burgundy velvet material
  const curtainMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b0000,  // Dark red
    roughness: 0.7,
    metalness: 0.1,
    emissive: 0x220000,
    emissiveIntensity: 0.05
  })
  
  // Left curtain
  const leftCurtainGeometry = new THREE.PlaneGeometry(3, 8)
  const leftCurtain = new THREE.Mesh(leftCurtainGeometry, curtainMaterial)
  leftCurtain.position.set(-8, 4, -5.5)
  leftCurtain.rotation.y = Math.PI / 8  // Angle inward slightly
  leftCurtain.receiveShadow = true
  leftCurtain.castShadow = true
  scene.add(leftCurtain)
  
  // Right curtain
  const rightCurtainGeometry = new THREE.PlaneGeometry(3, 8)
  const rightCurtain = new THREE.Mesh(rightCurtainGeometry, curtainMaterial.clone())
  rightCurtain.position.set(8, 4, -5.5)
  rightCurtain.rotation.y = -Math.PI / 8  // Angle inward slightly
  rightCurtain.receiveShadow = true
  rightCurtain.castShadow = true
  scene.add(rightCurtain)
  
  // Add fabric fold texture to both curtains
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  
  // Base velvet color
  ctx.fillStyle = '#8b0000'
  ctx.fillRect(0, 0, 512, 1024)
  
  // Vertical folds/pleats
  for (let x = 0; x < 512; x += 40) {
    const brightness = Math.sin(x / 40) * 30
    ctx.fillStyle = `rgb(${139 + brightness}, 0, 0)`
    ctx.fillRect(x, 0, 20, 1024)
  }
  
  // Add shadow in folds
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  for (let x = 20; x < 512; x += 40) {
    ctx.fillRect(x, 0, 10, 1024)
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  
  leftCurtain.material.map = texture
  leftCurtain.material.needsUpdate = true
  rightCurtain.material.map = texture
  rightCurtain.material.needsUpdate = true
}

function createAudience() {
  // Dark silhouette material for audience members
  const audienceMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.9,
    metalness: 0.0
  })
  
  const audienceGroup = new THREE.Group()
  
  // Create rows of audience members - positioned in front of camera view
  const rows = 3
  const membersPerRow = 12
  
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < membersPerRow; i++) {
      // Head
      const headSize = 0.3 + Math.random() * 0.15
      const headGeometry = new THREE.SphereGeometry(headSize, 16, 16)
      const head = new THREE.Mesh(headGeometry, audienceMaterial)
      
      // Shoulders/body
      const shoulderWidth = headSize * 2.5
      const shoulderHeight = headSize * 1.8
      const shoulderGeometry = new THREE.BoxGeometry(shoulderWidth, shoulderHeight, headSize * 1.2)
      const shoulders = new THREE.Mesh(shoulderGeometry, audienceMaterial)
      
      // Position person - spread across bottom of view
      const xSpread = 18
      const xPos = (i / membersPerRow) * xSpread - xSpread / 2 + (Math.random() - 0.5) * 0.5
      const zPos = 7 - row * 0.8 + Math.random() * 0.3  // Close to camera, rows going back
      const baseY = 0.2 - row * 0.2  // Near bottom of view
      
      head.position.set(xPos, baseY + shoulderHeight + headSize * 0.7, zPos)
      shoulders.position.set(xPos, baseY + shoulderHeight / 2, zPos)
      
      head.castShadow = true
      shoulders.castShadow = true
      
      audienceGroup.add(head)
      audienceGroup.add(shoulders)
    }
  }
  
  scene.add(audienceGroup)
}

function createNeonSign() {
  // Create canvas with neon text
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 768
  const ctx = canvas.getContext('2d')
  
  // Clear background
  ctx.fillStyle = 'rgba(0, 0, 0, 0)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  ctx.textAlign = 'center'
  
  // Top line - "GEMINI" in cyan/electric blue
  const geminiColor = '#00ffff'
  ctx.font = 'italic bold 220px Arial'
  ctx.textBaseline = 'middle'
  
  // Glow layers for GEMINI
  ctx.shadowColor = geminiColor
  ctx.shadowBlur = 60
  ctx.fillStyle = geminiColor
  ctx.fillText('GEMINI', canvas.width / 2, 200)
  
  ctx.shadowBlur = 40
  ctx.fillText('GEMINI', canvas.width / 2, 200)
  
  ctx.shadowBlur = 20
  ctx.fillStyle = '#ffffff'
  ctx.fillText('GEMINI', canvas.width / 2, 200)
  
  // Bottom line - "ROAST CLUB" in hot pink
  const roastColor = '#ff0066'
  ctx.font = 'bold 200px Arial'
  
  // Glow layers for ROAST CLUB
  ctx.shadowColor = roastColor
  ctx.shadowBlur = 70
  ctx.fillStyle = roastColor
  ctx.fillText('ROAST CLUB', canvas.width / 2, 520)
  
  ctx.shadowBlur = 45
  ctx.fillText('ROAST CLUB', canvas.width / 2, 520)
  
  ctx.shadowBlur = 25
  ctx.fillStyle = '#ffffff'
  ctx.fillText('ROAST CLUB', canvas.width / 2, 520)
  
  // Add decorative stars/sparkles
  ctx.shadowBlur = 15
  ctx.fillStyle = '#ffff00'
  ctx.font = 'bold 80px Arial'
  ctx.fillText('★', 200, 200)
  ctx.fillText('★', canvas.width - 200, 200)
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas)
  
  // Create plane for sign - taller for two lines
  const signGeometry = new THREE.PlaneGeometry(7, 2.8)
  const signMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  
  const signMesh = new THREE.Mesh(signGeometry, signMaterial)
  signMesh.position.set(0, 6.8, -4.5)
  scene.add(signMesh)
  
  // Create glow plane (larger, behind the main sign)
  const glowGeometry = new THREE.PlaneGeometry(8, 3.5)
  const glowMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
  glowMesh.position.set(0, 6.8, -4.52)
  scene.add(glowMesh)
  
  // Add bright point lights for environmental glow - cyan for top
  const topLight = new THREE.PointLight(0x00ffff, 4, 10)
  topLight.position.set(0, 7.5, -4)
  scene.add(topLight)
  
  // Pink for bottom
  const bottomLight = new THREE.PointLight(0xff0066, 5, 10)
  bottomLight.position.set(0, 6.2, -4)
  scene.add(bottomLight)
  
  const leftLight = new THREE.PointLight(0xff0066, 3, 8)
  leftLight.position.set(-2, 6.5, -4)
  scene.add(leftLight)
  
  const rightLight = new THREE.PointLight(0x00ffff, 3, 8)
  rightLight.position.set(2, 6.5, -4)
  scene.add(rightLight)
}


function createMicrophoneStand() {
  const standGroup = new THREE.Group()
  
  // Shared metallic material
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.9,
    roughness: 0.15,
    envMapIntensity: 1.0
  })
  
  // Base - sits on floor
  const baseHeight = 0.08
  const baseGeometry = new THREE.CylinderGeometry(0.4, 0.4, baseHeight, 32)
  const base = new THREE.Mesh(baseGeometry, metalMaterial)
  base.position.y = baseHeight / 2  // Half height to sit on floor
  base.castShadow = true
  base.receiveShadow = true
  standGroup.add(base)
  
  // Pole - connects to top of base
  const poleHeight = 1.5
  const poleGeometry = new THREE.CylinderGeometry(0.025, 0.025, poleHeight, 16)
  const pole = new THREE.Mesh(poleGeometry, metalMaterial)
  pole.position.y = baseHeight + (poleHeight / 2)  // Base height + half pole height
  pole.castShadow = true
  standGroup.add(pole)
  
  // Create arm+mic group that pivots from pole top
  const poleTop = baseHeight + poleHeight
  const armGroup = new THREE.Group()
  armGroup.position.set(0, poleTop, 0)  // Pivot point at pole top
  
  // Mic holder arm - positioned upward from pivot
  const armLength = 0.5
  const armGeometry = new THREE.CylinderGeometry(0.018, 0.018, armLength, 16)
  const arm = new THREE.Mesh(armGeometry, metalMaterial)
  arm.position.y = armLength / 2  // Half length up from pivot
  arm.castShadow = true
  armGroup.add(arm)
  
  // Microphone - at the top of the arm
  const micGeometry = new THREE.CapsuleGeometry(0.08, 0.2, 8, 16)
  const micMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.7,
    roughness: 0.25,
    envMapIntensity: 0.8
  })
  microphone = new THREE.Mesh(micGeometry, micMaterial)
  microphone.position.y = armLength  // At end of arm
  microphone.castShadow = true
  armGroup.add(microphone)
  
  // Now rotate the entire arm+mic group
  armGroup.rotation.z = Math.PI / 3.5
  armGroup.rotation.y = -0.2
  
  standGroup.add(armGroup)
  
  // Position stand on the stage - right side
  const stageHeight = 0.3
  standGroup.position.set(2.5, stageHeight, -2.5)
  standGroup.castShadow = true
  scene.add(standGroup)
  
  micStand = standGroup
}

function projectImageOnWall(imageDataUrl) {
  // Create texture from captured image
  const loader = new THREE.TextureLoader()
  loader.load(imageDataUrl, (texture) => {
    photoTexture = texture
    
    // Calculate dimensions based on image aspect ratio
    const img = texture.image
    const aspect = img.width / img.height
    const baseWidth = 4
    let canvasWidth, canvasHeight
    
    if (aspect > 1) {
      // Landscape
      canvasWidth = 1024
      canvasHeight = Math.round(1024 / aspect)
    } else {
      // Portrait
      canvasHeight = 1024
      canvasWidth = Math.round(1024 * aspect)
    }
    
    // Create canvas with photo and frame border
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')
    
    // Dark background
    ctx.fillStyle = '#1a0a0a'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    
    // Gold ornate frame border
    const borderSize = Math.min(canvasWidth, canvasHeight) * 0.03
    ctx.strokeStyle = '#d4af37'
    ctx.lineWidth = borderSize
    ctx.strokeRect(borderSize / 2, borderSize / 2, canvasWidth - borderSize, canvasHeight - borderSize)
    
    ctx.strokeStyle = '#b8941e'
    ctx.lineWidth = borderSize * 0.4
    ctx.strokeRect(borderSize * 1.5, borderSize * 1.5, canvasWidth - borderSize * 3, canvasHeight - borderSize * 3)
    
    // Draw the captured image in the center
    const padding = borderSize * 2.5
    ctx.drawImage(img, padding, padding, canvasWidth - padding * 2, canvasHeight - padding * 2)
    
    // Create texture from canvas
    const framedTexture = new THREE.CanvasTexture(canvas)
    framedTexture.needsUpdate = true
    
    // Create photo plane with proper aspect ratio
    const planeWidth = baseWidth
    const planeHeight = baseWidth / aspect
    const photoGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
    photoMaterial = new THREE.MeshStandardMaterial({
      map: framedTexture,
      side: THREE.DoubleSide
    })
    
    const photoPlane = new THREE.Mesh(photoGeometry, photoMaterial)
    
    // Add hanging strings/wires
    const stringMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 })
    
    // Left string
    const leftString = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 2.5, 8),
      stringMaterial
    )
    leftString.position.set(-planeWidth * 0.25, planeHeight / 2 + 1.25, 0.05)
    
    // Right string
    const rightString = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 2.5, 8),
      stringMaterial
    )
    rightString.position.set(planeWidth * 0.25, planeHeight / 2 + 1.25, 0.05)
    
    // Group photo and strings together
    photoGroup = new THREE.Group()
    photoGroup.add(photoPlane)
    photoGroup.add(leftString)
    photoGroup.add(rightString)
    photoGroup.userData.clickable = true // Mark as clickable
    
    // Start position - in front of camera (where user is)
    photoGroup.position.set(0, 2, 5)
    photoGroup.scale.set(0.3, 0.3, 0.3)
    scene.add(photoGroup)
    
    // Flash effect
    flashEffect()
    
    // Animate photo flying to the wall
    const startTime = Date.now()
    const duration = 1200 // 1.2 seconds
    const startPos = { x: 0, y: 2, z: 5 }
    const endPos = { x: -8.5, y: 3.5, z: -4.5 } // Far LEFT, well in front of curtains
    const startScale = 0.3
    const endScale = 1.0
    
    const flyAnimation = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3)
      
      // Interpolate position
      photoGroup.position.x = startPos.x + (endPos.x - startPos.x) * eased
      photoGroup.position.y = startPos.y + (endPos.y - startPos.y) * eased + Math.sin(progress * Math.PI) * 0.5
      photoGroup.position.z = startPos.z + (endPos.z - startPos.z) * eased
      
      // Interpolate scale
      const scale = startScale + (endScale - startScale) * eased
      photoGroup.scale.set(scale, scale, scale)
      
      // Add slight rotation during flight
      photoGroup.rotation.y = Math.sin(progress * Math.PI * 2) * 0.2
      
      if (progress < 1) {
        requestAnimationFrame(flyAnimation)
      } else {
        // Animation complete - photo is now on the wall
        photoGroup.rotation.set(0, 0, 0)
        
        // Turn on spotlight
        spotlightPhoto.intensity = 3
        spotlightPhoto.target.position.set(-8.5, 3.5, -4.5)
        scene.add(spotlightPhoto.target)
      }
    }
    flyAnimation()
  })
}

function flashEffect() {
  // Bright flash - entire scene lights up
  const originalAmbient = ambientLight.intensity
  const originalMain = spotlightMain.intensity
  
  ambientLight.intensity = 3
  spotlightMain.intensity = 15
  
  setTimeout(() => {
    ambientLight.intensity = originalAmbient
    spotlightMain.intensity = originalMain
  }, 100)
}

function startAnalysisAnimation() {
  // Scanning spotlight effect
  if (!spotlightPhoto) return
  
  const startTime = Date.now()
  const scanDuration = 2500
  
  const scan = () => {
    if (!props.isAnalyzing) return
    
    const elapsed = Date.now() - startTime
    const progress = (elapsed % scanDuration) / scanDuration
    
    // Move spotlight in a scanning pattern across the photo
    const x = Math.sin(progress * Math.PI * 2) * 2
    const y = 3 + Math.cos(progress * Math.PI * 4) * 0.8
    
    spotlightPhoto.target.position.set(x, y, -6)
    
    // Pulse intensity
    spotlightPhoto.intensity = 2.5 + Math.sin(progress * Math.PI * 6) * 0.5
    
    if (props.isAnalyzing) {
      requestAnimationFrame(scan)
    }
  }
  scan()
}

function roastRevealAnimation() {
  // Simple fade-in for roast text - no effects on photo
  console.log('Roast revealed!')
}

function displayRoastText(roastData) {
  // Create a canvas for the roast text
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 768
  const ctx = canvas.getContext('2d')
  
  // Background - dark with slight texture
  ctx.fillStyle = '#1a0a0a'
  ctx.fillRect(0, 0, 512, 768)
  
  // Gold ornate frame border
  ctx.strokeStyle = '#d4af37'
  ctx.lineWidth = 12
  ctx.strokeRect(20, 20, 472, 728)
  
  ctx.strokeStyle = '#b8941e'
  ctx.lineWidth = 4
  ctx.strokeRect(32, 32, 448, 704)
  
  // Title
  ctx.fillStyle = '#ff4444'
  ctx.font = 'bold 36px serif'
  ctx.textAlign = 'center'
  ctx.fillText('THE ROAST', 256, 80)
  
  // Overall vibe
  ctx.fillStyle = '#ffaa88'
  ctx.font = 'italic 20px serif'
  const vibeText = `"${roastData.data.overall_vibe}"`
  wrapText(ctx, vibeText, 256, 130, 420, 26)
  
  // Roast lines
  ctx.fillStyle = '#cccccc'
  ctx.font = '16px monospace'
  ctx.textAlign = 'left'
  let y = 220
  roastData.data.roast_lines.slice(0, 8).forEach((line, i) => {
    const wrapped = wrapText(ctx, `• ${line}`, 60, y, 390, 20)
    y += wrapped * 20 + 10
  })
  
  // One-liner at bottom
  ctx.fillStyle = '#ff6666'
  ctx.font = 'bold italic 22px serif'
  ctx.textAlign = 'center'
  const oneLiner = `"${roastData.data.one_liner}"`
  wrapText(ctx, oneLiner, 256, y + 40, 420, 28)
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  
  // Create roast sheet with hanging strings
  const roastGroup = new THREE.Group()
  
  // Create frame geometry
  const frameGeometry = new THREE.PlaneGeometry(2.5, 3.5)
  const frameMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide
  })
  
  roastFrameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
  roastFrameMesh.userData.clickable = true // Mark as clickable
  roastGroup.add(roastFrameMesh)
  
  // Add hanging strings
  const stringMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 })
  
  const leftString = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 2.0, 8),
    stringMaterial
  )
  leftString.position.set(-0.6, 1.75 + 1.0, 0.05)
  roastGroup.add(leftString)
  
  const rightString = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 2.0, 8),
    stringMaterial
  )
  rightString.position.set(0.6, 1.75 + 1.0, 0.05)
  roastGroup.add(rightString)
  
  // Position far RIGHT, well in front of curtains
  roastGroup.position.set(8.5, 3.5, -4.5)
  scene.add(roastGroup)
  
  // Add spotlight for the text frame
  const textLight = new THREE.SpotLight(0xffffdd, 4)
  textLight.position.set(8.5, 5, 0)
  textLight.target = roastFrameMesh
  textLight.angle = Math.PI / 8
  textLight.penumbra = 0.4
  scene.add(textLight)
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  let lineCount = 0
  
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
    
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y)
      line = words[n] + ' '
      y += lineHeight
      lineCount++
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y)
  lineCount++
  
  return lineCount
}

let frameCount = 0
function animate() {
  animationId = requestAnimationFrame(animate)
  
  const delta = clock.getDelta()
  
  // Log first few frames
  if (frameCount < 5) {
    console.log(`Frame ${frameCount}: Rendering scene`)
    frameCount++
  }
  
  // Subtle microphone sway
  if (microphone) {
    microphone.rotation.z = Math.PI / 6 + Math.sin(Date.now() * 0.001) * 0.02
  }
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function onCanvasClick(event) {
  if (!camera || !renderer) return
  
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  const rect = canvasRef.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera)
  
  // Check for intersections with both roast frame and photo
  const clickableObjects = [roastFrameMesh, photoGroup].filter(obj => obj !== null)
  const intersects = raycaster.intersectObjects(clickableObjects, true)
  
  if (intersects.length > 0) {
    const clickedObject = intersects[0].object
    // Check if clicked on photo group or its children
    if (photoGroup && (clickedObject === photoGroup || photoGroup.children.includes(clickedObject))) {
      console.log('Photo clicked!')
      emit('photoClicked')
    } 
    // Check if clicked on roast frame
    else if (roastFrameMesh && clickedObject === roastFrameMesh) {
      console.log('Roast frame clicked!')
      emit('roastFrameClicked')
    }
  }
}

function onCanvasMouseMove(event) {
  if (!camera || !renderer || !canvasRef.value) return
  
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  const rect = canvasRef.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera)
  
  // Check for intersections with both roast frame and photo
  const clickableObjects = [roastFrameMesh, photoGroup].filter(obj => obj !== null)
  const intersects = raycaster.intersectObjects(clickableObjects, true)
  
  // Change cursor style
  if (intersects.length > 0) {
    canvasRef.value.style.cursor = 'pointer'
  } else {
    canvasRef.value.style.cursor = 'default'
  }
}
</script>
