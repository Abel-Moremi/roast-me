---
tags: [development]
---
# Local setup

## Requirements
- Node 20+ (CI uses 20)
- Python 3.10+ (production runs 3.10)
- A Gemini API key, needed only for the real backend. The frontend runs on mock data without one.
- A webcam and a browser on `localhost` or HTTPS (camera access requires a secure context)

## Frontend only (mock data)
```bash
npm install          # also runs `nuxt prepare`
npm run dev          # http://localhost:3000
```
With `VITE_ROAST_API_URL` unset, every capture plays the mock roast. See [[Mock Mode]].

## Frontend + local backend
**1. Backend** (its own terminal):
```bash
cd functions
python -m venv venv
venv/Scripts/activate        # Windows (Git Bash: source venv/Scripts/activate)
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

export GEMINI_API_KEY=...            # PowerShell: $env:GEMINI_API_KEY="..."
export ENABLE_AUDIO_TEST=true        # optional: saves functions/temp/roast_audio.wav
functions-framework --target roast_me --port 8080
```
The backend does **not** read `.env` files. The variables must be set in that shell. See [[Backend Configuration]].

**2. Frontend:** create `.env` in the repo root (it's git-ignored):
```bash
VITE_ROAST_API_URL=http://localhost:8080
```
then `npm run dev`. Nuxt reads the root `.env` in dev. Restart the dev server after changing it.

CORS allows any origin unless `ALLOWED_ORIGINS` is set, so `localhost:3000` → `localhost:8080` works out of the box.

**3. Check the backend directly:**
```bash
curl -X POST http://localhost:8080 -H "Content-Type: application/json" -d @public/mock/input.txt
```

## Production-like build
```bash
npm run generate     # static site into .output/public (dist/ points there)
npx serve dist       # or any static server
```
Firebase serves `dist/` with every path rewritten to `/index.html` (`firebase.json`).

## Debugging
- The browser console has helpers like `setAnimationState('spellcast')` and `debugMouth()`. See [[3D Scene]].
- The backend logs every step at INFO, including Gemini response previews and timeline validation errors and warnings.
- `metadata.fallback: true` in a response means Gemini's timeline was rejected. The log lines just before it say why.
