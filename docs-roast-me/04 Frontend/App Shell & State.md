---
tags: [frontend]
---
# App shell & state

`app.vue` is the whole app: there is no `pages/` folder and no router. Everything renders inside `<ClientOnly>` because Three.js, Web Audio and the camera only exist in the browser.

## What it renders (top to bottom in the template)
1. `LoadingScreen`: until the model is ready. See [[Loading Screen]].
2. `ComedyClubScene`: always there, full screen behind everything. See [[3D Scene]].
3. A vignette overlay.
4. `CameraCapture`: only while there is no photo (`v-if="!capturedImage"`). See [[Camera Capture]].
5. Error banner: when no roast could be produced (`roastError`). A yellow notice (`roastNotice`) shows when the roast is the bundled sample.
6. Audio panel (bottom-right): when `roastData` is set. Progress bar, ⏪ 10s, Play/Pause, 10s ⏩, Roast Again, Reset.
7. "Preparing your roast" overlay: while `isAnalyzing`. Shows the snapshot thumbnail, what the backend is doing, an elapsed-time counter (`analyzingSeconds`), a "press ▶ Play when ready" hint, and a cancel link that calls `reset()`.
8. Roast modal and photo modal, opened by clicking the frames in the 3D scene.

## State
Reactive (`ref`): `capturedImage`, `roastData`, `isAnalyzing`, `roastError`, `roastNotice`, `audioLoading`, `isPlaying`, `audioError`, `currentTime`, `duration`, `showRoastModal`, `showPhotoModal`, `analyzingSeconds` (updated once a second by an interval that a watcher on `isAnalyzing` starts and clears).

Plain variables, not reactive: the Web Audio objects (`audioContext`, `audioSource`, `audioBuffer`, `audioAnalyser`), timing (`startTime`, `pausedAt`), `animationFrameId`, `isTransitioning`, and `audioState` (`stopped` / `playing` / `paused` / `loading`). See [[Audio Playback]].

## Main functions
| Function | Does |
| --- | --- |
| `handleImageCaptured(img)` | Stores the photo, calls `fetchRoast()` |
| `fetchRoast()` | Sets `isAnalyzing`, calls `useRoastApi().requestRoast()`. Usable response → `handleRoastReceived` (plus a `roastNotice` if it came from the mock); otherwise shows `roastError` (including the API's own 4xx message) and clears the photo so the camera returns. |
| `handleRoastReceived(data, requestId)` | After a 1.5 s delay: sets `roastData`, resets audio state, measures the audio length from the PCM, calls `initSync(script, duration)`, clears `isAnalyzing`. |
| `reRoast()` | Stops audio, clears the roast, calls `fetchRoast()` with the same photo |
| `reset()` | Stops everything and returns to the camera. Bumps `roastRequestId`, so a response still in flight is ignored. |
| `playAudio` / `pauseAudio` / `resumeAudio` / `toggleAudio` / `seekAudio` / `skipForward` / `skipBackward` | See [[Audio Playback]] |
| `getAudioFrequencyData()` | Passed to the scene for lip sync. See [[Face & Lip Sync]]. |

## Wiring to the scene
`app.vue` → `ComedyClubScene` props: `capturedImage`, `isAnalyzing`, `roastReady`, `roastData`, `audioPlaying`, `audioCurrentTime`, `audioDuration`, `getAudioFrequencyData`, and the sync outputs `syncAnimation`, `syncExpression`.

Scene → `app.vue` events: `sceneReady`, `characterLoadProgress`, `characterLoadError`, `roastFrameClicked`, `photoClicked`.

## Stale responses
`roastRequestId` goes up on every request and on `reset()`. `fetchRoast` and the 1.5 s timeout in `handleRoastReceived` both check it, so a response that arrives after Reset or after a newer Roast Again is dropped.

## Composables used directly
`useAnimationAudioSync` ([[Animation-Audio Sync]]), `useRoastApi`, `useLoadingState`.

## API URL
`import.meta.env.VITE_ROAST_API_URL`, read in `composables/useRoastApi.js`. Vite bakes it in **at build time**, so changing it needs a rebuild. Empty values or values containing `your-` are treated as unset. See [[Mock Mode]].
