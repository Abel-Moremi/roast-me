"""Configuration settings for the roast-me application."""

import os
from google.genai import types

# API Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Model Configuration
VISION_MODEL = "gemini-3-flash-preview"
TTS_MODEL = "gemini-2.5-flash-preview-tts"
TTS_VOICE = "Aoede"  # Energetic voice for roasting

# Image Processing
MAX_IMAGE_DIMENSION = 1024

# Model Parameters
ROAST_TEMPERATURE = 0.8
ROAST_MAX_TOKENS = 2000  # Increased to prevent truncation

# TTS Configuration
TTS_SAMPLE_RATE = 24000
TTS_AUDIO_MIME_TYPE = "audio/L16;codec=pcm;rate=24000"

# Testing
ENABLE_AUDIO_TEST = os.environ.get("ENABLE_AUDIO_TEST") == "true"

# CORS Configuration
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

# Roast Schema
ROAST_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "overall_vibe": types.Schema(
            type=types.Type.STRING,
            description="Overall impression or vibe of the person/image",
        ),
        "roast_lines": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING),
            description="8-12 individual roast jokes or observations - make them diverse and punchy",
            min_items=8,
        ),
        "confidence_rating": types.Schema(
            type=types.Type.INTEGER,
            description="Perceived confidence level from 0 to 10",
        ),
        "style_tags": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING),
            description="Tone/style tags such as 'awkward', 'bold', 'chaotic'",
        ),
        "one_liner": types.Schema(
            type=types.Type.STRING,
            description="Best single-line roast",
        ),
    },
    required=[
        "overall_vibe",
        "roast_lines",
        "confidence_rating",
        "style_tags",
        "one_liner",
    ],
)

# Roast Prompt
ROAST_PROMPT = """
You are a roast comedian speaking directly to the person in front of you.

Style & Delivery:
- Sound like natural spoken language, not written text
- Short punchy sentences that flow when spoken aloud
- Confident, relaxed rhythm
- Playful roasting, never hateful
- Clever observations, not insults
- Use conversational phrasing and timing
- Let jokes breathe — pauses matter

Language Rules:
- Use contractions (you're, ain't, that's, can't)
- Light slang is allowed, but don't overdo it
- Occasional emphasis like "nah", "see", "look", "hold up"
- Repetition is okay if it adds rhythm
- Write exactly how it should be spoken

Roast Rules:
- Roast actions, vibes, or presentation — not identity
- Keep it funny, not aggressive
- Sound like a comedian enjoying the moment
- Focus on what you SEE in the image

Output Requirements:
- Output must strictly follow the provided JSON schema
- No extra text, no markdown, no explanations
- Provide 8-12 roast_lines - make them diverse and varied
- Write roast_lines as if you're speaking directly to them
- Use ellipses (...) in text for dramatic pauses
- Make the one_liner punchy and memorable
"""
