"""
Animation Script Validator
Validates animation script structure and content against state machine rules.
Enforces posture restrictions, sequence validation, and sit lock logic.

This module provides comprehensive validation across multiple layers:
1. Structure validation (metadata, timeline, fields)
2. Content validation (animation/expression names, numeric ranges)
3. Timing validation (duration, gaps, continuity)
4. State machine validation (posture rules, walk sequences, sit lock)

All validation functions are organized by concern with clear error messages
to assist with debugging and fixing invalid scripts.
"""

import logging
from typing import Dict, List, Tuple, Any, Optional
from .animation_constants import (
    AVAILABLE_ANIMATIONS, AVAILABLE_EXPRESSIONS, 
    AnimationConfig, Posture, is_valid_animation, is_valid_expression
)

logger = logging.getLogger(__name__)


# ============================================
# MAIN VALIDATION ENTRY POINT
# ============================================

def validate_animation_script(
    script: Dict[str, Any], expected_duration: float
) -> Tuple[bool, List[str], List[str]]:
    """
    Validate animation script structure and content against state machine rules.
    
    Performs comprehensive validation in 4 phases:
    1. Structure validation (required fields, types)
    2. Content validation (animation names, expressions, ranges)
    3. Timing validation (duration, gaps, continuity)
    4. State machine validation (posture, sequences, sit lock)
    
    Args:
        script: The animation script dictionary to validate
        expected_duration: Expected duration in seconds
        
    Returns:
        Tuple of (is_valid: bool, errors: List[str], warnings: List[str])
        Errors make the script unusable (bad structure, broken timing,
        state machine violations), so is_valid is True only when there are none.
        Warnings are quality issues (duration drift, gaps, keyframe count)
        that the frontend copes with, so the script is still used.
    """
    errors: List[str] = []
    warnings: List[str] = []

    # Structure
    if not isinstance(script, dict):
        return False, ["Script must be a dictionary"], warnings

    # Metadata problems are warnings: the frontend only shows it on the
    # in-scene roast frame and has defaults for every field
    metadata = script.get("metadata")
    if not metadata:
        warnings.append("Missing 'metadata' section")
    else:
        warnings.extend(_validate_metadata(metadata, expected_duration))

    # Timeline structure
    timeline = script.get("timeline", [])
    if not isinstance(timeline, list):
        return False, errors + ["Timeline must be a list"], warnings
    if not timeline:
        return False, errors + ["Timeline is empty or missing"], warnings

    warnings.extend(_validate_timeline_structure(timeline))

    # Keyframe content and timing
    for i, frame in enumerate(timeline):
        errors.extend(_validate_keyframe(frame, i, expected_duration))

    # Coverage and gaps
    warnings.extend(_validate_timeline_continuity(timeline, expected_duration))

    # State machine rules
    errors.extend(_validate_state_machine_rules(timeline))

    return len(errors) == 0, errors, warnings


# ============================================
# METADATA VALIDATION
# ============================================

def _validate_metadata(metadata: Dict[str, Any], expected_duration: float) -> List[str]:
    """
    Validate metadata section of script.
    
    Checks: duration, transcript, intensity, and consistency with expected values.
    
    Args:
        metadata: Metadata dictionary from script
        expected_duration: Expected audio duration for comparison
        
    Returns:
        List of validation issues found
    """
    issues = []
    
    if not isinstance(metadata, dict):
        return ["Metadata must be a dictionary"]
    
    # Check duration field
    duration = metadata.get("duration")
    if duration is None:
        issues.append("Metadata missing 'duration'")
    elif not isinstance(duration, (int, float)):
        issues.append(f"Metadata duration must be a number, got {type(duration).__name__}")
    elif duration <= 0:
        issues.append(f"Metadata duration must be positive, got {duration}")
    elif abs(duration - expected_duration) > 2:  # 2 second tolerance
        issues.append(
            f"Duration mismatch: expected ~{expected_duration}s, got {duration}s. "
            f"Suggestion: verify audio duration or adjust script timeline."
        )
    
    # Check transcript field
    transcript = metadata.get("transcript")
    if not transcript:
        issues.append("Metadata missing 'transcript'")
    elif not isinstance(transcript, str):
        issues.append("Metadata transcript must be a string")
    
    # Check intensity field
    intensity = metadata.get("intensity")
    if intensity and intensity not in ["low", "medium", "high"]:
        issues.append(
            f"Metadata intensity must be 'low', 'medium', or 'high', got '{intensity}'"
        )
    
    return issues


