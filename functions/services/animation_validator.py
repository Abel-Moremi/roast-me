"""
Animation Script Validator
Validates animation script structure and content against schema.
"""

import logging
from .animation_constants import AVAILABLE_ANIMATIONS, AVAILABLE_EXPRESSIONS, ANIMATION_CONFIG

logger = logging.getLogger(__name__)


def validate_animation_script(script, expected_duration):
    """
    Validate animation script structure and content.
    
    Args:
        script (dict): The animation script to validate
        expected_duration (float): Expected duration in seconds
        
    Returns:
        tuple: (is_valid: bool, issues: list[str])
    """
    issues = []
    
    # Validate top-level structure
    if not isinstance(script, dict):
        issues.append("Script must be a dictionary")
        return False, issues
    
    # Validate metadata
    metadata = script.get("metadata")
    if not metadata:
        issues.append("Missing 'metadata' section")
    else:
        metadata_issues = _validate_metadata(metadata, expected_duration)
        issues.extend(metadata_issues)
    
    # Validate timeline
    timeline = script.get("timeline", [])
    if not timeline:
        issues.append("Timeline is empty or missing")
        return len(issues) == 0, issues
    
    if not isinstance(timeline, list):
        issues.append("Timeline must be a list")
        return False, issues
    
    if len(timeline) > ANIMATION_CONFIG["max_keyframes"]:
        issues.append(f"Timeline has too many keyframes ({len(timeline)} > {ANIMATION_CONFIG['max_keyframes']})")
    
    if len(timeline) < 3:
        issues.append("Timeline should have at least 3 keyframes")
    
    # Validate each keyframe
    for i, frame in enumerate(timeline):
        frame_issues = _validate_keyframe(frame, i, expected_duration)
        issues.extend(frame_issues)
    
    # Validate timeline continuity
    continuity_issues = _validate_timeline_continuity(timeline, expected_duration)
    issues.extend(continuity_issues)
    
    return len(issues) == 0, issues


def _validate_metadata(metadata, expected_duration):
    """Validate metadata section."""
    issues = []
    
    if not isinstance(metadata, dict):
        return ["Metadata must be a dictionary"]
    
    # Check duration
    duration = metadata.get("duration")
    if duration is None:
        issues.append("Metadata missing 'duration'")
    elif not isinstance(duration, (int, float)):
        issues.append(f"Metadata duration must be a number, got {type(duration)}")
    elif duration <= 0:
        issues.append(f"Metadata duration must be positive, got {duration}")
    elif abs(duration - expected_duration) > 2:  # Allow 2 second tolerance
        issues.append(f"Duration mismatch: expected ~{expected_duration}s, got {duration}s")
    
    # Check transcript
    transcript = metadata.get("transcript")
    if not transcript:
        issues.append("Metadata missing 'transcript'")
    elif not isinstance(transcript, str):
        issues.append("Metadata transcript must be a string")
    
    # Check intensity
    intensity = metadata.get("intensity")
    if intensity and intensity not in ["low", "medium", "high"]:
        issues.append(f"Metadata intensity must be 'low', 'medium', or 'high', got '{intensity}'")
    
    return issues


def _validate_keyframe(frame, index, expected_duration):
    """Validate a single keyframe."""
    issues = []
    
    if not isinstance(frame, dict):
        return [f"Keyframe {index} must be a dictionary"]
    
    # Check required fields
    required_fields = ["startTime", "endTime", "animation", "expression", "intensity"]
    for field in required_fields:
        if field not in frame:
            issues.append(f"Keyframe {index} missing required field '{field}'")
    
    # Validate timing
    start_time = frame.get("startTime")
    end_time = frame.get("endTime")
    
    if start_time is not None and not isinstance(start_time, (int, float)):
        issues.append(f"Keyframe {index} startTime must be numeric")
    if end_time is not None and not isinstance(end_time, (int, float)):
        issues.append(f"Keyframe {index} endTime must be numeric")
    
    if start_time is not None and end_time is not None:
        if start_time < 0:
            issues.append(f"Keyframe {index} startTime cannot be negative")
        if end_time <= start_time:
            issues.append(f"Keyframe {index} endTime must be after startTime")
        if end_time > expected_duration + 1:  # 1 second tolerance
            issues.append(f"Keyframe {index} endTime exceeds duration")
    
    # Validate animation
    animation = frame.get("animation")
    if animation and animation not in AVAILABLE_ANIMATIONS:
        issues.append(f"Keyframe {index} has invalid animation '{animation}'")
    
    # Validate expression
    expression = frame.get("expression")
    if expression and expression not in AVAILABLE_EXPRESSIONS:
        issues.append(f"Keyframe {index} has invalid expression '{expression}'")
    
    # Validate intensity
    intensity = frame.get("intensity")
    if intensity is not None:
        if not isinstance(intensity, (int, float)):
            issues.append(f"Keyframe {index} intensity must be numeric")
        elif not (0.0 <= intensity <= 1.0):
            issues.append(f"Keyframe {index} intensity must be between 0.0 and 1.0, got {intensity}")
    
    return issues


def _validate_timeline_continuity(timeline, expected_duration):
    """Validate that timeline covers the duration without gaps."""
    issues = []
    
    if not timeline:
        return issues
    
    # Check start time
    first_frame = timeline[0]
    if first_frame.get("startTime", 0) > 0.5:  # Allow small gap
        issues.append("Timeline should start near 0 seconds")
    
    # Check end time
    last_frame = timeline[-1]
    last_end = last_frame.get("endTime", 0)
    if last_end < expected_duration - 1:  # 1 second tolerance
        issues.append(f"Timeline ends at {last_end}s but expected duration is {expected_duration}s")
    
    # Check for significant gaps
    for i in range(len(timeline) - 1):
        current_end = timeline[i].get("endTime", 0)
        next_start = timeline[i + 1].get("startTime", 0)
        if next_start - current_end > 1:  # More than 1 second gap
            issues.append(f"Gap in timeline between keyframe {i} and {i+1}")
    
    return issues


def log_validation_issues(issues):
    """Log validation issues at appropriate levels."""
    if not issues:
        return
    
    logger.warning(f"Animation script validation found {len(issues)} issue(s):")
    for issue in issues:
        logger.warning(f"  - {issue}")
