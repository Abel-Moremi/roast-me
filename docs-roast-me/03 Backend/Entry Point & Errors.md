---
tags: [backend]
---
# Entry point & errors

`functions/main.py`, function `roast_me(request)`, registered with `@functions_framework.http`.

## What it does
1. Builds CORS headers for the caller's `Origin` (`config.get_cors_headers`).
2. `OPTIONS` → `204`.
3. No `GEMINI_API_KEY` → `500 Server is not configured`.
4. `parse_image_from_request` → `resize_image` (max 1024 px) → `image_to_bytes` (PNG, converting CMYK and other unusual modes to RGB).
5. `generate_roast(client, image_bytes)` → roast dict. See [[Roast Generation]].
6. `build_narration_text(roast)` → narration string.
7. `generate_tts_audio(client, narration)` → base64 PCM or `None`. See [[Text to Speech]].
8. `get_audio_duration(audio)` → seconds, or `None` without audio.
9. `generate_animation_script(client, narration, duration)` → script. See [[Animation Script Pipeline]]. Wrapped in its own `try`, so a failure here never fails the request.
10. Returns the JSON in [[API Contract]].

The Gemini client (`genai.Client`) is created once at import time and reused across requests on a warm instance.

## Error handling

| Exception | Response |
| --- | --- |
| `ValueError` (bad image, Gemini blocked, roast unparseable) | `400` with `str(error)` |
| Anything else | `500 Internal server error`. The traceback is logged with `logger.exception`, not sent to the client. |

TTS and animation failures are swallowed inside their services, so they show up as a missing `audio` field or `metadata.fallback: true`, never as an error status.

## Logging
`logging.INFO` to stdout, which goes to Cloud Logging. `roast_service` is very chatty: it logs response previews and the full parsed roast on every call.
