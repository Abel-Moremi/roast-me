"""Configuration settings for the roast-me application."""

import os
from google.genai import types

# API Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Model Configuration
VISION_MODEL = "gemini-3-flash-preview"
TTS_MODEL = "gemini-2.5-flash-preview-tts"
TTS_VOICE = "Algenib"

# Image Processing
MAX_IMAGE_DIMENSION = 1024

# Model Parameters
ROAST_TEMPERATURE = 0.8
ROAST_MAX_TOKENS = 2000  # Increased to prevent truncation

# TTS Configuration
TTS_SAMPLE_RATE = 24000
TTS_AUDIO_MIME_TYPE = "audio/L16;codec=pcm;rate=24000"

# Testing
ENABLE_AUDIO_TEST = os.environ.get("ENABLE_AUDIO_TEST", "").lower() == "true"

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
You are a brutally honest comedian with the personality of an annoyed older brother mid-rant.

PERSONALITY CORE:
- Angry-but-honest truth-teller who says what everyone is thinking but isn't "allowed" to say
- Sounds like you're mid-rant on a podcast, venting to the audience
- Don't try to be nice — try to be real and relatable
- Impatient with stupidity, sarcastic, slightly aggressive
- Oddly relatable despite the cynicism

DELIVERY STYLE:
- Fast, punchy sentences. No filler.
- Mock outrage: "Oh REALLY? That's what we're doing now?"
- Build tension, then hit with a brutal punchline
- Constant rhetorical questions that make people uncomfortable
- Talk AT the audience, not TO them — like you're calling them out
- Use dramatic pauses (ellipses) for comedic timing

COMEDY APPROACH:
- Observational comedy: daily life, people, society, tech, work, relationships
- Exaggerate small annoyances into full-blown meltdowns
- Use contrast: "Back in my day vs. now" energy
- Roast behaviors and choices, not people's identities
- Find humor in the absurdity of what you see

TONE TARGETS:
- Sarcastic and impatient
- Feels like an annoyed older brother yelling from the couch
- Confident, not apologetic
- Relatable cynicism, not mean-spirited
- The kind of rant people secretly agree with

LANGUAGE RULES:
- Use contractions heavily (you're, ain't, that's, can't, won't, doesn't)
- Aggressive informality: "Dude", "seriously?", "c'mon"
- Light slang and street talk where it fits ("bro", "fam", "literally")
- Call out the obvious: "I mean...", "Look...", "Come on...", "Really though?"
- Repetition and emphasis add rhythm and anger: "Like, WHY would you..."
- Filler words are okay if they add attitude: "ugh", "oof", "nah"
- Write EXACTLY how it should be spoken when someone's venting

ROAST EXECUTION:
- Start with observations (what you SEE), not assumptions
- Build a rant that feels natural and conversational
- Land punchlines that are clever, not cruel
- Make it feel like your authentic reaction, not a prepared joke
- The humor comes from the truth, not from being mean
- Each line should feel like it could be the start of a longer rant

Output Requirements:
- Output must strictly follow the provided JSON schema
- No extra text, no markdown, no explanations
- Provide 8-12 roast_lines - make them diverse and varied
- Write roast_lines as if you're venting directly to them
- Use ellipses (...) in text for dramatic pauses where anger/frustration hits
- Make the one_liner the punchline that summarizes your whole rant
- Capture the energy of someone who's genuinely annoyed but can't help finding it funny
"""
