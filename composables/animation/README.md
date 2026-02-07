# Animation System Documentation

## Overview

The refactored animation system provides a clean, maintainable interface for managing GLTF model animations in the Roast Me application. It follows Nuxt 3 and Vue 3 Composition API best practices.

## Architecture

```
composables/animation/
├── index.js                    # Main export file
├── useAnimationManager.js      # Core composable
├── animationConstants.js       # Centralized constants
├── animationUtils.js          # Helper utilities
└── README.md                  # This file
```

## Key Features

### 1. **Clean State Management**
- Uses Vue 3 `ref()` for reactive state
- Computed properties for derived values
- Type-safe state transitions

### 2. **GLTF Animation Integration**
- Automatic animation clip detection
- Smooth fade transitions between states
- Support for procedural overlays

### 3. **Procedural Animation Layering**
- Breathing motion (chest, 0.5Hz)
- Head sway (head, 0.6Hz)
- Shoulder bounce (shoulders, 0.4Hz)

### 4. **Comprehensive Debugging**
- State introspection
- Bone cache inspection
- Animation clip listing
- Available states documentation

## Usage

### Basic Setup

```javascript
import { useAnimationManager } from '@/composables/animation'

const {
  initialize,
  setState,
  update,
  holdState,
  debugState
} = useAnimationManager()

// On GLTF load
initialize(gltfObject)

// In animation loop
update(deltaTime, audioIntensity)

// State transitions
setState('walk', 0.3)  // 0.3 second fade

// Lock to specific state
holdState('relax')
```

### Advanced Usage

```javascript
// Check state
const current = getState()

// Unlock state for transitions
unlockState()

// Enable/disable animations
enable()
disable()

// Debug info
debugState()
debugBones()
debugAvailableStates()
```

## Animation States

All available states are defined in `animationConstants.js`:

```javascript
{
  idle,           // Standing idle
  walkRelaxed,    // Casual walking
  walk,           // Walking
  walkThink,      // Walking while thinking
  run,            // Running/energetic
  relax,          // Relaxing pose (default)
  sitTalk,        // Sitting and talking
  spellcast,      // Spellcast gesture
  action,         // Action pose
  default         // Default pose
}
```

## Configuration

### Default Configuration

Edit `animationConstants.js`:

```javascript
export const DEFAULT_ANIMATION_CONFIG = {
  defaultState: 'relax',           // Initial state
  transitionDuration: 0.3,         // Default fade time
  enableProcedural: true           // Layer procedural movements
}
```

### Procedural Movements

Customize in `animationConstants.js`:

```javascript
export const PROCEDURAL_CONFIG = {
  breathing: {
    enabled: true,
    bones: ['chest'],
    speed: 0.5,        // Hz
    range: 0.02,       // Radians
    axis: 'x'
  },
  // ... more movements
}
```

## Best Practices

### 1. **Initialize Early**
```javascript
onMounted(async () => {
  const gltf = await loader.load(modelPath)
  const success = initialize(gltf)
  if (!success) {
    console.error('Failed to initialize animations')
  }
})
```

### 2. **Check Transitions**
```javascript
if (canTransition.value) {
  setState('walk')
}
```

### 3. **Lock for Constant State**
```javascript
// Ensure character stays in relax
setState('relax', 0)
holdState('relax')
```

### 4. **Graceful Degradation**
```javascript
// Handle missing animations
try {
  const success = setState('walk')
  if (!success) {
    setState('idle')  // Fallback
  }
} catch (error) {
  console.error('Animation error:', error)
}
```

## API Reference

### State Methods

#### `initialize(input: THREE.Scene | Object): boolean`
Initialize the animation manager with model data.

#### `setState(state: string, speed?: number): boolean`
Transition to a new animation state.

#### `getState(): string`
Get the current animation state.

#### `holdState(state: string): void`
Lock to a specific state, blocking transitions.

#### `unlockState(): void`
Allow state transitions again.

### Control Methods

#### `update(delta: number, audioIntensity?: number): void`
Update animations (call every frame).

#### `enable(): void`
Enable animation updates.

#### `disable(): void`
Disable animation updates.

### Debug Methods

#### `debugState(): void`
Print current manager state to console.

#### `debugBones(): void`
Print cached bones to console.

#### `debugModel(): void`
Print loaded model animations to console.

#### `debugAvailableStates(): void`
Print all available states to console.

## Performance Considerations

1. **Bone Caching** - Bones are cached on init for O(1) access
2. **Animation Clips** - Stored by name for quick lookup
3. **Computed Properties** - Use Vue's reactivity system efficiently
4. **Procedural Updates** - Applied only when enabled
5. **Mixer Updates** - Single mixer handles all clips

## Troubleshooting

### Animations Not Playing
1. Check: `debugModel()` - Are clips loaded?
2. Check: `debugState()` - Is mixer initialized?
3. Check: `debugAvailableStates()` - Is state valid?

### State Transitions Not Working
1. Check: `isStateLocked.value` - Is state locked?
2. Check: `canTransition` computed property
3. Call: `unlockState()` to allow transitions

### Procedural Movements Not Showing
1. Check: `PROCEDURAL_CONFIG.breathing.enabled` etc.
2. Verify bones are cached: `debugBones()`
3. Ensure `enable()` is called

## Migration from Old System

Old system files still exist for reference:
- `composables/useAnimationManager.js` (legacy)
- `composables/useProceduralAnimations.js` (legacy)

New system locations:
- `composables/animation/useAnimationManager.js` ✓
- `composables/animation/animationConstants.js` ✓
- `composables/animation/animationUtils.js` ✓

Update imports in components:
```javascript
// Old
import { useAnimationManager } from '@/composables/useAnimationManager'

// New
import { useAnimationManager } from '@/composables/animation'
```

## Contributing

When modifying the animation system:

1. **Update constants** in `animationConstants.js`
2. **Add utilities** in `animationUtils.js`
3. **Keep logic** in `useAnimationManager.js`
4. **Document changes** in this README
5. **Test thoroughly** with `debugState()` and console output

## Future Enhancements

- [ ] Animation blending for smooth transitions
- [ ] Animation events (onStart, onComplete)
- [ ] Audio-reactive procedural movements
- [ ] Animation presets/profiles
- [ ] Performance metrics collection
- [ ] Automated testing suite
