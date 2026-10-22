# AGENTS.md

Instructions for AI coding agents (and humans) working in this repo. Read this before making changes.

## What this is

Roast Me: a webcam photo goes to a Python Google Cloud Function. The function makes three Gemini calls in a row (roast JSON → TTS audio → animation timeline) and returns everything in one response. A Nuxt 4 + Three.js frontend then plays the audio while a 3D comedian performs the timeline and lip-syncs.

- Frontend: repo root (`app.vue`, `components/`, `composables/`). It's a static site (`nuxt generate`) with no SSR at runtime, and everything is inside `<ClientOnly>`.
- Backend: `functions/` (single HTTP function `roast_me`, Python 3.10).
- Character: `public/comedian.glb` (~29 MB, 12 clips, 121 face shapes).
- Docs: `docs-roast-me/`, an Obsidian vault. **The source of truth for how things work**, kept in sync with the code (see below).

Start with `docs-roast-me/00 Home.md` for the map.

## Rule #1: every change updates the docs in the same change

A change isn't done until the docs describe it. Same commit or PR, not "later".

1. **Find the affected notes** with the table below, or search the vault for the file, function or constant name you touched.
2. **Update them to match the code.** Describe what the code does now, not what it used to do or what you hoped. Remove anything your change made untrue.
3. **Known Issues** (`docs-roast-me/Known Issues.md`):
   - Fixed a listed issue → move it to the "Fixed" list with one line.
   - Found a bug you're not fixing → add it under "Bugs".
4. **README.md** only covers the overview, quick start, config, structure, deployment and troubleshooting. Update it when those change (new env var, new command, new top-level folder, new user-visible error).
5. **New design choice** → add a row to `docs-roast-me/08 Decisions/Decisions.md`, or a full ADR from `ADR Template.md`. Don't invent reasons you don't know; write `_unknown_` and say so.
6. If no doc needs to change (pure refactor, typo, formatting), say that in the PR description. CI will ask (see "Docs check" below).

### Where things are documented

| If you change… | Update |
| --- | --- |
| `functions/main.py`, request/response shape, error codes | `02 Architecture/API Contract.md`, `03 Backend/Entry Point & Errors.md`, `02 Architecture/Request Lifecycle.md` |
| `functions/config.py` (models, prompt, schema, env vars, CORS) | `03 Backend/Backend Configuration.md`, `03 Backend/Roast Generation.md`, README "Configuration" |
| `functions/services/roast_service.py` | `03 Backend/Roast Generation.md` |
| `functions/services/tts_service.py`, audio format | `03 Backend/Text to Speech.md`, `04 Frontend/Audio Playback.md`, `02 Architecture/API Contract.md` |
| `functions/services/animation_*.py` | `03 Backend/Animation Script Pipeline.md`, `05 Character & Assets/Animation Catalogue.md` |
| `functions/utils/image_utils.py` | `02 Architecture/API Contract.md` (request), `03 Backend/Entry Point & Errors.md` |
| `app.vue` | `04 Frontend/App Shell & State.md`, `04 Frontend/Audio Playback.md` |
| `components/CameraCapture.vue` | `04 Frontend/Camera Capture.md` |
| `components/ComedyClubScene.vue` | `04 Frontend/3D Scene.md`, `04 Frontend/Face & Lip Sync.md`, `05 Character & Assets/Expression Catalogue.md` |
| `components/LoadingScreen.vue`, `useLoadingState.js` | `04 Frontend/Loading Screen.md` |
| `composables/useAnimationAudioSync.js` | `04 Frontend/Animation-Audio Sync.md` |
| `composables/animation/*` | `composables/animation/README.md`, `05 Character & Assets/Animation Catalogue.md`, `04 Frontend/3D Scene.md` |
| `useBlinking.js`, `useJawMovement.js`, `useMouthAnimation.js` | `04 Frontend/Face & Lip Sync.md` |
| `useRoastApi.js`, `useMockRoast.js`, `public/mock/*` | `06 Development/Mock Mode.md` |
| `public/comedian.glb` | `05 Character & Assets/comedian.glb.md` + both catalogues |
| `.github/workflows/*`, `firebase.json`, deploy settings | `07 Operations/Deployment.md`, `07 Operations/Cost & Limits.md`, README "Deployment" |
| Setup steps, scripts, dependencies | `06 Development/Local Setup.md`, `06 Development/Testing.md`, README "Quick start" |
| A new user-visible behaviour | `01 Overview/What is Roast Me.md` |
| A new term | `01 Overview/Glossary.md` |
| A new note | Link it from `00 Home.md` |

### Writing the docs
- Plain Markdown with Obsidian `[[wikilinks]]` between notes, using the note's file name without `.md`, e.g. `[[API Contract]]`. Keep note names unique across folders, or links become ambiguous.
- Keep the YAML frontmatter `tags:` on each note.
- Short and factual: tables for reference data, `file:function` names so readers can find the code. Mermaid diagrams are fine.
- If you notice a note that's wrong about code you didn't touch, fix it or add it to Known Issues. Don't leave it.
- Before finishing, check that no `[[link]]` points at a note that doesn't exist (snippet under "Checks").

