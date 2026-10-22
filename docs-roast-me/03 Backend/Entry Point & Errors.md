---
tags: [backend]
---
# Entry point & errors

`functions/main.py`, function `roast_me(request)`, registered with `@functions_framework.http`.

## What it does
1. Builds CORS headers for the caller's `Origin` (`config.get_cors_headers`).
2. `OPTIONS` → `204`.
3. No `GEMINI_API_KEY` → `500 Server is not configured`.
4. Rate limit: `rate_limiter.check(client_ip(request))`. Over the limit → `429` with a friendly message and `Retry-After`. See "Rate limiting" below.
5. `parse_image_from_request` → `resize_image` (max 1024 px) → `image_to_bytes` (PNG, converting CMYK and other unusual modes to RGB).
6. `generate_roast(client, image_bytes)` → roast dict. See [[Roast Generation]].
7. `build_narration_text(roast)` → narration string.
8. `generate_tts_audio(client, narration)` → base64 PCM or `None`. See [[Text to Speech]].
9. `get_audio_duration(audio)` → seconds, or `None` without audio.
10. `generate_animation_script(client, narration, duration)` → script. See [[Animation Script Pipeline]]. Wrapped in its own `try`, so a failure here never fails the request.
11. Returns the JSON in [[API Contract]].

The Gemini client (`genai.Client`) is created once at import time and reused across requests on a warm instance.

## Error handling

| Exception | Response |
| --- | --- |
| `ValueError` (bad image, Gemini blocked, roast unparseable) | `400` with `str(error)` |
| Anything else | `500 Internal server error`. The traceback is logged with `logger.exception`, not sent to the client. |

TTS and animation failures are swallowed inside their services, so they show up as a missing `audio` field or `metadata.fallback: true`, never as an error status.

## Rate limiting
`functions/utils/rate_limit.py`. `RateLimiter(RATE_LIMIT_PER_HOUR)` is created once per instance at import time.

- Sliding one-hour window per client IP. The IP is the first `X-Forwarded-For` entry (the function sits behind Google's proxy), falling back to `request.remote_addr`.
- Counted in memory only: each instance counts on its own and forgets on restart. The effective limit is `RATE_LIMIT_PER_HOUR` × running instances, which `--max-instances` caps (see [[Cost & Limits]]). No database, so no new GCP resources.
- Every non-`OPTIONS` request counts, including ones later rejected for a bad image.
- `RATE_LIMIT_PER_HOUR=0` turns it off. Clients quiet for an hour are pruned once more than 1000 are tracked.
- Tested in `functions/tests/test_rate_limit.py`.

## Logging
`logging.INFO` to stdout, which goes to Cloud Logging. `roast_service` is very chatty: it logs response previews and the full parsed roast on every call.
