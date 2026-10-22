---
tags: [frontend]
---
# Camera capture

`components/CameraCapture.vue`

- On mount: `getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 (ideal) }, audio: false })`. If that fails, an `alert()` asks for camera permission and there's no other fallback (no file upload).
- The preview is mirrored with CSS (`transform: scaleX(-1)`). The **captured image is not mirrored**: it's drawn straight from the video frame.
- Capture: draw the current frame to a hidden canvas at the video's native size → `toDataURL('image/jpeg', 0.9)` → emit `imageCaptured(dataUrl)`.
- Text under the button tells the user only this single snapshot is roasted and that the camera turns off once it's taken.
- The component does no networking. `app.vue` sends the photo (see [[App Shell & State]]).
- The camera stream is stopped on unmount, which happens as soon as a photo exists, because the parent uses `v-if="!capturedImage"`.

Camera access needs a secure context: HTTPS, or `localhost` in development.
