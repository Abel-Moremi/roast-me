"""
Animation Constants
Centralized configuration for available animations and expressions.
Matches the frontend component capabilities in composables/.
"""

# ============================================
# AVAILABLE ANIMATIONS
# Maps animation names to descriptions matching frontend ANIMATION_STATES
# ============================================
AVAILABLE_ANIMATIONS = {
    "idle": {
        "name": "idle",
        "description": "Standing idle - neutral pose",
        "energy": "low",
        "use_cases": ["neutral moments", "listening", "thinking"]
    },
    "walkRelaxed": {
        "name": "walkRelaxed",
        "description": "Casual walking - relaxed movement",
        "energy": "low",
        "use_cases": ["transitions", "casual storytelling"]
    },
    "walkThink": {
        "name": "walkThink",
        "description": "Walking while thinking - contemplative",
        "energy": "medium",
        "use_cases": ["building up", "pacing", "considering"]
    },
    "run": {
        "name": "run",
        "description": "Running/energetic movement - high energy",
        "energy": "high",
        "use_cases": ["excitement", "climax", "punchlines"]
    },
    "sitTalk": {
        "name": "sitTalk",
        "description": "Sitting and talking - conversational",
        "energy": "medium",
        "use_cases": ["casual delivery", "storytelling", "relaxed tone"]
    },
    "spellcast": {
        "name": "spellcast",
        "description": "Spellcast gesture - dramatic hand movement",
        "energy": "high",
        "use_cases": ["emphasis", "dramatic moments", "punchlines"]
    },
    "relax": {
        "name": "relax",
        "description": "Relaxing pose - comfortable stance",
        "energy": "low",
        "use_cases": ["conclusion", "settling down", "comfortable moments"]
    }
}

# ============================================
# AVAILABLE EXPRESSIONS
# Maps expression names to descriptions matching frontend EXPRESSIONS
# ============================================
AVAILABLE_EXPRESSIONS = {
    "neutral": {
        "name": "neutral",
        "description": "Default neutral face",
        "emotion": "neutral",
        "intensity": 0.0
    },
    "smile": {
        "name": "smile",
        "description": "Happy smile - friendly",
        "emotion": "positive",
        "intensity": 0.4
    },
    "laugh": {
        "name": "laugh",
        "description": "Laughing - very amused",
        "emotion": "positive",
        "intensity": 1.0
    },
    "shocked": {
        "name": "shocked",
        "description": "Shocked expression - surprised",
        "emotion": "surprise",
        "intensity": 0.8
    },
    "angry": {
        "name": "angry",
        "description": "Angry expression - annoyed or sarcastic",
        "emotion": "negative",
        "intensity": 0.7
    },
    "confused": {
        "name": "confused",
        "description": "Confused expression - uncertain",
        "emotion": "uncertain",
        "intensity": 0.5
    }
}

# ============================================
# ANIMATION CONFIGURATION
# General settings for animation generation
# ============================================
ANIMATION_CONFIG = {
    "min_duration": 3,  # Minimum animation duration in seconds
    "max_keyframes": 10,  # Maximum number of keyframes in timeline
    "default_intensity": 0.5,  # Default movement intensity
    "intensity_range": (0.0, 1.0),  # Valid intensity range
    "temperature": 0.7,  # Creativity level for Gemini (0-1)
    "max_tokens": 2000  # Max tokens for generation response
}

# ============================================
# DEFAULTS
# ============================================
DEFAULT_EXPRESSION = "neutral"
DEFAULT_ANIMATION = "idle"
DEFAULT_INTENSITY = 0.5
