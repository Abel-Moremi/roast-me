---
tags: [backend, config]
---
# Backend configuration

## Environment variables
Read with `os.environ` in `functions/config.py`. **No `.env` file is loaded**: locally you must export them in your shell (see [[Local Setup]]). In production they're set by the deploy workflow ([[Deployment]]).

| Variable | Required | Default | Effect |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | yes | none | Without it every request returns `500 Server is not configured`. |
| `ENABLE_AUDIO_TEST` | no | off | `true` saves each TTS clip to `functions/temp/`. See [[Text to Speech]]. |
| `ALLOWED_ORIGINS` | no | `*` | Comma-separated list of origins allowed by CORS, e.g. `https://fun-series-gcloud.web.app,http://localhost:3000`. |

## Constants in `functions/config.py`

| Constant | Value | Used by |
| --- | --- | --- |
| `VISION_MODEL` | `gemini-3-flash-preview` | roast **and** animation calls |
| `TTS_MODEL` | `gemini-2.5-flash-preview-tts` | TTS |
| `TTS_VOICE` | `Algenib` | TTS |
| `MAX_IMAGE_DIMENSION` | 1024 | longest side of the image sent to Gemini (`main.py` → `resize_image`) |
| `ROAST_TEMPERATURE` | 0.8 | roast |
| `ROAST_MAX_TOKENS` | 2000 | roast |
| `TTS_SAMPLE_RATE` | 24000 | audio duration maths |
| `TTS_AUDIO_MIME_TYPE` | `audio/L16;codec=pcm;rate=24000` | response |
| `ROAST_SCHEMA`, `ROAST_PROMPT` | | see [[Roast Generation]] |

## Constants in `functions/services/animation_constants.py`
`AnimationConfig`: `MAX_KEYFRAMES` 10, `GEMINI_TEMPERATURE` 0.7, `GEMINI_MAX_TOKENS` 2000, plus intensity limits. `AVAILABLE_ANIMATIONS` and `AVAILABLE_EXPRESSIONS` are the backend catalogue. See [[Animation Catalogue]].

## Dependencies
`functions/requirements.txt` pins everything. The main ones: `google-genai` 1.58.0, `functions-framework` 3.10.0, `Flask` 3.1.2, `pillow` 12.1.0. The runtime is Python 3.10 (set in the deploy workflow).

## Import quirk
`roast_service.py`, `tts_service.py` and `animation_service.py` add `functions/` to `sys.path` so `import config` works whether they're imported as a package or run directly. `functions/test_imports.py` checks this layout.
