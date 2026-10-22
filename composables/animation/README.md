# Animation manager

Plays the character's baked body animations (from `public/comedian.glb`) and layers a small procedural idle sway on top. Used by `components/ComedyClubScene.vue`.

Facial animation is not handled here: blinking, jaw and lips live in `composables/useBlinking.js`, `useJawMovement.js` and `useMouthAnimation.js`, and expressions in `ComedyClubScene.vue`. Which animation plays when is decided by `composables/useAnimationAudioSync.js`.

Full docs: `docs-roast-me/04 Frontend/3D Scene.md` and `docs-roast-me/05 Character & Assets/Animation Catalogue.md`.

## Files

| File | Contents |
| --- | --- |
| `useAnimationManager.js` | The composable: `AnimationMixer`, clip cache, bone cache, state changes, procedural sway |
| `animationConstants.js` | `ANIMATION_STATES` (state → clip), `BONE_MAP`, `PROCEDURAL_CONFIG`, `DEFAULT_ANIMATION_CONFIG` |
| `animationUtils.js` | Small helpers (`getAnimationClip`, `getBone`, `isValidAnimationState`, …) |
| `index.js` | Re-exports everything. `ComedyClubScene.vue` currently imports `useAnimationManager.js` directly. |

## Usage

```js
import { useAnimationManager } from '@/composables/animation'

const { initialize, setState, holdState, unlockState, update } = useAnimationManager()

// After GLTFLoader finishes
initialize(gltf)               // caches clips by name and bones via BONE_MAP; returns false on failure

// Every frame
update(delta, audioIntensity)  // advances the mixer, then applies the procedural sway

// Change animation (cross-fade, default 0.3 s)
setState('spellcast')
setState('relax', 0)           // no fade

// Lock / unlock
holdState('relax')             // setState is refused while locked
unlockState()
```

What the scene does: after loading it plays `relax` and locks it. Every time the timeline's animation changes, it calls `unlockState()` and then `setState(name)`.

## States

`ANIMATION_STATES` keys are the camelCase form of the backend's timeline names (`walk-relaxed-start` → `walkRelaxedStart`). **Every animation the backend can choose must have a key here**, or the character ignores those keyframes.

| State | Clip | Plays |
| --- | --- | --- |
| `idle` | `idle` | loop |
| `walkRelaxedStart` | `walk-relaxed-start` | once, holds last frame |
| `walkRelaxedLoop` | `walk-relaxed-loop` | loop |
| `walkRelaxedEnd` | `walk-relaxed-end` | once, holds last frame |
| `standToSit` | `stand-to-sit` | once, holds last frame |
| `spellcast` | `spellcast` | loop |
| `aerobicDance` | `aerobic-dance` | loop |
| `relax` | `relax` | loop |
| `walkThink` | `walk-think` | loop |
| `sitTalk` | `sit-talk` | loop (seated idle, used after `standToSit`) |
| `walkRelaxed`, `walk` | `walk-relaxed-loop` | loop (console aliases) |
| `run` | `aerobic-dance` | loop (console alias) |
| `action`, `default` | `Action`, `Default` | loop (console only) |

`loopOnce: true` on a state means `THREE.LoopOnce` + `clampWhenFinished`. Everything else uses `THREE.LoopRepeat`.

### Adding a state
1. Make sure the clip exists in `comedian.glb` (`debugModel()` lists them).
2. Add `{ clipName, weight, description, loopOnce? }` to `ANIMATION_STATES`.
3. If the backend should be able to choose it, add it to `AVAILABLE_ANIMATIONS` in `functions/services/animation_constants.py` as well, and update the Animation Catalogue note.

## Procedural sway

`PROCEDURAL_CONFIG` adds sine-wave motion every frame:

| Movement | Bones | Speed | Range | Axis |
| --- | --- | --- | --- | --- |
| breathing | chest | 0.5 Hz | 0.02 rad | x |
| headSway | head | 0.6 Hz | 0.03 rad | z |
| shoulderBounce | shoulderL, shoulderR | 0.4 Hz | 0.02 rad | x |

The sway is additive: `applyProceduralOverrides` adds the sine offset on top of whatever rotation the playing clip left on the bone, so the clip's motion is kept. Each frame `update()` first calls `removeProceduralOffsets` to undo the previous frame's offsets *before* `mixer.update()`; otherwise bones the clip doesn't animate would accumulate the offset and drift. Turn a movement off with `enabled: false`.

`BONE_MAP` maps the short names to the model's `CC_Base_*` bones. Several candidates are allowed, and the first one found wins.

## API

| Member | Notes |
| --- | --- |
| `initialize(gltfOrScene)` | Accepts a GLTF result or a Scene/Group with `.animations`. Returns `boolean`. |
| `setState(state, fade = 0.3)` | `false` if the state is unknown, locked, or the clip is missing |
| `getState()` | Current state name (string) |
| `holdState(state)` / `unlockState()` | Lock / unlock |
| `update(delta, audioIntensity = 0)` | `audioIntensity` is stored but not used yet |
| `enable()` / `disable()` | Pause or resume all updates |
| `currentState`, `targetState`, `isEnabled`, `isStateLocked` | refs |
| `canTransition`, `animationCount`, `boneCount` | computed |
| `debugState()`, `debugBones()`, `debugModel()`, `debugAvailableStates()` | Console output. Also on `window` as `debugAnim*` (dev builds print; production strips `console.log`). |

`DEFAULT_ANIMATION_CONFIG.enableProcedural` exists but isn't read. Use `PROCEDURAL_CONFIG.*.enabled` instead.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `Unknown state "xyz"` in the console | The state is missing from `ANIMATION_STATES`. Usually a new backend animation name. |
| `Clip not found "xyz"` | `clipName` doesn't match a clip in the model. Run `debugModel()`. |
| `State is locked, transition blocked` | Something called `holdState`. Call `unlockState()` first. |
| Sway not visible | `debugBones()`: were the bones found? |
