---
tags: [frontend]
---
# Loading screen

`components/LoadingScreen.vue` + `composables/useLoadingState.js`

## Stages
`useLoadingState` tracks three stages, each with a flag and a 0–100 progress value: **scene**, **character**, **animations**.

`app.vue` starts all three straight away (they really do start together when the scene mounts). Then:
- `characterLoadProgress(percent)` from the scene → `updateCharacterProgress`. This is real download progress of `comedian.glb` from the `GLTFLoader` progress callback, available when the server sends `Content-Length`.
- `sceneReady` from the scene, emitted after the model has loaded and the animation manager has started → all three stages complete → `completeLoading()`.

## Screen
- The bar shows the **highest** of the three progress values, which in practice is the model download.
- The status text moves through "Setting up Stage…" → "Summoning Performer…" → "Teaching Moves…" → "Ready!".
- Tips rotate every 5 s.
- The screen hides (with a fade `<Transition>`) as soon as `completeLoading()` sets `isLoading` to false, which happens on `sceneReady`.
- It also emits `loadingComplete` 1 s after all three flags are set, but `app.vue` only logs it.

## If the model fails to load
`GLTFLoader`'s error callback emits `characterLoadError`, and `app.vue` calls `failLoading(message)`. The loading screen (prop `error`) then shows "The comedian missed his cue", the message, and a **Reload** button.
