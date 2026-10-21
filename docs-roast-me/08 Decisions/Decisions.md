---
tags: [decisions, index]
---
# Decisions

Short records of design choices: what was decided, why, and what it costs. One note per decision, named `ADR-NNN Title`, using [[ADR Template]].

The choices below can be seen in the code, but **the reasons behind them were never written down**. Each needs its author to fill in the "why" before it becomes a real record.

| Choice visible in the code | Where | Reason |
| --- | --- | --- |
| One synchronous request returns roast + audio + timeline (no streaming) | `functions/main.py` | _unknown_ |
| Raw PCM audio decoded by hand with Web Audio instead of WAV/MP3 | `tts_service.py`, `app.vue` | _unknown_ (likely: it's what Gemini TTS returns) |
| A second Gemini call plans the body animation, with a rule-based validator, instead of fixed or random animation | `animation_service.py` | _unknown_ |
| Audio-frequency lip sync instead of phoneme or viseme timing | `useMouthAnimation.js` | _unknown_ |
| The API failing silently falls back to a canned roast | `useRoastApi.js` | _unknown_ |
| Nuxt as a static site with no SSR, everything inside `<ClientOnly>` | `app.vue`, deploy workflow | _unknown_ |
| Preview Gemini models | `functions/config.py` | _unknown_ |
