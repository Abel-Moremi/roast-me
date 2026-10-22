---
tags: [operations]
---
# Cost & limits

## Per roast
| Resource | Amount |
| --- | --- |
| Gemini calls | **3, one after another:** vision roast (image + ~430-word prompt, ≤ 2000 output tokens), TTS (the full narration as audio, typically 60–90 s), animation timeline (~720-word text prompt, ≤ 2000 output tokens) |
| Function time | the three calls end to end, usually several seconds and sometimes much longer for TTS. The timeout is 540 s. |
| Response size | dominated by audio: ~64 KB of base64 per second of speech. The mock response (86 s) is ~5.5 MB. |
| Page load | `comedian.glb` ~29 MB plus the JS bundle, on every visit (normal browser caching only) |

"Roast Again" costs the same as a new roast.

Check current Gemini pricing for the three models in [[Backend Configuration]]. TTS is usually the most expensive of the three.

## Function settings
Gen 2, `us-central1`, 2 GB memory, 540 s timeout, **`--max-instances 10`**. Concurrency is not set, so the gen 2 default applies. At the cap, extra requests get a platform error, which the frontend treats like a 5xx (sample roast with a notice).

## Protections (or lack of them)
- **No authentication.** Anyone with the URL can call it.
- **Per-IP rate limit:** `RATE_LIMIT_PER_HOUR` (default 20) per instance, kept in memory, so one IP can get at most about 20 × 10 instances per hour. It stops one person hammering the function, not a determined attacker with many IPs. See [[Entry Point & Errors]].
- **Instance cap:** `--max-instances 10` bounds how many roasts run at once, and so the worst-case spend rate.
- CORS (`ALLOWED_ORIGINS`) only stops other websites from calling it from a browser. It doesn't stop scripts or curl.
- No limit on request size beyond the platform's own. Images are shrunk to 1024 px before reaching Gemini.

Cheap first steps:
1. `--max-instances` and a per-IP limit: done.
2. Set a budget alert on the GCP project and a quota on the Gemini API key (console settings, not in this repo). When the key's quota runs out, users see an "out of roasts" panel instead of a generic failure (see [[API Contract]]); check the function logs for `Gemini quota exceeded`.
3. Then consider App Check / Firebase Auth, or a shared rate limit (e.g. Firestore) if the in-memory one isn't enough. Both add GCP resources, so ask first.

## Model risk
The three models are **preview** models (`gemini-3-flash-preview`, `gemini-2.5-flash-preview-tts`). Preview models can be renamed, changed or retired. If roasts suddenly fail with model errors, check the model names in `functions/config.py` first.
