"""
Roast-Me Cloud Function
Analyzes images and generates playful roasts with TTS audio.
"""

import functions_framework
from flask import jsonify
from google import genai
import logging

from config import GEMINI_API_KEY, CORS_HEADERS
from utils.image_utils import parse_image_from_request, resize_image, image_to_bytes
from services.roast_service import generate_roast, build_narration_text
from services.tts_service import generate_tts_audio, get_audio_mime_type

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini client
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set")

client = genai.Client(api_key=GEMINI_API_KEY)


@functions_framework.http
def roast_image(request):
    """
    HTTP Cloud Function to generate roasts from images.
    
    Args:
        request: Flask request object
        
    Returns:
        JSON response with roast data and optional audio
    """
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return ("", 204, CORS_HEADERS)

    try:
        logger.info("Roast request received")

        # Validate API key
        if not GEMINI_API_KEY:
            return _error_response(
                "GEMINI_API_KEY not configured",
                status_code=500
            )

        # Parse and validate image
        image = parse_image_from_request(request)
        if image is None:
            return _error_response(
                "No image provided (base64 JSON or multipart expected)",
                status_code=400
            )

        # Process image
        image = resize_image(image)
        image_bytes = image_to_bytes(image)

        # Generate roast
        roast_data = generate_roast(client, image_bytes)

        # Build narration text for TTS
        narration_text = build_narration_text(roast_data)

        # Generate TTS audio
        audio_base64 = generate_tts_audio(client, narration_text)

        # Build response
        response_data = {
            "success": True,
            "data": roast_data,
        }

        if audio_base64:
            response_data["audio"] = audio_base64
            response_data["audioMimeType"] = get_audio_mime_type()

        return jsonify(response_data), 200, CORS_HEADERS

    except ValueError as ve:
        # Expected errors (validation, safety filters, etc.)
        logger.warning(f"Validation error: {ve}")
        return _error_response(str(ve), status_code=400)

    except Exception as e:
        # Unexpected errors
        logger.exception("Roast failed")
        return _error_response(
            f"Internal server error: {str(e)}",
            status_code=500
        )


def _error_response(message, status_code=500):
    """
    Create a standardized error response.
    
    Args:
        message: Error message
        status_code: HTTP status code
        
    Returns:
        Flask response tuple
    """
    return jsonify({
        "success": False,
        "error": message,
    }), status_code, CORS_HEADERS