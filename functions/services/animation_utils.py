"""
Animation Utilities
Helper functions for animation script generation and processing.
"""

import json
import logging
from .animation_constants import (
    AVAILABLE_ANIMATIONS, 
    AVAILABLE_EXPRESSIONS,
    DEFAULT_ANIMATION,
    DEFAULT_EXPRESSION,
    DEFAULT_INTENSITY
)

logger = logging.getLogger(__name__)


def parse_animation_response(response_text):
    """
    Extract and parse JSON from Gemini response.
    Handles responses with surrounding text.
    
    Args:
        response_text (str): Raw response text from Gemini
        
    Returns:
        tuple: (parsed_dict: dict | None, error: str | None)
    """
    try:
        # Try to find JSON block in response
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        
        if json_start < 0 or json_end <= json_start:
            return None, "No JSON object found in response"
        
        json_str = response_text[json_start:json_end]
        parsed = json.loads(json_str)
        
        return parsed, None
        
    except json.JSONDecodeError as e:
        return None, f"Invalid JSON: {str(e)}"
    except Exception as e:
        return None, f"Failed to parse response: {str(e)}"


def estimate_audio_duration(text):
    """
    Estimate audio duration from text.
    Based on average speaking rate of ~150 words per minute.
    
    Args:
        text (str): The narration text
        
    Returns:
        float: Estimated duration in seconds
    """
    word_count = len(text.split())
    # 150 words per minute = 0.4 seconds per word
    estimated_seconds = word_count * 0.4
    # Minimum 3 seconds, maximum 120 seconds
    return max(3, min(120, estimated_seconds))


def generate_default_animation_script(duration_seconds, transcript):
    """
    Generate a simple fallback animation script when Gemini fails.
    Creates a 4-section animation pattern with good default values.
    
    Args:
        duration_seconds (float): Duration of audio
        transcript (str): The narration text
        
    Returns:
        dict: A valid animation script with fallback flag
    """
    logger.info("Generating default animation script fallback")
    
    # Divide duration into 4 sections
    section_1 = duration_seconds * 0.25
    section_2 = duration_seconds * 0.5
    section_3 = duration_seconds * 0.75
    
    timeline = [
        {
            "startTime": 0,
            "endTime": section_1,
            "animation": "idle",
            "expression": "neutral",
            "intensity": 0.5,
            "notes": "Opening - neutral stance, setting up"
        },
        {
            "startTime": section_1,
            "endTime": section_2,
            "animation": "sitTalk",
            "expression": "smile",
            "intensity": 0.7,
            "notes": "Building - friendly, conversational tone"
        },
        {
            "startTime": section_2,
            "endTime": section_3,
            "animation": "spellcast",
            "expression": "laugh",
            "intensity": 0.9,
            "notes": "Climax - high energy, emphasizing humor"
        },
        {
            "startTime": section_3,
            "endTime": duration_seconds,
            "animation": "relax",
            "expression": "smile",
            "intensity": 0.6,
            "notes": "Closing - settling down, satisfied expression"
        }
    ]
    
    return {
        "metadata": {
            "duration": duration_seconds,
            "transcript": transcript[:100] + "..." if len(transcript) > 100 else transcript,
            "intensity": "medium",
            "style": "comedic",
            "notes": "Generated using fallback pattern",
            "fallback": True
        },
        "timeline": timeline
    }


def validate_keyframe_integrity(keyframe):
    """
    Quick validation that a keyframe has all required fields.
    
    Args:
        keyframe (dict): Keyframe to validate
        
    Returns:
        bool: True if valid
    """
    required = ["startTime", "endTime", "animation", "expression", "intensity"]
    return all(field in keyframe for field in required)


def clamp_intensity(value):
    """
    Clamp intensity value to valid range [0.0, 1.0].
    
    Args:
        value: Intensity value
        
    Returns:
        float: Clamped value
    """
    if not isinstance(value, (int, float)):
        return DEFAULT_INTENSITY
    return max(0.0, min(1.0, float(value)))


def sanitize_animation_script(script):
    """
    Clean and normalize animation script, fixing common issues.
    
    Args:
        script (dict): Raw animation script
        
    Returns:
        dict: Sanitized script
    """
    if not isinstance(script, dict):
        return None
    
    # Ensure metadata exists
    metadata = script.get("metadata", {})
    
    # Ensure timeline exists
    timeline = script.get("timeline", [])
    if not isinstance(timeline, list):
        return None
    
    # Sanitize each keyframe
    sanitized_timeline = []
    for frame in timeline:
        if not isinstance(frame, dict):
            continue
        
        sanitized_frame = {
            "startTime": frame.get("startTime", 0),
            "endTime": frame.get("endTime", 0),
            "animation": frame.get("animation", DEFAULT_ANIMATION),
            "expression": frame.get("expression", DEFAULT_EXPRESSION),
            "intensity": clamp_intensity(frame.get("intensity", DEFAULT_INTENSITY)),
            "notes": frame.get("notes", "")
        }
        sanitized_timeline.append(sanitized_frame)
    
    return {
        "metadata": metadata,
        "timeline": sanitized_timeline
    }
