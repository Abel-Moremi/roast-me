"""
Roast-Me Cloud Function
Analyzes images and generates playful roasts with TTS audio.
"""

import functions_framework
from flask import jsonify
from google import genai
import logging

from config import GEMINI_API_KEY, MAX_IMAGE_DIMENSION, get_cors_headers
from utils.image_utils import parse_image_from_request, resize_image, image_to_bytes
from services.roast_service import generate_roast, build_narration_text
from services.tts_service import generate_tts_audio, get_audio_duration, get_audio_mime_type
from services.animation_service import generate_animation_script

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini client
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set")

client = genai.Client(api_key=GEMINI_API_KEY)


@functions_framework.http
def roast_me(request):
    """
    HTTP Cloud Function to generate roasts from images.
    
    Args:
        request: Flask request object
        
    Returns:
        JSON response with roast data and optional audio
    """
    cors_headers = get_cors_headers(request.headers.get("Origin"))

    # Handle CORS preflight
    if request.method == "OPTIONS":
        return ("", 204, cors_headers)

    try:
        logger.info("Roast request received")

        # Validate API key
        if not GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY not configured")
            return _error_response(
                "Server is not configured",
                cors_headers,
                status_code=500
            )

        # Parse and validate image
        image = parse_image_from_request(request)
        if image is None:
            return _error_response(
                "No image provided (base64 JSON or multipart expected)",
                cors_headers,
                status_code=400
            )

        # Process image
        image = resize_image(image, MAX_IMAGE_DIMENSION)
        image_bytes = image_to_bytes(image)

        # Generate roast
        roast_data = generate_roast(client, image_bytes)

        # Build narration text for TTS
        narration_text = build_narration_text(roast_data)

        # Generate TTS audio
        audio_base64 = generate_tts_audio(client, narration_text)

        # Measure the real audio length so the animation timeline matches
        # playback. Without audio, the animation service estimates it from
        # the word count instead.
        audio_duration = get_audio_duration(audio_base64)

        # Generate animation script based on narration and audio duration
        try:
            animation_script = generate_animation_script(
                client,
                narration_text,
                audio_duration
            )
        except Exception as anim_error:
            logger.warning(f"Animation script generation failed, continuing without: {anim_error}")
            animation_script = None

        # Build response
        response_data = {
            "success": True,
            "data": roast_data,
        }

        if audio_base64:
            response_data["audio"] = audio_base64
            response_data["audioMimeType"] = get_audio_mime_type()

        if animation_script:
            response_data["animationScript"] = animation_script

        return jsonify(response_data), 200, cors_headers

    except ValueError as ve:
        # Expected errors (validation, safety filters, etc.)
        logger.warning(f"Validation error: {ve}")
        return _error_response(str(ve), cors_headers, status_code=400)

    except Exception as e:
        # Unexpected errors: log the details, but don't send them to the browser
        logger.exception("Roast failed")
        return _error_response(
            "Internal server error",
            cors_headers,
            status_code=500
        )


def _error_response(message, cors_headers, status_code=500):
    """
    Create a standardized error response.
    
    Args:
        message: Error message
        cors_headers: CORS headers for this request
        status_code: HTTP status code
        
    Returns:
        Flask response tuple
    """
    return jsonify({
        "success": False,
        "error": message,
    }), status_code, cors_headers