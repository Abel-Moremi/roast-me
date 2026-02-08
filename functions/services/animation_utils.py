"""
Animation Utilities
Helper functions for animation script generation, parsing, and processing.

This module provides utility functions organized into logical groups:
1. Response Parsing: Extract and parse Gemini JSON responses
2. Duration Estimation: Calculate audio duration from transcripts
3. Script Generation: Create fallback/default animation scripts
4. Script Validation: Quick integrity checks on keyframes
5. Animation Fixing: Map invalid animation names to valid alternatives
6. Script Sanitization: Normalize and clean raw scripts
"""

import json
import logging
from typing import Dict, Tuple, Optional, Any
from .animation_constants import (
    AVAILABLE_ANIMATIONS,
    AVAILABLE_EXPRESSIONS,
    DEFAULT_ANIMATION,
    DEFAULT_EXPRESSION,
    DEFAULT_INTENSITY,
    is_valid_animation
)

logger = logging.getLogger(__name__)


# ============================================
# RESPONSE PARSING
# ============================================

def parse_animation_response(response_text: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Extract and parse JSON from Gemini response.
    
    Handles responses with surrounding text by finding the first '{' and last '}'
    to extract the JSON block. Useful for dealing with markdown formatting or
    explanatory text around the core JSON response.
    
    Args:
        response_text: Raw response text from Gemini
        
    Returns:
        Tuple of (parsed_dict, error_message)
        - parsed_dict is the parsed JSON as dict, or None if failed
        - error_message is a string describing the error, or None if successful
    """
    try:
        # Find JSON block boundaries
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        
        if json_start < 0 or json_end <= json_start:
            return None, "No JSON object found in response"
        
        json_str = response_text[json_start:json_end]
        parsed = json.loads(json_str)
        
        logger.debug(f"Successfully parsed animation response ({len(json_str)} bytes)")
        return parsed, None
        
    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON: {str(e)}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"Failed to parse response: {str(e)}"
        logger.error(error_msg)
        return None, error_msg


# ============================================
# DURATION ESTIMATION
# ============================================

def estimate_audio_duration(text: str) -> float:
    """
    Estimate audio duration from transcript text.
    
    Uses average speaking rate of ~150 words per minute (0.4 seconds per word).
    Applies bounds to ensure reasonable values: minimum 3 seconds, maximum 120 seconds.
    
    Args:
        text: The narration/speech text
        
    Returns:
        Estimated duration in seconds
    """
    word_count = len(text.split())
    # 150 words per minute = 0.4 seconds per word
    estimated_seconds = word_count * 0.4
    # Clamp to reasonable range
    return max(3, min(120, estimated_seconds))


# ============================================
# SCRIPT GENERATION
# ============================================

def generate_default_animation_script(duration_seconds: float, transcript: str) -> Dict[str, Any]:
    """
    Generate a simple fallback animation script when Gemini fails.
    
    Creates a valid animation script that respects state machine rules:
    - Uses only standing animations (no sitting transitions)
    - Uses valid animation names from AVAILABLE_ANIMATIONS
    - Divides duration into logical performance sections
    - Provides smooth energy progression
    
    Script structure:
    1. Opening (0-20%): idle neutral greeting
    2. Building (20-45%): walk-think for engagement
    3. Climax (45-70%): spellcast for emphasis
    4. Peak (70-85%): aerobic-dance for high energy
    5. Closing (85-100%): relax for resolution
    
    Args:
        duration_seconds: Duration of audio/performance
        transcript: The narration text (used for metadata)
        
    Returns:
        Dict with metadata and valid timeline using state machine animations
    """
    logger.info(f"Generating default fallback script ({duration_seconds}s) - state machine compliant")
    
    # Divide duration into performance sections
    section_1 = duration_seconds * 0.2   # Opening: 0-20%
    section_2 = duration_seconds * 0.45  # Building: 20-45%
    section_3 = duration_seconds * 0.7   # Climax: 45-70%
    section_4 = duration_seconds * 0.85  # Peak: 70-85%
    
    timeline = [
        {
            "startTime": 0,
            "endTime": section_1,
            "animation": "idle",
            "expression": "neutral",
            "intensity": 0.4,
            "notes": "Opening - neutral stance, setting up for performance"
        },
        {
            "startTime": section_1,
            "endTime": section_2,
            "animation": "walk-think",
            "expression": "smile",
            "intensity": 0.6,
            "notes": "Building - contemplative movement, engaging audience"
        },
        {
            "startTime": section_2,
            "endTime": section_3,
            "animation": "spellcast",
            "expression": "laugh",
            "intensity": 0.9,
            "notes": "Climax - high energy gesture with dramatic emphasis"
        },
        {
            "startTime": section_3,
            "endTime": section_4,
            "animation": "aerobic-dance",
            "expression": "laugh",
            "intensity": 0.8,
            "notes": "Peak energy - celebrating the comedic moment"
        },
        {
            "startTime": section_4,
            "endTime": duration_seconds,
            "animation": "relax",
            "expression": "smile",
            "intensity": 0.5,
            "notes": "Closing - settling down with satisfied expression"
        }
    ]
    
    return {
        "metadata": {
            "duration": duration_seconds,
            "transcript": transcript[:100] + "..." if len(transcript) > 100 else transcript,
            "intensity": "medium",
            "style": "comedic",
            "notes": "Generated using fallback pattern (state machine compliant)",
            "fallback": True
        },
        "timeline": timeline
    }


# ============================================
# VALIDATION HELPERS
# ============================================

def validate_keyframe_integrity(keyframe: Dict[str, Any]) -> bool:
    """
    Quick validation that a keyframe has all required fields.
    
    Does not validate field types or value ranges - use full validator for that.
    
    Args:
        keyframe: Keyframe dictionary to validate
        
    Returns:
        True if keyframe contains all required fields
    """
    required_fields = ["startTime", "endTime", "animation", "expression", "intensity"]
    return all(field in keyframe for field in required_fields)


def clamp_intensity(value: Any) -> float:
    """
    Clamp intensity value to valid range [0.0, 1.0].
    
    If value is not numeric, returns DEFAULT_INTENSITY.
    
    Args:
        value: Intensity value (any type)
        
    Returns:
        Clamped intensity float in range [0.0, 1.0]
    """
    if not isinstance(value, (int, float)):
        return DEFAULT_INTENSITY
    return max(0.0, min(1.0, float(value)))


# ============================================
# ANIMATION NAME FIXING
# ============================================

# Mapping of common invalid animation names to valid state machine animations
INVALID_TO_VALID_MAPPING: Dict[str, str] = {
    # camelCase variations
    "sitTalk": "idle",  # Doesn't exist
    "walkRelaxed": "walk-relaxed-start",
    "walkThink": "walk-think",
    "aerobicDance": "aerobic-dance",
    "spellCast": "spellcast",
    
    # Incomplete walk sequences
    "walk": "walk-think",
    "walking": "walk-think",
    
    # Sitting/posture variations
    "sit": "stand-to-sit",
    "sitting": "idle",
    "sit-talk": "idle",  # Sitting animation not valid as standalone
    
    # Dance/run variants
    "dance": "aerobic-dance",
    "run": "aerobic-dance",
    "aerobic": "aerobic-dance",
    
    # Typos and variations
    "relax-pose": "relax",
    "relaxing": "relax",
    "idle-pose": "idle",
    "idle-stand": "idle"
}


def fix_invalid_animation_name(animation_name: str) -> str:
    """
    Map invalid animation names to valid state machine animations.
    
    Handles common naming errors from Gemini:
    - camelCase variations (sitTalk → idle)
    - Incomplete names (walk → walk-think)
    - Typos (aerobicDance → aerobic-dance)
    - Posture-specific names (sit → stand-to-sit)
    
    If animation name is valid, returns it unchanged.
    If animation is unknown, defaults to 'idle' and logs warning.
    
    Args:
        animation_name: Potentially invalid animation name
        
    Returns:
        Valid animation name from AVAILABLE_ANIMATIONS
    """
    # If valid, return as-is
    if is_valid_animation(animation_name):
        return animation_name
    
    # Check if it's a known invalid mapping
    lower_name = animation_name.lower()
    if lower_name in INVALID_TO_VALID_MAPPING:
        fixed = INVALID_TO_VALID_MAPPING[lower_name]
        logger.warning(f"Fixed invalid animation: '{animation_name}' → '{fixed}'")
        return fixed
    
    # Unknown animation - default to idle
    logger.warning(f"Unknown animation name: '{animation_name}', defaulting to '{DEFAULT_ANIMATION}'")
    return DEFAULT_ANIMATION


# ============================================
# SCRIPT SANITIZATION
# ============================================

def sanitize_animation_script(script: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Clean and normalize animation script, fixing common issues.
    
    Operations performed:
    1. Validates basic structure (dict with metadata and timeline)
    2. Fixes invalid animation names using mapping
    3. Clamps intensity values to [0.0, 1.0]
    4. Ensures all required keyframe fields exist
    5. Normalizes expressions to valid options
    
    Logs corrections made for debugging purposes.
    
    Args:
        script: Raw animation script (potentially with errors)
        
    Returns:
        Sanitized script with valid names and values, or None if invalid structure
    """
    if not isinstance(script, dict):
        logger.error("Script must be a dictionary")
        return None
    
    # Preserve metadata
    metadata = script.get("metadata", {})
    
    # Process timeline
    timeline = script.get("timeline", [])
    if not isinstance(timeline, list):
        logger.error("Timeline must be a list")
        return None
    
    # Sanitize each keyframe
    sanitized_timeline = []
    for i, frame in enumerate(timeline):
        if not isinstance(frame, dict):
            logger.warning(f"Keyframe {i} is not a dict, skipping")
            continue
        
        # Fix invalid animation names
        animation = frame.get("animation", DEFAULT_ANIMATION)
        fixed_animation = fix_invalid_animation_name(animation)
        
        # Validate/fix expression
        expression = frame.get("expression", DEFAULT_EXPRESSION)
        if expression not in AVAILABLE_EXPRESSIONS:
            logger.warning(f"Keyframe {i}: invalid expression '{expression}', using '{DEFAULT_EXPRESSION}'")
            expression = DEFAULT_EXPRESSION
        
        # Build sanitized keyframe
        sanitized_frame = {
            "startTime": frame.get("startTime", 0),
            "endTime": frame.get("endTime", 0),
            "animation": fixed_animation,
            "expression": expression,
            "intensity": clamp_intensity(frame.get("intensity", DEFAULT_INTENSITY)),
            "notes": frame.get("notes", "")
        }
        sanitized_timeline.append(sanitized_frame)
    
    logger.debug(f"Sanitized {len(sanitized_timeline)} keyframes")
    
    return {
        "metadata": metadata,
        "timeline": sanitized_timeline
    }
