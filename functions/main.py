"""
Roast-Me Cloud Function
Analyzes images and generates playful roasts with TTS audio.
"""

import functions_framework
from flask import jsonify
from google import genai
import logging

from config import GEMINI_API_KEY, MAX_IMAGE_DIMENSION, RATE_LIMIT_PER_HOUR, get_cors_headers
from utils.image_utils import parse_image_from_request, resize_image, image_to_bytes
from utils.rate_limit import RateLimiter, client_ip
from utils.gemini_errors import QuotaExceededError
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

rate_limiter = RateLimiter(RATE_LIMIT_PER_HOUR)


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

        # Each roast makes 3 paid Gemini calls, so limit roasts per client
        allowed, retry_after = rate_limiter.check(client_ip(request))
        if not allowed:
            minutes = max(1, round(retry_after / 60))
            logger.warning("Rate limit hit")
            return _error_response(
                f"That's a lot of roasts! Try again in about {minutes} minute{'s' if minutes != 1 else ''}.",
                {**cors_headers, "Retry-After": str(retry_after)},
                status_code=429,
                code="RATE_LIMITED"
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

        # Generate TTS audio. If only the voice runs out of quota, still send
        # the roast text and tell the frontend why there's no audio.
        notices = []
        try:
            audio_base64 = generate_tts_audio(client, narration_text)
        except QuotaExceededError as quota_error:
            audio_base64 = None
            notices.append(_quota_notice(quota_error, voice_only=True))

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

        if notices:
            response_data["notices"] = notices

        return jsonify(response_data), 200, cors_headers

    except QuotaExceededError as quota_error:
        # The Gemini API key's request limit, not this user's fault: 429 so
        # the frontend shows it instead of falling back to the sample roast
        logger.warning(f"Gemini quota exceeded: {quota_error}")
        notice = _quota_notice(quota_error)
        return _error_response(
            notice["message"],
            cors_headers,
            status_code=429,
            code=notice["code"],
            extra={"quotaPeriod": quota_error.period}
        )

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


def _quota_notice(quota_error, voice_only=False):
    """User-facing code and message for a Gemini quota error."""
    when = {
        "day": "Try again tomorrow.",
        "minute": "Try again in a minute.",
    }.get(quota_error.period, "Try again later.")
    if voice_only:
        return {
            "code": "VOICE_QUOTA_EXCEEDED",
            "message": f"The comedian's voice has hit its Gemini usage limit, so this roast is text only. {when}",
            "period": quota_error.period,
        }
    return {
        "code": "QUOTA_EXCEEDED",
        "message": f"The roast machine has hit its Gemini usage limit. {when}",
        "period": quota_error.period,
    }


def _error_response(message, cors_headers, status_code=500, code=None, extra=None):
    """
    Create a standardized error response.
    
    Args:
        message: Error message
        cors_headers: CORS headers for this request
        status_code: HTTP status code
        code: Optional machine-readable error code (e.g. QUOTA_EXCEEDED)
        extra: Optional extra fields for the JSON body
        
    Returns:
        Flask response tuple
    """
    body = {
        "success": False,
        "error": message,
    }
    if code:
        body["code"] = code
    if extra:
        body.update(extra)
    return jsonify(body), status_code, cors_headers