---
tags: [issues]
---
# Known issues

Found by reading the code (October 2026). Remove items as they're fixed and add new ones here.

## Bugs

_None open._

## Gaps
- **No auth**, and the rate limit is per instance and in memory only, on a function that makes 3 paid calls per request. See [[Cost & Limits]].
- **No frontend tests.** The backend animation and rate-limit code is tested. See [[Testing]].
- **Preview Gemini models** may change or be retired. See [[Cost & Limits]].
- **Console logging in dev.** The per-frame and response-dump logs are gone, but other `console.log` calls remain. Production builds strip them.
- **The ~29 MB model** is downloaded on every first visit. Consider Draco/Meshopt compression.

## Unused but kept on purpose
- `currentIntensity` in the sync code: tracked per keyframe but not used by the scene yet. It's the obvious hook for scaling gesture or expression strength.
- `audioIntensity` passed to the animation manager's `update()`: stored, never read.
- `DEFAULT_ANIMATION_CONFIG.enableProcedural`: never read. Each sway movement has its own `enabled` flag instead.

## Fixed (October 2026)
For reference. Docs: `README.md` and `composables/animation/README.md` rewritten from the code to match this vault.

Fourth round:
- `fix_invalid_animation_name` only fixed camelCase names on its hand-written list (the first-round fix was partial), so e.g. `walkRelaxedStart` became `idle`. Any camelCase form of a valid name is now converted. Found by the new tests.
- Camera denied was a dead end (`alert()` only). Photo upload is now offered, and is the main action when there's no camera.
- No automated tests: backend unit tests now run in CI.
- No rate limiting: per-IP limit in the function plus `--max-instances 10`.
- 13 build-output files under `.output/` were committed despite `.gitignore`. Untracked.
- Also added: photo countdown and retake, autoplay, subtitles.

Third round:
- Users couldn't tell that only the snapshot was roasted or what to do while waiting. The camera screen and the waiting overlay now say so, show the snapshot and the time waited, point to **Play**, and allow cancelling.
- The idle sway (breathing, head sway, shoulder bounce) replaced the clips' upper-body rotation with the load-time pose. It's now added on top of the clip pose.

Second round:
- Facial expressions matched no face shapes. They now use the model's real names, looked up exactly.
- Lip sync no longer overrides timeline expressions.
- The animation prompt now gets the full roast instead of the first 150 characters.
- The prompt's wrong "auto-transition" claims, the literal `{{ duration }}` and the conflicting walk loop → idle rule are gone.
- The wall frame shows the roast (vibe, lines, one-liner, confidence, tags) instead of animation details.
- Old roast frames and their spotlights piled up on every Roast Again. They're now removed and their GPU memory freed.
- Model load failure shows an error and a Reload button instead of hanging.
- A sample roast is now labelled. 4xx errors are shown instead of being hidden behind the mock.
- Responses that arrive after Reset or a newer request are ignored.
- Dead code: `MAX_IMAGE_DIMENSION` is now used. Removed `syncIntensity`, `shouldTransition`, the microphone stand and the unreachable posture check.
- Production builds strip `console.log`.

First round:
- 5 of 9 backend animations had no frontend state (the character ignored them). One-time clips now play once and hold their pose. Seated idle after `stand-to-sit`.
- Crash in the sit-lock validator (`{i}` → `{index}`).
- Any warning rejected Gemini's timeline. Now there are errors vs warnings, and sanitize runs before validate.
- The timeline was planned against a word-count guess. Now it uses the measured audio length.
- Name fixing never matched camelCase mistakes.
- The mock fallback fetched the real API URL. The served mock file was invalid JSON. The sample request was missing its braces.
- The "Preparing your roast" overlay never showed while the request ran. An empty fallback roast could crash the popup.
- The Firebase deploy ignored `composables/`, `public/` and `assets/` changes.
- Internal errors were sent to the browser. Bad images returned 500 instead of 400.
- Removed unused `utils/`, `useThree.js`, `ThreeScene.vue`, `useFacialExpressions.js`, the duplicate mock, and committed `.pyc` files.
