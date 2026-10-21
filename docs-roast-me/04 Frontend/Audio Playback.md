---
tags: [frontend, audio]
---
# Audio playback

All in `app.vue`, using the Web Audio API. There is no `<audio>` element, because the backend sends raw PCM, not a playable file.

## Decoding (`playAudio`, first play only)
1. `atob(base64)` → bytes.
2. `numSamples = bytes / 2` (16-bit samples).
3. `audioContext.createBuffer(1, numSamples, 24000)`. The browser resamples to the device rate.
4. For each sample, `DataView.getInt16(i * 2, true)` (little-endian) ÷ 32768 → float.

The 24 kHz rate is hard-coded here and must match `TTS_SAMPLE_RATE` in [[Backend Configuration]].

## Graph
`AudioBufferSourceNode → AnalyserNode (fftSize 256, smoothing 0.8) → destination`. The analyser feeds lip sync through `getAudioFrequencyData()`. See [[Face & Lip Sync]].

## State machine
`audioState`: `stopped` → `loading` → `playing` ⇄ `paused` → `stopped` (on end).

- Buffer sources can only be started once, so pause, seek and skip all **stop the current source and create a new one** starting at `pausedAt`.
- `isTransitioning` and `audioLoading` guard against double clicks during these swaps.
- Position = `audioContext.currentTime - startTime`, where `startTime = currentTime - pausedAt` when a source starts.

## Progress loop
`updateProgress()` runs on `requestAnimationFrame` while playing. It sets `currentTime`, then calls `updateSync(currentTime)`, which drives the character. See [[Animation-Audio Sync]].

## Seek / skip
`seekAudio(event)` (click on the bar) and `skipBackward`/`skipForward` (±10 s, clamped) all update `pausedAt`, call `syncSeek(time)`, and restart the source if it was playing.

## End
`handleAudioEnded` resets the position to 0, sets the sync animation to `idle` and stops the progress loop.

## Autoplay
Playback starts only when the user clicks Play. The `AudioContext` is created on that first click, so browser autoplay rules are satisfied without an explicit `resume()`.
