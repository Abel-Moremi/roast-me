---
tags: [frontend, animation, audio]
---
# Face & lip sync

Everything on the face is done with morph targets (face shapes) on the single mesh `Cesar_D_LaTorre_Jacket` in [[comedian.glb]]. There are four systems. All of them **find face shapes by name**, so a name that doesn't exist does nothing, silently.

| System | Code | Finds shapes by | Works with this model? |
| --- | --- | --- | --- |
| Blinking | `composables/useBlinking.js` | case-insensitive substring of `EYE_MORPHS` (e.g. `Blink`) | ✅ matches `Eyes_Blink`, `Eye_Blink_L/R`, `A14/A15_Eye_Blink_*` |
| Jaw | `composables/useJawMovement.js` | substring of `JAW_MORPHS` (e.g. `Jaw_Open`, `mouth_open`) | ✅ `A25_Jaw_Open`, `Mouth_Open` |
| Mouth / lips / teeth | `composables/useMouthAnimation.js` | exact names in `LIP_SHAPE_MORPHS` and the `V_*` visibility shapes | ✅ |
| Expressions | `expressionConfigs` in `ComedyClubScene.vue` | exact names (e.g. `Brow_Raise_Left`) | ✅ (all 20 names checked against the model) |

## Lip sync
Audio-driven, not phoneme-based.

1. `getAudioFrequencyData()` in `app.vue` reads 128 frequency bins from the analyser. `midFreq` = average of bins 10–40 %, `highFreq` = average of bins 40–100 %, both scaled to 0–1. The bottom 10 % is ignored.
2. `updateLipSync()` in the scene → `useMouthAnimation().updateFromAudio(intensity, mid, high)`, where intensity = max(mid, high):
   - Speaking when intensity > 0.05.
   - Target jaw opening = max(0.15, mid × 0.25) + high × 0.25 + a small sine wobble, capped at 0.7. The jaw eases toward it.
   - The teeth (`V_*` shapes) and lip shapes follow the jaw opening.
3. Lip sync doesn't touch expressions; those come only from the timeline.

## Blinking
A random gap of 2.5–5 s, 150 ms to close and 100 ms to open, applied to every blink shape it finds.

## Expressions
`setExpression(name)` sets a target, and `updateFacialExpression(delta)` blends to it at `EXPRESSION_BLEND_SPEED` (3.0 per second, about 0.33 s). Each expression is a map of face-shape names to amounts. See [[Expression Catalogue]].

## Ordering constraint
`updateFacialExpression` resets **all** face shapes to their baseline every frame. Blinking and lip sync run after it in the render loop, so they win. Anything new that writes face shapes must also run after it, or it gets wiped.
