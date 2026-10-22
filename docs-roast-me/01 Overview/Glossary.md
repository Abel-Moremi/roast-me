---
tags: [overview]
---
# Glossary

| Term | Meaning |
| --- | --- |
| **Roast** | The JSON Gemini returns about the photo: `overall_vibe`, `roast_lines`, `one_liner`, `confidence_rating`, `style_tags`. See [[Roast Generation]]. |
| **Narration** | One string built from the roast for text-to-speech: `"{vibe}. {lines…} And here's the best part: {one_liner}"`. |
| **Animation script** | JSON with `metadata` and a `timeline` telling the character what to do and when. Made by a second Gemini call. See [[Animation Script Pipeline]]. |
| **Timeline / keyframe** | `timeline` is a list of keyframes. Each has `startTime`, `endTime` (seconds), `animation`, `expression`, `intensity` (0–1) and optional `notes`. |
| **Fallback script** | A fixed 5-keyframe timeline (idle → walk-think → spellcast → aerobic-dance → relax) used when Gemini's script can't be used. `metadata.fallback = true`. |
| **Clip** | A body animation baked into [[comedian.glb]], e.g. `walk-think`. |
| **Animation state** | The frontend's camelCase name for a clip, e.g. `walkThink`. See [[Animation Catalogue]]. |
| **Posture / sit lock** | Rule in the backend: once `stand-to-sit` plays, only `idle` is allowed afterwards. The frontend shows that idle as the seated `sit-talk` clip. |
| **Walk sequence** | `walk-relaxed-start` → `walk-relaxed-loop` → `walk-relaxed-end`, which must happen in that order. |
| **Morph target** | A face shape on the model (e.g. `Mouth_Open`) blended from 0 to 1. Used for blinking, the jaw, lips and expressions. |
| **Expression** | A named face preset (`neutral`, `smile`, `laugh`, `shocked`, `angry`, `confused`). See [[Expression Catalogue]]. |
| **PCM** | The raw audio format TTS returns: 16-bit, mono, 24 kHz, little-endian, no header. |
| **Mock mode** | Using `public/mock/output.txt` instead of the real API. See [[Mock Mode]]. |
