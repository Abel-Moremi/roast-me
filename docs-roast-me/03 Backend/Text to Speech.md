---
tags: [backend, gemini, audio]
---
# Text to speech

`functions/services/tts_service.py`

## The call
- Model: `TTS_MODEL` = `gemini-2.5-flash-preview-tts`
- Voice: `TTS_VOICE` = `Algenib` (a prebuilt Gemini voice)
- `response_modalities=["AUDIO"]`
- The narration is wrapped in a performance direction: "You're a stand-up comedian performing this roast live on stage… Honor every ellipsis (...) with a real pause… Vary your pace…".

## Output
The first `inline_data` part, base64-encoded. It is **raw PCM**: 16-bit signed little-endian, mono, 24 kHz, no header. `get_audio_mime_type()` returns `audio/L16;codec=pcm;rate=24000`.

`get_audio_duration(audio_base64)` = decoded bytes ÷ 2 ÷ 24 000. This real length is what the animation timeline is planned against (see [[Animation Script Pipeline]]).

## Failure
Any exception → logged, returns `None`. The response then has no `audio` and the UI shows the roast without playback controls.

## Audio test mode
With `ENABLE_AUDIO_TEST=true`, each generated clip is also saved to:
- `functions/temp/audio_base64.txt`
- `functions/temp/roast_audio.wav` (made by running `functions/utils/decode_audio.py` as a subprocess)

This is for local listening only; `functions/temp/` is git-ignored and excluded from deploys. The deploy workflow sets it to `false`.

Converting by hand:
```bash
python functions/utils/decode_audio.py input_base64.txt output.wav
```
