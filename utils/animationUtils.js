/**
 * Animation Utilities
 * Helper functions for scene animations and effects
 */

import * as THREE from 'three'

// ============================================
// SCANNING ANIMATION
// ============================================
/**
 * Create scanning spotlight effect
 * @param {THREE.Light} spotlight - The spotlight to animate
 * @param {number} duration - Duration in milliseconds
 * @returns {function} Cancel function
 */
export function createScanAnimation(spotlight, duration = 2500) {
  const startTime = Date.now()
  let animationFrame

  function scan() {
    const elapsed = Date.now() - startTime
    const progress = (elapsed % duration) / duration
    const angle = progress * Math.PI * 2

    // Rotate spotlight around the comedian
    spotlight.position.x = 4 * Math.cos(angle)
    spotlight.position.z = 3 + 2 * Math.sin(angle)

    if (elapsed < duration) {
      animationFrame = requestAnimationFrame(scan)
    }
  }

  scan()

  return () => cancelAnimationFrame(animationFrame)
}

// ============================================
// REVEAL ANIMATION
// ============================================
/**
 * Animate reveal of roast text with typewriter effect
 * @param {THREE.Mesh} textMesh - The text canvas mesh
 * @param {number} duration - Duration in milliseconds
 * @returns {function} Cancel function
 */
export function createRevealAnimation(textMesh, duration = 1500) {
  const startTime = Date.now()
  let animationFrame

  function reveal() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(1, elapsed / duration)

    // Fade in and scale effect
    textMesh.material.opacity = progress
    textMesh.scale.y = 0.8 + progress * 0.2

    if (elapsed < duration) {
      animationFrame = requestAnimationFrame(reveal)
    }
  }

  reveal()

  return () => cancelAnimationFrame(animationFrame)
}

// ============================================
// HOVER EFFECTS
// ============================================
/**
 * Animate hover effect on object
 * @param {THREE.Object3D} object - Object to animate
 * @param {number} targetScale - Target scale value
 * @param {number} duration - Duration in milliseconds
 * @returns {function} Cancel function
 */
export function createHoverAnimation(
  object,
  targetScale = 1.1,
  duration = 300
) {
  const startTime = Date.now()
  const startScale = object.scale.x
  let animationFrame

  function hover() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(1, elapsed / duration)
    const easeProgress = easeInOutQuad(progress)

    const newScale = THREE.MathUtils.lerp(
      startScale,
      targetScale,
      easeProgress
    )
    object.scale.set(newScale, newScale, newScale)

    if (elapsed < duration) {
      animationFrame = requestAnimationFrame(hover)
    }
  }

  hover()

  return () => cancelAnimationFrame(animationFrame)
}

/**
 * Create return-to-normal animation
 * @param {THREE.Object3D} object - Object to animate
 * @param {number} originalScale - Original scale value
 * @param {number} duration - Duration in milliseconds
 * @returns {function} Cancel function
 */
export function createUnhoverAnimation(
  object,
  originalScale = 1,
  duration = 300
) {
  return createHoverAnimation(object, originalScale, duration)
}

// ============================================
// EASING FUNCTIONS
// ============================================
export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function easeOutCubic(t) {
  return 1 + (t - 1) ** 3
}

export function easeInCubic(t) {
  return t ** 3
}

// ============================================
// MORPHTARGET ANIMATION
// ============================================
/**
 * Animate morphTarget influence
 * @param {THREE.Mesh} mesh - Mesh with morphTargets
 * @param {number} morphIndex - Index of morphTarget to animate
 * @param {number} targetInfluence - Target influence value (0-1)
 * @param {number} duration - Duration in milliseconds
 * @returns {function} Cancel function
 */
export function animateMorphTarget(
  mesh,
  morphIndex,
  targetInfluence,
  duration = 500
) {
  if (!mesh.morphTargetInfluences || morphIndex === undefined) {
    return () => {}
  }

  const startTime = Date.now()
  const startInfluence = mesh.morphTargetInfluences[morphIndex]
  let animationFrame

  function update() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(1, elapsed / duration)
    const easeProgress = easeInOutQuad(progress)

    mesh.morphTargetInfluences[morphIndex] = THREE.MathUtils.lerp(
      startInfluence,
      targetInfluence,
      easeProgress
    )

    if (elapsed < duration) {
      animationFrame = requestAnimationFrame(update)
    }
  }

  update()

  return () => cancelAnimationFrame(animationFrame)
}

// ============================================
// PROGRESS TRACKING
// ============================================
/**
 * Smooth animation of progress value
 * @param {number} currentTime - Current playback time
 * @param {number} duration - Total duration
 * @returns {number} Progress 0-1
 */
export function getAnimationProgress(currentTime, duration) {
  if (duration === 0) return 0
  return Math.min(1, currentTime / duration)
}

/**
 * Calculate delta time for smooth animations
 * @param {number} currentTime - Current timestamp
 * @param {number} lastTime - Last frame timestamp
 * @returns {number} Delta in seconds
 */
export function calculateDelta(currentTime, lastTime) {
  return lastTime > 0 ? (currentTime - lastTime) * 0.001 : 0.016
}

// ============================================
// GEOMETRY ANIMATIONS
// ============================================
/**
 * Animate position of object
 * @param {THREE.Object3D} object - Object to animate
 * @param {THREE.Vector3} targetPosition - Target position
 * @param {number} duration - Duration in milliseconds
 * @returns {function} Cancel function
 */
export function animatePosition(
  object,
  targetPosition,
  duration = 1000
) {
  const startTime = Date.now()
  const startPosition = object.position.clone()
  let animationFrame

  function update() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(1, elapsed / duration)
    const easeProgress = easeInOutQuad(progress)

    object.position.lerpVectors(startPosition, targetPosition, easeProgress)

    if (elapsed < duration) {
      animationFrame = requestAnimationFrame(update)
    }
  }

  update()

  return () => cancelAnimationFrame(animationFrame)
}

/**
 * Animate rotation of object
 * @param {THREE.Object3D} object - Object to animate
 * @param {THREE.Euler} targetRotation - Target rotation
 * @param {number} duration - Duration in milliseconds
 * @returns {function} Cancel function
 */
export function animateRotation(
  object,
  targetRotation,
  duration = 1000
) {
  const startTime = Date.now()
  const startRotation = object.rotation.clone()
  let animationFrame

  function update() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(1, elapsed / duration)
    const easeProgress = easeInOutQuad(progress)

    // Slerp between start and target rotations using quaternions
    const startQuat = new THREE.Quaternion().setFromEuler(startRotation)
    const endQuat = new THREE.Quaternion().setFromEuler(targetRotation)
    const resultQuat = new THREE.Quaternion().slerpQuaternions(
      startQuat,
      endQuat,
      easeProgress
    )

    object.quaternion.copy(resultQuat)

    if (elapsed < duration) {
      animationFrame = requestAnimationFrame(update)
    }
  }

  update()

  return () => cancelAnimationFrame(animationFrame)
}
