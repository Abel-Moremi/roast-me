"""Roast generation service using Gemini API."""

import logging
import sys
import os

# Ensure parent directory is in path for config import
if __name__ != "__main__":
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

from google import genai
from google.genai import types
import config

logger = logging.getLogger(__name__)


def generate_roast(client, image_bytes):
    """
    Generate a roast using Gemini vision model.
    
    Args:
        client: Gemini client instance
        image_bytes: Image data as bytes
        
    Returns:
        dict: Roast data with normalized fields
        
    Raises:
        ValueError: If roast generation fails or is blocked
    """
    logger.info("Generating roast with vision model")
    
    response = client.models.generate_content(
        model=config.VISION_MODEL,
        contents=[
            config.ROAST_PROMPT,
            types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
        ],
        config=types.GenerateContentConfig(
            temperature=config.ROAST_TEMPERATURE,
            max_output_tokens=config.ROAST_MAX_TOKENS,
            response_schema=config.ROAST_SCHEMA,
            response_mime_type="application/json",
        ),
    )

    if not response.candidates:
        raise ValueError("Response blocked by safety filters")

    roast_data = response.parsed
    
    if roast_data is None:
        raise ValueError("Failed to parse roast data")
    
    # Normalize to dict if needed
    if not isinstance(roast_data, dict):
        roast_data = roast_data.__dict__

    # Clamp confidence rating to valid range
    confidence = roast_data.get("confidence_rating", 5)
    roast_data["confidence_rating"] = max(0, min(10, confidence))

    logger.info("Roast generated successfully")
    return roast_data


def build_narration_text(roast_data):
    """
    Build narration text from roast data for TTS.
    
    Args:
        roast_data: Dict containing roast information
        
    Returns:
        str: Formatted narration text
    """
    overall_vibe = roast_data.get("overall_vibe", "")
    roast_lines = roast_data.get("roast_lines", [])
    one_liner = roast_data.get("one_liner", "")

    text = f"{overall_vibe}. "
    if roast_lines:
        text += " ".join(roast_lines)
    if one_liner:
        text += f" And here's the best part: {one_liner}"

    return text
