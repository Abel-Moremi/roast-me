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
Browsers only let audio start after a user gesture. The click that confirms the photo (or Roast Again) calls `unlockAudio()`, which creates or resumes the `AudioContext` during that click. When the roast arrives, `autoPlayWhenReady()` calls `playAudio()` if the context is `running`.

If the browser still blocked it (context `suspended`), nothing plays and `awaitingFirstPlay` makes the Play button pulse with a "Press ▶ Play" hint. `startAudioPlayback()` resumes a suspended context before every start, which is allowed because Play is a click.

## Subtitles
`composables/useSubtitles.js`. The response has no per-line timing, so `buildSubtitleCues(roast, duration)` estimates it:
1. Splits the narration into the pieces `build_narration_text()` speaks: `overall_vibe`, each roast line, `"And here's the best part: " + one_liner` (see [[Roast Generation]]). **Keep the two in step.**
2. Gives each piece a share of the audio proportional to its length plus `PAUSE_WEIGHT` (12 characters, for the pause between sentences).

`currentSubtitle` is the cue containing `currentTime` (none at 0, i.e. before play and after the end). The timing is an estimate and can drift by a second or two when the voice speeds up or pauses. On the 85.8 s sample it produces 14 cues.

**CC** toggles `showSubtitles`. The choice is saved in `localStorage` (`roastme.subtitles`); default on.