# ============================================
# TIMELINE STRUCTURE VALIDATION
# ============================================

def _validate_timeline_structure(timeline: List[Dict[str, Any]]) -> List[str]:
    """
    Validate timeline structure (length, keyframe count).
    
    Args:
        timeline: Timeline list from script
        
    Returns:
        List of validation issues found
    """
    issues = []
    
    max_frames = AnimationConfig.MAX_KEYFRAMES
    if len(timeline) > max_frames:
        issues.append(
            f"Timeline has too many keyframes ({len(timeline)} > {max_frames}). "
            f"Suggestion: reduce animation count or extend audio duration."
        )
    
    if len(timeline) < 3:
        issues.append(
            f"Timeline should have at least 3 keyframes for variety, found {len(timeline)}. "
            f"Suggestion: add more distinct animations."
        )
    
    return issues


# ============================================
# KEYFRAME CONTENT VALIDATION
# ============================================

def _validate_keyframe(frame: Dict[str, Any], index: int, expected_duration: float) -> List[str]:
    """
    Validate a single keyframe's structure and content.
    
    Checks: required fields, field types, animation names, expression names,
    intensity ranges, and timing values.
    
    Args:
        frame: The keyframe dictionary to validate
        index: Index of keyframe in timeline
        expected_duration: Expected duration for timing validation
        
    Returns:
        List of validation issues found
    """
    issues = []
    
    if not isinstance(frame, dict):
        return [f"Keyframe {index} must be a dictionary, got {type(frame).__name__}"]
    
    # Check required fields
    required_fields = ["startTime", "endTime", "animation", "expression", "intensity"]
    for field in required_fields:
        if field not in frame:
            issues.append(f"Keyframe {index} missing required field '{field}'")
    
    # Validate timing fields
    timing_issues = _validate_keyframe_timing(frame, index, expected_duration)
    issues.extend(timing_issues)
    
    # Validate animation field
    animation = frame.get("animation")
    if animation:
        if not is_valid_animation(animation):
            issues.append(
                f"Keyframe {index} has invalid animation '{animation}'. "
                f"Suggestion: use one of: {', '.join(list(AVAILABLE_ANIMATIONS.keys())[:3])}... (9 total available)"
            )
    
    # Validate expression field
    expression = frame.get("expression")
    if expression:
        if not is_valid_expression(expression):
            issues.append(
                f"Keyframe {index} has invalid expression '{expression}'. "
                f"Available: neutral, smile, laugh, shocked, angry, confused"
            )
    
    # Validate intensity field
    intensity = frame.get("intensity")
    if intensity is not None:
        if not isinstance(intensity, (int, float)):
            issues.append(f"Keyframe {index} intensity must be numeric, got {type(intensity).__name__}")
        elif not (0.0 <= intensity <= 1.0):
            issues.append(
                f"Keyframe {index} intensity must be between 0.0 and 1.0, got {intensity}. "
                f"Suggestion: clamp to valid range."
            )
    
    return issues


def _validate_keyframe_timing(frame: Dict[str, Any], index: int, expected_duration: float) -> List[str]:
    """
    Validate timing fields of a keyframe (startTime, endTime).
    
    Args:
        frame: The keyframe dictionary
        index: Keyframe index
        expected_duration: Expected script duration
        
    Returns:
        List of timing validation issues
    """
    issues = []
    
    start_time = frame.get("startTime")
    end_time = frame.get("endTime")
    
    # Type validation
    if start_time is not None and not isinstance(start_time, (int, float)):
        issues.append(f"Keyframe {index} startTime must be numeric, got {type(start_time).__name__}")
    if end_time is not None and not isinstance(end_time, (int, float)):
        issues.append(f"Keyframe {index} endTime must be numeric, got {type(end_time).__name__}")
    
    # Value validation
    if start_time is not None and end_time is not None:
        if start_time < 0:
            issues.append(f"Keyframe {index} startTime cannot be negative: {start_time}")
        if end_time <= start_time:
            issues.append(
                f"Keyframe {index} endTime ({end_time}s) must be after startTime ({start_time}s)"
            )

    return issues


