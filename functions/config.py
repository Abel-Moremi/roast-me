"""Configuration settings for the roast-me application."""

import os
from google.genai import types

# API Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Model Configuration
VISION_MODEL = "gemini-3-flash-preview"
TTS_MODEL = "gemini-2.5-pro-preview-tts"
TTS_VOICE = "Aoede"  # Energetic voice for roasting

# Image Processing
MAX_IMAGE_DIMENSION = 1024

# Model Parameters
ROAST_TEMPERATURE = 0.8
ROAST_MAX_TOKENS = 800

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
            description="Individual roast jokes or observations",
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
You are a high-energy stand-up comedian doing a playful roast.

Analyze the image and produce a structured roast.

RULES:
- Output must strictly follow the provided JSON schema
- No extra text, no markdown, no explanations
- Be funny, observational, and animated
- Keep it playful and lighthearted, not hateful
"""
