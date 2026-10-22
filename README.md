# 🎤 Roast Me

Take a selfie and get roasted by a 3D stand-up comedian. Google Gemini writes the roast from your photo and voices it, then plans the comedian's gestures and expressions. The comedian performs it on a comedy club stage, lip-syncing to the audio.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)

## 🎥 Demo

[![Watch the demo](https://img.youtube.com/vi/Cd-LDGmjxfI/0.jpg)](https://youtu.be/Cd-LDGmjxfI)

**[View the full demo on YouTube](https://youtu.be/Cd-LDGmjxfI)**

## How it works

1. The browser captures a webcam photo and POSTs it to a Google Cloud Function.
2. The function makes three Gemini calls in a row:
   - **Roast:** `gemini-3-flash-preview` looks at the photo and returns structured JSON (vibe, 8–12 roast lines, a one-liner, a confidence rating, style tags).
   - **Voice:** `gemini-2.5-flash-preview-tts` performs the roast as raw 24 kHz PCM audio.
   - **Performance:** Gemini plans a timeline of body animations and facial expressions for the exact audio length. A rule checker validates it, and a built-in default is used if it fails.
3. The frontend plays the audio with the Web Audio API. The comedian ([Three.js](https://threejs.org/)) follows the timeline, lip-syncs from live audio frequency analysis, blinks, and sways.

If the API is unreachable, the app plays a bundled sample roast and says so on screen.

## Tech stack

| Part | Tech |
| --- | --- |
| Frontend | Nuxt 4 (static build), Vue 3, Three.js 0.182, Tailwind CSS |
| Backend | Python 3.10 Cloud Function (gen 2), `functions-framework`, `google-genai`, Pillow |
| AI | Gemini vision + Gemini TTS |
| Hosting | Firebase Hosting (frontend), Google Cloud Functions (backend) |
| CI/CD | GitHub Actions, one workflow per side |

## Quick start

### Frontend only (sample roast, no API key needed)

```bash
git clone https://github.com/Abel-Moremi/roast-me.git
cd roast-me
npm install
npm run dev            # http://localhost:3000
```

With no API URL set, every capture plays the sample roast in `public/mock/output.txt`.

### Frontend + local backend

```bash
# Terminal 1: backend
cd functions
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
export GEMINI_API_KEY=your-key    # PowerShell: $env:GEMINI_API_KEY="your-key"
functions-framework --target roast_me --port 8080
```

```bash
# Terminal 2: frontend. Point it at the local backend, then start it
echo "VITE_ROAST_API_URL=http://localhost:8080" > .env
npm run dev
```

The backend reads its settings from environment variables only (no `.env` file). The frontend's `VITE_ROAST_API_URL` is baked in at build time.

Check the backend on its own:

```bash
curl -X POST http://localhost:8080 -H "Content-Type: application/json" -d @public/mock/input.txt
```

## Configuration

| Variable | Where | Required | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | backend | yes | Gemini API key |
| `ALLOWED_ORIGINS` | backend | no | Comma-separated CORS origins. Defaults to `*`. |
| `RATE_LIMIT_PER_HOUR` | backend | no | Roasts per client IP per hour, per function instance. Defaults to `20`; `0` turns it off. |
| `ENABLE_AUDIO_TEST` | backend | no | `true` saves each generated clip to `functions/temp/` as base64 and WAV |
| `VITE_ROAST_API_URL` | frontend build | no | Cloud Function URL. Unset means sample roast only. |

Models, voice, prompt and limits are set in [`functions/config.py`](functions/config.py).

## Project structure

```
app.vue                  App shell: state, API call, audio playback, overlays
components/
  CameraCapture.vue      Webcam preview, countdown, retake, photo upload
  ComedyClubScene.vue    Three.js club, character, facial expressions
  LoadingScreen.vue      Loader shown until the 3D model is ready
composables/
  useRoastApi.js         Send photo to API, fall back to sample roast
  useAnimationAudioSync.js  Audio time -> current animation/expression
  useBlinking.js, useJawMovement.js, useMouthAnimation.js  Face animation
  useSubtitles.js        Subtitles for the roast being played
  useLoadingState.js, useMockRoast.js
  animation/             Body animation manager (clips, bones, idle sway)
functions/               Python Cloud Function: the whole backend
  main.py                HTTP entry point
  config.py              Models, prompt, schema, CORS
  services/              Roast, TTS and animation-timeline generation
  utils/                 Image handling, rate limiting, PCM-to-WAV helper
  tests/                 Backend unit tests (unittest, no API key needed)
public/comedian.glb      The 3D character (~29 MB)
public/mock/             Sample API response + sample request body
docs-roast-me/           Full documentation (Obsidian vault)
AGENTS.md                Working rules for contributors and AI agents (CLAUDE.md imports it)
```

## Documentation

Everything in depth lives in [`docs-roast-me/`](docs-roast-me/), an [Obsidian](https://obsidian.md/) vault of plain Markdown files. Start at [`00 Home.md`](docs-roast-me/00%20Home.md). Useful entry points:

- [System Overview](docs-roast-me/02%20Architecture/System%20Overview.md) and [Request Lifecycle](docs-roast-me/02%20Architecture/Request%20Lifecycle.md)
- [API Contract](docs-roast-me/02%20Architecture/API%20Contract.md): request and response format, errors
- [Animation Catalogue](docs-roast-me/05%20Character%20&%20Assets/Animation%20Catalogue.md): read this before adding or renaming an animation
- [Local Setup](docs-roast-me/06%20Development/Local%20Setup.md), [Deployment](docs-roast-me/07%20Operations/Deployment.md), [Known Issues](docs-roast-me/Known%20Issues.md)

## Deployment

Pushing to `main` deploys automatically:

| Workflow | Triggers on | Does |
| --- | --- | --- |
| `deploy-cloud-function.yml` | `functions/**` | `gcloud functions deploy roast_me` (gen 2, Python 3.10, `us-central1`, 2 GB, 540 s timeout, max 10 instances) |
| `deploy-firebase.yml` | frontend files (`app.vue`, `components/`, `composables/`, `public/`, config) | `npm run generate` → Firebase Hosting |

Required GitHub secrets: `GCP_SA_KEY` (service-account JSON), `GEMINI_API_KEY`, and `ROAST_API_URL` (the function URL, passed to the build as `VITE_ROAST_API_URL`). Details: [Deployment](docs-roast-me/07%20Operations/Deployment.md).

Pull requests also run the backend tests (`tests.yml`) and the docs check (`docs-check.yml`).

> ⚠️ The function has no authentication, and every roast makes three paid Gemini calls. It's protected only by a per-IP limit kept in each instance's memory and a cap of 10 instances. See [Cost & Limits](docs-roast-me/07%20Operations/Cost%20&%20Limits.md) before sharing the URL widely.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| The same roast every time, with a yellow "sample roast" notice | `ROAST_API_URL` secret missing at build time, or the function is down or returning 5xx. Check the function logs: `gcloud functions logs read roast_me --region us-central1`. |
| "Roast failed: …" banner | The API rejected the photo (unreadable image, or Gemini's safety filters). The message says which. |
| "That's a lot of roasts! Try again in about N minutes." | The per-IP rate limit (`RATE_LIMIT_PER_HOUR`) was hit. |
| "OUT OF ROASTS FOR NOW" panel, or "the comedian's voice has hit its Gemini usage limit" | The Gemini API key's request quota is used up (daily or per minute; the message says which). Check usage in Google AI Studio, or raise the key's limit. |
| Camera doesn't start | The page must be on HTTPS or `localhost`, and camera permission must be granted. Users can upload a photo instead. |
| Loader says "The comedian missed his cue" | `comedian.glb` failed to download. Check the network tab and reload. |
| No Play button after a roast | Text-to-speech failed. The roast is still shown, so check the function logs. |
| Roast doesn't start by itself | The browser blocked autoplay. The Play button pulses; pressing it starts the show. |
| `Server is not configured` (500) | `GEMINI_API_KEY` isn't set for the function. |

The browser console has debug helpers such as `setAnimationState('spellcast')` and `debugMouth()` in dev builds. See [3D Scene](docs-roast-me/04%20Frontend/3D%20Scene.md).

## Contributing

1. Read [AGENTS.md](AGENTS.md). It has the working rules for humans and AI agents: commands, invariants that are easy to break, and which docs to update for each part of the code.
2. Fork, then branch (`git checkout -b feature/your-change`). Pushes to `main` deploy to production.
3. **Update the docs in the same PR as the code.** The `Docs check` workflow fails a PR that changes code without touching any docs. For pure refactors, add the `docs-not-needed` label and say why. It also fails on broken links in the vault.
4. Open a pull request. The template has the checklist.

Style: Vue Composition API with `<script setup>`, Tailwind for styling, PEP 8 for Python. Backend tests: `cd functions && python -m unittest discover -s tests -v` (standard library only). There are no frontend tests yet. See [Testing](docs-roast-me/06%20Development/Testing.md).

## License

MIT. See [LICENSE](LICENSE).

---

**Made with ❤️ by [Abel Moremi](https://github.com/Abel-Moremi)**