# ============================================
# TIMELINE CONTINUITY VALIDATION
# ============================================

def _validate_timeline_continuity(timeline: List[Dict[str, Any]], expected_duration: float) -> List[str]:
    """
    Validate timeline continuity: no gaps, covers duration, proper sequencing.
    
    Args:
        timeline: Timeline list from script
        expected_duration: Expected script duration
        
    Returns:
        List of continuity validation issues
    """
    issues = []
    
    if not timeline:
        return issues
    
    # Check start time
    first_frame = timeline[0]
    first_start = first_frame.get("startTime", 0)
    if first_start > 0.5:  # Allow small gap
        issues.append(
            f"Timeline should start near 0 seconds, starts at {first_start}s. "
            f"Suggestion: shift keyframes earlier."
        )
    
    # Check end time coverage
    last_frame = timeline[-1]
    last_end = last_frame.get("endTime", 0)
    if last_end < expected_duration - 1:  # 1 second tolerance
        issues.append(
            f"Timeline ends at {last_end}s but expected duration is {expected_duration}s. "
            f"Suggestion: extend final animation or add new keyframes."
        )
    
    # Check for keyframes running past the audio (they simply never play)
    for i, frame in enumerate(timeline):
        end_time = frame.get("endTime", 0) if isinstance(frame, dict) else 0
        if isinstance(end_time, (int, float)) and end_time > expected_duration + 1:
            issues.append(
                f"Keyframe {i} endTime ({end_time}s) exceeds duration ({expected_duration}s)"
            )

    # Check for significant gaps between keyframes
    for i in range(len(timeline) - 1):
        current_end = timeline[i].get("endTime", 0)
        next_start = timeline[i + 1].get("startTime", 0)
        gap = next_start - current_end
        
        if gap > 1:  # More than 1 second gap
            issues.append(
                f"Gap in timeline between keyframe {i} and {i+1}: {gap}s. "
                f"Suggestion: add transition animation or adjust timing."
            )
    
    return issues


# ============================================
# STATE MACHINE VALIDATION
# ============================================


def _validate_state_machine_rules(timeline: List[Dict[str, Any]]) -> List[str]:
    """
    Validate state machine and posture rules.
    
    Enforces three key state machine guarantees:
    1. Posture restrictions (no standing animations while sitting)
    2. Walk sequence validation (start -> loop -> end pattern)
    3. Sit lock mechanism (once sitting, only idle allowed)
    
    Tracks internal state (current posture, sit lock, walk sequence progress)
    through the timeline to validate transitions.
    
    Args:
        timeline: Timeline list from script
        
    Returns:
        List of state machine validation issues
    """
    issues = []
    
    # State machine tracking
    current_posture = Posture.STANDING
    is_sitting = False  # Sit lock: once true, character can't stand again
    walk_sequence_state = None  # Track walk sequence: None -> "start" -> "loop" -> "end"
    
    for i, frame in enumerate(timeline):
        animation = frame.get("animation")
        
        # Skip invalid animations (already caught by other validators)
        if not animation or animation not in AVAILABLE_ANIMATIONS:
            continue
        
        anim_config = AVAILABLE_ANIMATIONS[animation]
        
        # ===== POSTURE VALIDATION =====
        posture_issues = _validate_posture_rules(frame, i, animation, anim_config, current_posture, is_sitting)
        issues.extend(posture_issues)
        
        # ===== WALK SEQUENCE VALIDATION =====
        walk_issues = _validate_walk_sequence_rules(frame, i, animation, walk_sequence_state)
        issues.extend(walk_issues)
        walk_sequence_state = _update_walk_sequence_state(animation, walk_sequence_state)
        
        # ===== SIT LOCK MECHANISM =====
        posture_update_issues = _update_posture_state(animation, anim_config)
        if posture_update_issues:
            current_posture, is_sitting = posture_update_issues
    
    return issues


