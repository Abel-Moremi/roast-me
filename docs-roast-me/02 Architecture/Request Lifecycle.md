---
tags: [architecture]
---
# Request lifecycle

From clicking capture to the comedian performing.

```mermaid
sequenceDiagram
  participant U as User
  participant C as CameraCapture
  participant A as app.vue
  participant F as Cloud Function
  participant G as Gemini
  participant S as ComedyClubScene

  U->>C: click capture
  C->>A: imageCaptured(JPEG data URL)
  A->>S: capturedImage (photo on wall, flash, scan light)
  A->>A: isAnalyzing = true ("Preparing your roast")
  A->>F: POST { image }
  F->>F: decode, resize to max 1024px, re-encode PNG
  F->>G: 1. roast (vision + JSON schema)
  F->>F: build narration text
  F->>G: 2. text-to-speech
  F->>F: measure audio length from PCM bytes
  F->>G: 3. animation timeline (text)
  F->>F: clean up, validate, else fallback timeline
  F-->>A: { success, data, audio, audioMimeType, animationScript }
  A->>A: wait 1.5 s (comic timing)
  A->>A: init sync with real audio length
  A->>S: roastReady (roast frame on left wall)
  U->>A: Play
  loop every animation frame
    A->>A: update sync with audio time
    A->>S: syncAnimation / syncExpression
    S->>S: play clip, blend face, lip sync from audio
  end
```

## Step details

| Step | Code | What can go wrong |
| --- | --- | --- |
| Capture | `components/CameraCapture.vue` `captureImage()` | Camera denied → `alert()`. |
| Send | `composables/useRoastApi.js` `requestRoast()` | URL unset, network error or 5xx → mock data plus a "sample roast" notice ([[Mock Mode]]). 4xx → the API's error message is shown. |
| Parse image | `functions/utils/image_utils.py` | Missing → 400. Undecodable → 400 `Invalid image data`. |
| Roast | `functions/services/roast_service.py` | Blocked or unparseable → `ValueError` → 400 with the message. |
| TTS | `functions/services/tts_service.py` | Any failure → logged, response has no `audio`. Roast still returned. |
| Animation | `functions/services/animation_service.py` | Any failure → fallback script. Never fails the request. |
| Show result | `app.vue` `fetchRoast()` → `handleRoastReceived()` | Response without `success`/`data` → error banner, camera returns. |
| Playback | `app.vue` `playAudio()` | Decode error → message under the controls. |

## Order matters
The three Gemini calls run **one after another**: TTS needs the narration from the roast, and the animation call needs the audio length from TTS. Total time is the sum of all three. See [[Cost & Limits]].

"Roast Again" runs the same flow with the existing photo (`reRoast()` → `fetchRoast()`).
