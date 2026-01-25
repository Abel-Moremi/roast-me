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

function createMicrophoneStand() {
  const standGroup = new THREE.Group()
  
  // Base - larger and more grounded
  const baseGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 32)
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.9,
    roughness: 0.15,
    envMapIntensity: 1.0
  })
  const base = new THREE.Mesh(baseGeometry, metalMaterial)
  base.position.y = 0.04
  base.castShadow = true
  base.receiveShadow = true
  standGroup.add(base)
  
  // Pole - taller
  const poleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 1.5, 16)
  const pole = new THREE.Mesh(poleGeometry, metalMaterial)
  pole.position.y = 0.83
  pole.castShadow = true
  standGroup.add(pole)
  
  // Mic holder arm - angled toward center
  const armGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.5, 16)
  const arm = new THREE.Mesh(armGeometry, metalMaterial)
  arm.position.set(0.22, 1.6, 0.1)
  arm.rotation.z = Math.PI / 3.5
  arm.rotation.y = -0.2 // Angle toward camera
  arm.castShadow = true
  standGroup.add(arm)
  
  // Microphone - larger and more prominent
  const micGeometry = new THREE.CapsuleGeometry(0.08, 0.2, 8, 16)
  const micMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.7,
    roughness: 0.25,
    envMapIntensity: 0.8
  })
  microphone = new THREE.Mesh(micGeometry, micMaterial)
  microphone.position.set(0.42, 1.85, 0.15)
  microphone.rotation.z = Math.PI / 7
  microphone.rotation.y = -0.2
  microphone.castShadow = true
  standGroup.add(microphone)
  
  // Position stand - moved forward and to the side
  standGroup.position.set(2.5, 0, 4)
  standGroup.castShadow = true
  scene.add(standGroup)
  
  micStand = standGroup
}

function projectImageOnWall(imageDataUrl) {
  // Create texture from captured image
  const loader = new THREE.TextureLoader()
  loader.load(imageDataUrl, (texture) => {
    photoTexture = texture
    
    // Create photo plane
    const aspect = texture.image.width / texture.image.height
    const photoWidth = 5
    const photoHeight = photoWidth / aspect
    
    const photoGeometry = new THREE.PlaneGeometry(photoWidth, photoHeight)
    photoMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: false,
      side: THREE.DoubleSide
    })
    
    const photoPlane = new THREE.Mesh(photoGeometry, photoMaterial)
    
    // Create ornate frame around the photo
    const frameThickness = 0.3
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Gold color
      metalness: 0.8,
      roughness: 0.2
    })
    
    // Top frame bar
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(photoWidth + frameThickness * 2, frameThickness, 0.2),
      frameMat
    )
    topFrame.position.set(0, photoHeight / 2 + frameThickness / 2, 0.1)
    
    // Bottom frame bar
    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(photoWidth + frameThickness * 2, frameThickness, 0.2),
      frameMat
    )
    bottomFrame.position.set(0, -photoHeight / 2 - frameThickness / 2, 0.1)
    
    // Left frame bar
    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, photoHeight, 0.2),
      frameMat
    )
    leftFrame.position.set(-photoWidth / 2 - frameThickness / 2, 0, 0.1)
    
    // Right frame bar
    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, photoHeight, 0.2),
      frameMat
    )
    rightFrame.position.set(photoWidth / 2 + frameThickness / 2, 0, 0.1)
    
    // Group photo and frame together
    photoGroup = new THREE.Group()
    photoGroup.add(photoPlane)
    photoGroup.add(topFrame)
    photoGroup.add(bottomFrame)
    photoGroup.add(leftFrame)
    photoGroup.add(rightFrame)
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
    const endPos = { x: -3.5, y: 3, z: -5.8 } // Move to LEFT side of wall
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
        spotlightPhoto.target.position.set(-3.5, 3, -6)
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
  
  // Create frame geometry - positioned to the right of the photo
  const frameGeometry = new THREE.PlaneGeometry(2.5, 3.5)
  const frameMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide
  })
  
  roastFrameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
  roastFrameMesh.position.set(1, 3, -5.8) // Center-right of wall, photo is at -3.5 (left)
  roastFrameMesh.userData.clickable = true // Mark as clickable
  scene.add(roastFrameMesh)
  
  // Add spotlight for the text frame
  const textLight = new THREE.SpotLight(0xffffdd, 4)
  textLight.position.set(1, 5, 0)
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
