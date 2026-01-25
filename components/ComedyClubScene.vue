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
  roastReady: Boolean
})

const containerRef = ref(null)
const canvasRef = ref(null)

let scene, camera, renderer
let spotlightMain, spotlightPhoto, ambientLight
let microphone, micStand, backgroundWall
let photoTexture, photoMaterial
let animationId
let clock

onMounted(() => {
  console.log('ComedyClubScene mounted')
  console.log('Canvas ref:', canvasRef.value)
  initScene()
  animate()
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
})

// Watch for captured image to project it
watch(() => props.capturedImage, (newImage) => {
  if (newImage) {
    projectImageOnWall(newImage)
  }
})

// Watch for analysis state to trigger spotlight scanning
watch(() => props.isAnalyzing, (analyzing) => {
  if (analyzing && spotlightPhoto) {
    startAnalysisAnimation()
  }
})

// Watch for roast ready to trigger reveal
watch(() => props.roastReady, (ready) => {
  if (ready) {
    roastRevealAnimation()
  }
})

function initScene() {
  console.log('Initializing 3D scene...')
  clock = new THREE.Clock()
  
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
    roughness: 0.85,
    metalness: 0.05
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
  
  // Draw brick pattern
  ctx.fillStyle = '#772222'
  const brickWidth = 120
  const brickHeight = 60
  
  for (let y = 0; y < 1024; y += brickHeight) {
    for (let x = 0; x < 1024; x += brickWidth) {
      const offset = (y / brickHeight) % 2 === 0 ? 0 : brickWidth / 2
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
  
  // Add some darker patches for variation
  ctx.fillStyle = 'rgba(50, 20, 20, 0.3)'
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 1024
    const y = Math.random() * 1024
    ctx.fillRect(x, y, Math.random() * 100 + 50, Math.random() * 100 + 50)
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  
  backgroundWall.material.map = texture
  backgroundWall.material.needsUpdate = true
}

function createMicrophoneStand() {
  const standGroup = new THREE.Group()
  
  // Base
  const baseGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32)
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.2
  })
  const base = new THREE.Mesh(baseGeometry, metalMaterial)
  base.position.y = 0.025
  standGroup.add(base)
  
  // Pole
  const poleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 16)
  const pole = new THREE.Mesh(poleGeometry, metalMaterial)
  pole.position.y = 0.65
  standGroup.add(pole)
  
  // Mic holder arm
  const armGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 16)
  const arm = new THREE.Mesh(armGeometry, metalMaterial)
  arm.position.set(0.2, 1.3, 0)
  arm.rotation.z = Math.PI / 3
  standGroup.add(arm)
  
  // Microphone
  const micGeometry = new THREE.CapsuleGeometry(0.05, 0.15, 8, 16)
  const micMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.6,
    roughness: 0.3
  })
  microphone = new THREE.Mesh(micGeometry, micMaterial)
  microphone.position.set(0.35, 1.5, 0)
  microphone.rotation.z = Math.PI / 6
  standGroup.add(microphone)
  
  standGroup.position.set(1.5, 0, 2)
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
      transparent: true,
      opacity: 1,
      emissive: 0xffffff,
      emissiveIntensity: 0.3
    })
    
    const photoPlane = new THREE.Mesh(photoGeometry, photoMaterial)
    
    // Start position - in front of camera (where user is)
    photoPlane.position.set(0, 2, 5)
    photoPlane.scale.set(0.3, 0.3, 0.3)
    scene.add(photoPlane)
    
    // Flash effect
    flashEffect()
    
    // Animate photo flying to the wall
    const startTime = Date.now()
    const duration = 1200 // 1.2 seconds
    const startPos = { x: 0, y: 2, z: 5 }
    const endPos = { x: 0, y: 3, z: -5.8 }
    const startScale = 0.3
    const endScale = 1.0
    
    const flyAnimation = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3)
      
      // Interpolate position
      photoPlane.position.x = startPos.x + (endPos.x - startPos.x) * eased
      photoPlane.position.y = startPos.y + (endPos.y - startPos.y) * eased + Math.sin(progress * Math.PI) * 0.5
      photoPlane.position.z = startPos.z + (endPos.z - startPos.z) * eased
      
      // Interpolate scale
      const scale = startScale + (endScale - startScale) * eased
      photoPlane.scale.set(scale, scale, scale)
      
      // Add slight rotation during flight
      photoPlane.rotation.y = Math.sin(progress * Math.PI * 2) * 0.2
      
      if (progress < 1) {
        requestAnimationFrame(flyAnimation)
      } else {
        // Animation complete - photo is now on the wall
        photoPlane.rotation.set(0, 0, 0)
        
        // Reduce emissive as it settles
        photoMaterial.emissiveIntensity = 0.1
        
        // Turn on spotlight
        spotlightPhoto.intensity = 2.5
        spotlightPhoto.target.position.set(0, 3, -6)
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
  // Pulse/glitch effect when roast is ready
  if (!photoMaterial) return
  
  let pulseCount = 0
  const pulse = () => {
    if (pulseCount >= 3) return
    
    photoMaterial.opacity = 0.5
    setTimeout(() => {
      photoMaterial.opacity = 0.85
      pulseCount++
      if (pulseCount < 3) {
        setTimeout(pulse, 200)
      }
    }, 100)
  }
  pulse()
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
</script>
