---
tags: [overview]
---
# What is Roast Me

A single-page web app. There are no accounts, pages or routes, just one screen.

## User flow

1. **Loading.** A full-screen loader shows while the 3D club and the ~29 MB character model download. See [[Loading Screen]].
2. **Camera.** The browser asks for camera access. A webcam preview with a capture button appears over the 3D club. There's also an "upload a photo instead" link; if the camera is blocked or missing, upload becomes the main button. See [[Camera Capture]].
3. **Capture.** Clicking the button starts a 3-2-1 countdown, then shows the photo with **Retake** and **🔥 Roast this photo**. The screen says only this single photo is roasted and the camera turns off once it's confirmed. On confirm, the photo appears in a gold frame on the right-hand wall, with a camera flash and a scanning spotlight. A "Preparing your roast" overlay shows while the backend works (three Gemini calls in a row, which can take a minute or more). It shows a thumbnail of the snapshot, says only that snapshot is roasted, counts the seconds waited, says the show starts by itself, and has a **Cancel and take a new photo** link.
4. **Roast ready.** About 1.5 s after the response arrives (a deliberate pause for comic timing), a second frame appears on the left wall and the audio controls appear bottom-right.
5. **Performance.** The roast **starts by itself** (the confirm click unlocks audio). If the browser still blocks it, the Play button pulses with "Press ▶ Play to start the show". Subtitles show the line being spoken (toggle with **CC**). The comedian:
   - follows a timeline of body animations and expressions picked by Gemini ([[Animation-Audio Sync]])
   - moves his mouth to the audio ([[Face & Lip Sync]])
   - blinks and sways on his own
6. **Controls.** Play/pause, ±10 s skip, **CC** (subtitles on/off, remembered in the browser), click the progress bar to seek, **Roast Again** (same photo, new roast) and **Reset** (back to the camera).
7. **Zoom.** Clicking the right frame opens the photo full screen. Clicking the left frame opens the roast text: the overall vibe, every roast line and the one-liner.

If the API is down, the app plays a bundled sample roast with a yellow notice saying so. See [[Mock Mode]]. If the Gemini API key's request limit is reached, a panel says so ("OUT OF ROASTS FOR NOW", try again tomorrow or in a minute) and offers a sample roast instead. If only the voice hit the limit, the roast is shown as text with a notice. If the API rejects the photo (bad image, blocked by safety filters, too many roasts from the same IP), or the sample can't load either, an error banner shows and the camera comes back.

## What the roast contains
See [[API Contract]]. In short: an overall vibe, 8–12 roast lines, a one-liner, a confidence rating and style tags. The wall frame shows the vibe, as many lines as fit, the one-liner, the confidence rating and the style tags. The popup shows the vibe, every line and the one-liner.

## Comedy persona
The roast prompt asks for "an annoyed older brother mid-rant": sarcastic, fast and informal, roasting choices rather than identities. See [[Roast Generation]].
