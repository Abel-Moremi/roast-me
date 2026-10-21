---
tags: [character, animation, reference]
---
# Expression catalogue

Six expressions, named the same on both sides:
- **Backend:** `AVAILABLE_EXPRESSIONS` in `functions/services/animation_constants.py`. What Gemini may choose; anything else becomes `neutral`.
- **Frontend:** `EXPRESSIONS` + `expressionConfigs` in `components/ComedyClubScene.vue`.

| Expression | Backend description | Face shapes in [[comedian.glb]] (amount added) |
| --- | --- | --- |
| `neutral` | Default neutral face | none |
| `smile` | Happy smile - friendly | `Mouth_Smile_L/R` .5, `Cheek_Raise_L/R` .3, `Brow_Raise_Outer_Left/Right` .15 |
| `laugh` | Laughing - very amused | `Mouth_Smile_L/R` .9, `Mouth_Open` .4, `Cheek_Raise_L/R` .7, `Eye_Squint_L/R` .5, `Brow_Raise_Outer_Left/Right` .4 |
| `shocked` | Shocked - surprised | `Mouth_Open` .6, `Eye_Wide_L/R` .8, `Brow_Raise_Inner_Left/Right` .7, `Brow_Raise_Outer_Left/Right` .6 |
| `angry` | Annoyed or sarcastic | `Mouth_Frown_L/R` .6, `Brow_Drop_Left/Right` .8, `Eye_Squint_L/R` .5, `Nose_Scrunch` .4 |
| `confused` | Uncertain | `Brow_Raise_Left` .7, `Brow_Drop_Right` .6, `Mouth_Frown_L/R` .2, `A36_Mouth_Shrug_Lower` .5, `Eye_Squint_L/R` .3, `Nose_Scrunch` .2 |

Names are looked up **exactly** (via `morphTargetDictionary`, then a case-insensitive exact match). A name that doesn't exist does nothing, so after editing, check every key against the model's shape list in [[comedian.glb]].

Blending: `setExpression(name)` sets a target, and `updateFacialExpression` cross-fades to it at 3.0 per second (about 0.33 s).

## Interaction with lip sync
Lip sync runs after expressions each frame and writes the jaw and open-mouth shapes (`Mouth_Open`, `A25_Jaw_Open`, `Mouth_Lips_Open/Part`, `Mouth_Widen`, `Mouth_Pucker*`). So while he's talking, the `Mouth_Open` part of `laugh`/`shocked` is replaced by the audio-driven mouth. Smiles, frowns, cheeks, brows, eyes and nose are left alone. See [[Face & Lip Sync]].

## What sets the expression
- `roastReady` → `smile`
- During playback: only the timeline (`syncExpression`)
