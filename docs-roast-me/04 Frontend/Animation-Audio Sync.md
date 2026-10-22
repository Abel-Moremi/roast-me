---
tags: [frontend, animation]
---
# Animation-audio sync

`composables/useAnimationAudioSync.js` turns "the audio is at 12.3 s" into "play `spellcast` with a `laugh`".

## API
| Function | Does |
| --- | --- |
| `initialize(script, duration)` | Checks the timeline (every frame has an `animation` and numeric `startTime < endTime`). Throws if invalid. Resets to `idle` / `neutral` / 0.5. |
| `update(time)` | Finds the keyframe where `startTime <= time < endTime` (before the first frame → the first frame; after the last → no update). Sets `currentAnimation`, `currentExpression` and `currentIntensity`. |
| `seek(time)` | Same as an update at that time. |
| `setPlaying(bool)` | Bookkeeping only. |
| `getTimelineOverview()`, `debugState()` | Debugging. |

`currentAnimation` and `currentExpression` are refs. `app.vue` passes them to the scene as `syncAnimation` / `syncExpression`, and the scene's watchers apply them. See [[3D Scene]].

## Name mapping
Timeline names are kebab-case and the frontend states are camelCase: `normalizeAnimationName` turns `walk-relaxed-start` into `walkRelaxedStart`. The result must be a key in `ANIMATION_STATES` (`composables/animation/animationConstants.js`), or the animation manager logs `Unknown state` and the keyframe is ignored. See [[Animation Catalogue]].

## Seated idle
The backend only allows `idle` after `stand-to-sit`, but `idle` is a standing clip. If a `stand-to-sit` keyframe comes earlier in the timeline, `update` plays `sitTalk` (the seated clip) instead. This is worked out from the timeline each time, so seeking back before the sit-down makes him stand again.

## Timing
Only keyframe boundaries change anything. `currentIntensity` is tracked but not used by the scene. The duration passed to `initialize` is the measured audio length, which the backend also uses to plan the timeline.