def _validate_posture_rules(
    frame: Dict[str, Any], 
    index: int, 
    animation: str, 
    anim_config: Dict[str, Any],
    current_posture: Posture, 
    is_sitting: bool
) -> List[str]:
    """
    Validate posture-related rules.
    
    Rules:
    - Character starts standing, can transition to sitting via stand-to-sit
    - Once locked in sitting, only idle animations allowed
    - Standing animations cannot play when character is sitting
    
    Args:
        frame: The keyframe being validated
        index: Index in timeline
        animation: Animation name
        anim_config: Animation metadata
        current_posture: Current character posture
        is_sitting: Whether character is locked in sitting
        
    Returns:
        List of posture validation issues
    """
    issues = []
    
    # Rule 1: Sitting lock enforcement
    if is_sitting and animation != "idle":
        issues.append(
            f"Keyframe {index}: '{animation}' violates sit lock. "
            f"Once 'stand-to-sit' completes, only 'idle' is allowed. "
            f"Suggestion: use 'idle' or add a standing animation before sit transition."
        )
    
    # Rule 2: Posture requirement checking
    if anim_config.get("required_posture") == Posture.STANDING and current_posture == Posture.SITTING:
        if not is_sitting:  # Only error if not permanently locked
            issues.append(
                f"Keyframe {index}: '{animation}' requires standing but character is sitting. "
                f"Suggestion: place animation before 'stand-to-sit' or use idle."
            )
    
    return issues


def _validate_walk_sequence_rules(
    frame: Dict[str, Any],
    index: int,
    animation: str,
    walk_sequence_state: str
) -> List[str]:
    """
    Validate walk sequence state machine rules.
    
    Rules for walk-relaxed sequences:
    - walk-relaxed-start MUST come first
    - walk-relaxed-loop MUST follow walk-relaxed-start
    - walk-relaxed-end MUST follow walk-relaxed-loop
    - Cannot return to idle from loop without end first
    
    Args:
        frame: The keyframe being validated
        index: Index in timeline
        animation: Animation name
        walk_sequence_state: Current walk sequence state
        
    Returns:
        List of walk sequence validation issues
    """
    issues = []
    
    if animation == "walk-relaxed-loop":
        if walk_sequence_state != "start":
            issues.append(
                f"Keyframe {index}: 'walk-relaxed-loop' must follow 'walk-relaxed-start'. "
                f"Current state: {walk_sequence_state}. "
                f"Suggestion: add 'walk-relaxed-start' before this keyframe."
            )
    
    elif animation == "walk-relaxed-end":
        if walk_sequence_state != "loop":
            issues.append(
                f"Keyframe {index}: 'walk-relaxed-end' must follow 'walk-relaxed-loop'. "
                f"Current state: {walk_sequence_state}. "
                f"Suggestion: add 'walk-relaxed-loop' before this keyframe."
            )
    
    elif animation == "idle":
        if walk_sequence_state == "loop":
            issues.append(
                f"Keyframe {index}: Cannot return to 'idle' from 'walk-relaxed-loop'. "
                f"Suggestion: add 'walk-relaxed-end' before this idle keyframe."
            )
    
    return issues


def _update_walk_sequence_state(animation: str, current_state: str) -> str:
    """
    Update walk sequence state based on animation played.
    
    Args:
        animation: Animation name just played
        current_state: Current walk sequence state
        
    Returns:
        Updated walk sequence state
    """
    if animation == "walk-relaxed-start":
        return "start"
    elif animation == "walk-relaxed-loop":
        return "loop"
    elif animation == "walk-relaxed-end":
        return "end"
    elif animation in ["idle", "spellcast", "aerobic-dance", "relax", "walk-think"]:
        return None  # Reset walk state
    
    return current_state


def _update_posture_state(animation: str, anim_config: Dict[str, Any]) -> Optional[Tuple[Posture, bool]]:
    """
    Update posture state based on animation.
    
    Args:
        animation: Animation name
        anim_config: Animation metadata
        
    Returns:
        Tuple of (new_posture, is_sitting_locked) or None if no change
    """
    if anim_config.get("changes_posture_after") == Posture.SITTING:
        # stand-to-sit locks character in sitting
        return (Posture.SITTING, True)
    
    # Could add stand-up animation logic here in future
    return None


def log_validation_issues(errors: List[str], warnings: List[str]) -> None:
    """
    Log validation errors and warnings.

    Args:
        errors: Issues that make the script unusable
        warnings: Quality issues that are tolerated
    """
    if errors:
        logger.warning(f"Animation script validation found {len(errors)} error(s):")
        for issue in errors:
            logger.warning(f"  - {issue}")
    if warnings:
        logger.info(f"Animation script validation found {len(warnings)} warning(s):")
        for issue in warnings:
            logger.info(f"  - {issue}")
