---
tags: [index]
---
# Roast Me docs

Roast Me takes a webcam photo, has Gemini write a stand-up roast about it, turns the roast into speech, and has a 3D comedian perform it on a comedy club stage, moving and lip-syncing in time with the audio.

These notes were written from the code (October 2026). When a note and the code disagree, trust the code and fix the note.

## Start here
- [[What is Roast Me]]: what the user sees, step by step
- [[System Overview]]: the pieces and how they connect
- [[Local Setup]]: run it on your machine
- [[Known Issues]]: bugs and gaps we know about

## Map

| Area | Notes |
| --- | --- |
| Overview | [[What is Roast Me]] · [[Glossary]] |
| Architecture | [[System Overview]] · [[Request Lifecycle]] · [[API Contract]] |
| Backend (`functions/`) | [[Entry Point & Errors]] · [[Roast Generation]] · [[Text to Speech]] · [[Animation Script Pipeline]] · [[Backend Configuration]] |
| Frontend (Nuxt) | [[App Shell & State]] · [[Camera Capture]] · [[3D Scene]] · [[Audio Playback]] · [[Animation-Audio Sync]] · [[Face & Lip Sync]] · [[Loading Screen]] |
| Character | [[comedian.glb]] · [[Animation Catalogue]] · [[Expression Catalogue]] |
| Development | [[Local Setup]] · [[Mock Mode]] · [[Testing]] |
| Operations | [[Deployment]] · [[Cost & Limits]] |
| Decisions | [[Decisions]] |

## Repo layout

```
app.vue                  App shell: state, API call, audio playback, overlays
components/
  CameraCapture.vue      Webcam preview + capture button
  ComedyClubScene.vue    Three.js scene, character, facial expressions
  LoadingScreen.vue      Full-screen loader until the model is ready
composables/
  useRoastApi.js         POST photo to the API, fall back to mock
  useMockRoast.js        Load public/mock/output.txt
  useAnimationAudioSync.js  Audio time -> current timeline keyframe
  useBlinking.js / useJawMovement.js / useMouthAnimation.js  Face animation
  useLoadingState.js     Loading flags + progress
  animation/             Body animation manager (clips, bones, idle sway)
functions/               Python Cloud Function (the whole backend)
public/comedian.glb      The 3D character (~29 MB)
public/mock/             Mock API response + sample request
.github/workflows/       Deploy frontend (Firebase) and backend (Cloud Functions)
docs-roast-me/           This vault
```
