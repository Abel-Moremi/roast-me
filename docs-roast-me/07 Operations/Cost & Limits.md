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
Gen 2, `us-central1`, 2 GB memory, 540 s timeout. Concurrency and instance limits are not set, so the platform defaults apply.

## Protections (or lack of them)
- **No authentication and no rate limiting.** Anyone with the URL can make the three paid calls as often as they like.
- CORS (`ALLOWED_ORIGINS`) only stops other websites from calling it from a browser. It doesn't stop scripts or curl.
- No limit on request size beyond the platform's own. Images are shrunk to 1024 px before reaching Gemini.

Cheap first steps:
1. Add `--max-instances` to the deploy command to cap concurrent spend.
2. Set a budget alert on the GCP project and a quota on the Gemini API key.
3. Then consider App Check / Firebase Auth, or a per-IP limit in front of the function.

## Model risk
The three models are **preview** models (`gemini-3-flash-preview`, `gemini-2.5-flash-preview-tts`). Preview models can be renamed, changed or retired. If roasts suddenly fail with model errors, check the model names in `functions/config.py` first.
