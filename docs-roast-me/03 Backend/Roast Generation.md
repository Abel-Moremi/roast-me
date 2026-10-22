---
tags: [backend, gemini]
---
# Roast generation

`functions/services/roast_service.py`, with the prompt and schema in `functions/config.py`.

## The call
- Model: `VISION_MODEL` = `gemini-3-flash-preview`
- Inputs: `ROAST_PROMPT` + the PNG image
- `temperature` 0.8, `max_output_tokens` 2000
- Structured output: `response_mime_type="application/json"` + `ROAST_SCHEMA`

## Schema (`ROAST_SCHEMA`)
| Field | Type | Notes |
| --- | --- | --- |
| `overall_vibe` | string | |
| `roast_lines` | string[] | `min_items=8`. The prompt asks for 8–12. |
| `confidence_rating` | integer | Clamped to 0–10 after parsing. |
| `style_tags` | string[] | e.g. "awkward", "bold". Not shown in the UI. |
| `one_liner` | string | Best single line. |

All five are required.

## The prompt (`ROAST_PROMPT`)
Persona: a "brutally honest comedian with the personality of an annoyed older brother mid-rant". It asks for observational, fast, informal delivery with heavy contractions, rhetorical questions and ellipses for pauses (TTS honours these). It also asks to roast behaviours and choices, not identities. Edit `config.py` to change the voice of the roasts.

## Fallbacks when parsing goes wrong
In order:
1. If the call with `response_schema` throws a quota error, raise `QuotaExceededError` straight away (a retry would fail too and use another request). See [[Entry Point & Errors]].
2. If it throws anything else, retry **without** the schema, adding "return ONLY valid JSON with these fields" to the prompt.
3. No candidates → `ValueError("Response blocked by safety filters")` → HTTP 400.
4. `response.parsed` is `None` → try `json.loads` on each text part.
5. If the output was cut off (`finish_reason == "MAX_TOKENS"`), try closing open quotes, brackets and braces.
6. Try extracting from a <code>```json</code> or <code>```</code> block.
7. All failed → `ValueError("Failed to parse roast data ...")` → HTTP 400.

## Narration
`build_narration_text()` joins the fields into the single string that is spoken and sent to the animation step:
```
{overall_vibe}. {roast_lines joined by spaces} And here's the best part: {one_liner}
```
The frontend subtitles split the audio into these same pieces (see [[Audio Playback]]). If you change this format, change `composables/useSubtitles.js` too.
