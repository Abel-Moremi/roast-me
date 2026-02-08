"""
Animation Script Generation Service
Orchestrates Gemini API calls to generate animation scripts from narration.

This module provides the main orchestration layer for animation generation:
1. Prompt building with state machine rules and animation metadata
2. Gemini API communication with error handling
3. Response parsing and validation
4. Fallback script generation on failures
5. Comprehensive logging for debugging

Uses component modules for clean separation:
- animation_constants: Animation metadata and state machine definitions
- animation_prompt: Prompt building with modular sections
- animation_validator: Comprehensive validation against state machine rules
- animation_utils: Response parsing, sanitization, and utility functions
"""

import logging
import sys
import os
from typing import Dict, Any, Optional
from google import genai
from google.genai import types

# Ensure parent directory is in path for config import
if __name__ != "__main__":
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

import config
from .animation_constants import AnimationConfig
from .animation_prompt import build_animation_generation_prompt
from .animation_validator import validate_animation_script, log_validation_issues
from .animation_utils import (
    parse_animation_response,
    generate_default_animation_script,
    sanitize_animation_script,
    estimate_audio_duration
)

logger = logging.getLogger(__name__)


# ============================================
# MAIN ORCHESTRATION FUNCTION
# ============================================

def generate_animation_script(
    client: Any,
    transcript: str,
    duration_seconds: Optional[float] = None
) -> Dict[str, Any]:
    """
    Generate an animation script from audio transcript using Gemini.
    
    Main orchestration function with fallback chain:
    1. Estimate duration if not provided
    2. Build state machine-aware prompt
    3. Call Gemini API to generate animation timeline
    4. Parse and validate response
    5. Sanitize animation names and ranges
    6. Return fallback if any step fails
    
    Error Handling:
    - API failures fall back to default script
    - Validation failures return sanitized version or fallback
    - Parse failures fall back to default script
    - All failures are logged for debugging
    
    Args:
        client: Gemini client instance (genai.Client)
        transcript: The narration text/speech transcript
        duration_seconds: Expected audio duration in seconds
                         If None, estimated from transcript word count
        
    Returns:
        Dict with structure:
        {
            "metadata": {...},
            "timeline": [{"startTime", "endTime", "animation", "expression", "intensity", "notes"}, ...]
        }
        
        Always returns a valid script (either generated or fallback).
    """
    # Step 0: Handle duration estimation
    if duration_seconds is None:
        duration_seconds = estimate_audio_duration(transcript)
        logger.info(f"Estimated duration from transcript: {duration_seconds:.1f}s ({len(transcript)} chars)")
    
    logger.info(
        f"Generating animation script: {duration_seconds}s, {len(transcript)} chars transcript"
    )
    
    try:
        # Step 1: Build prompt with state machine rules
        prompt = build_animation_generation_prompt(transcript, duration_seconds)
        logger.debug(f"Built prompt ({len(prompt)} chars) with state machine rules")
        
        # Step 2: Call Gemini API
        animation_script = _call_gemini_for_animation(client, prompt)
        
        if animation_script is None:
            logger.warning("Gemini returned no animation script - using fallback")
            return generate_default_animation_script(duration_seconds, transcript)
        
        # Step 3: Validate script against state machine rules
        is_valid, issues = validate_animation_script(animation_script, duration_seconds)
        
        if issues:
            log_validation_issues(issues)
            if not is_valid:
                logger.warning(
                    f"Validation failed ({len(issues)} issues) - using fallback script"
                )
                return generate_default_animation_script(duration_seconds, transcript)
            else:
                logger.info(f"Validation passed with {len(issues)} warning(s)")
        else:
            logger.info("Validation passed with no issues")
        
        # Step 4: Sanitize and normalize
        sanitized = sanitize_animation_script(animation_script)
        if not sanitized:
            logger.warning("Failed to sanitize script - using fallback")
            return generate_default_animation_script(duration_seconds, transcript)
        
        keyframe_count = len(sanitized.get('timeline', []))
        logger.info(f"Generated animation script with {keyframe_count} keyframes")
        
        return sanitized
        
    except Exception as e:
        logger.error(f"Animation script generation failed: {type(e).__name__}: {e}", exc_info=True)
        logger.info("Falling back to default animation script")
        return generate_default_animation_script(duration_seconds, transcript)


# ============================================
# GEMINI API COMMUNICATION
# ============================================

def _call_gemini_for_animation(client: Any, prompt: str) -> Optional[Dict[str, Any]]:
    """
    Call Gemini API to generate animation script.
    
    Communication Details:
    - Uses configured vision model and temperature
    - Handles safety filter blocks gracefully
    - Parses JSON from response (handles markdown wrapping)
    - Logs full response on parse failures for debugging
    
    Error Scenarios Handled:
    - API connection failures
    - Response blocked by safety filters
    - Invalid/unparseable JSON
    - Empty or malformed responses
    - Timeout/rate limiting (propagated)
    
    Args:
        client: Gemini client instance
        prompt: The animation generation prompt
        
    Returns:
        Parsed animation script dict, or None if:
        - API call fails
        - Response blocked
        - JSON parsing fails
    """
    try:
        logger.info("Calling Gemini API for animation generation")
        logger.debug(f"Model: {config.VISION_MODEL}, Temperature: {AnimationConfig.GEMINI_TEMPERATURE}")
        
        # Call Gemini API
        response = client.models.generate_content(
            model=config.VISION_MODEL,
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=AnimationConfig.GEMINI_TEMPERATURE,
                max_output_tokens=AnimationConfig.GEMINI_MAX_TOKENS,
            ),
        )
        
        # Check if response was generated
        if not response.candidates:
            logger.error("Animation generation blocked by safety filters")
            return None
        
        if not response.candidates[0].content.parts:
            logger.error("Response has no content parts")
            return None
        
        # Extract text response
        response_text = response.candidates[0].content.parts[0].text
        logger.debug(f"Gemini response received: {len(response_text)} chars")
        logger.debug(f"First 300 chars: {response_text[:300]}")
        
        # Parse JSON from response
        parsed_script, parse_error = parse_animation_response(response_text)
        if parse_error:
            logger.error(f"Failed to parse Gemini response: {parse_error}")
            logger.debug(f"Full response:\n{response_text}")
            return None
        
        logger.debug("Successfully parsed animation script from Gemini response")
        return parsed_script
        
    except ValueError as e:
        # Handle validation/format errors
        logger.error(f"Invalid response format from Gemini: {e}")
        return None
    except TypeError as e:
        # Handle type mismatches in response
        logger.error(f"Type error in response: {e}")
        return None
    except Exception as e:
        # Handle all other errors
        logger.error(f"Gemini API call failed: {type(e).__name__}: {e}", exc_info=True)
        return None
