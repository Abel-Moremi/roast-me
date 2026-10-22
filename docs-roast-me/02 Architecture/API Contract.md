---
tags: [architecture, backend]
---
# API contract

One endpoint: the Cloud Function `roast_me`. Its URL is the `ROAST_API_URL` GitHub secret, which the frontend build receives as `VITE_ROAST_API_URL`.

## Request

`POST` with either:

**JSON** (what the frontend sends)
```json
{ "image": "data:image/jpeg;base64,/9j/4AAQ..." }
```
The `data:...;base64,` prefix is optional; anything before the first comma is dropped.

**Multipart:** form field named `image` holding the file.

Any format Pillow can open works. The backend resizes so the longest side is at most 1024 px and re-encodes as PNG before sending it to Gemini.

`OPTIONS` returns `204` with CORS headers (preflight).

## Success: `200`

```json
{
  "success": true,
  "data": {
    "overall_vibe": "string",
    "roast_lines": ["8-12 strings"],
    "one_liner": "string",
    "confidence_rating": 0,
    "style_tags": ["string"]
  },
  "audio": "<base64 PCM>",
  "audioMimeType": "audio/L16;codec=pcm;rate=24000",
  "animationScript": {
    "metadata": { "duration": 85.81, "transcript": "...", "intensity": "low|medium|high", "style": "...", "notes": "...", "fallback": true },
    "timeline": [
      { "startTime": 0, "endTime": 17.16, "animation": "idle", "expression": "neutral", "intensity": 0.4, "notes": "..." }
    ]
  }
}
```

| Field | Always present? | Notes |
| --- | --- | --- |
| `data` | yes | `confidence_rating` is clamped to 0–10. Other fields come straight from Gemini; `roast_lines` length isn't enforced in code. |
| `audio` | no, missing if TTS failed | Raw PCM: 16-bit signed, little-endian, mono, 24 kHz, **no WAV header**. Duration = bytes ÷ 48 000. About 64 KB of base64 per second of audio. |
| `audioMimeType` | only with `audio` | Fixed string. |
| `notices` | no, only when something degraded | List of `{ code, message, period }`. Today only `VOICE_QUOTA_EXCEEDED`: the TTS call hit the API key's quota, so there is no `audio`. `period` is `day`, `minute` or `null`. |
| `animationScript` | in practice yes | The service always returns a script (Gemini's or the fallback). `metadata.fallback: true` marks the fallback. Animation names: see [[Animation Catalogue]]. |

## Errors

```json
{ "success": false, "error": "message", "code": "QUOTA_EXCEEDED", "quotaPeriod": "day" }
```
`code` is only present on errors the frontend handles specially (`RATE_LIMITED`, `QUOTA_EXCEEDED`). `quotaPeriod` (`day`, `minute` or `null`) only with `QUOTA_EXCEEDED`.

| Status | When | `error` |
| --- | --- | --- |
| 400 | No `image` in the body | `No image provided (base64 JSON or multipart expected)` |
| 400 | Image can't be decoded | `Invalid image data` (or the base64 decode message) |
| 400 | Gemini blocked or returned unparseable roast JSON | The `ValueError` message, e.g. `Response blocked by safety filters` |
| 429 `RATE_LIMITED` | More than `RATE_LIMIT_PER_HOUR` requests from the same IP in the last hour (per instance) | `That's a lot of roasts! Try again in about N minutes.` Also sets a `Retry-After` header (seconds). |
| 429 `QUOTA_EXCEEDED` | The roast call hit the **Gemini API key's** request quota | `The roast machine has hit its Gemini usage limit. Try again tomorrow.` (or `in a minute` / `later`, from `quotaPeriod`) |
| 500 | `GEMINI_API_KEY` not set | `Server is not configured` |
| 500 | Anything unexpected | `Internal server error` (details only in the Cloud Function logs) |

The frontend shows `QUOTA_EXCEEDED` in its own panel (see [[App Shell & State]]), and any other 4xx `error` in the error banner, bringing the camera back. Only 5xx and network errors fall back to the sample roast.

## CORS
`Access-Control-Allow-Origin` comes from the `ALLOWED_ORIGINS` env var (comma-separated). Unset means `*`. See [[Backend Configuration]].

## Try it
`public/mock/input.txt` is a ready-made request body:
```bash
curl -X POST "$ROAST_API_URL" -H "Content-Type: application/json" -d @public/mock/input.txt
```
