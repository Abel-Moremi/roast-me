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
| Rate limit kept in each instance's memory, plus `--max-instances 10` | `functions/utils/rate_limit.py`, deploy workflow | October 2026: stops one person hammering the paid calls without adding a database or other GCP resource. Trade-off: not shared between instances. Values (20/hour, 10 instances) are a first guess; tune from real traffic. |
| Backend tests use `unittest`, not pytest | `functions/tests/` | October 2026: standard library only, so CI and contributors need no install. pytest still runs them. |
| Subtitle timing estimated from text length | `composables/useSubtitles.js` | October 2026: the API has no per-line timestamps. Good enough for captions without changing the backend. Real timing would need TTS word timestamps or one TTS call per line. |
| Gemini quota errors return 429 `QUOTA_EXCEEDED` (not 5xx), and a TTS-only quota error still returns the roast as text | `functions/main.py`, `utils/gemini_errors.py` | October 2026: the API key has a request limit. A 5xx would hide it behind the sample roast; users should know why. |
| Autoplay the roast, with Play as fallback | `app.vue` | October 2026: users didn't know they had to press Play. The confirm click unlocks audio. |
