"""
Animation Constants Module
Centralized configuration for available animations and expressions.
Includes state machine metadata with posture requirements and sequence rules.

Features:
- Type-safe animation metadata
- Helper functions for animation lookups
- Validation helpers for metadata integrity
- Posture and state machine definitions
"""

from typing import Dict, List, Optional, Literal, Any
from enum import Enum

# ============================================
# POSTURE ENUM
# Character posture states that restrict which animations can play
# ============================================
class Posture(str, Enum):
    """Character posture states for state machine."""
    STANDING = "standing"
    SITTING = "sitting"


class EnergyLevel(str, Enum):
    """Animation energy/intensity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ============================================
# TYPE DEFINITIONS
# ============================================
AnimationName = str
AnimationMetadata = Dict[str, Any]
AnimationLibrary = Dict[AnimationName, AnimationMetadata]

# ============================================
# ANIMATION STATE MACHINE METADATA
# Complete animation definitions with timing, posture requirements, and sequences
# ============================================
AVAILABLE_ANIMATIONS: AnimationLibrary = {
    "idle": {
        "name": "idle",
        "duration": 5.70,
        "description": "Base standing idle state",
        "energy": EnergyLevel.LOW,
        "required_posture": Posture.STANDING,
        "is_looping": True,
        "can_transition_to": ["walk-relaxed-start", "stand-to-sit", "spellcast", "aerobic-dance", "walk-think", "relax"],
        "use_cases": ["neutral moments", "listening", "thinking"]
    },
    
    "walk-relaxed-start": {
        "name": "walk-relaxed-start",
        "duration": 3.53,
        "description": "Walk start pose - leads into loop",
        "energy": EnergyLevel.LOW,
        "required_posture": Posture.STANDING,
        "is_looping": False,
        "next_in_sequence": "walk-relaxed-loop",
        "can_transition_to": ["walk-relaxed-loop"],
        "use_cases": ["movement", "transitions"]
    },
    
    "walk-relaxed-loop": {
        "name": "walk-relaxed-loop",
        "duration": 4.87,
        "description": "Looping walk - repeats until requested to stop",
        "energy": EnergyLevel.LOW,
        "required_posture": Posture.STANDING,
        "is_looping": True,
        "previous_in_sequence": "walk-relaxed-start",
        "required_sequence_completion": 0.9,  # Must be 90% complete before entering
        "next_in_sequence": "walk-relaxed-end",
        "can_transition_to": ["walk-relaxed-end", "idle"],
        "use_cases": ["continuous movement"]
    },
    
    "walk-relaxed-end": {
        "name": "walk-relaxed-end",
        "duration": 2.68,
        "description": "Walk end pose - concludes the walking sequence",
        "energy": "low",
        "required_posture": Posture.STANDING,
        "is_looping": False,
        "previous_in_sequence": "walk-relaxed-loop",
        "must_play_before": ["idle"],  # Must play before returning to idle
        "can_transition_to": ["idle"],
        "use_cases": ["walk conclusion"]
    },
    
    "stand-to-sit": {
        "name": "stand-to-sit",
        "duration": 4.70,
        "description": "Transition from standing to sitting posture",
        "energy": "medium",
        "required_posture": Posture.STANDING,
        "changes_posture_after": Posture.SITTING,
        "is_looping": False,
        "locks_character": True,  # Locks in sitting after completion
        "can_transition_to": ["idle"],
        "use_cases": ["posture change", "sitting"]
    },
    
    "spellcast": {
        "name": "spellcast",
        "duration": 9.70,
        "description": "Dramatic spellcast gesture",
        "energy": "high",
        "required_posture": Posture.STANDING,
        "is_looping": False,
        "can_transition_to": ["idle", "walk-relaxed-start"],
        "use_cases": ["emphasis", "dramatic moments", "punchlines"]
    },
    
    "aerobic-dance": {
        "name": "aerobic-dance",
        "duration": 15.15,
        "description": "High-energy aerobic dance",
        "energy": "high",
        "required_posture": Posture.STANDING,
        "is_looping": False,
        "can_transition_to": ["idle"],
        "use_cases": ["excitement", "climax", "high energy"]
    },
    
    "relax": {
        "name": "relax",
        "duration": 17.68,
        "description": "Relaxing standing pose",
        "energy": EnergyLevel.LOW,
        "required_posture": Posture.STANDING,
        "is_looping": False,
        "can_transition_to": ["idle"],
        "use_cases": ["conclusion", "settling down", "comfortable moments"]
    },
    
    "walk-think": {
        "name": "walk-think",
        "duration": 34.02,
        "description": "Walking while thinking - long-form contemplative movement",
        "energy": EnergyLevel.MEDIUM,
        "required_posture": Posture.STANDING,
        "is_looping": True,
        "can_transition_to": ["idle"],
        "use_cases": ["building up", "pacing", "considering"]
    }
}

# ============================================
# AVAILABLE EXPRESSIONS
# Maps expression names to descriptions matching frontend EXPRESSIONS
# ============================================
AVAILABLE_EXPRESSIONS: Dict[str, Dict[str, Any]] = {
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
class AnimationConfig:
    """Configuration constants for animation generation."""
    MIN_DURATION: int = 3  # Minimum animation duration in seconds
    MAX_KEYFRAMES: int = 10  # Maximum number of keyframes in timeline
    DEFAULT_INTENSITY: float = 0.5  # Default movement intensity
    MIN_INTENSITY: float = 0.0  # Minimum intensity value
    MAX_INTENSITY: float = 1.0  # Maximum intensity value
    GEMINI_TEMPERATURE: float = 0.7  # Creativity level for Gemini (0-1)
    GEMINI_MAX_TOKENS: int = 2000  # Max tokens for generation response
    WALK_START_COMPLETION_THRESHOLD: float = 0.9  # 90% before loop allowed
    WALK_AUTO_TRANSITION_THRESHOLD: float = 0.95  # 95% for auto-transition


# ============================================
# DEFAULTS & CONSTANTS
# ============================================
DEFAULT_EXPRESSION: str = "neutral"
DEFAULT_ANIMATION: str = "idle"
DEFAULT_INTENSITY: float = 0.5

# Backward compatibility - convert to dict for existing code
ANIMATION_CONFIG: Dict[str, any] = {
    "min_duration": AnimationConfig.MIN_DURATION,
    "max_keyframes": AnimationConfig.MAX_KEYFRAMES,
    "default_intensity": AnimationConfig.DEFAULT_INTENSITY,
    "intensity_range": (AnimationConfig.MIN_INTENSITY, AnimationConfig.MAX_INTENSITY),
    "temperature": AnimationConfig.GEMINI_TEMPERATURE,
    "max_tokens": AnimationConfig.GEMINI_MAX_TOKENS
}

# ============================================
# HELPER FUNCTIONS
# ============================================

def is_valid_animation(animation_name: str) -> bool:
    """
    Check if animation name is valid.
    
    Args:
        animation_name: Name to check
        
    Returns:
        True if animation exists in AVAILABLE_ANIMATIONS
    """
    return animation_name in AVAILABLE_ANIMATIONS


def is_valid_expression(expression_name: str) -> bool:
    """
    Check if expression name is valid.
    
    Args:
        expression_name: Name to check
        
    Returns:
        True if expression exists in AVAILABLE_EXPRESSIONS
    """
    return expression_name in AVAILABLE_EXPRESSIONS


def get_animation_metadata(animation_name: str) -> Optional[AnimationMetadata]:
    """
    Get metadata for a specific animation.
    
    Args:
        animation_name: Animation to lookup
        
    Returns:
        Animation metadata dict or None if not found
    """
    return AVAILABLE_ANIMATIONS.get(animation_name)


def get_animation_duration(animation_name: str) -> Optional[float]:
    """
    Get duration of a specific animation.
    
    Args:
        animation_name: Animation to lookup
        
    Returns:
        Duration in seconds or None if not found
    """
    metadata = get_animation_metadata(animation_name)
    return metadata.get("duration") if metadata else None


def get_animations_by_posture(posture: Posture) -> List[str]:
    """
    Get all animations that require a specific posture.
    
    Args:
        posture: Posture to filter by
        
    Returns:
        List of animation names
    """
    return [
        name for name, metadata in AVAILABLE_ANIMATIONS.items()
        if metadata.get("required_posture") == posture
    ]


def get_looping_animations() -> List[str]:
    """
    Get all looping animations.
    
    Returns:
        List of animation names that loop
    """
    return [
        name for name, metadata in AVAILABLE_ANIMATIONS.items()
        if metadata.get("is_looping", False)
    ]


def get_one_time_animations() -> List[str]:
    """
    Get all one-time (non-looping) animations.
    
    Returns:
        List of animation names that don't loop
    """
    return [
        name for name, metadata in AVAILABLE_ANIMATIONS.items()
        if not metadata.get("is_looping", False)
    ]


def get_valid_transitions(animation_name: str) -> List[str]:
    """
    Get animations that can follow a specific animation.
    
    Args:
        animation_name: Current animation
        
    Returns:
        List of valid next animation names
    """
    metadata = get_animation_metadata(animation_name)
    return metadata.get("can_transition_to", []) if metadata else []


def validate_animation_metadata() -> Dict[str, List[str]]:
    """
    Validate all animation metadata for consistency.
    
    Returns:
        Dict with 'errors' and 'warnings' lists
    """
    errors = []
    warnings = []
    
    for anim_name, metadata in AVAILABLE_ANIMATIONS.items():
        # Check required fields
        required_fields = ["name", "duration", "description", "energy", "required_posture", "is_looping"]
        for field in required_fields:
            if field not in metadata:
                errors.append(f"{anim_name}: missing required field '{field}'")
        
        # Check duration is positive
        if metadata.get("duration", 0) <= 0:
            errors.append(f"{anim_name}: duration must be positive")
        
        # Check valid transitions exist
        if "can_transition_to" not in metadata:
            warnings.append(f"{anim_name}: no transitions defined")
        else:
            for target in metadata["can_transition_to"]:
                if target not in AVAILABLE_ANIMATIONS:
                    errors.append(f"{anim_name}: transition to invalid animation '{target}'")
        
        # Check sequence references
        if "next_in_sequence" in metadata:
            next_anim = metadata["next_in_sequence"]
            if next_anim not in AVAILABLE_ANIMATIONS:
                errors.append(f"{anim_name}: next_in_sequence '{next_anim}' doesn't exist")
        
        if "previous_in_sequence" in metadata:
            prev_anim = metadata["previous_in_sequence"]
            if prev_anim not in AVAILABLE_ANIMATIONS:
                errors.append(f"{anim_name}: previous_in_sequence '{prev_anim}' doesn't exist")
    
    return {"errors": errors, "warnings": warnings}
