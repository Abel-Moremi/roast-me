---
tags: [character, animation, reference]
---
# Animation catalogue

**Single reference for animation names.** Names live in three places and must agree:

1. **Backend:** `AVAILABLE_ANIMATIONS` in `functions/services/animation_constants.py`. What Gemini may use and the validator accepts.
2. **Frontend:** `ANIMATION_STATES` in `composables/animation/animationConstants.js`. The key is the camelCase of the backend name (converted by `normalizeAnimationName`).
3. **Model:** clip names in [[comedian.glb]].

If (1) has a name that (2) lacks, the character ignores those keyframes. If (2) points at a clip that (3) lacks, you get a `Clip not found` warning.

| Backend name | Frontend state | Clip | Plays | Backend clip length | Energy | Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `idle` | `idle` → `sitTalk` after sitting | `idle` / `sit-talk` | loop | 5.70 s | low | The only thing allowed after `stand-to-sit` |
| `walk-relaxed-start` | `walkRelaxedStart` | `walk-relaxed-start` | once, holds | 3.53 s | low | Must come before `walk-relaxed-loop` |
| `walk-relaxed-loop` | `walkRelaxedLoop` | `walk-relaxed-loop` | loop | 4.87 s | low | Only after start. Can't go straight to `idle`. |
| `walk-relaxed-end` | `walkRelaxedEnd` | `walk-relaxed-end` | once, holds | 2.68 s | low | Only after loop |
| `stand-to-sit` | `standToSit` | `stand-to-sit` | once, holds | 4.70 s | medium | Locks seated: only `idle` after it |
| `spellcast` | `spellcast` | `spellcast` | loop | 9.70 s | high | emphasis, punchlines |
| `aerobic-dance` | `aerobicDance` | `aerobic-dance` | loop | 15.15 s | high | peak energy |
| `relax` | `relax` | `relax` | loop | 17.68 s | low | closing; also the pose on load |
| `walk-think` | `walkThink` | `walk-think` | loop | 34.02 s | medium | building up, pacing |

"Plays" is the frontend behaviour (`loopOnce` in `ANIMATION_STATES`). The backend's `is_looping` flags are only guidance in the prompt.

Frontend-only states (console/testing): `sitTalk`, `walkRelaxed` and `walk` (both → `walk-relaxed-loop`), `run` (→ `aerobic-dance`), `action` (→ `Action`), `default` (→ `Default`).

## Rules enforced by the backend validator
- **Sit lock:** after `stand-to-sit`, anything other than `idle` is an error.
- **Walk order:** `walk-relaxed-loop` must follow `walk-relaxed-start`. `walk-relaxed-end` must follow the loop. `idle` can't directly follow the loop.

Breaking either sends the whole script to the fallback. See [[Animation Script Pipeline]].

## Name fixes the backend applies
Before validation, `fix_invalid_animation_name` maps common Gemini mistakes (case-insensitive): `walkThink`→`walk-think`, `aerobicDance`/`dance`/`run`/`aerobic`→`aerobic-dance`, `spellCast`→`spellcast`, `walkRelaxed`→`walk-relaxed-start`, `walk`/`walking`→`walk-think`, `sit`→`stand-to-sit`, `sitting`/`sit-talk`/`sitTalk`→`idle`, `relax-pose`/`relaxing`→`relax`, `idle-pose`/`idle-stand`→`idle`. Anything else unknown → `idle`.

## Adding an animation
1. Add the clip to the model ([[comedian.glb]]).
2. Add an entry to `AVAILABLE_ANIMATIONS` (backend): duration, energy, `required_posture`, `can_transition_to`, use cases. The prompt is generated from this.
3. If it ends a walk sequence or should otherwise reset the walk state, add it to the reset list in `_update_walk_sequence_state` (`animation_validator.py`).
4. Add the camelCase key to `ANIMATION_STATES` (frontend). Set `loopOnce: true` if it's a one-off transition.
5. Update this table.
