"""Roast generation service using Gemini API."""

import logging
import sys
import os
import json

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
    logger.info(f"Generating roast with vision model: {config.VISION_MODEL}")
    logger.info(f"Temperature: {config.ROAST_TEMPERATURE}, Max tokens: {config.ROAST_MAX_TOKENS}")
    
    try:
        # First attempt: with structured output (response_schema)
        try:
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
            logger.info("Successfully called API with response_schema")
        except Exception as schema_error:
            logger.warning(f"Failed with response_schema: {schema_error}")
            logger.info("Retrying without response_schema...")
            
            # Fallback: without response_schema, just ask for JSON in prompt
            response = client.models.generate_content(
                model=config.VISION_MODEL,
                contents=[
                    config.ROAST_PROMPT + "\n\nIMPORTANT: Return ONLY valid JSON with these exact fields: overall_vibe, roast_lines (array), confidence_rating (0-10), style_tags (array), one_liner",
                    types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                ],
                config=types.GenerateContentConfig(
                    temperature=config.ROAST_TEMPERATURE,
                    max_output_tokens=config.ROAST_MAX_TOKENS,
                ),
            )
            logger.info("Successfully called API without response_schema")
        
        logger.info(f"Response received. Candidates count: {len(response.candidates) if response.candidates else 0}")
        
        if not response.candidates:
            logger.error("Response blocked by safety filters")
            raise ValueError("Response blocked by safety filters")

        # Log the raw response for debugging
        try:
            finish_reason = response.candidates[0].finish_reason if response.candidates else 'N/A'
            logger.info(f"First candidate finish_reason: {finish_reason}")
            
            # Check if response was truncated
            if finish_reason == "MAX_TOKENS":
                logger.warning("Response was truncated due to MAX_TOKENS - increasing token limit may help")
                
            if response.candidates and response.candidates[0].content:
                logger.info(f"Content parts count: {len(response.candidates[0].content.parts) if response.candidates[0].content.parts else 0}")
                if response.candidates[0].content.parts:
                    first_part = response.candidates[0].content.parts[0]
                    logger.info(f"First part type: {type(first_part)}")
                    if hasattr(first_part, 'text'):
                        logger.info(f"Text content preview: {first_part.text[:200] if first_part.text else 'No text'}")
        except Exception as log_error:
            logger.warning(f"Error logging response details: {log_error}")

        roast_data = response.parsed
        logger.info(f"Parsed data type: {type(roast_data)}")
        logger.info(f"Parsed data is None: {roast_data is None}")
        
        if roast_data is None:
            logger.error("response.parsed returned None - attempting manual JSON parse")
            # Try to get text directly and parse manually
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text') and part.text:
                        raw_text = part.text.strip()
                        logger.info(f"Raw response text: {raw_text[:500]}")
                        
                        try:
                            # Try to parse as JSON
                            roast_data = json.loads(raw_text)
                            logger.info("Successfully parsed JSON from raw text")
                            break
                        except json.JSONDecodeError as je:
                            logger.error(f"Failed to parse as JSON: {je}")
                            
                            # Check if JSON is truncated (missing closing braces)
                            if finish_reason == "MAX_TOKENS":
                                logger.error("JSON appears truncated due to MAX_TOKENS limit")
                                # Try to repair the JSON by closing it
                                try:
                                    # Count opening and closing braces
                                    open_braces = raw_text.count('{')
                                    close_braces = raw_text.count('}')
                                    open_brackets = raw_text.count('[')
                                    close_brackets = raw_text.count(']')
                                    
                                    repaired = raw_text
                                    # Close any unclosed strings
                                    if repaired.count('"') % 2 != 0:
                                        repaired += '"'
                                    # Close unclosed arrays
                                    for _ in range(open_brackets - close_brackets):
                                        repaired += ']'
                                    # Close unclosed objects
                                    for _ in range(open_braces - close_braces):
                                        repaired += '}'
                                    
                                    logger.info(f"Attempting to parse repaired JSON: {repaired}")
                                    roast_data = json.loads(repaired)
                                    logger.info("Successfully parsed repaired JSON!")
                                    break
                                except Exception as repair_error:
                                    logger.error(f"Failed to repair and parse JSON: {repair_error}")
                            else:
                                logger.error(f"Full raw text: {raw_text}")
                            
                            # Try to extract JSON from markdown code blocks if present
                            if "```json" in raw_text:
                                try:
                                    json_start = raw_text.find("```json") + 7
                                    json_end = raw_text.find("```", json_start)
                                    json_str = raw_text[json_start:json_end].strip()
                                    roast_data = json.loads(json_str)
                                    logger.info("Successfully extracted JSON from markdown block")
                                    break
                                except Exception as e:
                                    logger.error(f"Failed to extract from markdown: {e}")
                            elif "```" in raw_text:
                                try:
                                    json_start = raw_text.find("```") + 3
                                    json_end = raw_text.find("```", json_start)
                                    json_str = raw_text[json_start:json_end].strip()
                                    roast_data = json.loads(json_str)
                                    logger.info("Successfully extracted JSON from code block")
                                    break
                                except Exception as e:
                                    logger.error(f"Failed to extract from code block: {e}")
            
            if roast_data is None:
                raise ValueError("Failed to parse roast data - response.parsed is None and manual parsing failed")
        
        logger.info(f"Parsed data content: {roast_data}")
        
        # Normalize to dict if needed
        if not isinstance(roast_data, dict):
            logger.info(f"Converting from {type(roast_data)} to dict")
            logger.info(f"Has __dict__: {hasattr(roast_data, '__dict__')}")
            if hasattr(roast_data, '__dict__'):
                roast_data = roast_data.__dict__
            else:
                logger.error(f"Cannot convert type {type(roast_data)} to dict")
                raise ValueError(f"Unexpected roast_data type: {type(roast_data)}")

        logger.info(f"Final roast_data keys: {list(roast_data.keys())}")
        
        # Clamp confidence rating to valid range
        confidence = roast_data.get("confidence_rating", 5)
        roast_data["confidence_rating"] = max(0, min(10, confidence))

        logger.info("Roast generated successfully")
        return roast_data
        
    except Exception as e:
        logger.exception(f"Error in generate_roast: {e}")
        raise


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
