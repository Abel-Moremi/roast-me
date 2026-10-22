---
tags: [overview]
---
# What is Roast Me

A single-page web app. There are no accounts, pages or routes, just one screen.

## User flow

1. **Loading.** A full-screen loader shows while the 3D club and the ~29 MB character model download. See [[Loading Screen]].
2. **Camera.** The browser asks for camera access. A webcam preview with a capture button appears over the 3D club, with a note that only one snapshot is roasted and the camera turns off once it's taken. See [[Camera Capture]].
3. **Capture.** On click, the photo appears in a gold frame on the right-hand wall, with a camera flash and a scanning spotlight. A "Preparing your roast" overlay shows while the backend works (three Gemini calls in a row, which can take a minute or more). It shows a thumbnail of the snapshot, says only that snapshot is roasted, counts the seconds waited, tells the user to press **Play** when it's ready, and has a **Cancel and take a new photo** link.
4. **Roast ready.** About 1.5 s after the response arrives (a deliberate pause for comic timing), a second frame appears on the left wall and the audio controls appear bottom-right.
5. **Performance.** The user presses **Play**. Audio does not autoplay. The comedian:
   - follows a timeline of body animations and expressions picked by Gemini ([[Animation-Audio Sync]])
   - moves his mouth to the audio ([[Face & Lip Sync]])
   - blinks and sways on his own
6. **Controls.** Play/pause, ±10 s skip, click the progress bar to seek, **Roast Again** (same photo, new roast) and **Reset** (back to the camera).
7. **Zoom.** Clicking the right frame opens the photo full screen. Clicking the left frame opens the roast text: the overall vibe, every roast line and the one-liner.

If the API is down, the app plays a bundled sample roast with a yellow notice saying so. See [[Mock Mode]]. If the API rejects the photo (bad image, blocked by safety filters), or the sample can't load either, an error banner shows and the camera comes back.

## What the roast contains
See [[API Contract]]. In short: an overall vibe, 8–12 roast lines, a one-liner, a confidence rating and style tags. The wall frame shows the vibe, as many lines as fit, the one-liner, the confidence rating and the style tags. The popup shows the vibe, every line and the one-liner.

## Comedy persona
The roast prompt asks for "an annoyed older brother mid-rant": sarcastic, fast and informal, roasting choices rather than identities. See [[Roast Generation]].
