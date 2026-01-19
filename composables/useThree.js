// Composable for Three.js utilities
import * as THREE from 'three'

export const useThree = () => {
  const createScene = () => {
    return new THREE.Scene()
  }

  const createCamera = (fov = 75, aspect = 1, near = 0.1, far = 1000) => {
    return new THREE.PerspectiveCamera(fov, aspect, near, far)
  }

  const createRenderer = (canvas, options = {}) => {
    return new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      ...options
    })
  }

  const createMesh = (geometry, material) => {
    return new THREE.Mesh(geometry, material)
  }

  return {
    THREE,
    createScene,
    createCamera,
    createRenderer,
    createMesh
  }
}
