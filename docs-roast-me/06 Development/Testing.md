---
tags: [development, testing]
---
# Testing

## Automated tests (backend)
`functions/tests/`, plain `unittest` (standard library only, no API key, no `pip install`):

```bash
cd functions
python -m unittest discover -s tests -v    # pytest also works if you have it
```

| File | Covers |
| --- | --- |
| `test_animation.py` | The fallback script validates for 3–120 s; sit lock and walk-order rules; bad timing; name fixing (camelCase, unknown → `idle`); intensity clamping; sanitize-then-validate; **every backend animation has a matching frontend `ANIMATION_STATES` key and clip, and every backend expression exists in `ComedyClubScene.vue`** (parsed from the source files) |
| `test_rate_limit.py` | `RateLimiter` window, per-client counting, `0` disables; `client_ip` header handling |

CI runs them on every pull request and push to `main` (`.github/workflows/tests.yml`, see [[Deployment]]). `.gcloudignore` keeps `tests/` out of the deployed function.

There are no frontend tests.

## Manual scripts

| Script | Run with | Checks |
| --- | --- | --- |
| `test_mock_structure.js` | `node test_mock_structure.js` | `public/mock/output.txt` parses as JSON and has `animationScript`, `audio`, `audioMimeType`, `data`, `success` |
| `test-audio.html` | serve the repo root with a static server and open `/test-audio.html` | Decodes and plays the mock audio with the same PCM logic as the app, to tell audio bugs apart from app bugs |
| `functions/test_imports.py` | `python functions/test_imports.py` | The backend files exist and import from the expected paths |

`functions/.gcloudignore` excludes `test_*.py` from deploys.

The "Checks before you finish" list in `AGENTS.md` is the agreed minimum for any change, including a one-line command to find broken vault links.

## Checking a change by hand
1. Backend logic without Gemini: the animation code (`animation_utils`, `animation_validator`, `animation_constants`) has no Gemini imports and can be called directly from Python in `functions/`. For example, validate a timeline with `validate_animation_script(script, duration)`.
2. Backend end to end: run it locally ([[Local Setup]]) and `curl` it with `public/mock/input.txt`.
3. Frontend: `npm run dev` in mock mode, capture, press Play, and watch the console for `Unknown state` / `Clip not found` warnings.

## Worth adding
- A check that every `clipName` in `ANIMATION_STATES` exists in `comedian.glb` (needs a GLB parser). The current test stops at the frontend constants. See [[Animation Catalogue]].
- Frontend unit tests, e.g. for `buildSubtitleCues` and the sync controller.