## Invariants that are easy to break

**Animation names live in three places and must agree.** See `05 Character & Assets/Animation Catalogue.md`:
1. Backend `AVAILABLE_ANIMATIONS` in `functions/services/animation_constants.py`, kebab-case, e.g. `walk-relaxed-start`.
2. Frontend `ANIMATION_STATES` in `composables/animation/animationConstants.js`, the camelCase key, e.g. `walkRelaxedStart`.
3. Clip names inside `public/comedian.glb`.

A backend name with no frontend key means the character silently ignores that keyframe.

**Face shape names are matched exactly against the model.** Expression presets (`expressionConfigs` in `ComedyClubScene.vue`) and the lip and blink code look up morph targets by name, and a wrong name silently does nothing. Check any new name against the list in `05 Character & Assets/comedian.glb.md`.

**Audio format.** TTS returns raw 16-bit mono little-endian PCM at 24 kHz with no header. `TTS_SAMPLE_RATE` (backend) and the hard-coded `24000` in `app.vue` must match. Duration = bytes ÷ 48 000.

**The API contract is shared.** `app.vue`, `ComedyClubScene.vue` and `public/mock/output.txt` all read the response shape. If you change a field, update all three and `API Contract.md`. Keep the backend backwards compatible when you can: the frontend and backend deploy separately.

**Render-loop order.** `updateFacialExpression` resets every face shape to its baseline each frame. Anything that writes face shapes must run after it in `animate()`.

**Timeline rules.** The validator rejects scripts that break the sit lock (only `idle` after `stand-to-sit`) or the walk order (start → loop → end). The prompt, the validator and the Animation Catalogue must describe the same rules.

## Commands

```bash
# Frontend
npm install
npm run dev                 # http://localhost:3000 (sample roast unless VITE_ROAST_API_URL is set)
npm run generate            # production static build; must pass before you finish frontend work

# Backend (from functions/, in a venv)
pip install -r requirements.txt
export GEMINI_API_KEY=...   # env vars only; the backend does not read .env
functions-framework --target roast_me --port 8080
curl -X POST http://localhost:8080 -H "Content-Type: application/json" -d @public/mock/input.txt

# Manual checks (there is no automated test suite yet)
node test_mock_structure.js            # mock response shape
python functions/test_imports.py       # backend layout/imports
```

The animation modules (`animation_utils`, `animation_validator`, `animation_constants`, `animation_prompt`) don't import Gemini, so you can exercise them directly in Python from `functions/` without an API key.

## Checks before you finish
- [ ] Docs updated per Rule #1 (or "no docs needed" stated with a reason).
- [ ] `npm run generate` succeeds, if you touched frontend code.
- [ ] `python -m py_compile` on changed Python files, plus a direct call of any animation function you changed.
- [ ] Animation or face-shape names checked against the model, if you touched them.
- [ ] No broken wikilinks in the vault:
  ```bash
  cd docs-roast-me && python -c "import re,pathlib;n={p.stem for p in pathlib.Path('.').rglob('*.md')};b=[(str(p),l) for p in pathlib.Path('.').rglob('*.md') for l in re.findall(r'\[\[([^\]|#]+)',p.read_text(encoding='utf-8')) if l not in n];print(b or 'ok')"
  ```
- [ ] Say what you could not verify (e.g. "not checked in a browser").

## Conventions
- **Vue:** Composition API with `<script setup>`, Tailwind classes for styling, composables in `composables/` named `useX.js`.
- **Python:** PEP 8. Raise `ValueError` for problems the client caused (→ HTTP 400). Let anything else become a generic 500, and never put exception text in a 500 response.
- **Logging:** `console.log` is stripped from production builds (`nuxt.config.ts`). Use `console.warn`/`console.error` for things that must show in production.
- **Comments:** explain *why*, briefly. No commented-out code; delete it (git has history).
- **Commits:** short imperative subject (`Fix expression morph names`, `Add docs check workflow`). Code and its docs in the same commit.

## Things not to do
- **Don't push to `main` casually.** Pushes to `main` deploy straight to production (Firebase Hosting and the Cloud Function). Work on a branch and open a PR.
- Don't commit secrets or `.env`. Don't commit build output (`.output/`, `dist/`, `.nuxt/`), `__pycache__/`, `functions/temp/`, or the Obsidian workspace files (all git-ignored; keep it that way).
- Don't change Gemini model names without checking they exist. All three are preview models (`functions/config.py`).
- Don't regenerate `public/mock/output.txt` casually. It's ~5.5 MB and the offline fallback for the whole app. If you do, keep it valid JSON and run `node test_mock_structure.js`.
- Don't add authentication, rate limiting or new GCP resources without asking. They change cost and deployment.
- Don't trust old commit messages or comments over the code. If they disagree, the code is right and the docs get fixed.
