"""
Animation Script Generation Service
Orchestrates Gemini API calls to generate animation scripts from narration.
Uses component modules for constants, prompts, validation, and utilities.
"""

import logging
import sys
import os
from google import genai
from google.genai import types

# Ensure parent directory is in path for config import
if __name__ != "__main__":
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

import config
from .animation_constants import ANIMATION_CONFIG
from .animation_prompt import build_animation_generation_prompt
from .animation_validator import validate_animation_script, log_validation_issues
from .animation_utils import (
    parse_animation_response,
    generate_default_animation_script,
    sanitize_animation_script
)

logger = logging.getLogger(__name__)


def generate_animation_script(client, transcript, duration_seconds):
    """
    Generate an animation script from audio transcript using Gemini.
    
    Main orchestration function that:
    1. Builds the prompt with available animations and expressions
    2. Calls Gemini API to generate animation timeline
    3. Validates and sanitizes the response
    4. Returns fallback script if generation fails
    
    Args:
        client: Gemini client instance
        transcript (str): The narration text/transcript
        duration_seconds (float): Expected audio duration in seconds
        
    Returns:
        dict: Animation script with timeline and metadata
        
    Raises:
        ValueError: If animation generation fails completely
    """
    logger.info(f"Generating animation script for {duration_seconds}s audio")
    logger.info(f"Transcript length: {len(transcript)} characters")
    
    try:
        # Step 1: Build prompt with available options
        prompt = build_animation_generation_prompt(transcript, duration_seconds)
        
        # Step 2: Call Gemini API
        animation_script = _call_gemini_for_animation(client, prompt)
        
        if animation_script is None:
            logger.warning("Gemini returned no animation script, using fallback")
            return generate_default_animation_script(duration_seconds, transcript)
        
        # Step 3: Validate script structure
        is_valid, issues = validate_animation_script(animation_script, duration_seconds)
        
        if issues:
            log_validation_issues(issues)
            if not is_valid:
                logger.warning("Validation failed, using fallback script")
                return generate_default_animation_script(duration_seconds, transcript)
        
        # Step 4: Sanitize and return
        sanitized = sanitize_animation_script(animation_script)
        logger.info(f"Animation script generated with {len(sanitized.get('timeline', []))} keyframes")
        
        return sanitized
        
    except Exception as e:
        logger.error(f"Animation script generation failed: {e}")
        logger.info("Falling back to default animation script")
        return generate_default_animation_script(duration_seconds, transcript)


def _call_gemini_for_animation(client, prompt):
    """
    Call Gemini API to generate animation script.
    
    Args:
        client: Gemini client instance
        prompt (str): The prompt to send to Gemini
        
    Returns:
        dict: Parsed animation script or None if failed
    """
    try:
        logger.info("Calling Gemini API for animation generation")
        
        response = client.models.generate_content(
            model=config.VISION_MODEL,
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=ANIMATION_CONFIG["temperature"],
                max_output_tokens=ANIMATION_CONFIG["max_tokens"],
            ),
        )
        
        # Check if response was blocked
        if not response.candidates:
            logger.error("Animation generation blocked by safety filters")
            return None
        
        # Extract text response
        response_text = response.candidates[0].content.parts[0].text
        logger.debug(f"Gemini response (first 200 chars): {response_text[:200]}")
        
        # Parse JSON from response
        parsed_script, parse_error = parse_animation_response(response_text)
        if parse_error:
            logger.error(f"Failed to parse Gemini response: {parse_error}")
            logger.debug(f"Full response: {response_text}")
            return None
        
        return parsed_script
        
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        return None
