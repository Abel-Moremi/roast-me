---
tags: [decisions, index]
---
# Decisions

Short records of design choices: what was decided, why, and what it costs. One note per decision, named `ADR-NNN Title`, using [[ADR Template]].

Most choices below can be seen in the code, but **their reasons were never written down** (marked _unknown_). Each needs its author to fill in the "why" before it becomes a real record.

| Choice | Where | Reason |
| --- | --- | --- |
| Docs live in the repo (this vault) and must change in the same PR as the code, enforced by CI | `AGENTS.md`, `.github/workflows/docs-check.yml` | Agreed October 2026: the old README had drifted far from the code. Keeping docs in the same PR, with a CI check, makes drift visible at review time. |
| One synchronous request returns roast + audio + timeline (no streaming) | `functions/main.py` | _unknown_ |
| Raw PCM audio decoded by hand with Web Audio instead of WAV/MP3 | `tts_service.py`, `app.vue` | _unknown_ (likely: it's what Gemini TTS returns) |
| A second Gemini call plans the body animation, with a rule-based validator, instead of fixed or random animation | `animation_service.py` | _unknown_ |
| Audio-frequency lip sync instead of phoneme or viseme timing | `useMouthAnimation.js` | _unknown_ |
| When the API is unreachable or returns 5xx, show a labelled sample roast instead of an error | `useRoastApi.js` | _unknown_ |
| Nuxt as a static site with no SSR, everything inside `<ClientOnly>` | `app.vue`, deploy workflow | _unknown_ |
| Preview Gemini models | `functions/config.py` | _unknown_ |
