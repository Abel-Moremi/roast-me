---
tags: [frontend, threejs]
---
# 3D scene

`components/ComedyClubScene.vue` (~1,700 lines). It builds the club, loads the character, runs the render loop, and owns facial expressions.

## Layout
- **Camera:** perspective, 50° field of view, at `(0, 2, 10)`, looking at `(0, 2.5, 0)`.
- **Lights:** ambient (2.5), main stage spotlight (8) from above the front of the stage, two reddish point lights on the wall, and a photo spotlight that starts off.
- **Environment:** a brick wall drawn on a canvas texture, the floor, a stage platform, curtains, audience silhouettes and a neon sign. All built in code by `createStage`, `createCurtains`, `createAudience`, `createNeonSign` and `addBrickTexture`.
- **Comedian:** `/comedian.glb` at `(0, 0.3, -1.5)`, scale 2.4, facing the audience. See [[comedian.glb]].
- **Photo frame:** right wall, `(8.5, 3.5, -4.5)`. Added by `projectImageOnWall()` when `capturedImage` is set, together with a flash (`flashEffect`) and the photo spotlight.
- **Roast frame:** left wall, `(-8.5, 3.5, -4.5)`. Drawn on a 512×768 canvas by `displayRoastText()` when `roastReady` turns on. It shows the overall vibe, as many roast lines as fit ("+N more - click to read the full roast"), the one-liner, and a footer with the confidence rating and style tags. `removeRoastFrame()` removes the frame, its strings and its spotlight and frees their GPU memory before a new one is drawn or on reset.

## Prop watchers
| Prop | Reaction |
| --- | --- |
| `capturedImage` set / cleared | Add or remove the photo frame. Flash. |
| `isAnalyzing` true | Scanning spotlight that sweeps until analysis ends (`startAnalysisAnimation`) |
| `roastReady` true | Replace the roast frame, start the expression system, set `smile` |
| `syncAnimation` changes | `unlockState()` then `setState(name)` on the animation manager |
| `syncExpression` changes | `setExpression(name)` |

## Render loop (`animate`)
Each frame, in order:
1. `updateAnimations(delta, audioIntensity)`: body clips + procedural idle sway (breathing, head sway, shoulder bounce). See `composables/animation/useAnimationManager.js` and its README. The sway is added on top of the clip pose (last frame's offset is removed before the mixer runs), so it doesn't replace the clips' motion.
2. `updateFacialExpression(delta)`: **resets every face shape to its baseline**, then blends the current and target expression.
3. `updateBlinking`
4. `updateLipSync()`: only while audio plays.
5. `updateFlashEffect(delta)`, then render.

Because step 2 resets the whole face every frame, anything that writes face shapes must run after it. See [[Face & Lip Sync]].

## Body animation manager
`composables/animation/useAnimationManager.js` wraps a Three.js `AnimationMixer`:
- `initialize(gltf)` caches the clips by name and finds bones through `BONE_MAP` (CC_Base_* names).
- `setState(state, fade)` looks up `ANIMATION_STATES[state].clipName` and cross-fades (0.3 s by default). Clips marked `loopOnce` play once and hold their last frame; all others loop.
- `holdState` / `unlockState` lock a state. On load the scene plays `relax` and locks it. Each sync update unlocks it again.

## Clicks
Raycasting on window `click` and `mousemove`. A hit on the photo frame emits `photoClicked`, a hit on the roast frame emits `roastFrameClicked`, and the cursor turns into a pointer over either.

## Browser console helpers
Registered on `window` when the scene mounts: `setAnimationState(state)`, `holdAnimationState(state)`, `unlockAnimationState()`, `debugAnimState()`, `debugAnimBones()`, `debugAnimModel()`, `debugAnimAvailableStates()`, `showTeeth()`, `hideTeeth()`, `debugTeeth()`, `debugMouth()`.

Example: `setAnimationState('aerobicDance')`. State names: see [[Animation Catalogue]].

## Things to know
- The scene logs heavily to the console in dev, including model meshes, face shapes and every sync change. Production builds strip `console.log` (`nuxt.config.ts`), so the `window.debug*` helpers print nothing there.
- If `comedian.glb` fails to load, the scene emits `characterLoadError`. See [[Loading Screen]].
