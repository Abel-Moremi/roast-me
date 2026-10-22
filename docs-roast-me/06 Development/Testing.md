---
tags: [development, testing]
---
# Testing

**There is no automated test suite.** No test runner, and the only CI check is the docs check on pull requests ([[Deployment]]). What exists are three manual scripts:

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
- pytest for `animation_validator` and `animation_utils` (pure functions, easy to test)
- A unit test that every name in `AVAILABLE_ANIMATIONS` maps to a key in `ANIMATION_STATES` with a clip that exists in the model. This would have caught the animation-name bug. See [[Animation Catalogue]].
